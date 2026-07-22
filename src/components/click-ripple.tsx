"use client";

import { useEffect, useState } from "react";

type Ripple = { id: number; x: number; y: number };

export function ClickRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0) return;

      const id = Date.now() + Math.random();
      setRipples((current) => [
        ...current,
        { id, x: event.clientX, y: event.clientY },
      ]);

      window.setTimeout(() => {
        setRipples((current) => current.filter((ripple) => ripple.id !== id));
      }, 650);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
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
