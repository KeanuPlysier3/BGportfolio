import * as THREE from 'three';
import { G, mat, taper, GeoBuilder } from './builder.js';
import { PALETTE as P, GLOW, worldMaterial } from './materials.js';
import { heightAt } from './terrain.js';
import { smoothstep } from '../utils/math.js';

/*
 * Every prop function receives a context:
 *   ctx.b        GeoBuilder for merged static geometry
 *   ctx.glow     GeoBuilder for merged glowing geometry
 *   ctx.physics  Physics (colliders / bodies)
 *   ctx.scene    for anything that needs its own mesh (animated / dynamic)
 *   ctx.anim     array of (dt, time) => void updaters
 *   ctx.rand     seeded random
 */

/* helpers ---------------------------------------------------------------- */
export function place(x, z, ry = 0, s = 1, y = heightAt(x, z)) {
  return mat(x, y, z, ry, 0, 0, s);
}
const box = (b, color, base, x, y, z, w, h, d, ry = 0, rx = 0, rz = 0, jitter = 0) =>
  b.add(G.box, color, mat(x, y, z, ry, rx, rz, w, h, d), base, jitter);
const cyl = (b, color, base, x, y, z, r, h, ry = 0, rx = 0, rz = 0, geo = G.cyl8) =>
  b.add(geo, color, mat(x, y, z, ry, rx, rz, r * 2, h, r * 2), base);
const ball = (b, color, base, x, y, z, r, geo = G.ico1, jitter = 0, sy = 1) =>
  b.add(geo, color, mat(x, y, z, 0, 0, 0, r * 2, r * 2 * sy, r * 2), base, jitter);

/**
 * Roofs get their own mesh that turns see-through when the player walks
 * underneath, so the top-down camera can still see what's inside.
 */
function fadingRoof(ctx, x, z, build) {
  const rb = new GeoBuilder(ctx.rand);
  build(rb);
  const material = worldMaterial.clone();
  material.transparent = true;
  const roof = rb.build(material, { receiveShadow: false });
  ctx.scene.add(roof);
  ctx.anim.push(() => {
    const d = Math.hypot(ctx.focus.x - x, ctx.focus.z - z);
    material.opacity = 0.18 + 0.82 * smoothstep(3.2, 7.5, d);
    material.depthWrite = material.opacity > 0.97;
    roof.castShadow = material.opacity > 0.6;
  });
}

/** World-space XZ of a local point on a placed prop. */
function local(x, z, ry, lx, lz) {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  return [x + lx * c + lz * s, z - lx * s + lz * c];
}

/* nature ----------------------------------------------------------------- */
export function roundTree(ctx, x, z, s = 1) {
  const { b, rand } = ctx;
  const m = place(x, z, rand() * Math.PI * 2, s);
  b.add(taper(0.18, 0.28, 2.4, 6), P.wood, mat(0, 1.2, 0), m, 0.1);
  const leaves = [P.leaf, P.leafLight, P.leafDark];
  const blobs = 3 + Math.floor(rand() * 2);
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + rand();
    const d = i === 0 ? 0 : 0.7 + rand() * 0.3;
    const r = i === 0 ? 1.5 : 1.0 + rand() * 0.35;
    ball(b, leaves[i % 3], m, Math.cos(a) * d, 3.0 + rand() * 0.7 + (i === 0 ? 0.4 : 0), Math.sin(a) * d, r, G.ico0, 0.08);
  }
  ctx.physics.addCircle(x, z, 0.4 * s);
}

export function pineTree(ctx, x, z, s = 1) {
  const { b, rand } = ctx;
  const m = place(x, z, rand() * Math.PI * 2, s * (0.85 + rand() * 0.3));
  b.add(taper(0.14, 0.22, 1.6, 6), P.woodDark, mat(0, 0.8, 0), m);
  const tiers = [
    [1.7, 2.2, 1.9],
    [1.3, 1.9, 3.1],
    [0.9, 1.6, 4.1],
  ];
  tiers.forEach(([r, h, y], i) => {
    b.add(G.cone7, i % 2 ? P.pineLight : P.pine, mat(0, y, 0, rand(), 0, 0, r * 2, h, r * 2), m, 0.06);
  });
  ctx.physics.addCircle(x, z, 0.35 * s);
}

export function rock(ctx, x, z, r = 0.6, collide = true) {
  const { b, rand } = ctx;
  const m = mat(x, heightAt(x, z) - r * 0.25, z, rand() * 6, rand() * 0.6, rand() * 0.6, r * 2, r * 2 * (0.55 + rand() * 0.35), r * 2 * (0.8 + rand() * 0.4));
  b.add(G.dodeca, rand() > 0.5 ? P.stone : P.stoneDark, null, m, 0.12);
  if (collide && r > 0.45) ctx.physics.addCircle(x, z, r * 0.85);
}

export function bush(ctx, x, z, s = 1) {
  const { b, rand } = ctx;
  const m = place(x, z, rand() * 6, s);
  ball(b, P.leafLight, m, 0, 0.35, 0, 0.55, G.ico0, 0.1, 0.8);
  ball(b, P.leaf, m, 0.4, 0.3, 0.2, 0.4, G.ico0, 0.1, 0.8);
  ball(b, P.leaf, m, -0.3, 0.28, -0.25, 0.38, G.ico0, 0.1, 0.8);
}

export function mushroom(ctx, x, z, s = 1) {
  const { b, rand } = ctx;
  const m = place(x, z, rand() * 6, s);
  cyl(b, P.paper, m, 0, 0.12, 0, 0.04, 0.24, 0, 0, 0, G.cyl6);
  b.add(new THREE.SphereGeometry(0.14, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), rand() > 0.3 ? '#b8453a' : '#c98f3c', mat(0, 0.22, 0), m);
}

/* camp furniture --------------------------------------------------------- */
const tentShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(-1.7, 0);
  s.lineTo(1.7, 0);
  s.lineTo(0, 2.3);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 3.6, bevelEnabled: false });
  g.translate(0, 0, -1.8);
  return g;
})();
const doorShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.62, 0);
  s.lineTo(0.62, 0);
  s.lineTo(0, 1.45);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false });
  g.translate(0, 0, 1.79);
  return g;
})();

