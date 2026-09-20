"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
  description?: string;
  tone?: "neutral" | "success" | "warning";
};

type UiSelectProps = {
  id: string;
  name: string;
  defaultValue: string;
  options: readonly SelectOption[];
  ariaLabel?: string;
};

export function UiSelect({ id, name, defaultValue, options, ariaLabel }: UiSelectProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === defaultValue)));
  const root = useRef<HTMLDivElement>(null);
  const listboxId = `${useId()}-listbox`;
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    setValue(option.value);
    setActiveIndex(index);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const next = open ? (activeIndex + direction + options.length) % options.length : Math.max(0, options.findIndex((option) => option.value === value));
      setActiveIndex(next);
      setOpen(true);
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
      setOpen(true);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else setOpen(true);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  if (!selected) return null;

  return (
    <div className={`ui-select${open ? " is-open" : ""}`} ref={root}>
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        className="ui-select-trigger"
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
      >
        <span className={`ui-select-dot ${selected.tone ?? "neutral"}`} aria-hidden="true" />
        <span className="ui-select-value">
          <strong>{selected.label}</strong>
          {selected.description ? <small>{selected.description}</small> : null}
        </span>
        <ChevronDown className="ui-select-chevron" size={17} aria-hidden="true" />
      </button>

      {open ? (
        <div className="ui-select-menu" id={listboxId} role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              id={`${listboxId}-${index}`}
              className={`ui-select-option${option.value === value ? " is-selected" : ""}${index === activeIndex ? " is-active" : ""}`}
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={option.value}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(index)}
            >
              <span className={`ui-select-dot ${option.tone ?? "neutral"}`} aria-hidden="true" />
              <span>
                <strong>{option.label}</strong>
                {option.description ? <small>{option.description}</small> : null}
              </span>
              <span className="ui-select-check" aria-hidden="true">{option.value === value ? <Check size={15} /> : null}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
