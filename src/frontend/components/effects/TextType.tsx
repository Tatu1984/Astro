"use client";
import { useEffect, useState } from "react";

export function TextType({
  text,
  speed = 18,
  className,
  cursor = true,
}: {
  text: string;
  speed?: number;
  className?: string;
  cursor?: boolean;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => {
      setN((x) => {
        if (x >= text.length) {
          clearInterval(id);
          return x;
        }
        return x + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return (
    <span className={className}>
      {text.slice(0, n)}
      {cursor && n < text.length && (
        <span className="inline-block w-0.5 h-[1em] align-middle bg-current ml-0.5 animate-pulse" />
      )}
    </span>
  );
}