export function tent(ctx, x, z, ry, color, accent = P.gold) {
  const { b } = ctx;
  const m = place(x, z, ry);
  b.add(tentShape, P.canvas, null, m);
  // coloured stripe over the ridge
  b.add(tentShape, color, mat(0, 0.02, 0, 0, 0, 0, 1.02, 1.0, 0.3), m);
  b.add(doorShape, P.dark, null, m);
  // open flaps
  box(b, color, m, -0.75, 0.75, 1.95, 0.08, 1.5, 0.7, 0.9, 0, 0.35);
  box(b, color, m, 0.75, 0.75, 1.95, 0.08, 1.5, 0.7, -0.9, 0, -0.35);
  // poles + ridge
  cyl(b, P.woodDark, m, 0, 1.35, 1.88, 0.05, 2.7, 0, 0, 0, G.cyl6);
  cyl(b, P.woodDark, m, 0, 1.35, -1.88, 0.05, 2.7, 0, 0, 0, G.cyl6);
  cyl(b, P.woodDark, m, 0, 2.32, 0, 0.04, 4.1, 0, Math.PI / 2, 0, G.cyl6);
  // pennant
  b.add(G.cone4, accent, mat(0, 2.55, 2.1, 0, Math.PI / 2, 0, 0.05, 0.5, 0.3), m);
  // rug
  box(b, color, m, 0, 0.03, 2.8, 1.5, 0.04, 1.2, 0, 0, 0, 0.1);
  box(b, accent, m, 0, 0.035, 2.8, 1.1, 0.04, 0.8);
  ctx.physics.addBox(x, z, 1.75, 1.95, ry);
}

export function bedroll(ctx, x, z, ry, color) {
  const { b } = ctx;
  const m = place(x, z, ry);
  box(b, color, m, 0, 0.07, 0, 0.8, 0.14, 1.9, 0, 0, 0, 0.05);
  box(b, P.canvas, m, 0, 0.12, -0.75, 0.6, 0.14, 0.35);
  cyl(b, color, m, 0, 0.18, 0.85, 0.18, 0.8, 0, 0, Math.PI / 2);
}

export function logSeat(ctx, x, z, ry, len = 2.2) {
  const { b } = ctx;
  const m = place(x, z, ry);
  cyl(b, P.wood, m, 0, 0.28, 0, 0.28, len, 0, 0, Math.PI / 2, G.cyl8);
  cyl(b, P.woodLight, m, len / 2 + 0.005, 0.28, 0, 0.24, 0.02, 0, 0, Math.PI / 2, G.cyl8);
  cyl(b, P.woodLight, m, -len / 2 - 0.005, 0.28, 0, 0.24, 0.02, 0, 0, Math.PI / 2, G.cyl8);
  ctx.physics.addBox(x, z, len / 2, 0.3, ry);
}

export function stool(ctx, x, z) {
  const m = place(x, z, ctx.rand() * 6);
  cyl(ctx.b, P.wood, m, 0, 0.25, 0, 0.26, 0.5, 0, 0, 0, G.cyl8);
  ctx.physics.addCircle(x, z, 0.3);
}

export function table(ctx, m, w, d, h = 0.9, color = P.plank) {
  const { b } = ctx;
  box(b, color, m, 0, h, 0, w, 0.1, d, 0, 0, 0, 0.04);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(b, P.woodDark, m, sx * (w / 2 - 0.12), h / 2, sz * (d / 2 - 0.12), 0.1, h, 0.1);
}

export function candle(ctx, m, x, y, z) {
  cyl(ctx.b, P.paper, m, x, y + 0.08, z, 0.04, 0.16, 0, 0, 0, G.cyl6);
  ctx.glow.add(G.cone5, GLOW.candle, mat(x, y + 0.21, z, 0, 0, 0, 0.05, 0.1, 0.05), m);
}

export function lanternPost(ctx, x, z, ry) {
  const { b, glow } = ctx;
  const m = place(x, z, ry);
  cyl(b, P.woodDark, m, 0, 1.2, 0, 0.07, 2.4, 0, 0, 0, G.cyl6);
  box(b, P.woodDark, m, 0.3, 2.3, 0, 0.7, 0.08, 0.08);
  box(b, P.metalDark, m, 0.55, 1.98, 0, 0.26, 0.05, 0.26);
  box(b, P.metalDark, m, 0.55, 1.68, 0, 0.26, 0.05, 0.26);
  b.add(G.cone4, P.metalDark, mat(0.55, 2.1, 0, Math.PI / 4, 0, 0, 0.36, 0.2, 0.36), m);
  glow.add(G.box, GLOW.lantern, mat(0.55, 1.83, 0, 0, 0, 0, 0.18, 0.26, 0.18), m);
  ctx.physics.addCircle(x, z, 0.15);
}

export function hangingLantern(ctx, x, y, z) {
  const { b, glow } = ctx;
  const m = mat(x, y, z);
  cyl(b, P.rope, m, 0, 0.45, 0, 0.012, 0.9, 0, 0, 0, G.cyl6);
  box(b, P.metalDark, m, 0, 0.02, 0, 0.2, 0.04, 0.2);
  box(b, P.metalDark, m, 0, -0.26, 0, 0.2, 0.04, 0.2);
  glow.add(G.box, GLOW.lantern, mat(0, -0.12, 0, 0, 0, 0, 0.14, 0.22, 0.14), m);
}

export function banner(ctx, x, z, ry, color, emblem = P.gold) {
  const { b } = ctx;
  const m = place(x, z, ry);
  cyl(b, P.woodDark, m, 0, 1.6, 0, 0.06, 3.2, 0, 0, 0, G.cyl6);
  box(b, P.woodDark, m, 0, 3.0, 0, 1.1, 0.07, 0.07);
  box(b, color, m, 0, 2.3, 0.05, 0.9, 1.3, 0.03);
  b.add(G.cone4, color, mat(0, 1.5, 0.05, Math.PI / 4, 0, 0, 0.9, 0.35, 0.03), m);
  b.add(G.octa, emblem, mat(0, 2.35, 0.08, 0, 0, 0, 0.36, 0.5, 0.04), m);
  ctx.physics.addCircle(x, z, 0.15);
}

/* dynamic props (own meshes, pushable) ----------------------------------- */
function dynamicMesh(ctx, build, x, z, ry) {
  const b = new GeoBuilder(ctx.rand);
  build(b);
  const mesh = b.build(worldMaterial);
  mesh.position.set(x, heightAt(x, z), z);
  mesh.rotation.y = ry;
  ctx.scene.add(mesh);
  return mesh;
}

export function crate(ctx, x, z, ry = 0, s = 1) {
  const mesh = dynamicMesh(
    ctx,
    (b) => {
      const w = 0.8 * s;
      box(b, P.plank, null, 0, w / 2, 0, w, w, w, 0, 0, 0, 0.08);
      for (const [dx, dz, bw, bd] of [
        [0, w / 2 + 0.01, w + 0.02, 0.04],
        [0, -w / 2 - 0.01, w + 0.02, 0.04],
        [w / 2 + 0.01, 0, 0.04, w + 0.02],
        [-w / 2 - 0.01, 0, 0.04, w + 0.02],
      ]) {
        box(b, P.woodDark, null, dx, 0.06, dz, bw, 0.1, bd);
        box(b, P.woodDark, null, dx, w - 0.06, dz, bw, 0.1, bd);
      }
    },
    x,
    z,
    ry,
  );
  ctx.physics.addBody(mesh, { r: 0.48 * s, mass: 1.2 * s });
}

