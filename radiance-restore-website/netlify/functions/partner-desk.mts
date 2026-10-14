import type { Context, Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

// Backend for the VA's Partner Call Desk at /partner-desk.
// Open for now. To lock it later, set PARTNER_DESK_CODE in the Netlify UI: every request then
// has to carry that code in the x-desk-code header, and the page asks for it once.
// Each lead is one blob ("lead/<id>") so two people logging different leads never overwrite
// each other. The lead list is loaded once from the page ("Load a lead list file"), so no
// lead data ever lives in this repo.

const LEAD_FIELDS = [
  "id", "company", "type", "city", "area", "phone", "email", "contact", "note", "confirm",
  "website", "address", "priority", "step", "status", "nextDue", "start", "notes", "history",
];
const PATCH_FIELDS = ["step", "status", "nextDue", "notes", "history", "email", "phone", "contact"];
const TYPES = ["vr", "pm", "hoa", "cw", "ob"];
const STATUSES = ["new", "active", "talked", "won", "lost", "dnc", "bad", "rested"];

function store() {
  return getStore({ name: "partner-desk", consistency: "strong" });
}

function codeOk(given: string): boolean {
  const want = Netlify.env.get("PARTNER_DESK_CODE") || "";
  if (!want) return true;
  if (!given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(want).digest();
  return timingSafeEqual(a, b);
}

function clip(v: unknown, n = 300): string {
  return String(v ?? "").slice(0, n);
}

function cleanHistory(h: unknown) {
  if (!Array.isArray(h)) return [];
  return h.slice(-40).map((x: any) => {
    const o: Record<string, unknown> = { d: clip(x?.d, 10), s: Number(x?.s) || 1, r: clip(x?.r, 120) };
    if (x?.n) o.n = clip(x.n, 600);
    return o;
  });
}

function cleanLead(raw: any): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const id = clip(raw.id, 80).toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!id || !clip(raw.company, 200).trim()) return null;
  const out: Record<string, unknown> = {};
  for (const k of LEAD_FIELDS) {
    if (k === "history") out.history = cleanHistory(raw.history);
    else if (k === "priority" || k === "step") out[k] = Math.max(1, Math.min(7, Number(raw[k]) || 1));
    else out[k] = clip(raw[k], k === "notes" ? 6000 : k === "note" || k === "confirm" ? 1000 : 300);
  }
  out.id = id;
  if (!TYPES.includes(String(out.type))) out.type = "pm";
  if (!STATUSES.includes(String(out.status))) out.status = "new";
  out.updatedAt = new Date().toISOString();
  return out;
}

function cleanPatch(raw: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const k of PATCH_FIELDS) {
    if (!(k in raw)) continue;
    if (k === "history") out.history = cleanHistory(raw.history);
    else if (k === "step") out.step = Math.max(1, Math.min(7, Number(raw.step) || 1));
    else if (k === "status") { if (STATUSES.includes(String(raw.status))) out.status = raw.status; }
    else out[k] = clip(raw[k], k === "notes" ? 6000 : 300);
  }
  return out;
}

async function allLeads() {
  const s = store();
  const { blobs } = await s.list({ prefix: "lead/" });
  const rows = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
  return rows.filter(Boolean);
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  if (!codeOk(req.headers.get("x-desk-code") || "")) {
    await new Promise((r) => setTimeout(r, 700));
    return json({ ok: false, error: "bad_code" }, 401);
  }

  let b: any;
  try {
    b = await req.json();
  } catch {
    return json({ ok: false, error: "Bad request" }, 400);
  }
  const s = store();

  try {
    switch (b.action) {
      case "list":
        return json({ ok: true, leads: await allLeads() });

      case "update": {
        const id = clip(b.id, 80);
        const cur: any = await s.get("lead/" + id, { type: "json" });
        if (!cur) return json({ ok: false, error: "That lead is gone. Reload the desk." }, 404);
        const next = { ...cur, ...cleanPatch(b.patch), updatedAt: new Date().toISOString() };
        await s.setJSON("lead/" + id, next);
        return json({ ok: true, lead: next });
      }

      case "create": {
        const lead = cleanLead(b.lead);
        if (!lead) return json({ ok: false, error: "A company name is required." }, 400);
        const { modified } = await s.setJSON("lead/" + lead.id, lead, { onlyIfNew: true });
        if (!modified) return json({ ok: false, error: "That lead already exists." }, 409);
        return json({ ok: true, lead });
      }

      case "import": {
        const list = Array.isArray(b.leads) ? b.leads.slice(0, 1000) : [];
        let added = 0, skipped = 0;
        for (const raw of list) {
          const lead = cleanLead(raw);
          if (!lead) { skipped++; continue; }
          const { modified } = await s.setJSON("lead/" + lead.id, lead, { onlyIfNew: true });
          if (modified) added++; else skipped++;
        }
        return json({ ok: true, added, skipped });
      }

      default:
        return json({ ok: false, error: "Unknown action" }, 400);
    }
  } catch (e) {
    console.error("partner-desk error", e);
    return json({ ok: false, error: "The desk couldn't save that. Try again." }, 500);
  }
};

export const config: Config = {
  path: "/api/partner-desk",
};
