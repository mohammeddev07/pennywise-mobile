import { format } from "date-fns";

export function formatDashboardDate(d: Date) {
  // Matches “Monday, 24 April”
  return format(d, "EEEE, d MMMM");
}

export function formatShortDate(d: Date) {
  return format(d, "MMM d");
}
