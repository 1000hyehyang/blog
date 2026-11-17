import { createHash } from "node:crypto";
import { MockAgent, setGlobalDispatcher } from "undici";

if (process.env.BLOG_E2E !== "1")
  throw new Error("OAuth mock is only for E2E tests");

const agent = new MockAgent();
agent.enableNetConnect(
  (host) => !["github.com", "api.github.com"].includes(host),
);
setGlobalDispatcher(agent);
const usedCodes = new Set();
agent
  .get("https://github.com")
  .intercept({ path: "/login/oauth/access_token", method: "POST" })
  .reply((request) => {
    const form = new URLSearchParams(request.body.toString());
    const code = form.get("code");
    let identity;
    try {
      identity = JSON.parse(Buffer.from(code, "base64url").toString("utf8"));
    } catch {
      return { statusCode: 200, data: { error: "bad_verification_code" } };
    }
    const challenge = createHash("sha256")
      .update(form.get("code_verifier") || "")
      .digest("base64url");
    if (
      usedCodes.has(code) ||
      identity.challenge !== challenge ||
      form.get("client_id") !== process.env.WRITE_GITHUB_CLIENT_ID ||
      form.get("client_secret") !== process.env.WRITE_GITHUB_CLIENT_SECRET ||
      form.get("redirect_uri") !==
        "http://127.0.0.1:3100/api/write/session/callback"
    ) {
      return { statusCode: 200, data: { error: "bad_verification_code" } };
    }
    usedCodes.add(code);
    return {
      statusCode: 200,
      data: {
        access_token: `e2e_${identity.id}`,
        token_type: "bearer",
        scope: "",
      },
    };
  })
  .persist();
agent
  .get("https://api.github.com")
  .intercept({ path: "/user", method: "GET" })
  .reply((request) => {
    const headers = new Headers(request.headers);
    const id = Number(headers.get("authorization")?.replace("Bearer e2e_", ""));
    return { statusCode: 200, data: { id, login: "mock-user" } };
  })
  .persist();
