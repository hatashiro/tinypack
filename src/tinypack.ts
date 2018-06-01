import { readFileSync } from "fs";
import { resolve, dirname } from "path";
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
  let id = fileModuleIdMap.get(file)!;
  let deps = new Map<string, number>();

  let content = readFileSync(file, "utf-8");
  let source = ts.createSourceFile(file, content, ts.ScriptTarget.ES2015);

  source.forEachChild(node => {
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      let importDecl = node as ts.ImportDeclaration;

      // module specifier should be a string literal
      let moduleSpecifier = importDecl.moduleSpecifier.getText(source);
      let depPath = JSON.parse(moduleSpecifier) as string;

      if (depPath.startsWith(".")) {
        if (!depPath.endsWith(".ts")) {
          depPath += ".ts";
        }
        let depAbsPath = resolve(dirname(file), depPath);
        let depID = fileModuleIdMap.get(depAbsPath);
        if (depID === undefined) {
          depID = ++moduleID;
          fileModuleIdMap.set(depAbsPath, depID);
          files.push(depAbsPath);
        }
        deps.set(depPath, depID);
      } else {
        // FIXME: Node.js module resolution
      }
    }
  });

  let transpiled = ts.transpileModule(content, {
    compilerOptions: {
      target: ts.ScriptTarget.ES5,
      module: ts.ModuleKind.CommonJS,
      noImplicitUseStrict: true,
      pretty: true
    }
  }).outputText;

  return { id, file, deps, transpiled };
}

let modules: Array<Module> = [];

let file;
while (file = files.shift()) {
  modules.push(compile(file));
}

// FIXME: code generation for modules
console.log(modules);
