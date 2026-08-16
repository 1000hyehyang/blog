"use client";

import { useEffect, useState } from "react";

type Ripple = { id: number; x: number; y: number };

export function ClickRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    let nextRippleId = 0;
    const timeoutIds = new Set<number>();

    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0) return;

      const id = nextRippleId;
      nextRippleId += 1;
      setRipples((current) => [
        ...current,
        { id, x: event.clientX, y: event.clientY },
      ]);

      const timeoutId = window.setTimeout(() => {
        setRipples((current) => current.filter((ripple) => ripple.id !== id));
        timeoutIds.delete(timeoutId);
      }, 650);
      timeoutIds.add(timeoutId);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
    >
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="click-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      ))}
    </div>
  );
}
