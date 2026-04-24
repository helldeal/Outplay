import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getTitleColorClass } from "../../utils/title-style";

interface ColoredTitleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function ColoredTitleSelect({
  value,
  onChange,
  options,
  placeholder = "Aucun titre",
}: ColoredTitleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedTitle = value || placeholder;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/60 flex items-center justify-between hover:border-slate-600"
      >
        <span
          className={`truncate ${
            value ? getTitleColorClass(value) : "text-slate-400"
          }`}
        >
          {selectedTitle}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-slate-700 bg-slate-950 shadow-lg max-h-64 overflow-y-auto">
          <div className="px-1 py-1 space-y-0.5" role="listbox">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-slate-800/50 transition text-slate-400"
            >
              {placeholder}
            </button>

            {options.map((title) => (
              <button
                key={title}
                type="button"
                onClick={() => {
                  onChange(title);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-slate-800/50 transition truncate ${getTitleColorClass(
                  title,
                )}`}
              >
                {title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
