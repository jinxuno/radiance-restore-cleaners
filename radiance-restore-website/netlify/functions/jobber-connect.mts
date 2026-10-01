import type { Config } from "@netlify/functions";
import { REDIRECT_URI } from "../lib/jobber.mts";

// Step 1 of connecting Jobber: send the owner to Jobber's "Allow access" screen.
export default async () => {
  const id = Netlify.env.get("JOBBER_CLIENT_ID");
  if (!id) return new Response("JOBBER_CLIENT_ID is not set in Netlify yet.", { status: 500 });
  const state = crypto.randomUUID();
  const url =
    "https://api.getjobber.com/api/oauth/authorize?" +
    new URLSearchParams({ response_type: "code", client_id: id, redirect_uri: REDIRECT_URI(), state }).toString();
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Set-Cookie": `jobber_state=${state}; Path=/api/jobber; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
};

export const config: Config = { path: "/api/jobber/connect" };
