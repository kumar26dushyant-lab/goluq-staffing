import { useEffect } from "react";

/**
 * Run `fn` now and every `ms`, but only while the tab is visible. A cockpit
 * left open in a background tab used to keep hitting the API every few
 * seconds all day; a hidden tab now costs nothing and catches up on return.
 */
export function usePoll(fn: () => void, ms: number, deps: unknown[] = []): void {
  useEffect(() => {
    let iv: number | null = null;
    const start = () => { if (iv === null) { fn(); iv = window.setInterval(fn, ms); } };
    const stop = () => { if (iv !== null) { window.clearInterval(iv); iv = null; } };
    const onVis = () => (document.visibilityState === "visible" ? start() : stop());
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
