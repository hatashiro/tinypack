import {
  readFileSync as readFile,
  writeFileSync as writeFile,
  statSync as stat,
  existsSync as exists
} from "fs";
import { resolve, dirname } from "path";
import * as ts from "typescript";

function error(msg: string): any {
  console.error(msg);
  process.exit(1);
}

let input = process.argv[2];
if (!input) error("No input is provided.");

let isFile = (path: string) => exists(path) && stat(path).isFile();
let isDir = (path: string) => exists(path) && stat(path).isDirectory();

function localModulePath(path: string, from?: string): string {
  let absPath = from ? resolve(dirname(from), path) : resolve(path);
  let tsPath = absPath.endsWith(".ts") ? absPath : absPath + ".ts";
  let indexPath = resolve(absPath, "index.ts");
  return isFile(tsPath) ? tsPath :
         isDir(absPath) && isFile(indexPath) ? indexPath :
         error(`Cannot find module '${path}'.`);
}

function npmModulePath(pkg: string, from: string): string {
  let projRoot = dirname(from);
  while (!isDir(resolve(projRoot, "node_modules"))) {
    projRoot = dirname(projRoot);
  }

  let pkgRoot = resolve(projRoot, "node_modules", pkg);

  let jsPath = pkgRoot + ".js";
  if (isFile(jsPath)) {
    return jsPath;
  }

  let packageJSONPath = resolve(pkgRoot, "package.json");
  if (isFile(packageJSONPath)) {
    let main: string = require(packageJSONPath).module ||
                       require(packageJSONPath).main;
    if (main) {
      return resolve(pkgRoot, main);
    }
  }

  let indexPath = resolve(pkgRoot, "index.js");
  if (isFile(indexPath)) {
    return indexPath;
  }

  return error(`Cannot find module '${pkg}'.`);
}

let entryFile = localModulePath(input);

/*
 * STEP 1: Type check
 */
let diagnostics = ts.getPreEmitDiagnostics(
  ts.createProgram([entryFile], {
    strict: true,
    target: ts.ScriptTarget.Latest,
    moduleResolution: ts.ModuleResolutionKind.NodeJs
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

let moduleID = 0;
let fileModuleIdMap = new Map([[entryFile, moduleID]]);

let files = [entryFile];

function compile(file: string): Module {
  let id = fileModuleIdMap.get(file)!;
  let deps = new Map<string, number>();

  let content = readFile(file, "utf-8");
  let source = ts.createSourceFile(file, content, ts.ScriptTarget.ES2015);

  source.forEachChild(node => {
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      let importDecl = node as ts.ImportDeclaration;

      // module specifier should be a string literal
      let moduleSpecifier = importDecl.moduleSpecifier.getText(source);
      let dep = JSON.parse(moduleSpecifier) as string;

      let depPath: string;
      if (dep.startsWith(".")) {
        depPath = localModulePath(dep, file);
      } else {
        depPath = npmModulePath(dep, file);
      }
      let depID = fileModuleIdMap.get(depPath);
      if (depID === undefined) {
        depID = ++moduleID;
        fileModuleIdMap.set(depPath, depID);
        files.push(depPath);
      }
      deps.set(dep, depID);
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
