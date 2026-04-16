import { describe, it, expect, beforeAll } from 'vitest';
import { loadModule } from '../helpers.js';

beforeAll(() => {
  loadModule('js/maps/shared.js');
});

describe('randomSpawnInZone', () => {
  var randomSpawnInZone;
  beforeAll(() => {
    randomSpawnInZone = GAME._mapHelpers.randomSpawnInZone;
  });

  it('should be a function', () => {
    expect(typeof randomSpawnInZone).toBe('function');
  });

  it('should return {x, z} within zone radius', () => {
    var zone = { x: 10, z: 10, radius: 4, label: 'ct' };
    for (var i = 0; i < 50; i++) {
      var pos = randomSpawnInZone(zone, []);
      var dx = pos.x - zone.x, dz = pos.z - zone.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      expect(dist).toBeLessThanOrEqual(zone.radius + 0.01);
    }
  });

  it('should return zone center when radius is 0', () => {
    var zone = { x: 5, z: -3, radius: 0, label: 'mid' };
    var pos = randomSpawnInZone(zone, []);
    expect(pos.x).toBe(5);
    expect(pos.z).toBe(-3);
  });

  it('should fall back to zone center after wall collisions', () => {
    var wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(100, 4, 100),
      new THREE.MeshStandardMaterial()
    );
    wallMesh.position.set(10, 2, 10);
    var zone = { x: 10, z: 10, radius: 4, label: 'ct' };
    var pos = randomSpawnInZone(zone, [wallMesh]);
    expect(pos.x).toBe(zone.x);
    expect(pos.z).toBe(zone.z);
  });
});

describe('pickSpawnZone', () => {
  var pickSpawnZone;
  beforeAll(() => {
    pickSpawnZone = GAME._mapHelpers.pickSpawnZone;
  });

  it('should be a function', () => {
    expect(typeof pickSpawnZone).toBe('function');
  });

  it('should return zone matching label', () => {
    var zones = [
      { x: 0, z: 0, radius: 4, label: 'ct' },
      { x: 10, z: 10, radius: 4, label: 't' },
      { x: 5, z: 5, radius: 5, label: 'mid' }
    ];
    var zone = pickSpawnZone(zones, 'ct');
    expect(zone.label).toBe('ct');
    expect(zone.x).toBe(0);
  });

  it('should return a random zone when label is null', () => {
    var zones = [
      { x: 0, z: 0, radius: 4, label: 'ct' },
      { x: 10, z: 10, radius: 4, label: 't' },
      { x: 5, z: 5, radius: 5, label: 'mid' }
    ];
    var seen = {};
    for (var i = 0; i < 100; i++) {
      var zone = pickSpawnZone(zones, null);
      seen[zone.label] = true;
    }
    expect(Object.keys(seen).length).toBeGreaterThanOrEqual(2);
  });

  it('should return zone furthest from a position when label is "furthest"', () => {
    var zones = [
      { x: 0, z: 0, radius: 4, label: 'ct' },
      { x: 50, z: 50, radius: 4, label: 't' },
      { x: 25, z: 25, radius: 5, label: 'mid' }
    ];
    var zone = pickSpawnZone(zones, 'furthest', [{ x: 1, z: 1 }]);
    expect(zone.label).toBe('t');
  });

  it('should return first zone as fallback for unknown label', () => {
    var zones = [
      { x: 0, z: 0, radius: 4, label: 'ct' },
      { x: 10, z: 10, radius: 4, label: 't' }
    ];
    var zone = pickSpawnZone(zones, 'nonexistent');
    expect(zone).toBeDefined();
  });
});
