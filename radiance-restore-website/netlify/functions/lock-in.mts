import type { Context, Config } from "@netlify/functions";
import { buildQuote, bedLabel, bathLabel, money } from "../../offer/pricing.js";

// Called when a customer taps "Lock in my spot" on /quote.
// Re-prices on the server, alerts the team in Slack, and texts the customer a confirmation.
// The team then sends the Jobber quote/booking link, where Jobber Payments saves the card.

function clip(v: unknown, n = 120): string {
  return String(v ?? "").trim().slice(0, n);
}
function cleanPhone(raw: string): string | null {
  const d = String(raw || "").replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  return null;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let b: Record<string, any>;
  try {
    b = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  if (clip(b.company)) return Response.json({ ok: true });

  const quote = buildQuote({ service: clip(b.service, 20), beds: b.beds, baths: b.baths, freq: clip(b.freq, 20) });
  const phone = cleanPhone(clip(b.phone, 30));
  const name = clip(b.name, 60) || "Customer";
  if (!quote) return Response.json({ ok: false, error: "Quote details are missing." }, { status: 400 });
  if (!phone) return Response.json({ ok: false, error: "Please enter a 10 digit mobile number." }, { status: 400 });

  const addons: { label: string; price: number | null; qty: number }[] = Array.isArray(b.addons)
    ? b.addons.slice(0, 20).map((a: any) => ({
        label: clip(a.label, 80),
        price: Number.isFinite(Number(a.price)) && a.price !== null ? Number(a.price) : null,
        qty: Math.max(1, Math.min(10, Number(a.qty) || 1)),
      }))
    : [];
  const addonTotal = addons.reduce((s, a) => s + (a.price ? a.price * a.qty : 0), 0);
  const day = clip(b.day, 40) || "flexible";
  const time = clip(b.time, 20) || "flexible";

  const addonText = addons.length
    ? addons.map((a) => `${a.label}${a.qty > 1 ? ` x${a.qty}` : ""} (${a.price ? money(a.price * a.qty) : "price on site"})`).join(", ")
    : "none";

  const tasks: Promise<unknown>[] = [];
  const slack = Netlify.env.get("SLACK_WEBHOOK_URL");
  if (slack) {
    const text =
      `:rotating_light: *${name} wants to lock in!* ${phone}\n` +
      `${quote.serviceLabel} · ${bedLabel(quote.beds)}, ${bathLabel(quote.baths)} · ${quote.freqLabel}\n` +
      `First clean ${money(quote.firstWithOffer)}${addonTotal ? ` + add ons ${money(addonTotal)} = ${money(quote.firstWithOffer + addonTotal)}` : ""}` +
      (quote.recurringPerVisit ? ` · then ${money(quote.recurringPerVisit)}/visit` : "") +
      `\nAdd ons: ${addonText}\nPreferred: ${day}, ${time}\nAddress: ${clip(b.address, 200) || "ask"}\n` +
      `Source: ${clip(b.utm_source, 80) || "direct"} · Campaign: ${clip(b.utm_campaign, 120) || "none"} · Ad: ${clip(b.utm_content, 120) || "none"}\n` +
      `*Next:* send the Jobber quote link so they can save a card.`;
    tasks.push(fetch(slack, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => {}));
  }

  const quoKey = Netlify.env.get("QUO_API_KEY");
  if (quoKey) {
    const first = name.split(/\s+/)[0];
    const msg =
      `Thanks, ${first}. We got your request for ${day} (${time.toLowerCase()}) for your ${quote.serviceShort}. ` +
      `We'll text you a secure Jobber link in a few minutes to confirm and save a card. Nothing is charged until after your clean.`;
    tasks.push(
      fetch("https://api.openphone.com/v1/messages", {
        method: "POST",
        headers: { Authorization: quoKey, "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg, from: Netlify.env.get("QUO_FROM_NUMBER") || "+15615565899", to: [phone] }),
      }).catch(() => {}),
    );
  }

  await Promise.all(tasks);
  return Response.json({ ok: true, total: quote.firstWithOffer + addonTotal });
};

export const config: Config = {
  path: "/api/lock-in",
};
