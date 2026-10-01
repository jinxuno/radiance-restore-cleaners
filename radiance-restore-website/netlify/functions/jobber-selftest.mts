import type { Config } from "@netlify/functions";
import { gql, readTokens } from "../lib/jobber.mts";

// Read-only check used during setup: is Jobber connected, and what do the API's input
// types look like on this API version. Returns schema names only, no customer data.
const TYPES = ["ClientCreateInput", "PropertyCreateInput", "PropertyAttributes", "QuoteCreateAttributes", "QuoteCreateLineItemAttributes", "Quote", "PhoneNumberCreateAttributes", "AddressAttributes"];

export default async () => {
  const t = await readTokens();
  if (!t) return Response.json({ connected: false });
  const out: Record<string, unknown> = { connected: true, account: t.account_name };
  try {
    const m = await gql(`query { __type(name: "Mutation") { fields { name args { name type { name kind ofType { name kind ofType { name } } } } } } }`);
    out.mutations = m.__type.fields.filter((f: any) => /quote|client|property/i.test(f.name)).map((f: any) => ({ name: f.name, args: f.args.map((a: any) => `${a.name}:${a.type.name || a.type.ofType?.name || a.type.ofType?.ofType?.name}`) }));
    const q = await gql(`query { __type(name: "Query") { fields { name args { name type { name kind ofType { name } } } } } }`);
    out.clientsQuery = q.__type.fields.filter((f: any) => /^clients?$/.test(f.name)).map((f: any) => ({ name: f.name, args: f.args.map((a: any) => a.name) }));
    for (const name of TYPES) {
      const r = await gql(`query($n:String!){ __type(name:$n){ kind inputFields { name type { name kind ofType { name kind ofType { name } } } } fields { name } } }`, { n: name });
      const ty = r.__type;
      out[name] = !ty ? null : (ty.inputFields || ty.fields || []).map((f: any) => f.type ? `${f.name}:${f.type.name || f.type.ofType?.name || f.type.ofType?.ofType?.name}${f.type.kind === "NON_NULL" ? "!" : ""}` : f.name);
    }
  } catch (e) {
    out.error = String(e).slice(0, 500);
  }
  return Response.json(out);
};

export const config: Config = { path: "/api/jobber/selftest" };
