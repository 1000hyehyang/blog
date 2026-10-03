"use client";

// Adapted from beui.dev/components/motion/tabs: underline tabs.
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const TabsContext = createContext<{
  value: string;
  setValue: (value: string) => void;
  id: string;
} | null>(null);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tabs components must be used inside Tabs");
  return context;
}

export function Tabs({
  defaultValue,
  children,
}: {
  defaultValue: string;
  children: ReactNode;
}) {
  const [value, setValue] = useState(defaultValue);
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <MotionConfig
      transition={
        reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 245, damping: 36, mass: 1.2 }
      }
    >
      <TabsContext.Provider value={{ value, setValue, id }}>
        <motion.div layoutRoot>{children}</motion.div>
      </TabsContext.Provider>
    </MotionConfig>
  );
}

export function TabsList({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-8 flex gap-6 border-b border-border"
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        const tabs = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>(
            '[role="tab"]',
          ),
        );
        const current = tabs.indexOf(event.target as HTMLButtonElement);
        if (current < 0) return;
        event.preventDefault();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : (current +
                  (event.key === "ArrowRight" ? 1 : -1) +
                  tabs.length) %
                tabs.length;
        tabs[next].focus();
        tabs[next].click();
      }}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const { value: current, setValue, id } = useTabs();
  const active = value === current;
  return (
    <button
      type="button"
      role="tab"
      id={`${id}-tab-${value}`}
      aria-controls={`${id}-panel-${value}`}
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={() => setValue(value)}
      className={cn(
        "relative -mb-px inline-flex min-h-11 items-center px-3 pb-3 pt-2 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <motion.span
          aria-hidden
          layoutId={`${id}-indicator`}
          layout
          className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--code-inline-foreground)]"
        />
      )}
    </button>
  );
}

export function TabsContent({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const { value: current, id } = useTabs();
  const reduce = useReducedMotion();
  const active = value === current;
  return (
    <motion.div
      role="tabpanel"
      id={`${id}-panel-${value}`}
      aria-labelledby={`${id}-tab-${value}`}
      hidden={!active}
      tabIndex={0}
      initial={false}
      animate={{ opacity: active ? 1 : 0, y: active || reduce ? 0 : 4 }}
      transition={{ duration: reduce ? 0 : 0.18, ease: "easeOut" }}
      className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      {children}
    </motion.div>
  );
}
