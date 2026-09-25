export async function readLimitedResponseText(
  response: Response,
  maximumBytes: number,
  truncate = false,
): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (!truncate && contentLength > maximumBytes) {
    await response.body?.cancel();
    throw new Error("Response was too large");
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const remaining = maximumBytes - byteLength;
      if (value.byteLength > remaining && !truncate)
        throw new Error("Response was too large");
      text += decoder.decode(value.subarray(0, remaining), { stream: true });
      byteLength += value.byteLength;
      if (value.byteLength > remaining) break;
    }

    return text + decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
