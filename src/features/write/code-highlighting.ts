import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { tokenizeMarkdownCode } from "@/lib/markdown-code";

const key = new PluginKey<DecorationSet>("codeHighlighting");

export const CodeHighlighting = Extension.create({
  name: "codeHighlighting",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, decorations) {
            return tr.getMeta(key) ?? decorations.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations: (state) => key.getState(state),
        },
        view: (view) => {
          let lastDoc = view.state.doc;
          let generation = 0;
          let destroyed = false;
          let timer: ReturnType<typeof setTimeout> | undefined;
          // ProseMirror nodes are immutable; unchanged blocks retain their tokens.
          const tokens = new WeakMap<
            ProseMirrorNode,
            ReturnType<typeof tokenizeMarkdownCode>
          >();

          async function refresh() {
            const doc = view.state.doc;
            const current = ++generation;
            const blocks: {
              node: ProseMirrorNode;
              code: string;
              language: string;
              from: number;
            }[] = [];
            doc.descendants((node, pos) => {
              if (node.type.name !== "codeBlock" || !node.attrs.language)
                return;
              const code = node.textContent;
              if (code.length > 20_000) return;
              blocks.push({
                node,
                code,
                language: node.attrs.language,
                from: pos + 1,
              });
            });
            if (!blocks.length && !key.getState(view.state)?.find().length)
              return;

            const spans: Decoration[] = [];
            if (blocks.length) {
              try {
                const { tokenizeMarkdownCode } =
                  await import("@/lib/markdown-code");
                for (const block of blocks) {
                  if (destroyed || current !== generation) return;
                  let pending = tokens.get(block.node);
                  if (!pending) {
                    pending = tokenizeMarkdownCode(
                      block.code,
                      block.language,
                    ).catch((error) => {
                      tokens.delete(block.node);
                      throw error;
                    });
                    tokens.set(block.node, pending);
                  }
                  const lines = await pending;
                  if (destroyed || current !== generation) return;
                  for (const line of lines) {
                    for (const token of line) {
                      if (!token.content || !token.variants.light.color)
                        continue;
                      spans.push(
                        Decoration.inline(
                          block.from + token.offset,
                          block.from + token.offset + token.content.length,
                          {
                            class: "writer-code-token",
                            style: `--shiki-light:${token.variants.light.color};--shiki-dark:${token.variants.dark.color}`,
                          },
                        ),
                      );
                    }
                  }
                }
              } catch {
                spans.length = 0;
              }
            }
            if (destroyed || current !== generation || doc !== view.state.doc)
              return;
            view.dispatch(
              view.state.tr.setMeta(key, DecorationSet.create(doc, spans)),
            );
          }

          void refresh();
          return {
            update(view) {
              if (lastDoc === view.state.doc) return;
              lastDoc = view.state.doc;
              generation++;
              clearTimeout(timer);
              timer = setTimeout(() => void refresh(), 150);
            },
            destroy() {
              destroyed = true;
              generation++;
              clearTimeout(timer);
            },
          };
        },
      }),
    ];
  },
});
