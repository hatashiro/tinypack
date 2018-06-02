import "./subpath";
import { increase, x } from "./subpath/common";

increase();
increase();

console.log(x === 5);
