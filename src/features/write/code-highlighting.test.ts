import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { CodeHighlighting } from "./code-highlighting";
import { tokenizeMarkdownCode } from "@/lib/markdown-code";

vi.mock("@/lib/markdown-code", () => ({
  tokenizeMarkdownCode: vi.fn(async () => []),
}));
afterEach(() => vi.clearAllMocks());

it("reuses unchanged blocks and batches rapid edits to a changed block", async () => {
  const editor = new Editor({
    extensions: [StarterKit, CodeHighlighting],
    content:
      '<p>Text</p><pre><code class="language-js">first</code></pre><pre><code class="language-js">second</code></pre>',
  });
  try {
    await waitFor(() => expect(tokenizeMarkdownCode).toHaveBeenCalledTimes(2));
    editor.commands.insertContentAt(2, "new");
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(tokenizeMarkdownCode).toHaveBeenCalledTimes(2);
    const codePosition = editor.state.doc.child(0).nodeSize + 1;
    editor.commands.insertContentAt(codePosition, "a");
    editor.commands.insertContentAt(codePosition, "b");
    await waitFor(() => expect(tokenizeMarkdownCode).toHaveBeenCalledTimes(3));
    expect(vi.mocked(tokenizeMarkdownCode).mock.calls.at(-1)).toEqual([
      "bafirst",
      "js",
    ]);
  } finally {
    editor.destroy();
  }
});
