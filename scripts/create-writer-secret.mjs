import { randomBytes, scryptSync } from "node:crypto";

let password;
if (process.argv.includes("--password-stdin")) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  password = Buffer.concat(chunks).toString("utf8").trimEnd();
  if (!/^\d{6}[^a-zA-Z0-9\s]$/.test(password))
    throw new Error("숫자 6자리와 특수문자 1자리를 입력하세요.");
} else {
  password =
    `${randomBytes(4).readUInt32BE() % 1_000_000}`.padStart(6, "0") + "!";
}
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64, {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
});
if (!process.argv.includes("--password-stdin"))
  console.log("관리자 비밀번호 (비밀번호 관리자에 보관):", password);
console.log(
  `WRITE_PASSWORD_HASH=scrypt:${salt.toString("hex")}:${hash.toString("hex")}`,
);
console.log(`WRITE_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
