// The server runs in UTC; members are all in Philadelphia.
const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/New_York",
});

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
