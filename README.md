# Tinypack

A simple TypeScript module bundler, inspired by [minipack](https://github.com/ronami/minipack)

## Features

- [x] Minimal dependency (only [the TypeScript Compiler API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API))
- [x] Type check
- [x] Bundle TypeScript modules (only ECMAScript Modules)
- [x] Remove duplication for the same module
- [x] Resolve circular dependency
- [x] `node_modules` resolution

## Install

### Install globally with npm

```shell
npm install -g @utatti/tinypack
```

Run with `tinypack`.

### Manual install from source

```shell
git clone https://github.com/utatti/tinypack.git
cd tinypack
yarn # or `npm i` should work too
```

Run `bin/tinypack` in the project root.

## How to use

```shell
tinypack path/to/entry.ts
```

### Play with [examples](examples)

```shell
tinypack examples/01-simple # stdout
tinypack examples/01-simple | node # run
```

## How does it work?

Use [the code](src/tinypack.ts), Luke!

## References

- [Minipack](https://github.com/ronami/minipack): A simplified example of a
  modern module bundler written in JavaScript
- [The TypeScript Compiler API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API)

## License

[MIT](LICENSE)
