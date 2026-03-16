"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"
    >
      {copied
        ? <span className="text-[11px] text-emerald-600 font-medium">Copied!</span>
        : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
