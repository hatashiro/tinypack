import * as moment from "moment";

export function currentDate(): string {
  return moment().format('[Today is a] dddd');
}
