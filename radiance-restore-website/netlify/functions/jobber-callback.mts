import type { Config } from "@netlify/functions";
import { REDIRECT_URI, gql, readTokens, saveTokens, tokenRequest } from "../lib/jobber.mts";

// Step 2: Jobber sends the owner back here with a one-time code. We swap it for tokens
// and keep them in Netlify Blobs. Once connected, only the same Jobber account can reconnect.
const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
      `<body style="font-family:system-ui,sans-serif;background:#fff0f3;color:#590d22;display:grid;place-items:center;min-height:100vh;margin:0">` +
      `<div style="background:#fff;padding:28px;border-radius:18px;max-width:420px;text-align:center;box-shadow:0 10px 30px rgba(164,19,60,.12)">` +
      `<h1 style="font-size:24px;margin:0 0 8px">${title}</h1><p style="margin:0">${body}</p></div>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Set-Cookie": "jobber_state=; Path=/api/jobber; Max-Age=0" } },
  );

export default async (req: Request) => {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const cookie = (req.headers.get("cookie") || "").match(/(?:^|;\s*)jobber_state=([^;]+)/)?.[1];
  if (u.searchParams.get("error")) return page("Not connected", "Jobber access was not allowed. You can try again any time.", 400);
  if (!code || !state || state !== cookie) return page("Link expired", "Please start again from radiancerestore.org/api/jobber/connect.", 400);

  try {
    const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI() });
    const data = await gql<{ account: { id: string; name: string } }>("query { account { id name } }", {}, t.access_token);
    const prev = await readTokens();
    if (prev?.account_id && prev.account_id !== data.account.id) {
      return page("Different account", "This site is already connected to another Jobber account, so nothing was changed.", 403);
    }
    await saveTokens(t, prev, { account_id: data.account.id, account_name: data.account.name });
    return page("Jobber connected", `Your website is now connected to <b>${data.account.name}</b>. You can close this tab.`);
  } catch (e) {
    console.error("Jobber connect failed", e);
    return page("Something went wrong", "Jobber didn't finish connecting. Please try again in a minute.", 500);
  }
};

export const config: Config = { path: "/api/jobber/callback" };
