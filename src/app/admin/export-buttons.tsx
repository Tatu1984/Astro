"use client";

import { Download } from "lucide-react";

import { Button } from "@/frontend/components/ui/Button";

const EXPORTS = [
  { resource: "users", label: "Users CSV" },
  { resource: "bookings", label: "Bookings CSV" },
  { resource: "llm-calls", label: "LLM Calls CSV" },
  { resource: "astrologers", label: "Astrologers CSV" },
  { resource: "payouts", label: "Payouts CSV" },
  { resource: "reviews", label: "Reviews CSV" },
];

export function ExportButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      {EXPORTS.map((e) => (
        <a
          key={e.resource}
          href={`/api/admin/export/${e.resource}`}
          download
          className="inline-flex"
        >
          <Button variant="outline" size="sm" type="button">
            <Download className="h-3.5 w-3.5 mr-1" /> {e.label}
          </Button>
        </a>
      ))}
    </div>
  );
}
