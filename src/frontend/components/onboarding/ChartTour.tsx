"use client";

import { useEffect, useState } from "react";

import { Button } from "@/frontend/components/ui/Button";

const STORAGE_KEY = "astro_chart_tour_seen";

const SLIDES: Array<{ title: string; body: string }> = [
  {
    title: "Welcome to your chart",
    body:
      "Your chart is a snapshot of the sky at the moment you were born — every planet's position carries meaning about your tendencies and timing.",
  },
  {
    title: "Signs and houses",
    body:
      "Each colored shape is a sign (Aries, Taurus, ...). Each cell is a house — an area of life like career, relationships or health. Together they say where each planet's energy plays out.",
  },
  {
    title: "Plain-English clarifications",
    body:
      "Click any underlined astrological term anywhere in the app to see a plain-English explanation. The reading style toggle in Settings switches the framing between Vedic and Western.",
  },
];

export function ChartTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    setOpen(true);
  }, []);

  function close() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1");
    }
    setOpen(false);
  }

  function next() {
    if (step >= SLIDES.length - 1) {
      close();
    } else {
      setStep((s) => s + 1);
    }
  }

  if (!open) return null;
  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[#1a1530] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider text-white/40">
            Tour {step + 1} of {SLIDES.length}
          </span>
          <button
            type="button"
            onClick={close}
            className="text-xs text-white/55 hover:text-white"
          >
            Skip
          </button>
        </div>
        <h2 className="text-lg font-semibold text-white">{slide.title}</h2>
        <p className="mt-2 text-sm text-white/75 leading-relaxed">{slide.body}</p>

        <div className="mt-5 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className={
                  "h-1.5 w-6 rounded-full " +
                  (i === step ? "bg-[var(--color-brand-gold)]" : "bg-white/15")
                }
              />
            ))}
          </div>
          <Button variant="gold" size="sm" onClick={next}>
            {isLast ? "Got it" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
