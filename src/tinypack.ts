import { readFileSync } from "fs";
import * as ts from "typescript";

let input = process.argv[2];

const program = ts.createProgram([input], { strict: true });
const diagnostics = ts.getPreEmitDiagnostics(program);

diagnostics.forEach(d => {
  console.log(d.messageText);
})
