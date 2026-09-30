import * as THREE from 'three';
import { fbm, smoothstep } from '../utils/math.js';
import { islandRadius, profile, SPOTS, pathMask } from './layout.js';
import { worldMaterial } from './materials.js';

const FLAT = Object.values(SPOTS);

function hills(x, z) {
  let n = fbm(x * 0.03, z * 0.03, 3) * 3.2;
  if (n < 0) n *= 0.25;
  return n + fbm(x * 0.15 + 7.3, z * 0.15 - 2.1, 2) * 0.25;
}

/** Terrain height, without the path wobble (cheap enough to call per frame). */
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  const t = r / islandRadius(Math.atan2(z, x));
  let k = 1 - smoothstep(0.62, 0.8, t);
  if (k <= 0) return profile(t);
  for (const s of FLAT) k *= smoothstep(s.r, s.r + 7, Math.hypot(x - s.x, z - s.z));
  return profile(t) + hills(x, z) * k;
}

const COLORS = {
  grassA: new THREE.Color('#5b8c3a'),
  grassB: new THREE.Color('#86ad4c'),
  grassDark: new THREE.Color('#44702f'),
  dirt: new THREE.Color('#8e6c45'),
  sand: new THREE.Color('#e3c78e'),
  wetSand: new THREE.Color('#b79862'),
  seabed: new THREE.Color('#7f6c4f'),
};

export function buildTerrain() {
  const size = 170;
  const segments = 170;
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);

    // grass with low-frequency variation
    const v = fbm(x * 0.08 + 3, z * 0.08 - 5, 3) * 0.5 + 0.5;
    c.copy(COLORS.grassDark).lerp(COLORS.grassA, smoothstep(0.2, 0.5, v)).lerp(COLORS.grassB, smoothstep(0.55, 0.85, v));

    const p = pathMask(x, z);
    if (p > 0) c.lerp(COLORS.dirt, p * 0.9);

    // beach
    const sandK = smoothstep(0.75, 0.45, h);
    if (sandK > 0) c.lerp(tmp.copy(COLORS.sand), sandK);
    if (h < 0.12) c.lerp(COLORS.wetSand, smoothstep(0.12, -0.2, h));
    if (h < -0.4) c.lerp(COLORS.seabed, smoothstep(-0.4, -2, h));

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.deleteAttribute('uv');
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, worldMaterial);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

