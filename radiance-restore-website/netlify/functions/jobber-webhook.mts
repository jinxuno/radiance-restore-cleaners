import type { Config, Context } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { gql, jobberStore } from "../lib/jobber.mts";

// Jobber webhooks (set in the Jobber Developer Center app): quote approved, invoice/payment events.
// Verifies the X-Jobber-Hmac-SHA256 signature, then posts a short Slack alert.
function slackUrl(): string | undefined {
  const m = (Netlify.env.get("SLACK_WEBHOOK_URL") || "").match(/https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/);
  return m ? m[0] : undefined;
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return new Response(null, { status: 204 });
  const raw = await req.text();
  const secret = Netlify.env.get("JOBBER_CLIENT_SECRET") || "";
  const sig = req.headers.get("x-jobber-hmac-sha256") || "";
  const want = createHmac("sha256", secret).update(raw).digest("base64");
  const ok = secret && sig.length === want.length && timingSafeEqual(Buffer.from(sig), Buffer.from(want));
  if (!ok) return new Response("bad signature", { status: 401 });

  const ev = JSON.parse(raw)?.data?.webHookEvent || {};
  const topic = String(ev.topic || "");
  const itemId = String(ev.itemId || "");

  context.waitUntil(
    (async () => {
      const store = jobberStore();
      const key = `seen/${topic}/${itemId}`;
      if (await store.get(key)) return; // Jobber can deliver the same event more than once
      await store.set(key, "1");

      let line = `:bell: Jobber: ${topic.replace(/_/g, " ").toLowerCase()}`;
      try {
        if (topic.startsWith("QUOTE")) {
          const d = await gql(`query($id: EncodedId!) { quote(id: $id) { title quoteNumber quoteStatus client { name } amounts { total } jobberWebUri } }`, { id: itemId });
          const q = d.quote;
          const approved = /APPROVED/.test(topic);
          line = `${approved ? ":white_check_mark: *Quote approved!*" : `:bell: Quote ${topic.replace("QUOTE_", "").toLowerCase()}`} ${q.client?.name || ""} · #${q.quoteNumber} ${q.title}` +
            (q.amounts?.total != null ? ` · $${q.amounts.total}` : "") +
            (approved ? `\nCard is on file. Convert it to a job and schedule it: ${q.jobberWebUri}` : `\n${q.jobberWebUri}`);
        } else if (/INVOICE|PAYMENT/.test(topic)) {
          line = `:moneybag: Jobber ${topic.replace(/_/g, " ").toLowerCase()} (item ${itemId}). Check Jobber > Payments.`;
        }
      } catch (e) {
        console.error("webhook lookup failed", e);
      }
      const slack = slackUrl();
      if (slack) await fetch(slack, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: line }) }).catch(() => {});
    })(),
  );
  return new Response(null, { status: 200 });
};

export const config: Config = { path: "/api/jobber/webhook" };
