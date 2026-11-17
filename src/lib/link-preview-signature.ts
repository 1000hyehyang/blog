import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getLinkPreviewImagePath, parseExternalHttpUrl } from "./link-preview";

function imageSignature(url: string) {
  const secret = process.env.WRITE_SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return createHmac("sha256", secret)
    .update(`blog:link-preview-image:v1\0${url}`)
    .digest("base64url");
}

export function previewImageSource(value?: string) {
  if (!value) return undefined;
  const url = parseExternalHttpUrl(value)?.href;
  if (!url) return undefined;
  const signature = imageSignature(url);
  return signature ? getLinkPreviewImagePath(url, signature) : url;
}

export function verifyPreviewImage(value: string, signature: string) {
  if (value.length > 8192 || !/^[A-Za-z0-9_-]{43}$/.test(signature))
    return false;
  const url = parseExternalHttpUrl(value);
  if (!url || url.href !== value) return false;
  const expected = imageSignature(value);
  return (
    expected !== null &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}
