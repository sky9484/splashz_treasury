"use client";
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

/**
 * Motion primitives. Rule: motion only explains something — arrival, change, cause, state.
 * Durations: 120 ms (feedback), 200 ms (state), 320 ms (arrival). One easing family.
 * Everything is disabled by prefers-reduced-motion in globals.css.
 */

/** Fades content up once when it enters the viewport. `i` staggers siblings by 60 ms (max 5 steps). */
export function Reveal({ children, i = 0, as: Tag = "div", className = "", style }: { children: ReactNode; i?: number; as?: ElementType; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setShown(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal${shown ? " in" : ""} ${className}`} style={{ ...style, ["--i" as string]: Math.min(i, 5) }}>
      {children}
    </Tag>
  );
}

/** Briefly tints a number green or red when its value moves, so live updates are noticed, not missed. */
export function Flash({ value, children, className = "" }: { value: number | null | undefined; children: ReactNode; className?: string }) {
  const prev = useRef(value);
  const [dir, setDir] = useState<"" | "up" | "down">("");
  useEffect(() => {
    const p = prev.current;
    prev.current = value;
    if (p == null || value == null || p === value) return;
    setDir(value > p ? "up" : "down");
    const t = setTimeout(() => setDir(""), 900);
    return () => clearTimeout(t);
  }, [value]);
  return <span className={`flash ${dir ? `flash-${dir}` : ""} ${className}`}>{children}</span>;
}
