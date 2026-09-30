import * as THREE from 'three';
import { RACES, CLASSES } from './options.js';
import { clamp, damp } from '../utils/math.js';

const METAL = '#b4b8bf';
const METAL_DARK = '#70747c';
const LEATHER = '#5a3d27';
const BOOT = '#3b2a1e';
const WOOD = '#6b4a2b';
const SCALE = 1.15;

/* materials are cached and shared between every character we ever build */
const materials = new Map();
function material(color, { glow = 0, shiny = false, double = false } = {}) {
  const key = `${color}|${glow}|${shiny}|${double}`;
  let m = materials.get(key);
  if (!m) {
    m = glow
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(glow) })
      : new THREE.MeshStandardMaterial({
          color,
          flatShading: true,
          roughness: shiny ? 0.38 : 0.85,
          metalness: shiny ? 0.3 : 0,
          side: double ? THREE.DoubleSide : THREE.FrontSide,
        });
    materials.set(key, m);
  }
  return m;
}

const cyl = (rt, rb, h, seg = 7) => new THREE.CylinderGeometry(rt, rb, h, seg);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const ico = (r, detail = 1) => new THREE.IcosahedronGeometry(r, detail);
function coneUp(r, h, seg = 5) {
  const g = new THREE.ConeGeometry(r, h, seg);
  g.translate(0, h / 2, 0);
  return g;
}

