"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Option = { value: string; label: string };

export function BirthdaySelect({ id, label, value, options, error, onChange }: { id: string; label: string; value: string; options: Option[]; error?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const listId = `${useId()}-options`;
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function show() {
    const bounds = root.current?.getBoundingClientRect();
    setOpensUp(Boolean(bounds && window.innerHeight - bounds.bottom < 250 && bounds.top > window.innerHeight - bounds.bottom));
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { show(); return; }
      setActiveIndex((index) => Math.min(options.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1))));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      if (!open) show();
      setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
    } else if (event.key === "PageDown" || event.key === "PageUp") {
      event.preventDefault();
      if (!open) { show(); return; }
      setActiveIndex((index) => Math.min(options.length - 1, Math.max(0, index + (event.key === "PageDown" ? 8 : -8))));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(activeIndex);
      else show();
    } else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
    } else if (/^[a-z0-9]$/i.test(event.key)) {
      const index = options.findIndex((option) => option.label.toLowerCase().startsWith(event.key.toLowerCase()));
      if (index >= 0) { event.preventDefault(); if (!open) show(); setActiveIndex(index); }
    }
  }

  return <div className={`birthday-picker${open ? " is-open" : ""}${opensUp ? " opens-up" : ""}`} ref={root}>
    <input type="hidden" name={id} value={value} />
    <button ref={trigger} id={id} data-field={id} type="button" role="combobox" className="birthday-picker-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${id}-error` : undefined} onClick={() => open ? setOpen(false) : show()} onKeyDown={onKeyDown}>
      <span className={selected ? "" : "is-placeholder"}>{selected?.label || label}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open ? <div id={listId} ref={menu} className="birthday-picker-menu" role="listbox" aria-label={`Choose ${label.toLowerCase()}`}>
      {options.map((option, index) => <button key={option.value} id={`${listId}-${index}`} data-index={index} type="button" role="option" aria-selected={option.value === value} tabIndex={-1} className={`birthday-picker-option${index === activeIndex ? " is-active" : ""}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(index)}><span>{option.label}</span>{option.value === value ? <Check size={14} aria-hidden="true" /> : null}</button>)}
    </div> : null}
  </div>;
}
