import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
});

describe('GAME.markStatic', () => {
  function makeNode() {
    var calls = 0;
    return {
      matrixAutoUpdate: true,
      updateMatrix: function() { calls++; this._updateCalls = calls; },
      children: []
    };
  }

  it('exists on GAME namespace', () => {
    expect(typeof GAME.markStatic).toBe('function');
  });

  it('sets matrixAutoUpdate=false on the root node', () => {
    var root = makeNode();
    GAME.markStatic(root);
    expect(root.matrixAutoUpdate).toBe(false);
  });

  it('calls updateMatrix() once on the root node', () => {
    var root = makeNode();
    GAME.markStatic(root);
    expect(root._updateCalls).toBe(1);
  });

  it('recurses through children', () => {
    var root = makeNode();
    var child = makeNode();
    var grandchild = makeNode();
    child.children.push(grandchild);
    root.children.push(child);

    GAME.markStatic(root);

    expect(child.matrixAutoUpdate).toBe(false);
    expect(grandchild.matrixAutoUpdate).toBe(false);
    expect(child._updateCalls).toBe(1);
    expect(grandchild._updateCalls).toBe(1);
  });

  it('handles nodes with no children', () => {
    var leaf = makeNode();
    expect(() => GAME.markStatic(leaf)).not.toThrow();
    expect(leaf.matrixAutoUpdate).toBe(false);
  });
});