function part(parent, geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, opts) {
  const mesh = new THREE.Mesh(geo, material(color, opts));
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

/* ------------------------------------------------------------------ items
 * Every item is built with its grip at the origin, extending along +Y. */
const ITEMS = {
  sword(g, c) {
    part(g, cyl(0.025, 0.025, 0.18, 6), LEATHER, 0, 0, 0);
    part(g, box(0.24, 0.045, 0.06), c.secondary, 0, 0.11, 0, 0, 0, 0, { shiny: true });
    part(g, box(0.07, 0.62, 0.02), METAL, 0, 0.44, 0, 0, 0, 0, { shiny: true });
    part(g, coneUp(0.05, 0.1, 4), METAL, 0, 0.75, 0, 0, Math.PI / 4, 0, { shiny: true });
    part(g, ico(0.035, 0), c.secondary, 0, -0.1, 0);
  },
  rapier(g, c) {
    part(g, cyl(0.022, 0.022, 0.16, 6), LEATHER);
    part(g, new THREE.SphereGeometry(0.07, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), c.secondary, 0, 0.08, 0, Math.PI, 0, 0, { shiny: true, double: true });
    part(g, box(0.025, 0.7, 0.015), METAL, 0, 0.45, 0, 0, 0, 0, { shiny: true });
  },
  dagger(g) {
    part(g, cyl(0.022, 0.022, 0.12, 6), LEATHER);
    part(g, box(0.14, 0.03, 0.04), METAL_DARK, 0, 0.07, 0);
    part(g, box(0.05, 0.28, 0.015), METAL, 0, 0.22, 0, 0, 0, 0, { shiny: true });
    part(g, coneUp(0.035, 0.07, 4), METAL, 0, 0.36, 0, 0, Math.PI / 4, 0, { shiny: true });
  },
  mace(g) {
    part(g, cyl(0.025, 0.025, 0.5, 6), WOOD, 0, 0.15, 0);
    part(g, ico(0.09, 0), METAL, 0, 0.44, 0, 0, 0, 0, { shiny: true });
    for (let i = 0; i < 4; i++) part(g, box(0.02, 0.14, 0.2), METAL, 0, 0.44, 0, 0, (i * Math.PI) / 4, 0, { shiny: true });
  },
  warhammer(g, c) {
    part(g, cyl(0.03, 0.03, 1.25, 6), WOOD, 0, 0.3, 0);
    part(g, box(0.34, 0.16, 0.16), METAL, 0, 0.9, 0, 0, 0, 0, { shiny: true });
    part(g, box(0.08, 0.2, 0.2), c.secondary, 0, 0.9, 0, 0, 0, 0, { shiny: true });
  },
  greataxe(g) {
    part(g, cyl(0.032, 0.032, 1.35, 6), WOOD, 0, 0.3, 0);
    const blade = new THREE.Shape();
    blade.moveTo(0, -0.12);
    blade.quadraticCurveTo(0.32, -0.3, 0.3, 0);
    blade.quadraticCurveTo(0.32, 0.3, 0, 0.12);
    blade.closePath();
    const geo = new THREE.ExtrudeGeometry(blade, { depth: 0.025, bevelEnabled: false, curveSegments: 4 });
    geo.translate(0, 0, -0.0125);
    part(g, geo, METAL, 0.02, 0.85, 0, 0, 0, 0, { shiny: true });
    part(g, geo.clone(), METAL, -0.02, 0.85, 0, 0, Math.PI, 0, { shiny: true });
  },
  staff(g, c) {
    part(g, cyl(0.03, 0.035, 1.75, 6), WOOD, 0, 0.35, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      part(g, coneUp(0.018, 0.2, 4), c.secondary, Math.cos(a) * 0.05, 1.2, Math.sin(a) * 0.05, Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4, { shiny: true });
    }
    const orb = part(g, ico(0.085, 1), '#7fb6ff', 0, 1.33, 0, 0, 0, 0, { glow: 2.4 });
    orb.userData.pulse = true;
  },
  druidstaff(g) {
    part(g, cyl(0.03, 0.04, 1.0, 5), WOOD, 0, 0.1, 0, 0, 0, 0.06);
    part(g, cyl(0.025, 0.03, 0.8, 5), WOOD, 0.03, 0.95, 0, 0, 0, -0.18);
    part(g, coneUp(0.02, 0.3, 4), WOOD, 0.1, 1.28, 0, 0, 0, -0.9);
    for (const [x, y, z] of [
      [0.12, 1.35, 0.05],
      [0.02, 1.4, -0.06],
      [-0.06, 1.3, 0.04],
    ]) part(g, ico(0.07, 0), '#5f9043', x, y, z);
    const glow = part(g, ico(0.05, 0), '#8dff9a', 0.05, 1.32, 0, 0, 0, 0, { glow: 2 });
    glow.userData.pulse = true;
  },
  shield(g, c) {
    const s = new THREE.Group();
    s.rotation.z = -Math.PI / 2;
    s.position.set(0.08, 0.02, 0.02);
    g.add(s);
    part(s, cyl(0.3, 0.3, 0.04, 12), c.secondary);
    part(s, new THREE.TorusGeometry(0.3, 0.025, 4, 16), METAL, 0, 0, 0, Math.PI / 2, 0, 0, { shiny: true });
    part(s, ico(0.07, 0), METAL, 0, 0.03, 0, 0, 0, 0, { shiny: true });
    part(s, box(0.08, 0.02, 0.5), c.primary, 0, 0.022, 0);
  },
  bow(g) {
    const arc = new THREE.TorusGeometry(0.42, 0.022, 4, 12, Math.PI);
    arc.rotateZ(-Math.PI / 2);
    arc.rotateY(-Math.PI / 2);
    arc.translate(0, 0, -0.42);
    arc.scale(1, 1.35, 0.6);
    part(g, arc, WOOD);
    part(g, cyl(0.004, 0.004, 1.13, 3), '#e8e0c8', 0, 0, -0.252);
    part(g, cyl(0.03, 0.03, 0.12, 6), LEATHER);
  },
  tome(g, c) {
    part(g, box(0.22, 0.28, 0.07), c.primary, 0, -0.05, 0.08);
    part(g, box(0.2, 0.26, 0.075), '#efe2c2', 0.012, -0.05, 0.08);
    part(g, box(0.1, 0.1, 0.08), c.secondary, 0, -0.05, 0.08, 0, 0, Math.PI / 4, { glow: 1.6 });
  },
  flame(g) {
    const outer = part(g, ico(0.1, 0), '#ff7a1f', 0, -0.08, 0.12, 0, 0, 0, { glow: 3 });
    const inner = part(g, ico(0.055, 0), '#ffe29a', 0, -0.08, 0.12, 0, 0, 0, { glow: 3 });
    outer.userData.flicker = inner.userData.flicker = true;
  },
  eldritch(g) {
    const outer = part(g, ico(0.1, 0), '#a77bff', 0, -0.08, 0.12, 0, 0, 0, { glow: 3 });
    const inner = part(g, ico(0.05, 0), '#f0e0ff', 0, -0.08, 0.12, 0, 0, 0, { glow: 3 });
    outer.userData.flicker = inner.userData.flicker = true;
  },
  lute(g, c) {
    part(g, ico(0.2, 1), '#a0662e', 0, 0, 0, 0, 0, 0).scale.set(1, 1.2, 0.45);
    part(g, cyl(0.045, 0.045, 0.02, 10), '#2a1d14', 0, 0.02, 0.09, Math.PI / 2, 0, 0);
    part(g, box(0.06, 0.42, 0.04), '#6b4423', 0, 0.42, 0);
    part(g, box(0.09, 0.12, 0.05), c.secondary, 0, 0.66, -0.02, -0.4, 0, 0);
  },
  quiver(g) {
    part(g, cyl(0.075, 0.065, 0.55, 7), LEATHER);
    for (let i = 0; i < 4; i++) {
      const x = (i % 2) * 0.05 - 0.025;
      const z = Math.floor(i / 2) * 0.05 - 0.025;
      part(g, cyl(0.008, 0.008, 0.2, 3), WOOD, x, 0.35, z);
      part(g, box(0.05, 0.08, 0.005), '#e8e0c8', x, 0.43, z, 0, i, 0);
    }
  },
};

/* ------------------------------------------------------------ character */
export class Character {
  constructor(config) {
    this.root = new THREE.Group();
    this.root.name = 'character';
    this.root.scale.setScalar(SCALE);
    this.anim = { t: 0, phase: 0, k: 0, air: 0 };
    this.set(config);
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.isMesh) o.geometry.dispose();
    });
    this.root.clear();
  }

  set(config) {
    this.dispose();
    this.config = { ...config };
    const race = RACES[config.race];
    const cls = CLASSES[config.cls];
    const c = { primary: config.primary, secondary: config.secondary };
    const skin = config.skin;
    const H = race.height;
    const W = race.width;
    const HS = race.head;
    const outfit = cls.outfit;

    const legLen = 0.5 * H;
    const bootH = 0.1;
    const hipY = legLen + bootH;
    const torsoH = 0.5 * H;
    const armLen = 0.47 * H;
    const headR = 0.24 * HS;
    const torsoTop = 0.24 * W;
    const torsoBot = 0.2 * W;
    const chestZ = (y) => torsoBot + (torsoTop - torsoBot) * (y / torsoH);

    const pants = { robe: '#3a2e28', plate: METAL, chain: METAL_DARK, tunic: '#4a3a2c', gi: c.primary, bare: c.primary }[outfit];
    const shirt = { robe: c.primary, plate: METAL, chain: METAL_DARK, tunic: c.primary, gi: c.primary, bare: skin }[outfit];
    const sleeves = shirt;
    const metalOpts = outfit === 'plate' || outfit === 'chain' ? { shiny: true } : undefined;

    const body = new THREE.Group();
    this.root.add(body);
    const hips = new THREE.Group();
    hips.position.y = hipY;
    body.add(hips);

    /* legs */
    const legs = [];
    for (const side of [1, -1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.1 * W, 0, 0);
      hips.add(leg);
      part(leg, cyl(0.09 * W, 0.072 * W, legLen, 7), pants, 0, -legLen / 2, 0, 0, 0, 0, metalOpts);
      part(leg, box(0.17 * W, bootH + 0.05, 0.27), outfit === 'plate' ? METAL_DARK : BOOT, 0, -legLen - bootH / 2 + 0.02, 0.04);
      legs.push(leg);
    }

    part(hips, cyl(torsoBot + 0.01, torsoBot * 0.95, 0.16, 8), pants, 0, 0.02, 0, 0, 0, 0, metalOpts);

    /* skirts / lower garments hang from the hips */
    if (outfit === 'robe') {
      const h = hipY - 0.02;
      part(hips, cyl(torsoBot + 0.012, 0.31 * W, h, 9), c.primary, 0, 0.04 - h / 2, 0);
      part(hips, cyl(0.315 * W, 0.315 * W, 0.06, 9), c.secondary, 0, 0.04 - h + 0.05, 0);
    } else if (outfit === 'tunic') {
      part(hips, cyl(torsoBot + 0.012, torsoBot + 0.08, 0.26, 8), c.primary, 0, -0.1, 0);
    } else if (outfit === 'plate' || outfit === 'chain') {
      part(hips, cyl(torsoBot + 0.015, torsoBot + 0.07, 0.2, 8), METAL_DARK, 0, -0.08, 0, 0, 0, 0, { shiny: true });
    } else if (outfit === 'bare') {
      part(hips, box(0.2 * W, 0.3, 0.03), c.secondary, 0, -0.12, torsoBot + 0.02);
      part(hips, box(0.2 * W, 0.3, 0.03), c.secondary, 0, -0.12, -torsoBot - 0.02);
    }

    /* torso */
    const torso = new THREE.Group();
    torso.position.y = 0.06;
    hips.add(torso);
    part(torso, cyl(torsoTop, torsoBot, torsoH, 8), shirt, 0, torsoH / 2, 0, 0, 0, 0, metalOpts);
    part(torso, cyl(torsoBot + 0.018, torsoBot + 0.018, 0.07, 8), outfit === 'gi' || outfit === 'robe' ? c.secondary : LEATHER, 0, 0.05, 0);
    if (outfit !== 'gi') part(torso, box(0.07, 0.06, 0.03), '#a8823a', 0, 0.05, torsoBot + 0.025);

    if (outfit === 'plate' || outfit === 'chain') {
      part(torso, box(0.26 * W, torsoH * 0.75 + 0.3, 0.025), c.primary, 0, torsoH * 0.4 - 0.15, chestZ(torsoH * 0.4) + 0.02);
      part(torso, box(0.26 * W, torsoH * 0.75 + 0.3, 0.025), c.primary, 0, torsoH * 0.4 - 0.15, -chestZ(torsoH * 0.4) - 0.02);
    }
    if (outfit === 'robe') part(torso, box(0.08, torsoH, 0.02), c.secondary, 0, torsoH / 2, chestZ(torsoH / 2) + 0.005);
    if (outfit === 'gi') {
      part(torso, box(0.06, torsoH * 0.9, 0.02), c.secondary, 0.03, torsoH * 0.55, chestZ(torsoH * 0.55) + 0.005, 0, 0, 0.45);
      part(torso, box(0.08, 0.14, 0.03), c.secondary, 0.1 * W, 0.0, torsoBot + 0.02, 0, 0, 0.3);
    }
    if (outfit === 'bare') part(torso, ico(0.16 * W, 0), c.secondary, 0.17 * W, torsoH - 0.02, 0);
    if (outfit === 'tunic' && config.cls === 'bard') part(torso, box(0.24 * W, 0.06, 0.02), c.secondary, 0, torsoH * 0.7, chestZ(torsoH * 0.7) + 0.01, 0, 0, 0.5);
    if (cls.chest === 'symbol') part(torso, cyl(0.075, 0.075, 0.02, 8), c.secondary, 0, torsoH * 0.62, chestZ(torsoH * 0.62) + 0.045, Math.PI / 2, 0, 0, { shiny: true });

    /* arms */
    const arms = [];
    const hands = [];
    const shoulderX = torsoTop + 0.06 * W;
    const handColor = outfit === 'plate' ? METAL_DARK : config.cls === 'monk' ? '#e8e0cc' : skin;
    for (const side of [1, -1]) {
      const arm = new THREE.Group();
      arm.position.set(side * shoulderX, torsoH - 0.05, 0);
      torso.add(arm);
      part(arm, cyl(0.072 * W, 0.058 * W, armLen, 6), sleeves, 0, -armLen / 2, 0, 0, 0, 0, metalOpts);
      if (outfit === 'robe') part(arm, cyl(0.07 * W, 0.1 * W, 0.16, 7), c.primary, 0, -armLen + 0.06, 0);
      if (outfit === 'plate') {
        part(arm, new THREE.SphereGeometry(0.135 * W, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), METAL, 0, -0.02, 0, 0, 0, side * -0.25, { shiny: true });
      }
      part(arm, ico(0.072 * Math.max(W, 0.95), 1), handColor, 0, -armLen - 0.02, 0);
      const hand = new THREE.Group();
      hand.position.y = -armLen - 0.03;
      arm.add(hand);
      arms.push(arm);
      hands.push(hand);
    }

    /* head */
    const head = new THREE.Group();
    head.position.y = torsoH + 0.02;
    torso.add(head);
    part(head, cyl(0.07, 0.085, 0.12, 6), skin, 0, 0.04, 0);
    const hc = headR * 0.95 + 0.05;
    part(head, new THREE.SphereGeometry(headR, 10, 8), skin, 0, hc, 0);

    const eyeColor = config.race === 'tiefling' ? '#f2c14e' : '#1b1410';
    for (const side of [1, -1]) {
      part(head, box(0.05 * HS, 0.075 * HS, 0.04), eyeColor, side * 0.085 * HS, hc + 0.015, headR * 0.95, 0, 0, 0, config.race === 'tiefling' ? { glow: 1.4 } : undefined);
      part(head, box(0.075 * HS, 0.02, 0.03), config.hairStyle === 'bald' || race.noHair ? skin : config.hairColor, side * 0.09 * HS, hc + 0.075 * HS, headR * 0.93, 0, 0, side * -0.12);
    }

    if (race.snout) {
      part(head, box(0.24 * HS, 0.15 * HS, 0.3 * HS), skin, 0, hc - 0.07, headR * 0.95);
      part(head, box(0.22 * HS, 0.035, 0.26 * HS), '#2a1d14', 0, hc - 0.135, headR * 0.98);
      part(head, box(0.2 * HS, 0.05, 0.05), '#e8dcc0', 0, hc + headR * 0.55, headR * 0.55);
      for (const side of [1, -1]) {
        part(head, coneUp(0.05, 0.36, 4), '#e8dcc0', side * 0.12, hc + headR * 0.6, -headR * 0.2, -1.2, 0, side * -0.35);
        part(head, coneUp(0.035, 0.2, 4), '#e8dcc0', side * headR * 0.95, hc - headR * 0.05, -headR * 0.2, -0.6, 0, side * -1.2);
        part(head, coneUp(0.025, 0.14, 4), '#e8dcc0', side * headR * 0.85, hc - headR * 0.4, -headR * 0.1, -0.4, 0, side * -1.6);
      }
    } else {
      part(head, box(0.045, 0.07, 0.06), skin, 0, hc - 0.04, headR * 0.98);
    }

    const earShapes = {
      round: () => ({ geo: ico(0.055, 0), rz: 0, rx: 0 }),
      short: () => ({ geo: coneUp(0.05, 0.14, 4), rz: 1.15, rx: -0.2 }),
      long: () => ({ geo: coneUp(0.05, 0.28, 4), rz: 1.05, rx: -0.3 }),
      swept: () => ({ geo: coneUp(0.055, 0.24, 4), rz: 1.35, rx: -0.9 }),
    };
    if (earShapes[race.ears]) {
      for (const side of [1, -1]) {
        const { geo, rz, rx } = earShapes[race.ears]();
        part(head, geo, skin, side * headR * 0.95, hc, -0.02, rx, 0, -side * rz);
      }
    }
    if (race.horns) {
      for (const side of [1, -1]) {
        const horn = new THREE.Group();
        horn.position.set(side * headR * 0.5, hc + headR * 0.7, headR * 0.1);
        horn.rotation.set(-0.35, 0, -side * 0.45);
        head.add(horn);
        part(horn, cyl(0.035, 0.055, 0.18, 5), '#2e2530', 0, 0.09, 0);
        const tip = part(horn, coneUp(0.035, 0.2, 5), '#2e2530', 0, 0.17, 0, -1.1, 0, 0);
        tip.position.z = -0.01;
      }
    }
    if (race.tusks) {
      for (const side of [1, -1]) part(head, coneUp(0.022, 0.09, 4), '#f1ead6', side * 0.07, hc - headR * 0.55, headR * 0.82, 0.2, 0, 0);
    }

    /* hair + beard */
    const hatHidesHair = cls.head === 'helmet' || cls.head === 'hood';
    if (!race.noHair && config.hairStyle !== 'bald' && !hatHidesHair) {
      const hair = config.hairColor;
      if (config.hairStyle !== 'mohawk') {
        part(head, new THREE.SphereGeometry(headR * 1.08, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), hair, 0, hc - 0.01, -0.01, -0.35, 0, 0);
      }
      if (config.hairStyle === 'long') part(head, box(headR * 2.05, headR * 1.9, headR * 0.7), hair, 0, hc - headR * 0.55, -headR * 0.55);
      if (config.hairStyle === 'ponytail') {
        part(head, cyl(0.055, 0.03, 0.42, 6), hair, 0, hc - headR * 0.35, -headR * 1.12, 0.3, 0, 0);
        part(head, ico(0.06, 0), '#d6a84a', 0, hc - 0.02, -headR * 1.02);
      }
      if (config.hairStyle === 'bun') part(head, ico(headR * 0.42, 1), hair, 0, hc + headR * 0.55, -headR * 0.8);
      if (config.hairStyle === 'mohawk') part(head, box(0.07, headR * 0.7, headR * 2.0), hair, 0, hc + headR * 0.9, -0.03);
    }
    if (!race.snout && (config.beard || race.beard)) {
      const beard = race.beard ? coneUp(headR * 0.78, headR * 1.3, 6) : box(headR * 1.35, headR * 0.55, headR * 0.6);
      if (race.beard) part(head, beard, config.hairColor, 0, hc - headR * 0.35, headR * 0.5, Math.PI, 0, 0);
      else part(head, beard, config.hairColor, 0, hc - headR * 0.62, headR * 0.55);
    }

    /* headgear */
    const gear = cls.head;
    const top = hc + headR * 0.55;
    if (gear === 'wizardhat') {
      part(head, cyl(headR * 1.65, headR * 1.65, 0.03, 12), c.primary, 0, top, 0, -0.12, 0, 0);
      part(head, cyl(headR * 0.5, headR * 0.98, headR * 1.5, 8), c.primary, 0, top + headR * 0.72, -0.02, -0.14, 0, 0);
      part(head, cyl(headR * 1.0, headR * 1.0, 0.07, 8), c.secondary, 0, top + 0.05, 0, -0.12, 0, 0);
      part(head, coneUp(headR * 0.5, headR * 1.3, 8), c.primary, 0, top + headR * 1.42, -headR * 0.25, -0.75, 0, 0);
    } else if (gear === 'hood') {
      part(head, new THREE.SphereGeometry(headR * 1.2, 10, 8, Math.PI * 0.75, Math.PI * 1.5, 0, Math.PI * 0.75), c.primary, 0, hc + 0.01, -0.01, 0, 0, 0, { double: true });
      part(head, coneUp(headR * 0.35, headR * 0.8, 5), c.primary, 0, hc + headR * 0.75, -headR * 0.75, -2.0, 0, 0);
      part(torso, cyl(torsoTop * 1.05, torsoTop * 1.4, 0.16, 8), c.primary, 0, torsoH - 0.03, 0);
    } else if (gear === 'helmet') {
      part(head, new THREE.SphereGeometry(headR * 1.12, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.4), METAL, 0, hc, 0, 0, 0, 0, { shiny: true });
      part(head, cyl(headR * 1.14, headR * 1.14, 0.05, 10), METAL_DARK, 0, hc + headR * 0.33, 0, 0, 0, 0, { shiny: true });
      part(head, box(0.04, headR * 0.6, 0.035), METAL, 0, hc + headR * 0.05, headR * 1.08, 0, 0, 0, { shiny: true });
      for (const side of [1, -1]) part(head, box(0.04, headR * 0.9, headR * 0.9), METAL, side * headR * 1.02, hc - headR * 0.15, -headR * 0.1, 0, 0, 0, { shiny: true });
      part(head, box(0.05, headR * 0.55, headR * 1.7), c.secondary, 0, hc + headR * 1.2, -0.04);
    } else if (gear === 'feathercap') {
      part(head, cyl(headR * 1.02, headR * 1.1, headR * 0.5, 10), c.primary, 0, top + headR * 0.1, -0.02, -0.1, 0, 0.18);
      part(head, cyl(headR * 1.35, headR * 1.35, 0.025, 10), c.primary, 0, top - headR * 0.1, -0.02, -0.1, 0, 0.18);
      const feather = part(head, coneUp(0.05, headR * 1.8, 4), c.secondary, headR * 0.75, top, -headR * 0.35, -0.8, 0, -0.55);
      feather.scale.set(0.45, 1, 1);
    } else if (gear === 'circlet') {
      part(head, new THREE.TorusGeometry(headR * 1.0, 0.02, 4, 18), c.secondary, 0, hc + headR * 0.4, 0, Math.PI / 2 - 0.12, 0, 0, { shiny: true });
      part(head, new THREE.OctahedronGeometry(0.04, 0), '#ff5a5a', 0, hc + headR * 0.47, headR * 1.0, 0, 0, 0, { glow: 2 });
    } else if (gear === 'leafcrown') {
      part(head, new THREE.TorusGeometry(headR * 1.02, 0.025, 4, 16), '#4f7a35', 0, hc + headR * 0.45, 0, Math.PI / 2 - 0.1, 0, 0);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        part(head, ico(0.045, 0), i % 2 ? '#6fa04a' : '#4f7a35', Math.cos(a) * headR * 1.02, hc + headR * 0.5, Math.sin(a) * headR * 1.02);
      }
      for (const side of [1, -1]) {
        part(head, coneUp(0.025, headR * 1.2, 4), '#7a5a36', side * headR * 0.6, hc + headR * 0.6, -0.02, -0.2, 0, -side * 0.5);
        part(head, coneUp(0.018, headR * 0.5, 4), '#7a5a36', side * headR * 0.85, hc + headR * 0.95, 0, 0.3, 0, -side * 1.1);
      }
    } else if (gear === 'headband') {
      part(head, new THREE.TorusGeometry(headR * 1.01, 0.03, 4, 16), c.secondary, 0, hc + headR * 0.3, 0, Math.PI / 2, 0, 0);
      part(head, box(0.04, 0.2, 0.02), c.secondary, 0.03, hc + headR * 0.15, -headR * 1.05, 0.3, 0, 0.3);
      part(head, box(0.04, 0.18, 0.02), c.secondary, -0.03, hc + headR * 0.15, -headR * 1.05, 0.3, 0, -0.3);
    }

    /* cape */
    let cape = null;
    if (cls.cape) {
      cape = new THREE.Group();
      cape.position.set(0, torsoH - 0.02, -torsoTop - 0.015);
      torso.add(cape);
      const len = hipY + torsoH - 0.2;
      part(cape, box(torsoTop * 2.2, len, 0.03), c.primary, 0, -len / 2, 0);
      part(cape, box(torsoTop * 2.2, 0.06, 0.035), c.secondary, 0, -len + 0.03, 0);
    }

    /* tail */
    let tail = null;
    if (race.tail) {
      const thick = race.tail === 'thick';
      tail = new THREE.Group();
      tail.position.set(0, 0.02, -torsoBot * 0.9);
      tail.rotation.x = 1.0;
      hips.add(tail);
      let parent = tail;
      const segs = thick ? [0.09, 0.07, 0.05] : [0.035, 0.028, 0.022];
      const len = thick ? 0.3 : 0.26;
      segs.forEach((r, i) => {
        part(parent, cyl(r * 0.8, r, len, 6), skin, 0, -len / 2, 0);
        const next = new THREE.Group();
        next.position.y = -len;
        next.rotation.x = -0.4;
        parent.add(next);
        parent = next;
        if (i === segs.length - 1) {
          const tipR = thick ? 0.04 : 0.06;
          part(parent, coneUp(tipR, thick ? 0.18 : 0.12, 4), thick ? skin : '#2e2530', 0, 0, 0, Math.PI, 0, 0);
        }
      });
    }

    /* items */
    const [handL, handR] = hands;
    const attach = (name, parent) => {
      if (!name || !ITEMS[name]) return null;
      const g = new THREE.Group();
      ITEMS[name](g, c);
      parent.add(g);
      return g;
    };
    const vertical = ['staff', 'druidstaff', 'greataxe', 'warhammer'];
    const right = attach(cls.right, handR);
    if (right) right.rotation.x = vertical.includes(cls.right) ? 0.3 : cls.right === 'flame' || cls.right === 'eldritch' ? 0 : 1.1;
    const left = attach(cls.left, handL);
    if (left && cls.left === 'dagger') left.rotation.x = 1.1;
    if (left && cls.left === 'tome') left.rotation.set(0.3, -0.4, 0);
    if (cls.back) {
      const back = attach(cls.back, torso);
      back.position.set(0, torsoH * 0.45, -torsoTop - 0.08);
      back.rotation.set(0.1, 0, cls.back === 'lute' ? 0.7 : -0.35);
    }

    this.root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = false;
      }
    });

    this.parts = { body, hips, torso, head, legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1], cape, tail };
    this.pose = {
      armL: left ? -0.3 : 0,
      armR: right ? -0.35 : 0,
      holdR: !!right,
    };
    this.glowParts = [];
    this.root.traverse((o) => {
      if (o.userData.flicker || o.userData.pulse) this.glowParts.push(o);
    });
    this.height = (hipY + 0.06 + torsoH + 0.02 + hc + headR) * SCALE;
  }

  /** speed in m/s, grounded flag. */
  update(dt, speed = 0, grounded = true) {
    const a = this.anim;
    const p = this.parts;
    a.t += dt;
    a.k = damp(a.k, clamp(speed / 7.2, 0, 1), 10, dt);
    a.air = damp(a.air, grounded ? 0 : 1, 14, dt);
    const K = a.k;
    const H = RACES[this.config.race].height;
    a.phase += dt * speed * (3.4 / (0.6 + H * 0.4));

    const amp = (0.3 + 0.5 * K) * Math.min(K * 4, 1);
    const swing = Math.sin(a.phase) * amp;
    const air = a.air;

    p.legL.rotation.x = swing * (1 - air) + -0.7 * air;
    p.legR.rotation.x = -swing * (1 - air) + 0.35 * air;
    p.armL.rotation.x = this.pose.armL - swing * 0.9 * (this.pose.armL ? 0.5 : 1) * (1 - air) - 0.5 * air;
    p.armR.rotation.x = this.pose.armR + swing * 0.9 * (this.pose.holdR ? 0.4 : 1) * (1 - air) - 0.4 * air;
    const idle = Math.sin(a.t * 1.6) * 0.03;
    p.armL.rotation.z = 0.08 + idle * (1 - K) + air * 0.5;
    p.armR.rotation.z = -0.08 - idle * (1 - K) - air * 0.5;

    p.body.position.y = Math.abs(Math.cos(a.phase)) * 0.07 * K + Math.sin(a.t * 2.2) * 0.006;
    p.body.rotation.x = K * 0.16;
    p.torso.rotation.y = Math.sin(a.phase) * 0.14 * K;
    p.head.rotation.y = -p.torso.rotation.y * 0.7;
    p.head.rotation.x = Math.sin(a.t * 0.7) * 0.03;
    if (p.cape) p.cape.rotation.x = 0.08 + K * 0.8 + air * 0.5 + Math.sin(a.t * 5) * 0.04 * (0.3 + K);
    if (p.tail) {
      p.tail.rotation.y = Math.sin(a.t * 2.4) * 0.4;
      p.tail.rotation.x = 1.0 - K * 0.4;
    }
    for (const g of this.glowParts) {
      if (g.userData.flicker) g.scale.setScalar(1 + Math.sin(a.t * 14 + g.id) * 0.15 + Math.sin(a.t * 23) * 0.08);
      if (g.userData.pulse) g.scale.setScalar(1 + Math.sin(a.t * 3) * 0.12);
      g.rotation.y += dt * 2;
    }
  }
}
