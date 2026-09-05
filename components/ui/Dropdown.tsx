"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRegisterOverlay } from "@/lib/overlayState";

export interface DropdownOption<T> {
  value: T;
  label: string;
}

interface DropdownProps<T extends string | number> {
  options: readonly DropdownOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
}

/** Where to pin the panel, in viewport coordinates. */
interface Anchor {
  top: number;
  right: number;
}

/**
 * Custom listbox dropdown.
 *
 * Replaces a native <select>, whose popup is drawn by the OS and takes no CSS.
 * The tradeoff is rebuilding what the native control provided: keyboard
 * navigation, the aria-activedescendant relationship, click-outside, focus
 * return, and Escape.
 *
 * Both the scrim and the panel are portalled to <body>. The bar holding this
 * dropdown is a stacking context nested inside another, so anything rendered in
 * place is capped at the bar's layer — which is what previously let the scrim
 * paint over the navbar and swallow its clicks. Portalled out, the panel sits
 * on the true top layer and the scrim sits just under it.
 *
 * Because the panel is no longer a DOM descendant of the trigger, it has to be
 * positioned from the trigger's rect, and the click-outside test has to check
 * both elements.
 */
export function Dropdown<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();

  useRegisterOverlay(open);

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const selected = options[selectedIndex];

  // Opening measures the trigger and starts the highlight on the current
  // selection. Done here rather than in an effect: both are consequences of the
  // open action, not state that needs syncing to anything outside React.
  function openList() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setAnchor({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  // Focus is a DOM side effect, so it does belong in an effect.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Pointerdown rather than click, so the panel is gone before whatever was
    // clicked underneath reacts. Both the trigger and the portalled panel count
    // as "inside" — the panel is no longer a descendant of the trigger.
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    // The anchor is a snapshot of where the trigger was. Rather than track it,
    // close on anything that would invalidate it.
    function onInvalidate() {
      setOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onInvalidate);
    window.addEventListener("scroll", onInvalidate, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onInvalidate);
      window.removeEventListener("scroll", onInvalidate, true);
    };
  }, [open]);

  function commit(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
      case "Tab":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${selected?.label ?? ""}`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openList();
          }
        }}
        className={`flex items-center gap-1.5 py-1 font-mono text-[15px] transition-opacity ${
          disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer opacity-80 hover:opacity-100"
        }`}
        style={{ color: "var(--ink)" }}
      >
        {selected?.label}
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className="size-2 transition-transform duration-200"
          style={{
            color: "var(--ink-dimmer)",
            transform: open ? "rotate(180deg)" : undefined,
          }}
        >
          <path
            d="M1 1L5 5L9 1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open &&
        anchor &&
        createPortal(
          <>
            <div className="overlay-scrim animate-scrim-in" aria-hidden="true" />
            <ul
              ref={listRef}
              role="listbox"
              aria-label={ariaLabel}
              aria-activedescendant={`${baseId}-${activeIndex}`}
              tabIndex={-1}
              onKeyDown={onListKeyDown}
              className="overlay-panel animate-panel-in fixed z-[110] min-w-[8rem] p-1 outline-none"
              style={{ top: anchor.top, right: anchor.right }}
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={String(option.value)}
                    id={`${baseId}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(index)}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-[6px] px-3 py-2 font-mono text-[15px]"
                    style={{
                      background: isActive ? "var(--hover-tint)" : "transparent",
                      color: isSelected ? "var(--ink)" : "var(--ink-dim)",
                    }}
                  >
                    {option.label}
                    {isSelected && (
                      <span aria-hidden="true" style={{ color: "var(--accent)" }}>
                        ·
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>,
          document.body
        )}
    </>
  );
}
