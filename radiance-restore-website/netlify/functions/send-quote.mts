import type { Context, Config } from "@netlify/functions";

// Accept either the bare webhook link or a pasted sample curl command that contains it.
function slackUrl(): string | undefined {
  const raw = Netlify.env.get("SLACK_WEBHOOK_URL") || "";
  const m = raw.match(/https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/);
  return m ? m[0] : undefined;
}
import { buildQuote, bedLabel, bathLabel, money } from "../../offer/pricing.js";

// Env vars (set in Netlify > Project configuration > Environment variables):
//   QUO_API_KEY        Quo (OpenPhone) API key, same one the follow up desk uses
//   QUO_FROM_NUMBER    defaults to +15615565899
//   SLACK_WEBHOOK_URL  Slack incoming webhook for lead alerts
//   ZAPIER_WEBHOOK_URL defaults to the live calculator's Jobber Zap
//   SITE_URL           defaults to https://www.radiancerestore.org

const DEFAULT_ZAP = "https://hooks.zapier.com/hooks/catch/28213073/44yt0ti/";

function cleanPhone(raw: string): string | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return null;
}

function clip(v: unknown, n = 120): string {
  return String(v ?? "").trim().slice(0, n);
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Bad request" }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields, people don't.
  if (clip(body.company)) return Response.json({ ok: true, quoteUrl: "/quote" });

  const name = clip(body.name, 60);
  const firstName = name.split(/\s+/)[0] || "there";
  const phone = cleanPhone(clip(body.phone, 30));
  const address = clip(body.address, 200);
  const quote = buildQuote({
    service: clip(body.service, 20),
    beds: body.beds,
    baths: body.baths,
    freq: clip(body.freq, 20),
  });

  if (!quote) return Response.json({ ok: false, error: "Please pick a cleaning type and how often." }, { status: 400 });
  if (!name) return Response.json({ ok: false, error: "Please add your first name." }, { status: 400 });
  if (!phone) return Response.json({ ok: false, error: "Please enter a 10 digit mobile number." }, { status: 400 });

  const utm = {
    source: clip(body.utm_source, 80),
    medium: clip(body.utm_medium, 80),
    campaign: clip(body.utm_campaign, 120),
    content: clip(body.utm_content, 120),
    term: clip(body.utm_term, 80),
  };

  const site = Netlify.env.get("SITE_URL") || "https://www.radiancerestore.org";
  const params = new URLSearchParams({
    s: quote.service,
    b: String(quote.beds),
    ba: String(quote.baths),
    f: quote.freq,
    n: firstName,
  });
  if (utm.source) params.set("utm_source", utm.source);
  if (utm.campaign) params.set("utm_campaign", utm.campaign);
  if (utm.content) params.set("utm_content", utm.content);
  const quoteUrl = `${site}/quote?${params.toString()}`;

  const homeLine = `${bedLabel(quote.beds)}, ${bathLabel(quote.baths)}`;
  const recurringLine = quote.recurringPerVisit
    ? `\nThen ${money(quote.recurringPerVisit)} per visit, ${quote.freqLabel.toLowerCase()}.`
    : "";
  const sms =
    `Hi ${firstName}, this is Radiance Restore Cleaners. Your exact price for a ${quote.serviceShort} (${homeLine}):\n` +
    `${money(quote.firstFull)} minus your $50 off = ${money(quote.firstWithOffer)} for your first clean.` +
    recurringLine +
    `\nSee everything included and lock in your spot: ${quoteUrl}` +
    `\nYou only pay after the clean. Reply here with any questions!`;

  const tasks: Promise<unknown>[] = [];
  let smsSent = false;

  // 1) Text the price through Quo.
  const quoKey = Netlify.env.get("QUO_API_KEY");
  if (quoKey) {
    tasks.push(
      fetch("https://api.openphone.com/v1/messages", {
        method: "POST",
        headers: { Authorization: quoKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          content: sms,
          from: Netlify.env.get("QUO_FROM_NUMBER") || "+15615565899",
          to: [phone],
        }),
      })
        .then(async (r) => {
          smsSent = r.ok;
          if (!r.ok) console.error("Quo send failed", r.status, await r.text());
        })
        .catch((e) => console.error("Quo send error", e)),
    );
  } else {
    console.warn("QUO_API_KEY not set, skipping text");
  }

  // 2) Hand the lead to the existing Jobber Zap (same payload shape as the homepage calculator).
  const zapUrl = Netlify.env.get("ZAPIER_WEBHOOK_URL") || DEFAULT_ZAP;
  if (zapUrl !== "off") tasks.push(
    fetch(zapUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        email: clip(body.email, 120),
        address,
        service: quote.serviceLabel === "Move In / Move Out" ? "Move In/Out" : quote.serviceLabel,
        sqft: String(quote.sqft),
        frequency: quote.zapierFrequency,
        calculatedPrice: String(quote.firstWithOffer),
        bedrooms: bedLabel(quote.beds),
        bathrooms: bathLabel(quote.baths),
        offer: "$50 off first clean",
        recurringPerVisit: quote.recurringPerVisit ? String(quote.recurringPerVisit) : "",
        quoteUrl,
        leadSource: "50-off landing page",
        ...Object.fromEntries(Object.entries(utm).map(([k, v]) => [`utm_${k}`, v])),
      }),
    }).catch((e) => console.error("Zapier error", e)),
  );

  await Promise.all(tasks);

  // 3) Slack alert (after the text so it can report whether it went out).
  const slack = slackUrl();
  if (slack) {
    const where = [context.geo?.city, context.geo?.subdivision?.code].filter(Boolean).join(", ");
    const text =
      `:tada: *New $50 off lead* ${name} ${phone}\n` +
      `${quote.serviceLabel} · ${homeLine} · ${quote.freqLabel}\n` +
      `First clean ${money(quote.firstWithOffer)} (was ${money(quote.firstFull)})` +
      (quote.recurringPerVisit ? ` · then ${money(quote.recurringPerVisit)}/visit` : "") +
      `\nAddress: ${address || "not given"}\n` +
      `Source: ${utm.source || "direct"} / ${utm.medium || "none"} · Campaign: ${utm.campaign || "none"} · Ad: ${utm.content || "none"}` +
      (where ? ` · ${where}` : "") +
      `\nText sent: ${smsSent ? "yes" : "NO, follow up manually"}`;
    await fetch(slack, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch((e) => console.error("Slack error", e));
  }

  return Response.json({ ok: true, smsSent, quoteUrl, quote });
};

export const config: Config = {
  path: "/api/send-quote",
};
