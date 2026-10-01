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

// ---- $50 offer booking: find/create client + property, then a sent quote with card required ----
type BookingInput = {
  name: string;
  phone: string; // +1XXXXXXXXXX
  address: string;
  source: string;
  title: string;
  message: string;
  lines: { name: string; description?: string; unitPrice: number; quantity?: number }[];
  discount: number;
};

const digits10 = (p: string) => p.replace(/\D/g, "").slice(-10);
const pretty = (p: string) => {
  const d = digits10(p);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

async function findClientByPhone(phone: string) {
  const want = digits10(phone);
  for (const term of [want, pretty(phone)]) {
    const d = await gql(
      `query($t: String!) { clients(searchTerm: $t, first: 10) { nodes { id name phones { normalizedPhoneNumber number }
        clientProperties { nodes { id address { street1 postalCode } } } } } }`,
      { t: term },
    );
    const hit = d.clients.nodes.find((c: any) => (c.phones || []).some((ph: any) => digits10(ph.normalizedPhoneNumber || ph.number || "") === want));
    if (hit) return hit;
  }
  return null;
}

export async function createOfferQuote(b: BookingInput) {
  const addr = parseAddress(b.address);
  const [firstName, ...rest] = b.name.trim().split(/\s+/);
  let client = await findClientByPhone(b.phone);
  let propertyId: string | undefined;

  if (!client) {
    const d = await gql(
      `mutation($input: ClientCreateInput!) { clientCreate(input: $input) {
        client { id name clientProperties { nodes { id } } } userErrors { message path } } }`,
      {
        input: {
          firstName: firstName || "Customer",
          lastName: rest.join(" ") || undefined,
          phones: [{ number: pretty(b.phone), primary: true, description: "MOBILE", smsAllowed: true }],
          properties: [{ address: addr }],
          sourceAttribution: { sourceText: b.source },
        },
      },
    );
    const err = userErrors(d.clientCreate);
    if (err) throw new Error(`clientCreate: ${err}`);
    client = d.clientCreate.client;
    propertyId = client.clientProperties?.nodes?.[0]?.id;
  } else {
    const props = client.clientProperties?.nodes || [];
    const street = addr.street1.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
    const same = props.find((p: any) => street && (p.address?.street1 || "").toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(street));
    propertyId = same?.id;
  }

  if (!propertyId) {
    const d = await gql(
      `mutation($id: EncodedId!, $input: PropertyCreateInput!) { propertyCreate(clientId: $id, input: $input) {
        properties { id } userErrors { message path } } }`,
      { id: client.id, input: { properties: [{ address: addr }] } },
    );
    const err = userErrors(d.propertyCreate);
    if (err) throw new Error(`propertyCreate: ${err}`);
    propertyId = d.propertyCreate.properties?.[0]?.id;
  }
  if (!propertyId) throw new Error("no property id");

  const d = await gql(
    `mutation($a: QuoteCreateAttributes!) { quoteCreate(attributes: $a) {
      quote { id quoteNumber clientHubUri jobberWebUri amounts { total } } userErrors { message path } } }`,
    {
      a: {
        clientId: client.id,
        propertyId,
        title: b.title,
        message: b.message,
        lineItems: b.lines.map((l) => ({
          name: l.name,
          description: l.description,
          quantity: l.quantity ?? 1,
          unitPrice: l.unitPrice,
          saveToProductsAndServices: false,
          category: "SERVICE",
        })),
        discount: { rate: b.discount, type: "Unit" },
        mandatoryPaymentMethodOnFile: true,
        allowClientHubCreditCardPayments: true,
        transitionQuoteTo: "AWAITING_RESPONSE",
      },
    },
  );
  const err = userErrors(d.quoteCreate);
  if (err) throw new Error(`quoteCreate: ${err}`);
  return { client, quote: d.quoteCreate.quote };
}
