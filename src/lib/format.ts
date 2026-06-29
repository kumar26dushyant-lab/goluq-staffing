/** ₹ with Indian digit grouping (BUILD_SPEC: use toLocaleString('en-IN')). */
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
