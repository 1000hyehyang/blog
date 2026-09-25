import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

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

          async function refresh() {
            const doc = view.state.doc;
            const current = ++generation;
            const blocks: { code: string; language: string; from: number }[] =
              [];
            doc.descendants((node, pos) => {
              if (node.type.name !== "codeBlock" || !node.attrs.language)
                return;
              const code = node.textContent;
              // ponytail: Skip very large blocks; tokenize them if editor performance needs it.
              if (code.length > 20_000) return;
              blocks.push({
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
                  const lines = await tokenizeMarkdownCode(
                    block.code,
                    block.language,
                  );
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
                // A missing grammar leaves editable, uncolored code.
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
              void refresh();
            },
            destroy() {
              destroyed = true;
              generation++;
            },
          };
        },
      }),
    ];
  },
});
