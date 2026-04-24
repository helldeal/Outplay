import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { rarityNameGradient } from "../../utils/rarity";
import type { CardWithRelations } from "../../types";

interface SignatureCardOption {
  value: string;
  label: string;
  rarity: CardWithRelations["rarity"];
}

interface ColoredSignatureCardSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SignatureCardOption[];
  placeholder?: string;
}

export function ColoredSignatureCardSelect({
  value,
  onChange,
  options,
  placeholder = "Aucune carte signature",
}: ColoredSignatureCardSelectProps) {
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

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/60 flex items-center justify-between hover:border-slate-600"
      >
        <span
          className={`truncate text-transparent bg-clip-text ${
            selectedOption
              ? rarityNameGradient(selectedOption.rarity)
              : "text-slate-400"
          }`}
        >
          {displayLabel}
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

            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-sm rounded-lg hover:bg-slate-800/50 transition truncate text-transparent bg-clip-text ${rarityNameGradient(
                  option.rarity,
                )}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