export function barrel(ctx, x, z, ry = 0) {
  const mesh = dynamicMesh(
    ctx,
    (b) => {
      b.add(taper(0.36, 0.3, 1.0, 10), P.wood, mat(0, 0.5, 0), null, 0.08);
      b.add(taper(0.37, 0.31, 0.06, 10), P.metalDark, mat(0, 0.15, 0));
      b.add(taper(0.38, 0.38, 0.06, 10), P.metalDark, mat(0, 0.55, 0));
      b.add(taper(0.33, 0.37, 0.06, 10), P.metalDark, mat(0, 0.9, 0));
    },
    x,
    z,
    ry,
  );
  ctx.physics.addBody(mesh, { r: 0.4, mass: 1.4 });
}

export function sack(ctx, x, z) {
  const mesh = dynamicMesh(
    ctx,
    (b) => {
      ball(b, P.straw, null, 0, 0.32, 0, 0.36, G.ico1, 0.05, 0.9);
      cyl(b, P.rope, null, 0, 0.64, 0, 0.1, 0.1, 0, 0, 0, G.cyl6);
    },
    x,
    z,
    ctx.rand() * 6,
  );
  ctx.physics.addBody(mesh, { r: 0.36, mass: 0.8 });
}

export function d20(ctx, x, z) {
  const geo = new THREE.IcosahedronGeometry(0.55, 0);
  const b = new GeoBuilder();
  b.add(geo, '#b6272e', null, null);
  const mesh = b.build(worldMaterial);
  mesh.position.set(x, heightAt(x, z) + 0.45, z);
  ctx.scene.add(mesh);
  const body = ctx.physics.addBody(mesh, { r: 0.5, mass: 0.7, roll: true });
  // rest on the lower vertices rather than the centre
  body.lift = 0.45;
}

/* key locations ----------------------------------------------------------- */
export function campfire(ctx, x, z) {
  const { b, rand } = ctx;
  const m = place(x, z);
  cyl(b, '#2c241e', m, 0, 0.02, 0, 0.85, 0.06, 0, 0, 0, G.cyl12);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    b.add(G.dodeca, rand() > 0.5 ? P.stone : P.stoneDark, mat(Math.cos(a) * 1.05, 0.12, Math.sin(a) * 1.05, rand() * 6, rand(), 0, 0.5, 0.34, 0.45), m, 0.12);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const beta = Math.atan2(-Math.cos(a), -Math.sin(a));
    b.add(taper(0.1, 0.12, 1.25, 6), i % 2 ? P.wood : P.woodDark, mat(Math.cos(a) * 0.38, 0.4, Math.sin(a) * 0.38, beta, 0.62, 0), m);
  }
  // cooking tripod + pot
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const beta = Math.atan2(-Math.cos(a), -Math.sin(a));
    b.add(taper(0.03, 0.03, 2.3, 5), P.woodDark, mat(Math.cos(a) * 0.34, 1.05, Math.sin(a) * 0.34, beta, 0.3, 0), m);
  }
  cyl(b, P.dark, m, 0, 1.85, 0, 0.012, 0.6, 0, 0, 0, G.cyl6);
  b.add(new THREE.SphereGeometry(0.28, 8, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#2d2a27', mat(0, 1.45, 0), m);
  cyl(b, '#2d2a27', m, 0, 1.44, 0, 0.29, 0.05, 0, 0, 0, G.cyl8);
  ctx.physics.addCircle(x, z, 1.25);
}

export function questBoard(ctx, x, z, ry) {
  const { b } = ctx;
  const m = place(x, z, ry);
  for (const sx of [-1, 1]) cyl(b, P.woodDark, m, sx * 1.25, 1.35, 0, 0.09, 2.7, 0, 0, 0, G.cyl6);
  box(b, P.plank, m, 0, 1.65, 0, 2.5, 1.5, 0.1, 0, 0, 0, 0.04);
  box(b, P.woodDark, m, 0, 2.45, 0, 2.8, 0.1, 0.12);
  // little roof
  box(b, P.red, m, 0, 2.78, 0.22, 3.0, 0.08, 0.7, 0, -0.55, 0);
  box(b, P.red, m, 0, 2.78, -0.22, 3.0, 0.08, 0.7, 0, 0.55, 0);
  // notices
  const notes = [
    [-0.8, 1.9, 0.5, 0.6, 0.05],
    [-0.2, 1.75, 0.45, 0.55, -0.08],
    [0.45, 1.95, 0.55, 0.7, 0.06],
    [0.95, 1.5, 0.4, 0.5, -0.1],
    [-0.75, 1.25, 0.45, 0.45, 0.12],
    [0.2, 1.25, 0.5, 0.45, 0],
  ];
  notes.forEach(([nx, ny, w, h, rz], i) => box(b, i === 2 ? '#f3dca0' : P.paper, m, nx, ny, 0.07, w, h, 0.02, 0, 0, rz));
  // wax seal on the "WANTED" notice
  cyl(b, '#9b2323', m, 0.45, 1.75, 0.09, 0.07, 0.03, 0, Math.PI / 2, 0, G.cyl8);
  ctx.physics.addBox(x, z, 1.4, 0.2, ry);
}

export function waypoint(ctx, x, z) {
  const { b, glow } = ctx;
  const m = place(x, z);
  cyl(b, P.stoneLight, m, 0, 0.12, 0, 1.7, 0.25, 0, 0, 0, G.cyl8);
  cyl(b, P.stone, m, 0, 0.3, 0, 1.2, 0.15, Math.PI / 8, 0, 0, G.cyl8);
  b.add(taper(0.28, 0.48, 2.8, 4), P.stoneDark, mat(0, 1.7, 0, Math.PI / 4), m, 0.05);
  b.add(G.cone4, P.stoneDark, mat(0, 3.25, 0, Math.PI / 4, 0, 0, 0.56, 0.35, 0.56), m);
  // glowing runes on each face
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const r = 0.37;
    for (let k = 0; k < 3; k++) {
      glow.add(G.box, GLOW.rune, mat(Math.sin(a) * r, 1.2 + k * 0.45, Math.cos(a) * r, a, 0, (k % 2 ? 0.4 : -0.3), 0.12, 0.22, 0.02), m);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    glow.add(G.box, GLOW.rune, mat(Math.cos(a) * 1.45, 0.255, Math.sin(a) * 1.45, -a, 0, 0, 0.3, 0.02, 0.08), m);
  }

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.035, 6, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(GLOW.rune).multiplyScalar(3) }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(x, heightAt(x, z) + 1.2, z);
  ctx.scene.add(ring);
  const light = new THREE.PointLight('#6fd8ff', 10, 9, 1.6);
  light.position.set(x, heightAt(x, z) + 2, z);
  ctx.scene.add(light);
  ctx.anim.push((dt, t) => {
    ring.position.y = heightAt(x, z) + 1.4 + Math.sin(t * 1.4) * 0.5;
    ring.scale.setScalar(1 + Math.sin(t * 1.4) * 0.12);
    ring.rotation.z = t * 0.4;
    light.intensity = 9 + Math.sin(t * 2.3) * 2;
  });
  ctx.physics.addCircle(x, z, 0.6);
}

