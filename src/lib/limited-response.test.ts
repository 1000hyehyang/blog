import { describe, expect, it } from "vitest";

import { readLimitedResponseText } from "./limited-response";

function createChunkedResponse(chunks: string[]) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/html" } },
  );
}

describe("limited response text", () => {
  it("keeps metadata streamed after the closing head tag", async () => {
    const response = createChunkedResponse([
      "<html><head></head><body>",
      '<meta property="og:title" content="Streamed title">',
      "</body></html>",
    ]);

    await expect(readLimitedResponseText(response, 1_024)).resolves.toContain(
      'property="og:title"',
    );
  });

  it("rejects a response that exceeds the byte limit", async () => {
    const response = createChunkedResponse(["1234", "5678"]);

    await expect(readLimitedResponseText(response, 7)).rejects.toThrow(
      "Response was too large",
    );
  });

  it("can keep the first bytes of a large page for preview metadata", async () => {
    const response = new Response(
      '<meta property="og:image" content="/cover.png">' + "x".repeat(2_000),
      { headers: { "content-length": "2049" } },
    );

    await expect(
      readLimitedResponseText(response, 100, true),
    ).resolves.toContain('content="/cover.png"');
  });
});
