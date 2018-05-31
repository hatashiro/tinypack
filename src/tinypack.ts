import { readFileSync } from "fs";
import { resolve } from "path";
import * as ts from "typescript";

function error(msg: string) {
  console.error(msg);
  process.exit(1);
}

let input = process.argv[2];

if (!input) error("No input is provided.");

let diagnostics = ts.getPreEmitDiagnostics(
  ts.createProgram([input], {
    strict: true,
    target: ts.ScriptTarget.Latest
  })
);

if (diagnostics.length) {
  diagnostics.forEach(d => console.log(d.messageText));
  error("Errors.");
}

type Module = {
  id: number;
  file: string;
  deps: Map<string, number>;
  transpiled: string;
}

let entryFile = resolve(input);
let moduleID = 0;
let fileModuleIdMap = new Map([[entryFile, moduleID]]);

let files = [entryFile];

function compile(file: string): Module {
  // FIXME
  // 1. Traverse `import` and create `deps`
  // 2. Get the absolute path of the import target
  // 3. If it's already in fileModuleIdMap, use the module ID.
  // 4. If not, fileModuleIdMap.set(path, ++moduleID) and files.push(path)
  // 5. Create a Module object and return
  return {} as any;
}

let modules: Array<Module> = [];

let file;
while (file = files.shift()) {
  modules.push(compile(file));
}

// FIXME: code generation for modules
