"use client";

import { useState } from "react";
import { ColorfulLoader } from "@/components/ColorfulLoader";

/**
 * Dev-only preview for ColorfulLoader, which nothing renders yet — it exists
 * for the cubejs "warming up scrambler" state on a future branch. Delete this
 * route once the loader has a real home, or keep it as the seed of a
 * component gallery.
 */
export default function LoaderPreviewPage() {
  const [showFullScreen, setShowFullScreen] = useState(false);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center gap-8 px-4 py-12">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-xl font-semibold">ColorfulLoader</h1>
        <p className="text-xs text-slate-500">
          port of the colorful-mode loader from brandonemartinez.com
        </p>
      </div>

      <section className="flex flex-col items-center gap-3">
        <span className="text-[10px] uppercase tracking-wider text-slate-600">
          contained — fullScreen={"{false}"}
        </span>
        <div className="w-80 h-56 overflow-hidden rounded-lg border border-slate-800">
          <ColorfulLoader fullScreen={false} label="Warming up scrambler" />
        </div>
      </section>

      <section className="flex flex-col items-center gap-3">
        <span className="text-[10px] uppercase tracking-wider text-slate-600">
          re-themed via CSS variables
        </span>
        <div
          className="w-80 h-56 overflow-hidden rounded-lg border border-slate-800"
          style={
            {
              "--bg-color-a": "rgb(34, 197, 94)",
              "--bg-color-b": "rgb(15, 23, 42)",
              "--symbol-color-a": "rgb(15, 23, 42)",
              "--symbol-color-b": "rgb(34, 197, 94)",
            } as React.CSSProperties
          }
        >
          <ColorfulLoader fullScreen={false} label="Loading" />
        </div>
      </section>

      <button
        type="button"
        onClick={() => setShowFullScreen(true)}
        className="text-xs text-slate-400 hover:text-white border border-slate-700 rounded-full px-4 py-2"
      >
        show full-screen variant
      </button>

      {showFullScreen && (
        <div onClick={() => setShowFullScreen(false)}>
          <ColorfulLoader label="Warming up scrambler" />
        </div>
      )}
      {showFullScreen && (
        <p className="fixed bottom-6 left-1/2 -translate-x-1/2 z-10 text-xs text-white/70">
          click anywhere to dismiss
        </p>
      )}
    </main>
  );
}
