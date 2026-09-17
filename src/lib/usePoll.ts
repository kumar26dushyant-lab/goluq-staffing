import { useEffect, useRef } from "react";
import { pollsPaused } from "./adminApi";

/**
 * Run `fn` now and every `ms`, but only while the tab is visible. A cockpit
 * left open in a background tab used to keep hitting the API every few
 * seconds all day; a hidden tab now costs nothing and catches up on return.
 *
 * The latest `fn` is kept in a ref, so a caller may pass a fresh closure on
 * every render without restarting the timer. Before this, a poller whose
 * callback changed with the data it fetched (the open conversation, for
 * one) restarted after every response and fired again at once — a request
 * loop as fast as the network, which tripped the rate limit and froze the
 * rest of the cockpit. `deps` restart the timer only for real changes: a
 * different search, filter or open thread.
 */
export function usePoll(fn: () => void, ms: number, deps: unknown[] = []): void {
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => {
    let iv: number | null = null;
    const tick = () => { if (!pollsPaused()) latest.current(); };
    const start = () => { if (iv === null) { tick(); iv = window.setInterval(tick, ms); } };
    const stop = () => { if (iv !== null) { window.clearInterval(iv); iv = null; } };
    const onVis = () => (document.visibilityState === "visible" ? start() : stop());
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}
