import type { Context, Config } from "@netlify/functions";

// Accept either the bare webhook link or a pasted sample curl command that contains it.
function slackUrl(): string | undefined {
  const raw = Netlify.env.get("SLACK_WEBHOOK_URL") || "";
  const m = raw.match(/https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/);
  return m ? m[0] : undefined;
}
import { buildQuote, bedLabel, bathLabel, money } from "../../offer/pricing.js";
import { createOfferQuote } from "../lib/jobber.mts";

// Called when a customer taps "Lock in my spot" on /quote.
// Re-prices on the server, alerts the team in Slack, and texts the customer a confirmation.
// Creates the client and a sent Jobber quote ($50 off, card on file required) and texts the
// customer the client hub link to approve. If Jobber is unavailable it falls back to a manual follow up.

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

  const address = clip(b.address, 200);
  if (address.length < 6) return Response.json({ ok: false, error: "Please add your home address so we can book the clean." }, { status: 400 });

  const source = clip(b.utm_source, 80) || "direct";
  const first = name.split(/\s+/)[0];

  // 1) Jobber: client + property + quote the customer can approve with a saved card.
  let jobber: { quoteNumber: number; clientHubUri: string; jobberWebUri: string } | null = null;
  let jobberError = "";
  try {
    const lines = [
      {
        name: `${quote.serviceLabel}: ${bedLabel(quote.beds)}, ${bathLabel(quote.baths)}`,
        description: `First clean. ${quote.freqLabel}${quote.recurringPerVisit ? `, then ${money(quote.recurringPerVisit)} per visit` : ""}.`,
        unitPrice: quote.firstFull,
      },
      ...addons.filter((a) => a.price).map((a) => ({ name: a.label, unitPrice: a.price as number, quantity: a.qty })),
    ];
    const askAddons = addons.filter((a) => !a.price).map((a) => a.label);
    const message =
      `Hi ${first}! Here's your first clean with $50 off. Preferred: ${day}, ${time.toLowerCase()}. ` +
      (askAddons.length ? `We'll confirm pricing for: ${askAddons.join(", ")}. ` : "") +
      (quote.recurringPerVisit ? `After your first clean, ${quote.freqLabel.toLowerCase()} visits are ${money(quote.recurringPerVisit)} each. ` : "") +
      `Approve below and save a card. Nothing is charged until after your clean.`;
    const r = await createOfferQuote({
      name,
      phone,
      address,
      source: `$50 off page (${source}${b.utm_campaign ? `, ${clip(b.utm_campaign, 60)}` : ""})`,
      title: `$50 Off First Clean: ${quote.serviceLabel}`,
      message,
      lines,
      discount: 50,
    });
    jobber = r.quote;
  } catch (e) {
    jobberError = String((e as Error)?.message || e).slice(0, 300);
    console.error("Jobber quote failed", e);
  }

  const tasks: Promise<unknown>[] = [];
  const slack = slackUrl();
  if (slack) {
    const text =
      `:rotating_light: *${name} wants to lock in!* ${phone}\n` +
      `${quote.serviceLabel} · ${bedLabel(quote.beds)}, ${bathLabel(quote.baths)} · ${quote.freqLabel}\n` +
      `First clean ${money(quote.firstWithOffer)}${addonTotal ? ` + add ons ${money(addonTotal)} = ${money(quote.firstWithOffer + addonTotal)}` : ""}` +
      (quote.recurringPerVisit ? ` · then ${money(quote.recurringPerVisit)}/visit` : "") +
      `\nAdd ons: ${addonText}\nPreferred: ${day}, ${time}\nAddress: ${address}\n` +
      `Source: ${source} · Campaign: ${clip(b.utm_campaign, 120) || "none"} · Ad: ${clip(b.utm_content, 120) || "none"}\n` +
      (jobber
        ? `:white_check_mark: Jobber quote #${jobber.quoteNumber} sent and texted to them. You'll get a ping when they approve: ${jobber.jobberWebUri}`
        : `:warning: Jobber quote NOT created (${jobberError || "unknown"}). *Send them a quote from Jobber manually.*`);
    tasks.push(fetch(slack, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => {}));
  }

  const quoKey = Netlify.env.get("QUO_API_KEY");
  if (quoKey) {
    const msg = jobber
      ? `Hi ${first}, it's Radiance Restore Cleaners. Your quote is ready: ${money(quote.firstWithOffer + addonTotal)} for your first ${quote.serviceShort} with $50 off. ` +
        `Tap to approve and save a card (nothing is charged until after your clean): ${jobber.clientHubUri}`
      : `Thanks, ${first}. We got your request for ${day} (${time.toLowerCase()}) for your ${quote.serviceShort}. ` +
        `We'll text you a secure Jobber link shortly to confirm and save a card. Nothing is charged until after your clean.`;
    tasks.push(
      fetch("https://api.openphone.com/v1/messages", {
        method: "POST",
        headers: { Authorization: quoKey, "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg, from: Netlify.env.get("QUO_FROM_NUMBER") || "+15615565899", to: [phone] }),
      }).catch(() => {}),
    );
  }

  await Promise.all(tasks);
  return Response.json({ ok: true, total: quote.firstWithOffer + addonTotal, approveUrl: jobber?.clientHubUri || null });
};

export const config: Config = {
  path: "/api/lock-in",
};
