import { format } from "date-fns";

export function currentDate(): string {
  return format(new Date(), '[Today is a] dddd');
}