/** Plan A — a war table with a map of Antwerp, pins and figurines. */
export function warTable(ctx, x, z, ry) {
  const { b } = ctx;
  const m = place(x, z, ry);
  table(ctx, m, 3.4, 2.2, 0.95, P.woodDark);
  box(b, P.paper, m, 0, 1.01, 0, 3.0, 0.02, 1.9);
  // the Scheldt river + districts
  const river = [
    [-1.3, -0.6, 0.6, 0.5],
    [-0.8, -0.2, 0.7, 0.2],
    [-0.3, 0.25, 0.7, -0.5],
    [0.35, 0.45, 0.8, 0.2],
    [1.0, 0.35, 0.7, -0.4],
  ];
  river.forEach(([rx, rz, len, rot]) => box(b, '#5b86a8', m, rx, 1.025, rz, len, 0.01, 0.18, rot));
  box(b, '#c9b58a', m, 0.3, 1.024, -0.4, 0.9, 0.01, 0.6, 0.2);
  box(b, '#b7a37a', m, -0.5, 1.024, 0.65, 0.6, 0.01, 0.4, -0.3);
  // pins with coloured flags = trip stops
  const pins = [
    [-0.9, -0.5, '#c63b3b'],
    [0.2, -0.3, '#e0b64a'],
    [0.9, 0.0, '#3b7bc6'],
    [-0.2, 0.6, '#4bb069'],
    [1.2, -0.6, '#c63b3b'],
  ];
  for (const [px, pz, col] of pins) {
    cyl(b, P.metalDark, m, px, 1.15, pz, 0.012, 0.28, 0, 0, 0, G.cyl6);
    box(b, col, m, px + 0.08, 1.25, pz, 0.16, 0.1, 0.01);
  }
  // dotted route between pins
  for (let i = 0; i < pins.length - 1; i++) {
    const [ax, az] = pins[i];
    const [bx, bz] = pins[i + 1];
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      box(b, '#7a2d2d', m, ax + (bx - ax) * t, 1.024, az + (bz - az) * t, 0.05, 0.01, 0.05);
    }
  }
  // figurines
  for (const [fx, fz, col] of [
    [-1.2, 0.5, P.blue],
    [-1.05, 0.62, P.red],
    [1.3, 0.7, P.gold],
  ]) {
    cyl(b, col, m, fx, 1.08, fz, 0.05, 0.12, 0, 0, 0, G.cyl6);
    ball(b, col, m, fx, 1.18, fz, 0.045);
  }
  candle(ctx, m, -1.45, 1.0, -0.8);
  candle(ctx, m, 1.45, 1.0, 0.8);
  // scroll rolls and an inkwell
  cyl(b, P.paper, m, 1.2, 1.06, -0.8, 0.05, 0.5, 0.3, 0, Math.PI / 2, G.cyl6);
  cyl(b, P.dark, m, -1.3, 1.07, 0.1, 0.06, 0.1, 0, 0, 0, G.cyl6);
  ctx.physics.addBox(x, z, 1.75, 1.15, ry);

  const [s1x, s1z] = local(x, z, ry, -1.2, -1.6);
  const [s2x, s2z] = local(x, z, ry, 1.1, 1.6);
  stool(ctx, s1x, s1z);
  stool(ctx, s2x, s2z);
  const [bx, bz] = local(x, z, ry, 2.6, -1.4);
  banner(ctx, bx, bz, ry, '#b52a2a', '#f2efe6');
}

/** MoMu — a tailor's pavilion with dress forms and fabric rolls. */
export function tailorPavilion(ctx, x, z, ry) {
  const { b } = ctx;
  const m = place(x, z, ry);
  const half = 2.6;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cyl(b, P.woodDark, m, sx * half, 1.45, sz * half, 0.08, 2.9, 0, 0, 0, G.cyl6);
      ctx.physics.addCircle(...local(x, z, ry, sx * half, sz * half), 0.12);
    }
  }
  // striped pyramid roof + valance
  fadingRoof(ctx, x, z, (rb) => {
    rb.add(G.cone4, '#5b3a7a', mat(0, 3.6, 0, Math.PI / 4, 0, 0, half * 2 * 1.5, 1.9, half * 2 * 1.5), m);
    rb.add(G.cone4, '#e6d7b8', mat(0, 3.75, 0, Math.PI / 4, 0, 0, half * 2 * 0.95, 1.3, half * 2 * 0.95), m);
    rb.add(G.cone4, '#5b3a7a', mat(0, 4.1, 0, Math.PI / 4, 0, 0, half * 2 * 0.5, 0.75, half * 2 * 0.5), m);
    rb.add(G.ico0, P.gold, mat(0, 4.55, 0, 0, 0, 0, 0.25), m);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      box(rb, P.gold, m, Math.sin(a) * (half + 0.05), 2.72, Math.cos(a) * (half + 0.05), half * 2.1, 0.22, 0.04, a);
    }
  });
  // dress forms
  const dresses = [
    [-1.2, -1.0, '#1f1f24', '#cfc6b8'],
    [0.2, -1.3, '#8b2f3c', P.gold],
    [1.4, -0.7, '#e6e0d2', '#2a2a30'],
  ];
  for (const [dx, dz, col, trim] of dresses) {
    cyl(b, P.woodDark, m, dx, 0.5, dz, 0.03, 1.0, 0, 0, 0, G.cyl6);
    cyl(b, P.woodDark, m, dx, 0.03, dz, 0.25, 0.06, 0, 0, 0, G.cyl6);
    b.add(taper(0.2, 0.16, 0.5, 8), col, mat(dx, 1.35, dz), m);
    b.add(taper(0.15, 0.48, 0.85, 9), col, mat(dx, 0.75, dz), m, 0.05);
    b.add(taper(0.16, 0.16, 0.05, 8), trim, mat(dx, 1.12, dz), m);
    ball(b, '#d8cdb8', m, dx, 1.68, dz, 0.07);
    ctx.physics.addCircle(...local(x, z, ry, dx, dz), 0.45);
  }
  // cutting table with fabric rolls
  const tm = mat(0.3, 0, 1.3, 0);
  tm.premultiply(m);
  table(ctx, tm, 2.0, 0.9, 0.85);
  ['#3f5f8f', '#b88a2e', '#6b3a6b', '#2f6b5c'].forEach((c, i) => cyl(b, c, tm, -0.65 + i * 0.43, 1.02, 0, 0.13, 0.8, 0, Math.PI / 2, 0, G.cyl8));
  box(b, P.metal, tm, 0.6, 0.93, 0.25, 0.3, 0.02, 0.06, 0.4);
  ctx.physics.addBox(...local(x, z, ry, 0.3, 1.3), 1.0, 0.45, ry);
  // mirror
  const mm = mat(-2.0, 0, 0.9, 0.8);
  mm.premultiply(m);
  box(b, P.gold, mm, 0, 1.0, 0, 0.8, 1.7, 0.08);
  box(b, '#9ec4d6', mm, 0, 1.0, 0.045, 0.62, 1.5, 0.02);
  box(b, P.woodDark, mm, 0, 0.05, 0, 0.9, 0.1, 0.5);
  ctx.physics.addBox(...local(x, z, ry, -2.0, 0.9), 0.45, 0.25, ry + 0.8);
}

