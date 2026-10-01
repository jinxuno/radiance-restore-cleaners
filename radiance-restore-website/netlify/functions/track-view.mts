import type { Context, Config } from "@netlify/functions";

// Accept either the bare webhook link or a pasted sample curl command that contains it.
function slackUrl(): string | undefined {
  const raw = Netlify.env.get("SLACK_WEBHOOK_URL") || "";
  const m = raw.match(/https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/);
  return m ? m[0] : undefined;
}

// Posts one Slack message per page view of /50-off and /quote, with UTM source and city.
// Needs SLACK_WEBHOOK_URL. Without it, views are only written to the function log.

const BOT = /bot|crawl|spider|preview|facebookexternalhit|slurp|lighthouse|headless/i;

function clip(v: unknown, n = 120): string {
  return String(v ?? "").trim().slice(0, n);
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return new Response(null, { status: 204 });
  if (BOT.test(req.headers.get("user-agent") || "")) return new Response(null, { status: 204 });

  let b: Record<string, unknown> = {};
  try {
    b = await req.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const page = clip(b.page, 40) || "unknown page";
  let refHost = "";
  try {
    refHost = clip(b.referrer, 300) ? new URL(clip(b.referrer, 300)).hostname : "";
  } catch {
    refHost = "";
  }
  const source = clip(b.utm_source, 80) || refHost || "direct";
  const where = [context.geo?.city, context.geo?.subdivision?.code].filter(Boolean).join(", ") || "unknown location";

  // Every real customer is in Florida. Views from anywhere else are Meta's ad review
  // systems and cloud data centers (Prineville OR, Altoona IA, Gallatin TN, Clonee IE,
  // Lulea SE...), so log them but don't ping Slack.
  if (context.geo?.subdivision?.code && (context.geo?.country?.code !== "US" || context.geo.subdivision.code !== "FL")) {
    console.log(`Skipped non Florida view (${where}) from ${clip(b.utm_source, 80) || "direct"}`);
    return new Response(null, { status: 204 });
  }
  const device = /mobile|iphone|android/i.test(req.headers.get("user-agent") || "") ? "phone" : "computer";

  const line =
    `:eyes: Someone opened *${page}* on a ${device} · ${where}\n` +
    `Source: ${source} / ${clip(b.utm_medium, 80) || "none"} · Campaign: ${clip(b.utm_campaign, 120) || "none"} · Ad: ${clip(b.utm_content, 120) || "none"}` +
    (clip(b.detail, 160) ? `\n${clip(b.detail, 160)}` : "");

  console.log(line.replace(/\n/g, " | "));

  const slack = slackUrl();
  if (slack) {
    await fetch(slack, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: line }),
    }).catch((e) => console.error("Slack error", e));
  }
  return new Response(null, { status: 204 });
};

export const config: Config = {
  path: "/api/track-view",
};
