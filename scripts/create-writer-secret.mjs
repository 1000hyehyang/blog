import { randomBytes } from "node:crypto";

console.log(`WRITE_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