/** Machine-learning experiments — an arcane circle with a floating "neural" orb. */
export function arcaneCircle(ctx, x, z, ry) {
  const { b, glow, rand } = ctx;
  const m = place(x, z, ry);
  const y0 = heightAt(x, z);
  cyl(b, '#57545a', m, 0, 0.04, 0, 3.4, 0.08, 0, 0, 0, G.cyl12);
  cyl(b, '#6a6670', m, 0, 0.07, 0, 2.6, 0.06, 0, 0, 0, G.cyl12);
  // rune ring
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    glow.add(G.box, GLOW.arcane, mat(Math.cos(a) * 3.0, 0.09, Math.sin(a) * 3.0, -a, 0, 0, 0.12, 0.02, i % 3 ? 0.35 : 0.2), m);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const c = Math.cos(a) * 2.0;
    const s = Math.sin(a) * 2.0;
    const n = ((i + 2) / 6) * Math.PI * 2;
    const len = Math.hypot(Math.cos(n) * 2 - c, Math.sin(n) * 2 - s);
    glow.add(G.box, GLOW.arcane, mat((c + Math.cos(n) * 2) / 2, 0.1, (s + Math.sin(n) * 2) / 2, -Math.atan2(Math.sin(n) * 2 - s, Math.cos(n) * 2 - c), 0, 0, len, 0.015, 0.05), m);
  }
  // standing stones
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.26;
    const h = 1.8 + rand() * 1.1;
    const sx = Math.cos(a) * 4.4;
    const sz = Math.sin(a) * 4.4;
    b.add(taper(0.32, 0.45, h, 5), P.stoneDark, mat(sx, h / 2 - 0.1, sz, rand() * 3, (rand() - 0.5) * 0.12, (rand() - 0.5) * 0.12), m, 0.08);
    glow.add(G.box, GLOW.arcane, mat(sx * 0.93, h * 0.6, sz * 0.93, -a + Math.PI / 2, 0, 0, 0.14, 0.3, 0.02), m);
    ctx.physics.addCircle(...local(x, z, ry, sx, sz), 0.45);
  }
  // alchemy table
  const tm = mat(0, 0, -2.0, 0);
  tm.premultiply(m);
  table(ctx, tm, 1.8, 0.8, 0.85, P.woodDark);
  const flasks = [
    [-0.6, GLOW.green, 0.09],
    [-0.3, GLOW.arcane, 0.12],
    [0.05, GLOW.rune, 0.08],
    [0.55, '#ff6fb0', 0.1],
  ];
  for (const [fx, col, r] of flasks) {
    glow.add(G.ico1, col, mat(fx, 0.95 + r, 0, 0, 0, 0, r * 2, r * 2, r * 2), tm);
    cyl(b, '#cfd8dc', tm, fx, 0.98 + r * 2, 0, 0.025, 0.12, 0, 0, 0, G.cyl6);
  }
  box(b, '#4a2d5c', tm, 0.3, 0.94, 0.15, 0.3, 0.06, 0.4, 0.3);
  ctx.physics.addBox(...local(x, z, ry, 0, -2.0), 0.95, 0.45, ry);

  // floating orb + orbiting nodes connected by lines (a tiny neural net)
  const group = new THREE.Group();
  group.position.set(x, y0 + 2.1, z);
  ctx.scene.add(group);
  const glowMat = (c, k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), glowMat(GLOW.arcane, 2.2));
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), glowMat('#ffffff', 2));
  group.add(orb, core);

  const layers = [3, 4, 3];
  const nodes = [];
  layers.forEach((count, li) => {
    for (let i = 0; i < count; i++) {
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), glowMat(li === 1 ? GLOW.rune : GLOW.arcane));
      node.userData = { li, i, count };
      group.add(node);
      nodes.push(node);
    }
  });
  const linePositions = [];
  const pairs = [];
  for (const a of nodes) for (const n of nodes) if (n.userData.li === a.userData.li + 1) pairs.push([a, n]);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pairs.length * 6), 3));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: new THREE.Color(GLOW.arcane).multiplyScalar(1.6), transparent: true, opacity: 0.55 }));
  group.add(lines);

  const light = new THREE.PointLight('#a77bff', 14, 12, 1.6);
  light.position.set(x, y0 + 2.2, z);
  ctx.scene.add(light);

  ctx.anim.push((dt, t) => {
    group.position.y = y0 + 2.1 + Math.sin(t * 1.2) * 0.2;
    orb.rotation.set(t * 0.3, t * 0.5, 0);
    core.rotation.set(-t, t * 0.7, 0);
    orb.scale.setScalar(1 + Math.sin(t * 3) * 0.04);
    for (const node of nodes) {
      const { li, i, count } = node.userData;
      const a = (i / count) * Math.PI * 2 + t * (0.5 + li * 0.15) * (li % 2 ? -1 : 1);
      const r = 0.9 + li * 0.25;
      node.position.set(Math.cos(a) * r, (li - 1) * 0.55, Math.sin(a) * r);
      node.rotation.y = t * 2;
    }
    const arr = lineGeo.attributes.position.array;
    pairs.forEach(([a, n], k) => {
      arr.set([a.position.x, a.position.y, a.position.z, n.position.x, n.position.y, n.position.z], k * 6);
    });
    lineGeo.attributes.position.needsUpdate = true;
    light.intensity = 12 + Math.sin(t * 3) * 3;
  });
}

