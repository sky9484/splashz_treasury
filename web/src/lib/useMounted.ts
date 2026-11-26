"use client";
import { useEffect, useState } from "react";

/** Wallet state only exists in the browser. Render the server-safe version until after hydration. */
export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
