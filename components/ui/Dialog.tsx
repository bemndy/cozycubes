"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRegisterOverlay } from "@/lib/overlayState";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional line under the title — version, date, that sort of thing. */
  subtitle?: string;
  children: ReactNode;
  /** Fills almost the whole viewport instead of a centred card. For content
   *  that wants room to breathe — a grid of options rather than a page of
   *  prose. */
  fullBleed?: boolean;
}

/**
 * Centred frosted-glass dialog.
 *
 * Handles the things a dialog has to handle to not be a trap: Escape closes,
 * a click on the scrim closes, focus moves into the panel on open and returns
 * to whatever opened it on close, and Tab is kept inside the panel while it is
 * up. It also registers with the overlay store, which is what stops Space and
 * Tab from reaching the timer underneath.
 */
export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  fullBleed = false,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useRegisterOverlay(open);

  // Held in a ref so the effect below depends on `open` alone.
  //
  // Callers routinely pass an inline arrow, which is a new function identity on
  // every render of the parent. With onClose in the dependency array, any
  // re-render of that parent while the dialog was open would tear the effect
  // down and set it back up — and the teardown calls restoreFocus, which yanked
  // focus out of the open dialog. The page re-renders on pointer-idle, so this
  // fired just by reading a dialog without moving the mouse.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;

      // Keep Tab inside the panel.
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    // Capture phase so this runs before the timer's window listener, letting
    // stopPropagation actually keep Escape from travelling further.
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  // Portalled to <body>. Rendered in place it would sit inside the footer,
  // which is a stacking context nested inside another — no z-index could lift
  // it above the page from there.
  return createPortal(
    <div
      className="overlay-scrim animate-scrim-in flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        // The scrim closes on click; the panel must not pass its own clicks up.
        onClick={(e) => e.stopPropagation()}
        className={`overlay-panel animate-panel-in flex flex-col gap-4 p-5 outline-none ${
          fullBleed
            ? "h-[calc(100vh-2.5rem)] w-[calc(100vw-2.5rem)] max-w-none"
            : "max-h-[70vh] w-full max-w-md"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="capitalize text-[15px] tracking-tight" style={{ color: "var(--ink)" }}>
              {title}
            </h2>
            {subtitle && (
              <p className="font-mono text-[10px]" style={{ color: "var(--ink-dimmer)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-[16px] leading-none opacity-40 transition-opacity hover:opacity-100"
            style={{ color: "var(--ink)" }}
          >
            ×
          </button>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto text-[13px] leading-relaxed">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