/** Technologies — weapon racks, anvil, forge, training dummy. */
export function armory(ctx, x, z, ry) {
  const { b, glow } = ctx;
  const m = place(x, z, ry);
  // weapon rack
  const rm = mat(0, 0, -1.8);
  rm.premultiply(m);
  for (const sx of [-1, 1]) cyl(b, P.woodDark, rm, sx * 1.4, 0.9, 0, 0.07, 1.8, 0, 0, 0, G.cyl6);
  box(b, P.wood, rm, 0, 1.5, 0, 3.0, 0.1, 0.12);
  box(b, P.wood, rm, 0, 0.35, 0.25, 3.0, 0.1, 0.35);
  const weapons = ['sword', 'spear', 'axe', 'sword', 'hammer', 'spear', 'sword'];
  weapons.forEach((w, i) => {
    const wx = -1.2 + i * 0.4;
    const tilt = -0.18;
    if (w === 'sword') {
      box(b, P.metal, rm, wx, 1.05, 0.12, 0.08, 1.1, 0.02, 0, tilt);
      box(b, P.gold, rm, wx, 0.45, 0.15, 0.25, 0.05, 0.06, 0, tilt);
      cyl(b, P.dark, rm, wx, 0.33, 0.17, 0.03, 0.18, 0, tilt, 0, G.cyl6);
    } else if (w === 'spear') {
      cyl(b, P.woodLight, rm, wx, 1.1, 0.12, 0.025, 1.9, 0, tilt, 0, G.cyl6);
      b.add(G.cone4, P.metal, mat(wx, 2.15, -0.07, 0, tilt, 0, 0.1, 0.3, 0.03), rm);
    } else if (w === 'axe') {
      cyl(b, P.woodLight, rm, wx, 0.95, 0.12, 0.03, 1.4, 0, tilt, 0, G.cyl6);
      box(b, P.metal, rm, wx + 0.12, 1.55, 0.02, 0.26, 0.3, 0.03, 0, tilt);
    } else {
      cyl(b, P.woodLight, rm, wx, 0.95, 0.12, 0.03, 1.4, 0, tilt, 0, G.cyl6);
      box(b, P.metalDark, rm, wx, 1.6, 0.0, 0.3, 0.16, 0.16, 0, tilt);
    }
  });
  ctx.physics.addBox(...local(x, z, ry, 0, -1.8), 1.55, 0.35, ry);

  // anvil on a stump
  const am = mat(1.2, 0, 0.8, 0.4);
  am.premultiply(m);
  cyl(b, P.wood, am, 0, 0.3, 0, 0.35, 0.6, 0, 0, 0, G.cyl8);
  box(b, P.metalDark, am, 0, 0.66, 0, 0.3, 0.12, 0.25);
  box(b, P.metalDark, am, 0, 0.8, 0, 0.7, 0.16, 0.3);
  b.add(G.cone4, P.metalDark, mat(0.45, 0.8, 0, 0, 0, -Math.PI / 2, 0.22, 0.25, 0.22), am);
  box(b, P.woodLight, am, -0.1, 0.9, 0.05, 0.05, 0.05, 0.4, 0.5);
  box(b, P.metal, am, -0.1, 0.92, -0.18, 0.14, 0.1, 0.1, 0.5);
  ctx.physics.addCircle(...local(x, z, ry, 1.2, 0.8), 0.45);

  // forge with glowing coals
  const fm = mat(-1.6, 0, 0.4, -0.3);
  fm.premultiply(m);
  box(b, P.stoneDark, fm, 0, 0.45, 0, 1.3, 0.9, 1.0, 0, 0, 0, 0.05);
  box(b, P.stone, fm, 0, 0.93, 0, 1.4, 0.1, 1.1);
  glow.add(G.box, GLOW.fire, mat(0, 0.98, 0, 0, 0, 0, 1.0, 0.04, 0.7), fm);
  for (let i = 0; i < 6; i++) glow.add(G.dodeca, i % 2 ? GLOW.fireCore : GLOW.fire, mat(-0.35 + i * 0.14, 1.03, (i % 3) * 0.15 - 0.15, i, i, 0, 0.14), fm);
  box(b, P.stoneDark, fm, 0, 1.8, -0.35, 0.5, 1.7, 0.4);
  box(b, P.woodDark, fm, 0.95, 0.4, 0.1, 0.5, 0.35, 0.6, 0.2);
  ctx.physics.addBox(...local(x, z, ry, -1.6, 0.4), 0.75, 0.6, ry - 0.3);
  const light = new THREE.PointLight('#ff8a3a', 8, 7, 1.8);
  const [lx, lz] = local(x, z, ry, -1.6, 0.9);
  light.position.set(lx, heightAt(x, z) + 1.6, lz);
  ctx.scene.add(light);
  ctx.anim.push((dt, t) => {
    light.intensity = 7 + Math.sin(t * 7) * 1.2 + Math.sin(t * 13.3) * 0.8;
  });

  // training dummy
  const dm = mat(1.6, 0, -0.6, -0.5);
  dm.premultiply(m);
  cyl(b, P.woodDark, dm, 0, 0.8, 0, 0.06, 1.6, 0, 0, 0, G.cyl6);
  box(b, P.woodDark, dm, 0, 1.25, 0, 1.0, 0.08, 0.08);
  b.add(taper(0.26, 0.3, 0.7, 8), P.straw, mat(0, 1.15, 0), dm, 0.05);
  ball(b, P.straw, dm, 0, 1.68, 0, 0.2);
  box(b, '#8b2f2f', dm, 0, 1.25, 0.28, 0.25, 0.25, 0.03);
  ctx.physics.addCircle(...local(x, z, ry, 1.6, -0.6), 0.35);

  // shield stand
  const sm = mat(-0.2, 0, 0.9, 0.2);
  sm.premultiply(m);
  cyl(b, P.blue, sm, 0, 0.6, 0, 0.42, 0.06, 0, Math.PI / 2 - 0.2, 0, G.cyl12);
  cyl(b, P.gold, sm, 0, 0.6, 0.04, 0.12, 0.08, 0, Math.PI / 2 - 0.2, 0, G.cyl8);
  ctx.physics.addCircle(...local(x, z, ry, -0.2, 0.9), 0.3);
}

