import * as THREE from 'three';
import { GeoBuilder } from './builder.js';
import { worldMaterial, glowMaterial, PALETTE as P } from './materials.js';
import { buildTerrain, heightAt } from './terrain.js';
import { SPOTS, DOCK, CAMP_RING, PATH_SEGMENTS, islandRadius, pathMask } from './layout.js';
import { createWater, createSky, createGrass, createFlowers, createFire, createFireflies } from './environment.js';
import { mulberry32 } from '../utils/math.js';
import * as props from './props.js';

const facing = (x, z, tx = 0, tz = 0) => Math.atan2(tx - x, tz - z);

export class World {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.updaters = [];
    this.fogColor = new THREE.Color('#1b2345');
    this.focus = new THREE.Vector3();

    scene.fog = new THREE.Fog(this.fogColor, 55, 150);
    scene.background = this.fogColor;

    this._lights();
    this.sky = createSky(this.fogColor);
    scene.add(this.sky);
    scene.add(buildTerrain());

    const water = createWater();
    scene.add(water.mesh);
    this.updaters.push((dt, t) => water.update(t));

    this._buildProps();
  }

  _lights() {
    const hemi = new THREE.HemisphereLight('#8f9fe6', '#3b2f45', 1.35);
    this.scene.add(hemi);

    const moon = new THREE.DirectionalLight('#c3cdff', 1.6);
    moon.position.set(-18, 30, -12);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    const s = moon.shadow.camera;
    s.left = s.bottom = -28;
    s.right = s.top = 28;
    s.near = 1;
    s.far = 90;
    moon.shadow.bias = -0.0006;
    moon.shadow.normalBias = 0.04;
    this.scene.add(moon, moon.target);
    this.moon = moon;
    this.moonOffset = moon.position.clone();

    // warm rim so faces facing away from the moon don't go flat blue
    const rim = new THREE.DirectionalLight('#ffb27a', 0.35);
    rim.position.set(20, 12, 25);
    this.scene.add(rim);
  }

  /** Keep the shadow frustum centred on the player. */
  follow(target) {
    this.moon.position.copy(target).add(this.moonOffset);
    this.moon.target.position.copy(target);
    this.focus.copy(target);
    this.sky.position.copy(target);
  }

  _buildProps() {
    const rand = mulberry32(7);
    const b = new GeoBuilder(rand);
    const glow = new GeoBuilder(rand);
    const ctx = { b, glow, physics: this.physics, scene: this.scene, anim: this.updaters, rand, focus: this.focus };
    const S = SPOTS;
    const occupied = []; // [x, z, r] areas the scatter must avoid

    /* camp core */
    props.campfire(ctx, S.campfire.x, S.campfire.z);
    const fire = createFire(new THREE.Vector3(0, heightAt(0, 0), 0));
    this.scene.add(fire.group);
    this.updaters.push(fire.update);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * 3.5;
      const z = Math.sin(a) * 3.5;
      props.logSeat(ctx, x, z, facing(x, z) + Math.PI / 2, 2.0);
    }
    props.d20(ctx, 2.2, 5.2);

    // companion tents between the paths
    const tents = [
      [0.28, '#6b2f5a', '#c9b6e4'], // Shadowheart
      [2.8, '#8a1f2a', '#e6e0d2'], // Astarion
      [-1.92, '#3d4f8f', P.gold], // Gale
      [-1.2, '#a4521d', '#2a2a30'], // Karlach
    ];
    for (const [a, color, accent] of tents) {
      const x = Math.cos(a) * 11.5;
      const z = Math.sin(a) * 11.5;
      props.tent(ctx, x, z, facing(x, z), color, accent);
      const bx = Math.cos(a + 0.3) * 8.6;
      const bz = Math.sin(a + 0.3) * 8.6;
      props.bedroll(ctx, bx, bz, facing(bx, bz) + 0.3, color);
      occupied.push([x, z, 3.2]);
    }
    props.campTree(ctx, -10.5, -6.5);
    occupied.push([-10.5, -6.5, 4]);

    /* key locations */
    props.questBoard(ctx, S.questboard.x, S.questboard.z, facing(S.questboard.x, S.questboard.z, 0, 8));
    props.waypoint(ctx, S.waypoint.x, S.waypoint.z);
    props.warTable(ctx, S.planA.x, S.planA.z, facing(S.planA.x, S.planA.z) + Math.PI / 2);
    props.tailorPavilion(ctx, S.momu.x, S.momu.z, facing(S.momu.x, S.momu.z));
    props.arcaneCircle(ctx, S.ml.x, S.ml.z, 0);
    props.armory(ctx, S.armory.x, S.armory.z, facing(S.armory.x, S.armory.z));
    props.library(ctx, S.library.x, S.library.z, facing(S.library.x, S.library.z));
    props.wagon(ctx, S.wagon.x, S.wagon.z, facing(S.wagon.x, S.wagon.z) + Math.PI / 2.4);
    props.dock(ctx, DOCK);
    props.signpost(ctx, 1.8, 8.2, 0, [facing(1.8, 8.2, S.wagon.x, S.wagon.z), facing(1.8, 8.2, S.questboard.x, S.questboard.z), 0]);

    /* pushable props — the Bruno Simon bit */
    const crates = [
      [S.wagon.x - 2.6, S.wagon.z + 1.5],
      [S.wagon.x - 2.8, S.wagon.z + 0.4],
      [S.wagon.x + 2.8, S.wagon.z - 2.2],
      [S.armory.x + 3.4, S.armory.z + 1.2],
      [S.library.x + 3.2, S.library.z + 2.4],
      [S.planA.x - 1, S.planA.z + 3.6],
      [-4.6, 7.8],
      [S.momu.x + 3.6, S.momu.z - 3.2],
    ];
    crates.forEach(([x, z], i) => props.crate(ctx, x, z, i * 0.7, i % 3 === 0 ? 1.15 : 1));
    const barrels = [
      [S.wagon.x - 1.8, S.wagon.z + 2.6],
      [S.armory.x - 3.3, S.armory.z + 2.2],
      [S.armory.x - 2.6, S.armory.z + 2.9],
      [5.2, 6.4],
      [5.9, 7.2],
      [-5.8, -5.6],
      [S.ml.x + 4, S.ml.z + 4.5],
      [0.8, DOCK.zStart + 1.5],
      [-0.7, DOCK.zStart + 2.4],
    ];
    barrels.forEach(([x, z]) => props.barrel(ctx, x, z));
    props.sack(ctx, S.wagon.x + 2.4, S.wagon.z - 1.2);
    props.sack(ctx, -6.2, 7.4);
    props.sack(ctx, S.library.x - 3.2, S.library.z + 1.8);

    /* lanterns along the paths */
    for (const [ax, az, bx, bz] of PATH_SEGMENTS) {
      const len = Math.hypot(bx - ax, bz - az);
      const nx = (bz - az) / len;
      const nz = -(bx - ax) / len;
      for (let d = 4; d < len - 4; d += 9) {
        const t = d / len;
        const side = Math.round(d / 9) % 2 ? 1 : -1;
        const x = ax + (bx - ax) * t + nx * 1.9 * side;
        const z = az + (bz - az) * t + nz * 1.9 * side;
        props.lanternPost(ctx, x, z, Math.atan2(nz * side, -nx * side));
        occupied.push([x, z, 1]);
      }
    }

    for (const s of Object.values(SPOTS)) occupied.push([s.x, s.z, s.r + 1.5]);
    occupied.push([DOCK.x, DOCK.zStart, 3]);

    const free = (x, z, pad = 0) => {
      for (const [ox, oz, r] of occupied) if ((x - ox) ** 2 + (z - oz) ** 2 < (r + pad) ** 2) return false;
      return pathMask(x, z) < 0.05;
    };
    const polar = (rMin, rMax) => {
      const a = rand() * Math.PI * 2;
      const R = islandRadius(a);
      const r = R * (rMin + (rMax - rMin) * Math.sqrt(rand()));
      return [Math.cos(a) * r, Math.sin(a) * r];
    };

    /* forest: dense near the rim, sparse inside */
    let placed = 0;
    for (let i = 0; i < 1400 && placed < 190; i++) {
      const [x, z] = polar(0.28, 0.8);
      const r = Math.hypot(x, z);
      const density = r < 24 ? 0.15 : 0.9;
      if (rand() > density || !free(x, z, 1.4)) continue;
      if (rand() < 0.55) props.pineTree(ctx, x, z, 0.9 + rand() * 0.5);
      else props.roundTree(ctx, x, z, 0.85 + rand() * 0.45);
      occupied.push([x, z, 1.6]);
      placed++;
    }
    for (let i = 0; i < 420; i++) {
      const [x, z] = polar(0.15, 0.95);
      if (!free(x, z, 0.4)) continue;
      const k = rand();
      if (k < 0.3) props.rock(ctx, x, z, 0.3 + rand() * 0.8);
      else if (k < 0.75) props.bush(ctx, x, z, 0.7 + rand() * 0.6);
      else props.mushroom(ctx, x, z, 0.8 + rand() * 0.8);
    }
    // big boulders on the beach
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2;
      const r = islandRadius(a) * (0.86 + rand() * 0.08);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.abs(x) < 4 && z > 40) continue; // keep the dock clear
      props.rock(ctx, x, z, 0.6 + rand() * 1.4);
    }
    // ring of stones around the camp ring
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const x = Math.cos(a) * (CAMP_RING + 1.4);
      const z = Math.sin(a) * (CAMP_RING + 1.4);
      if (pathMask(x, z) < 0.2 && rand() > 0.5) props.rock(ctx, x, z, 0.18 + rand() * 0.15, false);
    }

    const staticMesh = b.build(worldMaterial);
    staticMesh.name = 'props';
    this.scene.add(staticMesh);
    const glowMesh = glow.build(glowMaterial, { castShadow: false, receiveShadow: false });
    this.scene.add(glowMesh);

    /* grass, flowers, fireflies */
    const grass = [];
    const flowers = [];
    for (let i = 0; i < 26000; i++) {
      const [x, z] = polar(0, 0.84);
      const h = heightAt(x, z);
      if (h < 0.7) continue;
      const p = pathMask(x, z);
      if (p > 0.35) continue;
      let blocked = false;
      for (const [ox, oz, r] of occupied) {
        if ((x - ox) ** 2 + (z - oz) ** 2 < (r * 0.5) ** 2) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      grass.push([x, h, z, 0.7 + rand() * 0.7, rand()]);
      if (rand() < 0.06) flowers.push([x + 0.2, h, z + 0.1]);
    }
    const g = createGrass(grass);
    this.scene.add(g.mesh);
    this.updaters.push((dt, t) => g.update(t));
    this.scene.add(createFlowers(flowers));

    const flies = [];
    for (let i = 0; i < 140; i++) {
      const [x, z] = polar(0.1, 0.8);
      flies.push([x, heightAt(x, z) + 0.6 + rand() * 2, z]);
    }
    const ff = createFireflies(flies);
    this.scene.add(ff.mesh);
    this.updaters.push(ff.update);
  }

  update(dt, t) {
    for (const u of this.updaters) u(dt, t);
  }
}
