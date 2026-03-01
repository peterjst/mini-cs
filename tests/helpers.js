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
    'var globalThis = window;\n' +
    'var requestAnimationFrame = window.requestAnimationFrame;\n' +
    'var cancelAnimationFrame = window.cancelAnimationFrame;\n' +
    'var localStorage = window.localStorage;\n' +
    'var AudioContext = window.AudioContext;\n' +
    'var performance = window.performance;\n' +
    'var speechSynthesis = window.speechSynthesis;\n' +
    'var SpeechSynthesisUtterance = window.SpeechSynthesisUtterance;\n' +
    code
  );
  fn(globalThis, document, globalThis.THREE, globalThis.GAME);
}

export function loadGameModules(...paths) {
  paths.forEach(function(p) { loadModule(p); });
}

export function freshGame() {
  globalThis.GAME = {};
}