/** Education — a scholar's lean-to with bookshelves, desk and candles. */
export function library(ctx, x, z, ry) {
  const { b } = ctx;
  const m = place(x, z, ry);
  // lean-to canopy
  for (const sx of [-1, 1]) {
    cyl(b, P.woodDark, m, sx * 2.4, 1.5, 1.4, 0.08, 3.0, 0, 0, 0, G.cyl6);
    cyl(b, P.woodDark, m, sx * 2.4, 1.8, -1.6, 0.08, 3.6, 0, 0, 0, G.cyl6);
    ctx.physics.addCircle(...local(x, z, ry, sx * 2.4, 1.4), 0.12);
  }
  fadingRoof(ctx, x, z, (rb) => {
    box(rb, '#3d5a80', m, 0, 3.3, -0.1, 5.2, 0.08, 3.6, 0, -0.18, 0);
    box(rb, P.canvas, m, 0, 3.34, -0.1, 5.2, 0.08, 0.6, 0, -0.18, 0);
  });
  // bookshelves along the back
  const colors = ['#7a2d2d', '#2d4a7a', '#3f6b3a', '#8a6a2d', '#5a3a6a', '#2d6a6a'];
  for (const sx of [-1.25, 1.25]) {
    const sm = mat(sx, 0, -1.3);
    sm.premultiply(m);
    box(b, P.woodDark, sm, 0, 1.2, -0.02, 2.2, 2.4, 0.06);
    for (const px of [-1.08, 1.08]) box(b, P.wood, sm, px, 1.2, 0.2, 0.08, 2.4, 0.45);
    for (let row = 0; row < 4; row++) {
      const y = 0.12 + row * 0.62;
      box(b, P.wood, sm, 0, y, 0.2, 2.2, 0.06, 0.45);
      let bx = -0.98;
      let i = row * 3 + (sx > 0 ? 7 : 0);
      while (bx < 0.95) {
        const w = 0.07 + ((i * 37) % 5) * 0.015;
        const h = 0.36 + ((i * 53) % 4) * 0.05;
        const lean = i % 7 === 3 ? 0.25 : 0;
        box(b, colors[i % colors.length], sm, bx + w / 2, y + 0.03 + h / 2, 0.22, w, h, 0.34, 0, 0, lean);
        bx += w + 0.012 + (lean ? 0.06 : 0);
        i++;
      }
    }
    ctx.physics.addBox(...local(x, z, ry, sx, -1.1), 1.15, 0.3, ry);
  }
  // desk with open book, scrolls and candles
  const dm = mat(0, 0, 0.5);
  dm.premultiply(m);
  table(ctx, dm, 1.8, 0.9, 0.8, P.wood);
  box(b, '#7a2d2d', dm, 0, 0.87, 0, 0.62, 0.04, 0.42);
  box(b, P.paper, dm, -0.15, 0.9, 0, 0.29, 0.03, 0.38, 0, 0, 0.08);
  box(b, P.paper, dm, 0.15, 0.9, 0, 0.29, 0.03, 0.38, 0, 0, -0.08);
  cyl(b, P.paper, dm, 0.65, 0.9, 0.15, 0.05, 0.4, 0.4, 0, Math.PI / 2, G.cyl6);
  cyl(b, P.paper, dm, 0.62, 0.95, 0.25, 0.05, 0.35, 0.8, 0, Math.PI / 2, G.cyl6);
  candle(ctx, dm, -0.7, 0.85, -0.2);
  candle(ctx, dm, -0.55, 0.85, 0.25);
  // quill
  b.add(G.cone4, '#f1efe8', mat(0.35, 1.0, 0.15, 0.4, 0, -0.6, 0.06, 0.35, 0.02), dm);
  ctx.physics.addBox(...local(x, z, ry, 0, 0.5), 0.95, 0.5, ry);
  // globe on a stand
  const gm = mat(-1.9, 0, 0.6);
  gm.premultiply(m);
  cyl(b, P.woodDark, gm, 0, 0.45, 0, 0.05, 0.9, 0, 0, 0, G.cyl6);
  cyl(b, P.woodDark, gm, 0, 0.03, 0, 0.25, 0.06, 0, 0, 0, G.cyl8);
  ball(b, '#3f7b8f', gm, 0, 1.1, 0, 0.28);
  ball(b, '#6b8f4a', gm, 0.1, 1.2, 0.14, 0.14, G.ico0);
  b.add(new THREE.TorusGeometry(0.33, 0.015, 4, 20), P.gold, mat(0, 1.1, 0, 0, 0, 0.4), gm);
  ctx.physics.addCircle(...local(x, z, ry, -1.9, 0.6), 0.3);
  // chair
  const cm = mat(0, 0, 1.25, Math.PI);
  cm.premultiply(m);
  box(b, P.wood, cm, 0, 0.45, 0, 0.5, 0.06, 0.5);
  box(b, P.wood, cm, 0, 0.8, 0.23, 0.5, 0.65, 0.05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(b, P.woodDark, cm, sx * 0.2, 0.22, sz * 0.2, 0.05, 0.45, 0.05);
}

/** Experience — a merchant's covered wagon. */
export function wagon(ctx, x, z, ry) {
  const { b } = ctx;
  const m = place(x, z, ry);
  box(b, P.plank, m, 0, 0.95, 0, 1.8, 0.5, 3.2, 0, 0, 0, 0.04);
  box(b, P.woodDark, m, 0, 0.68, 0, 1.9, 0.08, 3.3);
  // canvas cover (half cylinder)
  const cover = new THREE.CylinderGeometry(1.0, 1.0, 3.0, 10, 1, true, -Math.PI / 2, Math.PI);
  b.add(cover, P.canvas, mat(0, 1.2, 0, 0, -Math.PI / 2, 0), m);
  for (const cz of [-1.4, -0.45, 0.45, 1.4]) b.add(new THREE.TorusGeometry(1.01, 0.03, 4, 12, Math.PI), P.woodDark, mat(0, 1.2, cz), m);
  b.add(new THREE.CircleGeometry(0.98, 10, 0, Math.PI), P.canvasDark, mat(0, 1.2, -1.5, Math.PI), m);
  // wheels
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wm = mat(sx * 1.0, 0.55, sz * 1.05, 0, 0, Math.PI / 2);
      wm.premultiply(m);
      b.add(new THREE.TorusGeometry(0.5, 0.06, 5, 14), P.woodDark, mat(0, 0, 0, 0, Math.PI / 2, 0), wm);
      cyl(b, P.wood, wm, 0, 0, 0, 0.1, 0.14, 0, 0, 0, G.cyl8);
      for (let k = 0; k < 4; k++) box(b, P.wood, wm, 0, 0, 0, 0.95, 0.04, 0.05, k * (Math.PI / 4));
    }
  }
  // shaft
  box(b, P.woodDark, m, -0.35, 0.6, 2.4, 0.08, 0.08, 1.8, 0, 0.12, 0);
  box(b, P.woodDark, m, 0.35, 0.6, 2.4, 0.08, 0.08, 1.8, 0, 0.12, 0);
  // lantern on the back
  const lm = mat(0.7, 1.9, -1.55);
  lm.premultiply(m);
  ctx.glow.add(G.box, GLOW.lantern, mat(0, 0, 0, 0, 0, 0, 0.14, 0.2, 0.14), lm);
  box(b, P.metalDark, lm, 0, 0.13, 0, 0.2, 0.04, 0.2);
  box(b, P.metalDark, lm, 0, -0.13, 0, 0.2, 0.04, 0.2);
  // goods inside the back
  box(b, '#6b4a2b', m, -0.4, 1.35, -1.2, 0.5, 0.35, 0.4, 0.2);
  ball(b, P.straw, m, 0.35, 1.35, -1.1, 0.25);
  ctx.physics.addBox(x, z, 1.1, 1.75, ry);
  ctx.physics.addBox(...local(x, z, ry, 0, 2.4), 0.45, 0.9, ry);
}

