/**
 * Format an integer microdollar amount (1 USD = 1_000_000 microdollars) as
 * "$X.XXXX" — four-decimal precision, banker's-rounding-free.
 */
export function formatUsdMicro(microdollars: number): string {
  const sign = microdollars < 0 ? "-" : "";
  const abs = Math.abs(microdollars);
  const dollars = abs / 1_000_000;
  return `${sign}$${dollars.toFixed(4)}`;
}

export function formatInr(amountInr: number): string {
  const sign = amountInr < 0 ? "-" : "";
  const abs = Math.abs(amountInr);
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
