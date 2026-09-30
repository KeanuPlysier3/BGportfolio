import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _color = new THREE.Color();
const _combined = new THREE.Matrix4();
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();

/** Build a transform: position, Y/X/Z rotation (applied Y first), scale. */
export function mat(x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  _euler.set(rx, ry, rz, 'YXZ');
  _quat.setFromEuler(_euler);
  return new THREE.Matrix4().compose(_pos.set(x, y, z), _quat, _scale.set(sx, sy, sz));
}

/**
 * Collects coloured primitives and merges them into a single mesh.
 * `add(geometry, color, local?, base?)` — final transform is base * local.
 */
export class GeoBuilder {
  constructor(random = Math.random) {
    this.parts = [];
    this.random = random;
  }

  add(geometry, color, local, base, jitter = 0) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (local && base) g.applyMatrix4(_combined.multiplyMatrices(base, local));
    else if (local || base) g.applyMatrix4(local || base);

    _color.set(color);
    if (jitter) _color.offsetHSL(0, 0, (this.random() - 0.5) * jitter);
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = _color.r;
      colors[i * 3 + 1] = _color.g;
      colors[i * 3 + 2] = _color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.clearGroups();
    this.parts.push(g);
    return this;
  }

  get empty() {
    return this.parts.length === 0;
  }

  build(material, { castShadow = true, receiveShadow = true } = {}) {
    if (this.empty) return null;
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  }
}

/* Shared primitive templates (cloned by GeoBuilder.add, never mutated). */
export const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6),
  cyl8: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  cyl12: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
  cone5: new THREE.ConeGeometry(0.5, 1, 5),
  cone7: new THREE.ConeGeometry(0.5, 1, 7),
  cone4: new THREE.ConeGeometry(0.5, 1, 4),
  ico0: new THREE.IcosahedronGeometry(0.5, 0),
  ico1: new THREE.IcosahedronGeometry(0.5, 1),
  dodeca: new THREE.DodecahedronGeometry(0.5, 0),
  octa: new THREE.OctahedronGeometry(0.5, 0),
  sphere: new THREE.SphereGeometry(0.5, 8, 6),
};

/** Tapered cylinder with its own top/bottom radius (not cached). */
export const taper = (top, bottom, h, seg = 7) => new THREE.CylinderGeometry(top, bottom, h, seg);