/** A long wooden dock with a rowboat. */
export function dock(ctx, d) {
  const { b, rand } = ctx;
  const len = d.zEnd - d.zStart;
  const cz = (d.zStart + d.zEnd) / 2;
  const m = mat(d.x, 0, cz);
  const planks = Math.floor(len / 0.42);
  for (let i = 0; i < planks; i++) {
    const pz = -len / 2 + 0.21 + i * 0.42;
    box(b, i % 3 ? P.plank : P.woodLight, m, (rand() - 0.5) * 0.06, d.y, pz, d.width, 0.1, 0.38, (rand() - 0.5) * 0.03, 0, 0, 0.06);
  }
  for (let pz = -len / 2 + 1.5; pz <= len / 2; pz += 2.5) {
    for (const sx of [-1, 1]) {
      cyl(b, P.woodDark, m, sx * (d.width / 2 + 0.05), d.y - 1.2, pz, 0.1, 3.2, 0, 0, 0, G.cyl6);
      ctx.physics.addCircle(d.x + sx * (d.width / 2 + 0.05), cz + pz, 0.12);
    }
  }
  // rails
  for (const sx of [-1, 1]) {
    box(b, P.woodDark, m, sx * (d.width / 2 + 0.05), d.y + 0.9, len / 4, 0.08, 0.08, len / 2);
    ctx.physics.addBox(d.x + sx * (d.width / 2 + 0.12), cz + len / 4, 0.08, len / 4);
  }
  ctx.physics.addPlatform(d.x, cz, d.width / 2 + 0.1, len / 2, d.y + 0.05);
  // stop the player walking off the far end
  ctx.physics.addBox(d.x, d.zEnd + 0.1, d.width / 2 + 0.2, 0.1);

  // rowboat bobbing beside the dock
  const bb = new GeoBuilder(rand);
  const hull = new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  bb.add(hull, P.wood, mat(0, 0.45, 0, 0, 0, 0, 0.75, 0.55, 1.9));
  bb.add(G.cyl12, P.woodDark, mat(0, 0.36, 0, 0, 0, 0, 1.3, 0.04, 3.4));
  box(bb, P.plank, null, 0, 0.3, 0.2, 1.3, 0.06, 0.3);
  box(bb, P.plank, null, 0, 0.3, -0.7, 1.1, 0.06, 0.3);
  box(bb, P.woodLight, null, 0.6, 0.45, 0, 0.06, 0.06, 2.2, 0.3, 0, 0.3);
  const boat = bb.build(worldMaterial);
  boat.position.set(d.x + 2.6, 0, d.zEnd - 3);
  ctx.scene.add(boat);
  ctx.physics.addCircle(d.x + 2.6, d.zEnd - 3.6, 0.8);
  ctx.physics.addCircle(d.x + 2.6, d.zEnd - 2.2, 0.8);
  ctx.anim.push((dt, t) => {
    boat.position.y = -0.25 + Math.sin(t * 1.3) * 0.06;
    boat.rotation.z = Math.sin(t * 1.1) * 0.05;
    boat.rotation.x = Math.sin(t * 0.9 + 1) * 0.03;
  });
}

/** The great camp tree with lanterns hanging from its branches. */
export function campTree(ctx, x, z) {
  const { b, rand } = ctx;
  const y = heightAt(x, z);
  const m = mat(x, y, z);
  b.add(taper(0.55, 0.9, 4.6, 8), P.woodDark, mat(0, 2.3, 0), m, 0.05);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.add(taper(0.15, 0.3, 1.2, 6), P.woodDark, mat(Math.cos(a) * 0.75, 0.25, Math.sin(a) * 0.75, -a, 0, Math.PI / 2.8), m);
  }
  const branches = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    b.add(taper(0.12, 0.3, 3.2, 6), P.woodDark, mat(Math.cos(a) * 1.3, 4.6, Math.sin(a) * 1.3, Math.PI / 2 - a, 0, 0.95), m);
    branches.push([Math.cos(a) * 2.6, Math.sin(a) * 2.6]);
  }
  const blobs = [
    [0, 7.2, 0, 3.2],
    [2.6, 6.3, 0.6, 2.3],
    [-2.4, 6.4, -0.5, 2.4],
    [0.4, 6.2, 2.6, 2.2],
    [-0.6, 6.5, -2.5, 2.2],
    [1.8, 7.6, -1.8, 1.8],
  ];
  blobs.forEach(([bx, by, bz, r], i) => ball(b, [P.leaf, P.leafDark, P.leafLight][i % 3], m, bx, by, bz, r, G.ico1, 0.1));
  for (const [bx, bz] of branches) hangingLantern(ctx, x + bx, y + 4.4 + rand() * 0.3, z + bz);
  ctx.physics.addCircle(x, z, 1.0);
}

export function signpost(ctx, x, z, ry, arms) {
  const { b } = ctx;
  const m = place(x, z, ry);
  cyl(b, P.woodDark, m, 0, 1.2, 0, 0.08, 2.4, 0, 0, 0, G.cyl6);
  arms.forEach((a, i) => {
    const am = mat(0, 2.0 - i * 0.35, 0, a - ry);
    am.premultiply(m);
    box(b, P.plank, am, 0, 0, 0.55, 0.06, 0.24, 1.0);
    b.add(G.cone4, P.plank, mat(0, 0, 1.12, Math.PI / 4, Math.PI / 2, 0, 0.24, 0.26, 0.24), am);
  });
  ctx.physics.addCircle(x, z, 0.15);
}
