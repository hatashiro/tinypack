import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import * as ts from "typescript";

function error(msg: string) {
  console.error(msg);
  process.exit(1);
}

let input = process.argv[2];
if (!input) error("No input is provided.");

/*
 * STEP 1: Type check
 */
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

/*
 * STEP 2: Compile modules
 */
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
      let dep = JSON.parse(moduleSpecifier) as string;

      if (dep.startsWith(".")) {
        let depPath = dep.endsWith(".ts") ? dep : dep + ".ts";
        let depAbsPath = resolve(dirname(file), depPath);
        let depID = fileModuleIdMap.get(depAbsPath);
        if (depID === undefined) {
          depID = ++moduleID;
          fileModuleIdMap.set(depAbsPath, depID);
          files.push(depAbsPath);
        }
        deps.set(dep, depID);
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

/*
 * STEP 3: Code generation
 */
function* generate(modules: Array<Module>): Iterable<string> {
  yield ";(function (modules) {";

  yield `
var executedModules = {};
(function executeModule(id) {
  if (executedModules[id]) return executedModules[id];

  var mod = modules[id];
  var localRequire = function (path) {
    return executeModule(mod[1][path]);
  };
  var module = { exports: {} };
  executedModules[id] = module.exports;
  mod[0](localRequire, module, module.exports);
  return module.exports;
})(0);
`;

  yield "})({";

  for (let mod of modules) {
    yield `${mod.id}: [`;
    yield `function (require, module, exports) {`;
    yield mod.transpiled;
    yield "}, {";
    for (let [key, val] of mod.deps) {
      yield `${JSON.stringify(key)}: ${val},`
    }
    yield "}"
    yield "],";
  }

  yield "})";
}

let result: string = "";
for (let code of generate(modules)) {
  result += code + "\n";
}

console.log(result);
