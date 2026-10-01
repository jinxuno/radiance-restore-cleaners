// Jobber API helper for Netlify Functions.
// Env (Netlify > Environment variables, mark as secret):
//   JOBBER_CLIENT_ID, JOBBER_CLIENT_SECRET   from the Jobber Developer Center app
//   JOBBER_API_VERSION                       optional, defaults below
// Tokens are stored in Netlify Blobs (store "jobber") by /api/jobber/callback.
// Jobber rotates refresh tokens, so every refresh overwrites the stored pair.
import { getStore } from "@netlify/blobs";

const API = "https://api.getjobber.com/api";
export const SITE = () => Netlify.env.get("SITE_URL") || "https://www.radiancerestore.org";
export const REDIRECT_URI = () => `${SITE()}/api/jobber/callback`;
const VERSION = () => Netlify.env.get("JOBBER_API_VERSION") || "2025-04-16";

type Tokens = { access_token: string; refresh_token: string; expires_at: number; account_id?: string; account_name?: string };

export function jobberStore() {
  return getStore({ name: "jobber", consistency: "strong" });
}

function jwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export async function tokenRequest(params: Record<string, string>) {
  const id = Netlify.env.get("JOBBER_CLIENT_ID");
  const secret = Netlify.env.get("JOBBER_CLIENT_SECRET");
  if (!id || !secret) throw new Error("JOBBER_CLIENT_ID / JOBBER_CLIENT_SECRET not set");
  const r = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, ...params }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Jobber token error ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j as { access_token: string; refresh_token?: string; expires_in?: number };
}

export async function readTokens(): Promise<Tokens | null> {
  return (await jobberStore().get("tokens", { type: "json" })) as Tokens | null;
}

export async function saveTokens(t: { access_token: string; refresh_token?: string; expires_in?: number }, prev?: Tokens | null, extra: Partial<Tokens> = {}) {
  const exp = jwtExpiry(t.access_token) ?? Date.now() + (t.expires_in || 3600) * 1000;
  const next: Tokens = {
    ...(prev || {}),
    ...extra,
    access_token: t.access_token,
    refresh_token: t.refresh_token || prev?.refresh_token || "",
    expires_at: exp - 2 * 60 * 1000,
  };
  await jobberStore().setJSON("tokens", next);
  return next;
}

async function accessToken(): Promise<string> {
  const t = await readTokens();
  if (!t) throw new Error("Jobber is not connected yet");
  if (t.expires_at > Date.now()) return t.access_token;
  try {
    const j = await tokenRequest({ grant_type: "refresh_token", refresh_token: t.refresh_token });
    return (await saveTokens(j, t)).access_token;
  } catch (e) {
    // Another function instance may have rotated the token a moment ago.
    const again = await readTokens();
    if (again && again.refresh_token !== t.refresh_token && again.expires_at > Date.now()) return again.access_token;
    throw e;
  }
}

export async function gql<T = any>(query: string, variables: Record<string, unknown> = {}, token?: string): Promise<T> {
  const r = await fetch(`${API}/graphql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token || (await accessToken())}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": VERSION(),
    },
    body: JSON.stringify({ query, variables }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) throw new Error(`Jobber API ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 400)}`);
  return j.data as T;
}

export function userErrors(obj: any): string {
  const errs = obj?.userErrors || [];
  return errs.length ? errs.map((e: any) => e.message).join("; ") : "";
}

// Best-effort split of "123 Main St, Wellington, FL 33414" into Jobber address parts.
export function parseAddress(raw: string) {
  const s = String(raw || "").trim();
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  const zip = (s.match(/\b(\d{5})(?:-\d{4})?\b(?!.*\b\d{5}\b)/) || [])[1] || "";
  let street1 = parts[0] || s;
  let city = "";
  if (parts.length >= 3) city = parts[1];
  else if (parts.length === 2) city = parts[1].replace(/\b(FL|Florida)\b.*$/i, "").replace(/\d{5}.*/, "").trim();
  return { street1, city, province: "FL", postalCode: zip, country: "US" };
}
