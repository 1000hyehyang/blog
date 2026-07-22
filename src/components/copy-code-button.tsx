"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="코드 복사"
      className="absolute right-3 top-8 z-10 grid size-8 place-items-center rounded border border-white/15 bg-black/30 text-zinc-300"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}
