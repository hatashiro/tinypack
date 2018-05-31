import { readFileSync } from "fs";
console.log(readFileSync(process.argv[2], "utf-8"));
