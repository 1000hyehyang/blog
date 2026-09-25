import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

type TableTarget = { position: number; row: number; column: number };

export function runTableAction(
  editor: Editor,
  target: TableTarget,
  action: string,
  rowIndex = target.row,
  columnIndex = target.column,
) {
  const table = editor.state.doc.nodeAt(target.position);
  if (!table || table.type.name !== "table") return;
  if (action === "paragraphBefore" || action === "paragraphAfter") {
    editor.commands.insertContentAt(
      target.position + (action === "paragraphAfter" ? table.nodeSize : 0),
      { type: "paragraph" },
    );
    return;
  }

  let position = target.position + 1;
  for (let i = 0; i < rowIndex; i++) position += table.child(i).nodeSize;
  const row = table.child(rowIndex);
  position++;
  for (let i = 0; i < columnIndex; i++) position += row.child(i).nodeSize;
  editor.commands.setTextSelection(position + 2);

  if (action === "duplicateRow" || action === "duplicateColumn") {
    const transaction = editor.state.tr;
    if (action === "duplicateRow") {
      let rowEnd = target.position + 1;
      for (let i = 0; i <= target.row; i++) rowEnd += table.child(i).nodeSize;
      transaction.insert(rowEnd, table.child(target.row));
    } else {
      const inserts: { position: number; cell: ProseMirrorNode }[] = [];
      let rowStart = target.position + 1;
      table.forEach((currentRow) => {
        let cellEnd = rowStart + 1;
        for (let i = 0; i <= target.column; i++)
          cellEnd += currentRow.child(i).nodeSize;
        inserts.push({
          position: cellEnd,
          cell: currentRow.child(target.column),
        });
        rowStart += currentRow.nodeSize;
      });
      for (const insert of inserts.reverse())
        transaction.insert(insert.position, insert.cell);
    }
    editor.view.dispatch(transaction);
    editor.commands.focus();
    return;
  }

  const command = {
    addRowBefore: () => editor.chain().focus().addRowBefore().run(),
    addRowAfter: () => editor.chain().focus().addRowAfter().run(),
    deleteRow: () => editor.chain().focus().deleteRow().run(),
    addColumnBefore: () => editor.chain().focus().addColumnBefore().run(),
    addColumnAfter: () => editor.chain().focus().addColumnAfter().run(),
    deleteColumn: () => editor.chain().focus().deleteColumn().run(),
    deleteTable: () => editor.chain().focus().deleteTable().run(),
  }[action];
  command?.();
}
