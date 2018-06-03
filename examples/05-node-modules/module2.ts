import * as format from "date-fns/format";

export function currentDate(): string {
  return format(new Date(), '[Today is a] dddd');
}
