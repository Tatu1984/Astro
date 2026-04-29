"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import * as React from "react";

import { lookupGlossary, type GlossaryEntry } from "@/shared/glossary";
import { cn } from "@/frontend/utils/cn";

interface Props {
  term: string;
  children?: React.ReactNode;
  className?: string;
}

export function GlossaryTerm({ term, children, className }: Props) {
  const entry = lookupGlossary(term);
  const label = children ?? term;

  if (!entry) {
    return <span className={className}>{label}</span>;
  }

  const triggerClassName = cn(
    "cursor-help underline decoration-dotted decoration-white/40 underline-offset-2 hover:decoration-white/80 focus:outline-none focus-visible:decoration-white",
    className,
  );

  return (
    <TooltipPrimitive.Provider delay={250}>
      <PopoverPrimitive.Root>
        <TooltipPrimitive.Root>
          <TooltipPrimitive.Trigger
            render={
              <PopoverPrimitive.Trigger
                nativeButton={false}
                render={
                  <span
                    role="button"
                    tabIndex={0}
                    className={triggerClassName}
                    aria-label={`${entry.term}: ${entry.plain}`}
                  >
                    {label}
                  </span>
                }
              />
            }
          />
          <TooltipPrimitive.Portal>
            <TooltipPrimitive.Positioner side="top" sideOffset={6}>
              <TooltipPrimitive.Popup className="z-50 max-w-xs rounded-md border border-white/10 bg-black/85 px-2.5 py-1.5 text-xs text-white shadow-lg backdrop-blur-sm">
                <strong className="font-medium text-white">{entry.term}</strong>
                <span className="text-white/75"> — {entry.plain}</span>
              </TooltipPrimitive.Popup>
            </TooltipPrimitive.Positioner>
          </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner side="bottom" sideOffset={8}>
            <PopoverPrimitive.Popup className="z-50 w-72 rounded-md border border-white/10 bg-[var(--color-surface)] p-3 text-sm text-white shadow-xl outline-none">
              <GlossaryPopupBody entry={entry} />
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

function GlossaryPopupBody({ entry }: { entry: GlossaryEntry }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-wider text-[var(--color-brand-gold)]">
        {entry.term}
      </p>
      <p className="text-white/85">{entry.plain}</p>
      {entry.long ? (
        <p className="pt-1 text-xs leading-relaxed text-white/65">{entry.long}</p>
      ) : null}
    </div>
  );
}
