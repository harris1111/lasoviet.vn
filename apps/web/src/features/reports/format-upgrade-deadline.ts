export function formatUpgradeDeadline(
  dateStr: string,
  locale: "vi" | "en",
): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);

    const find = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const day = find("day");
    const month = find("month");
    const year = find("year");
    const hour = find("hour");
    const minute = find("minute");

    if (locale === "vi") {
      return `${hour}:${minute} ${day}/${month}/${year}`;
    }
    return `${year}-${month}-${day} ${hour}:${minute}`;
  } catch {
    return dateStr;
  }
}
