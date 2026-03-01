import { readFileSync } from 'fs';
import { resolve } from 'path';

var moduleCache = {};

export function loadModule(relativePath) {
  var absPath = resolve(relativePath);
  if (!moduleCache[absPath]) {
    moduleCache[absPath] = readFileSync(absPath, 'utf-8');
  }
  var code = moduleCache[absPath];
  var fn = new Function('window', 'document', 'THREE', 'GAME',
    'var globalThis = window;\n' + code
  );
  fn(globalThis, document, globalThis.THREE, globalThis.GAME);
}

export function loadGameModules(...paths) {
  paths.forEach(function(p) { loadModule(p); });
}

export function freshGame() {
  globalThis.GAME = {};
}
