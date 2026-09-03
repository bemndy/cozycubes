"use client";

import { Dialog } from "./ui/Dialog";
import type { SupportedCubeSize } from "@/lib/scramble-gen";

interface ClearSessionConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cubeSize: SupportedCubeSize;
  solveCount: number;
}

/**
 * Confirms before the footer's clear-session action wipes every solve for
 * the active cube size. Themed like every other dialog in the app rather
 * than a native window.confirm() — the one thing that isn't fully generic
 * about that native dialog is that it can't carry the app's own type or
 * colour tokens, which would be the only thing about it that looked out of
 * place next to the rest of the chrome.
 */
export function ClearSessionConfirm({
  open,
  onClose,
  onConfirm,
  cubeSize,
  solveCount,
}: ClearSessionConfirmProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Clear session">
      <div className="flex flex-col gap-5">
        <p style={{ color: "var(--ink-dim)" }}>
          Clear all {solveCount} {cubeSize}×{cubeSize} solves? This can&apos;t be undone.
        </p>
        <div className="flex justify-end gap-5">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[11px] uppercase tracking-[.14em] opacity-60 transition-opacity hover:opacity-100"
            style={{ color: "var(--ink)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="font-mono text-[11px] uppercase tracking-[.14em] transition-opacity hover:opacity-80"
            style={{ color: "var(--quality-warn)" }}
          >
            Clear
          </button>
        </div>
      </div>
    </Dialog>
  );
}
