"use client";

import { useEffect, useId, useRef, useState } from "react";
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

/**
 * Custom listbox dropdown on the shared frosted panel.
 *
 * Replaces the native <select>, which could not be given the glass treatment —
 * a select's popup is drawn by the OS and takes no CSS. The tradeoff is that
 * everything the native control provided has to be rebuilt here: keyboard
 * navigation, the aria-activedescendant relationship, click-outside, focus
 * return, and Escape.
 *
 * Focus stays on the listbox itself and the highlighted option is reported via
 * aria-activedescendant, rather than moving DOM focus between options. That is
 * the pattern screen readers expect from a listbox, and it keeps the visual
 * highlight and the assistive-tech cursor in step.
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
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();

  useRegisterOverlay(open);

  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const selected = options[selectedIndex];

  // Opening always starts the highlight on the current selection. Done in the
  // handlers below rather than an effect: it is a consequence of the open
  // action, not state that needs syncing to anything outside React.
  function openList() {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  // Focus is a DOM side effect, so it does belong here.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Click outside closes. Pointerdown rather than click so the dropdown is gone
  // before whatever was clicked underneath reacts.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function commit(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
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
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
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
        className={`flex items-center gap-1.5 py-1 text-[13px] transition-opacity ${
          disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:opacity-100"
        }`}
        style={{ color: "var(--ink)" }}
      >
        {selected?.label}
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className="size-2.5 transition-transform duration-200"
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

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={`${baseId}-${activeIndex}`}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className="glass-panel animate-panel-in absolute right-0 top-[calc(100%+8px)] z-40 min-w-[7rem] p-1 outline-none"
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
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-[13px]"
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
      )}
    </div>
  );
}
