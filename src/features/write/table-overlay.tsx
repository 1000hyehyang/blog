import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { runTableAction } from "./table-commands";
import styles from "./writer.module.css";

type Target = {
  position: number;
  row: number;
  column: number;
  table: DOMRect;
  rowRect: DOMRect;
  columnRect: DOMRect;
  hostRect: DOMRect;
};
type Menu = "row" | "column" | "table";

export function TableOverlay({
  editor,
  children,
}: {
  editor: Editor;
  children: ReactNode;
}) {
  const host = useRef<HTMLDivElement>(null);
  const menuElement = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);

  useEffect(() => {
    if (menu) menuElement.current?.querySelector("button")?.focus();
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: PointerEvent) => {
      const node = event.target as Node;
      if (
        menuElement.current?.contains(node) ||
        host.current
          ?.querySelector<HTMLButtonElement>('[aria-expanded="true"]')
          ?.contains(node)
      )
        return;
      setMenu(null);
      setTarget(null);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [menu]);

  useEffect(() => {
    const hide = () => {
      setTarget(null);
      setMenu(null);
    };
    const onSelection = () => {
      if (!menu && !editor.isActive("table")) hide();
    };
    editor.on("selectionUpdate", onSelection);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      editor.off("selectionUpdate", onSelection);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [editor, menu]);

  function findTarget(element: Element) {
    const cell = element.closest("td, th");
    const tableElement = cell?.closest("table");
    const wrapper = tableElement?.closest(".tableWrapper");
    if (!cell || !tableElement || !wrapper || !host.current?.contains(wrapper))
      return null;
    const rowElement = cell.closest("tr")!;
    const rows = Array.from(tableElement.rows);
    const row = rows.indexOf(rowElement);
    const column = Array.from(rowElement.cells).indexOf(
      cell as HTMLTableCellElement,
    );
    const $cell = editor.state.doc.resolve(editor.view.posAtDOM(cell, 0));
    let depth = $cell.depth;
    while (depth && $cell.node(depth).type.name !== "table") depth--;
    if (!depth) return null;
    return {
      position: $cell.before(depth),
      row,
      column,
      table: tableElement.getBoundingClientRect(),
      rowRect: rowElement.getBoundingClientRect(),
      columnRect: (rows[0].cells[column] ?? cell).getBoundingClientRect(),
      hostRect: host.current.getBoundingClientRect(),
    } satisfies Target;
  }

  function run(
    action: string,
    rowIndex = target?.row,
    columnIndex = target?.column,
  ) {
    if (!target) return;
    runTableAction(editor, target, action, rowIndex!, columnIndex!);
    setMenu(null);
    setTarget(null);
  }

  const hostRect = target?.hostRect;
  const x = (value: number) => value - (hostRect?.left ?? 0);
  const y = (value: number) => value - (hostRect?.top ?? 0);
  const menuItems =
    menu === "row"
      ? [
          ["위에 행 추가", "addRowBefore"],
          ["아래에 행 추가", "addRowAfter"],
          ["행 복제", "duplicateRow"],
          ["행 삭제", "deleteRow"],
        ]
      : menu === "column"
        ? [
            ["왼쪽에 열 추가", "addColumnBefore"],
            ["오른쪽에 열 추가", "addColumnAfter"],
            ["열 복제", "duplicateColumn"],
            ["열 삭제", "deleteColumn"],
          ]
        : [
            ["표 위에 문단 추가", "paragraphBefore"],
            ["표 아래에 문단 추가", "paragraphAfter"],
            ["표 삭제", "deleteTable"],
          ];
  const handlePosition = target && {
    row: {
      left: x(target.table.left) - 28,
      top: y(target.rowRect.top + target.rowRect.height / 2) - 12,
    },
    column: {
      left: x(target.columnRect.left + target.columnRect.width / 2) - 12,
      top: y(target.table.top) - 28,
    },
    table: {
      left: x(target.table.left) - 58,
      top: y(target.table.top + target.columnRect.height / 2) - 12,
    },
  };
  const menuAnchor =
    target && menu && (menu === "row" ? target.rowRect : target.columnRect);
  const menuPosition = menuAnchor &&
    target &&
    menu &&
    typeof window !== "undefined" && {
      left: Math.max(
        8,
        Math.min(
          menu === "column" ? target.columnRect.left : target.table.left + 16,
          window.innerWidth - 204,
        ),
      ),
      top:
        menuAnchor.bottom + 6 + 180 > window.innerHeight - 8 &&
        menuAnchor.top > 188
          ? menuAnchor.top - 186
          : Math.max(
              8,
              Math.min(menuAnchor.bottom + 6, window.innerHeight - 188),
            ),
    };

  return (
    <div
      ref={host}
      className={styles.tableOverlay}
      onMouseMove={(event) => {
        if (menu || (event.target as Element).closest("[data-table-control]"))
          return;
        const next = findTarget(event.target as Element);
        if (next) setTarget(next);
        else if (
          target &&
          (event.clientX < target.table.left - 76 ||
            event.clientX > target.table.right + 38 ||
            event.clientY < target.table.top - 36 ||
            event.clientY > target.table.bottom + 38)
        )
          setTarget(null);
      }}
      onMouseLeave={(event) => {
        if (!menu && !host.current?.contains(event.relatedTarget as Node))
          setTarget(null);
      }}
      onClickCapture={(event) => {
        if ((event.target as Element).closest("table")) {
          setTarget(findTarget(event.target as Element));
        }
        if (!(event.target as Element).closest("[data-table-control]")) {
          setMenu(null);
        }
        if (!(event.target as Element).closest("table, [data-table-control]")) {
          setTarget(null);
        }
      }}
    >
      {children}
      {target && handlePosition && (
        <>
          <span
            className={styles.tableGutter}
            style={{
              left: x(target.table.left) - 74,
              top: y(target.table.top) - 32,
              width: 74,
              height: target.table.height + 64,
            }}
          />
          {(menu === null || menu === "row") && (
            <span
              className={`${styles.tableSelection} ${menu === "row" ? styles.tableSelectionActive : ""}`}
              style={{
                left: x(target.table.left),
                top: y(target.rowRect.top),
                width: target.table.width,
                height: target.rowRect.height,
              }}
            />
          )}
          {menu === "column" && (
            <span
              className={`${styles.tableSelection} ${styles.tableSelectionActive}`}
              style={{
                left: x(target.columnRect.left),
                top: y(target.table.top),
                width: target.columnRect.width,
                height: target.table.height,
              }}
            />
          )}
          {menu === "table" && (
            <span
              className={`${styles.tableSelection} ${styles.tableSelectionActive}`}
              style={{
                left: x(target.table.left),
                top: y(target.table.top),
                width: target.table.width,
                height: target.table.height,
              }}
            />
          )}
          {(["table", "row", "column"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              data-table-control
              className={styles.tableHandle}
              style={handlePosition[kind]}
              aria-label={
                kind === "row"
                  ? `${target.row + 1}행 메뉴`
                  : kind === "column"
                    ? `${target.column + 1}열 메뉴`
                    : "표 메뉴"
              }
              aria-expanded={menu === kind}
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={() => {
                setMenu(menu === kind ? null : kind);
              }}
            >
              {kind === "table" ? <GripVertical size={18} /> : "⋮⋮"}
            </button>
          ))}
          <button
            type="button"
            data-table-control
            className={styles.tableAddRow}
            style={{
              left: x(target.table.left),
              top: y(target.table.bottom) + 4,
              width: target.table.width,
            }}
            aria-label="마지막에 행 추가"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              run(
                "addRowAfter",
                editor.state.doc.nodeAt(target.position)!.childCount - 1,
              )
            }
          >
            <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <button
            type="button"
            data-table-control
            className={styles.tableAddColumn}
            style={{
              left: x(target.table.right) + 8,
              top: y(target.table.top),
              height: target.table.height,
            }}
            aria-label="마지막에 열 추가"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              run(
                "addColumnAfter",
                target.row,
                editor.state.doc.nodeAt(target.position)!.firstChild!
                  .childCount - 1,
              )
            }
          >
            <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
          {menu &&
            menuPosition &&
            createPortal(
              <div
                ref={menuElement}
                data-table-control
                className={styles.tableMenu}
                role="menu"
                style={menuPosition}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    host.current
                      ?.querySelector<HTMLButtonElement>(
                        '[aria-expanded="true"]',
                      )
                      ?.focus();
                    setMenu(null);
                  }
                }}
              >
                {menuItems.map(([label, action]) => {
                  const Icon =
                    action.startsWith("addRow") ||
                    action.startsWith("paragraph")
                      ? action.endsWith("Before")
                        ? ArrowUp
                        : ArrowDown
                      : action.startsWith("addColumn")
                        ? action.endsWith("Before")
                          ? ArrowLeft
                          : ArrowRight
                        : action.startsWith("duplicate")
                          ? Copy
                          : Trash2;
                  return (
                    <button
                      key={action}
                      type="button"
                      role="menuitem"
                      className={
                        action.startsWith("delete")
                          ? styles.tableMenuDelete
                          : ""
                      }
                      onClick={() => run(action)}
                    >
                      <Icon size={17} aria-hidden="true" />
                      {label}
                    </button>
                  );
                })}
              </div>,
              document.body,
            )}
        </>
      )}
    </div>
  );
}
