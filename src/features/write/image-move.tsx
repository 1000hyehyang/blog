"use client";

import type { Editor, NodeViewProps } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { closeHistory } from "@tiptap/pm/history";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./writer.module.css";

const HOLD_DELAY_MS = 300;
const HOLD_CANCEL_DISTANCE = 8;
const MOVE_DISTANCE = 5;
const DROP_MARGIN = 40;
const SCROLL_EDGE = 80;
const SCROLL_STEP = 12;

export function moveImage(editor: Editor, from: number, to: number) {
  const { doc } = editor.state;
  if (from < 0 || from >= doc.content.size || to < 0 || to > doc.content.size)
    return false;
  if (
    to === doc.content.size &&
    doc.lastChild?.type.name === "paragraph" &&
    doc.lastChild.content.size === 0
  )
    to -= doc.lastChild.nodeSize;
  const node = doc.nodeAt(from);
  if (
    !editor.isEditable ||
    node?.type.name !== "image" ||
    doc.resolve(from).depth !== 0 ||
    doc.resolve(to).depth !== 0 ||
    (to >= from && to <= from + node.nodeSize)
  )
    return false;
  const transaction = closeHistory(editor.state.tr).delete(
    from,
    from + node.nodeSize,
  );
  const destination = transaction.mapping.map(to);
  transaction.insert(destination, node);
  transaction.setSelection(NodeSelection.create(transaction.doc, destination));
  editor.view.dispatch(transaction);
  return true;
}

export function useImageMove({
  editor,
  getPos,
}: Pick<NodeViewProps, "editor" | "getPos">) {
  const cleanupRef = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const [holding, setHolding] = useState(false);
  const [marker, setMarker] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);

  return {
    wrapperProps: {
      tabIndex: editor.isEditable ? 0 : undefined,
      "aria-label": "사진 · 길게 눌러 위치 이동",
      "data-moving": holding ? "" : undefined,
      "data-movable": editor.isEditable ? "" : undefined,
      onClickCapture: (event: React.MouseEvent<HTMLElement>) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
      },
      onContextMenu: (event: React.MouseEvent<HTMLElement>) => {
        if (editor.isEditable && event.target instanceof HTMLImageElement)
          event.preventDefault();
      },
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        const from = getPos();
        if (typeof from !== "number") return;
        const position = editor.state.doc.resolve(from);
        const index = position.index();
        const to =
          event.key === "ArrowUp"
            ? from - (editor.state.doc.maybeChild(index - 1)?.nodeSize ?? 0)
            : from +
              (position.nodeAfter?.nodeSize ?? 0) +
              (editor.state.doc.maybeChild(index + 1)?.nodeSize ?? 0);
        moveImage(editor, from, to);
      },
      onPointerDownCapture: (event: React.PointerEvent<HTMLElement>) => {
        suppressClick.current = false;
        if (
          event.button !== 0 ||
          !event.isPrimary ||
          !editor.isEditable ||
          !(event.target instanceof HTMLImageElement)
        )
          return;
        if (event.pointerType !== "touch") event.preventDefault();
        cleanupRef.current?.();
        const figure = event.currentTarget;
        const pointerId = event.pointerId;
        const startX = event.clientX;
        const startY = event.clientY;
        let clientX = event.clientX;
        let clientY = startY;
        let destination: number | null = null;
        let frame = 0;
        let moved = false;
        let active = false;
        const holdTimer = window.setTimeout(() => {
          active = true;
          suppressClick.current = true;
          figure.setPointerCapture(pointerId);
          setHolding(true);
          frame = window.requestAnimationFrame(update);
        }, HOLD_DELAY_MS);
        const update = () => {
          const from = getPos();
          const box = editor.view.dom.getBoundingClientRect();
          destination = null;
          if (
            moved &&
            typeof from === "number" &&
            clientX >= box.left - DROP_MARGIN &&
            clientX <= box.right + DROP_MARGIN
          ) {
            let top = box.bottom;
            destination = editor.state.doc.content.size;
            editor.state.doc.forEach((_node, offset) => {
              if (
                offset === from ||
                destination !== editor.state.doc.content.size
              )
                return;
              const element = editor.view.nodeDOM(offset);
              if (!(element instanceof HTMLElement)) return;
              const rect = element.getBoundingClientRect();
              if (clientY < rect.top + rect.height / 2) {
                destination = offset;
                top = rect.top;
              } else top = rect.bottom;
            });
            setMarker((current) =>
              current?.top === top &&
              current.left === box.left &&
              current.width === box.width
                ? current
                : { top, left: box.left, width: box.width },
            );
            const scroll =
              clientY < SCROLL_EDGE
                ? -SCROLL_STEP
                : clientY > window.innerHeight - SCROLL_EDGE
                  ? SCROLL_STEP
                  : 0;
            if (scroll) window.scrollBy(0, scroll);
          } else setMarker(null);
          frame = window.requestAnimationFrame(update);
        };
        const move = (next: PointerEvent) => {
          if (next.pointerId !== pointerId) return;
          clientX = next.clientX;
          clientY = next.clientY;
          if (!active) {
            if (
              Math.hypot(clientX - startX, clientY - startY) >
              HOLD_CANCEL_DISTANCE
            )
              cleanup();
            return;
          }
          if (Math.abs(clientY - startY) > MOVE_DISTANCE) moved = true;
        };
        const touchMove = (next: TouchEvent) => {
          if (active && next.cancelable) next.preventDefault();
        };
        const cleanup = () => {
          window.clearTimeout(holdTimer);
          window.cancelAnimationFrame(frame);
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", stop);
          window.removeEventListener("pointercancel", cancel);
          window.removeEventListener("keydown", escape);
          window.removeEventListener("blur", cleanup);
          figure.removeEventListener("touchmove", touchMove);
          if (figure.hasPointerCapture(pointerId))
            figure.releasePointerCapture(pointerId);
          setHolding(false);
          setMarker(null);
          cleanupRef.current = null;
        };
        const stop = (next: PointerEvent) => {
          if (next.pointerId !== pointerId) return;
          clientX = next.clientX;
          clientY = next.clientY;
          window.cancelAnimationFrame(frame);
          if (active) update();
          const from = getPos();
          const to = destination;
          cleanup();
          if (typeof from === "number" && to !== null)
            moveImage(editor, from, to);
        };
        const cancel = (next: PointerEvent) => {
          if (next.pointerId === pointerId) cleanup();
        };
        const escape = (next: KeyboardEvent) => {
          if (next.key === "Escape") cleanup();
        };
        cleanupRef.current = cleanup;
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
        window.addEventListener("pointercancel", cancel);
        window.addEventListener("keydown", escape);
        window.addEventListener("blur", cleanup);
        figure.addEventListener("touchmove", touchMove, { passive: false });
      },
    },
    marker:
      marker &&
      createPortal(
        <div
          className={styles.imageDropMarker}
          style={marker}
          aria-hidden="true"
        />,
        document.body,
      ),
  };
}
