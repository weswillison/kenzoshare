// The server runs in UTC; members are all in Philadelphia.
const ZONE = "America/New_York";
const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: ZONE,
});
const dayFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// A plain date like "2026-10-20" has no time of day, so it's shown as
// written rather than shifted into Philadelphia time.
export const formatDate = (iso: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso) ? dayFmt.format(new Date(`${iso}T00:00:00Z`)) : dateFmt.format(new Date(iso));

// The last second of a plain date in Philadelphia, as a timestamp. The
// offset is looked up for that date, so daylight saving time is handled.
export function endOfDay(date: string) {
  const offset = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, timeZoneName: "longOffset" })
    .formatToParts(new Date(`${date}T12:00:00Z`))
    .find((p) => p.type === "timeZoneName")!.value.replace("GMT", "");
  return new Date(`${date}T23:59:59${offset}`).toISOString();
}

const moneyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const formatCents = (cents: number) => moneyFmt.format(cents / 100);
