import * as THREE from 'three';
import { heightAt } from '../world/terrain.js';

const CELL = 6;
const GRAVITY = 20;
const _axis = new THREE.Vector3();
const _quat = new THREE.Quaternion();

/**
 * Tiny 2.5D physics: everything collides on the XZ plane as circles or
 * oriented boxes, and height comes from the terrain (or platforms like the dock).
 */
export class Physics {
  constructor() {
    this.grid = new Map();
    this.platforms = [];
    this.bodies = [];
    this._stamp = 0;
  }

  addCircle(x, z, r) {
    this._insert({ box: false, x, z, r, stamp: 0 }, r);
  }

  addBox(x, z, hw, hd, rot = 0) {
    this._insert({ box: true, x, z, hw, hd, cos: Math.cos(rot), sin: Math.sin(rot), stamp: 0 }, Math.hypot(hw, hd));
  }

  addPlatform(x, z, hw, hd, y, rot = 0) {
    this.platforms.push({ x, z, hw, hd, y, cos: Math.cos(rot), sin: Math.sin(rot) });
  }

  _insert(collider, radius) {
    const x0 = Math.floor((collider.x - radius) / CELL);
    const x1 = Math.floor((collider.x + radius) / CELL);
    const z0 = Math.floor((collider.z - radius) / CELL);
    const z1 = Math.floor((collider.z + radius) / CELL);
    for (let gx = x0; gx <= x1; gx++) {
      for (let gz = z0; gz <= z1; gz++) {
        const key = gx * 10007 + gz;
        let cell = this.grid.get(key);
        if (!cell) this.grid.set(key, (cell = []));
        cell.push(collider);
      }
    }
  }

  groundAt(x, z) {
    let h = heightAt(x, z);
    for (const p of this.platforms) {
      const dx = x - p.x;
      const dz = z - p.z;
      const lx = dx * p.cos - dz * p.sin;
      const lz = dx * p.sin + dz * p.cos;
      if (Math.abs(lx) <= p.hw && Math.abs(lz) <= p.hd) h = Math.max(h, p.y);
    }
    return h;
  }

  /** Push a circle at pos (x/z) out of every static collider. Returns true on contact. */
  resolve(pos, r) {
    const stamp = ++this._stamp;
    let hit = false;
    const x0 = Math.floor((pos.x - r) / CELL);
    const x1 = Math.floor((pos.x + r) / CELL);
    const z0 = Math.floor((pos.z - r) / CELL);
    const z1 = Math.floor((pos.z + r) / CELL);
    for (let gx = x0; gx <= x1; gx++) {
      for (let gz = z0; gz <= z1; gz++) {
        const cell = this.grid.get(gx * 10007 + gz);
        if (!cell) continue;
        for (const c of cell) {
          if (c.stamp === stamp) continue;
          c.stamp = stamp;
          if (c.box ? this._resolveBox(pos, r, c) : this._resolveCircle(pos, r, c)) hit = true;
        }
      }
    }
    return hit;
  }

  _resolveCircle(pos, r, c) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const min = r + c.r;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) return false;
    const d = Math.sqrt(d2) || 1e-4;
    pos.x = c.x + (dx / d) * min;
    pos.z = c.z + (dz / d) * min;
    return true;
  }

  _resolveBox(pos, r, c) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const lx = dx * c.cos - dz * c.sin;
    const lz = dx * c.sin + dz * c.cos;
    const cx = Math.max(-c.hw, Math.min(c.hw, lx));
    const cz = Math.max(-c.hd, Math.min(c.hd, lz));
    const ox = lx - cx;
    const oz = lz - cz;
    const d = Math.hypot(ox, oz);
    if (d >= r) return false;

    let nx;
    let nz;
    let push;
    if (d > 1e-5) {
      nx = ox / d;
      nz = oz / d;
      push = r - d;
    } else {
      const px = c.hw - Math.abs(lx);
      const pz = c.hd - Math.abs(lz);
      if (px < pz) {
        nx = Math.sign(lx) || 1;
        nz = 0;
        push = px + r;
      } else {
        nx = 0;
        nz = Math.sign(lz) || 1;
        push = pz + r;
      }
    }
    pos.x += (nx * c.cos + nz * c.sin) * push;
    pos.z += (-nx * c.sin + nz * c.cos) * push;
    return true;
  }

  /* ---------------------------------------------------------------- bodies */

  addBody(mesh, { r = 0.5, mass = 1, roll = false, floatDepth = 0.3 } = {}) {
    const body = {
      mesh,
      r,
      mass,
      roll,
      floatDepth,
      x: mesh.position.x,
      z: mesh.position.z,
      y: mesh.position.y,
      vx: 0,
      vz: 0,
      vy: 0,
      spin: 0,
      tumble: 0,
      baseQuat: mesh.quaternion.clone(),
    };
    this.bodies.push(body);
    return body;
  }

  /** Step dynamic props and let the player shove them around. */
  step(dt, player, time) {
    const bodies = this.bodies;

    for (const b of bodies) {
      // player contact
      const dx = b.x - player.pos.x;
      const dz = b.z - player.pos.z;
      const min = b.r + player.radius;
      const d = Math.hypot(dx, dz);
      if (d < min && Math.abs(b.y - player.pos.y) < 1.4) {
        const nx = d > 1e-4 ? dx / d : 1;
        const nz = d > 1e-4 ? dz / d : 0;
        const overlap = min - d;
        b.x += nx * overlap * 0.7;
        b.z += nz * overlap * 0.7;
        player.pos.x -= nx * overlap * 0.3;
        player.pos.z -= nz * overlap * 0.3;

        const vn = player.vel.x * nx + player.vel.z * nz;
        if (vn > 0) {
          const target = (vn * 1.5) / b.mass;
          const cur = b.vx * nx + b.vz * nz;
          if (cur < target) {
            b.vx += nx * (target - cur);
            b.vz += nz * (target - cur);
          }
          if (vn > 5.5 && b.vy === 0) {
            b.vy = (2.5 + Math.random() * 2) / Math.sqrt(b.mass);
            b.tumble = (Math.random() - 0.5) * 12;
          }
          b.spin += (Math.random() - 0.5) * vn * 0.6;
        }
      }
    }

    // body vs body
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const min = a.r + b.r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || Math.abs(a.y - b.y) > 1.2) continue;
        const d = Math.sqrt(d2) || 1e-4;
        const nx = dx / d;
        const nz = dz / d;
        const overlap = min - d;
        const wa = b.mass / (a.mass + b.mass);
        a.x -= nx * overlap * wa;
        a.z -= nz * overlap * wa;
        b.x += nx * overlap * (1 - wa);
        b.z += nz * overlap * (1 - wa);
        const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (rel < 0) {
          const imp = (-1.3 * rel) / (1 / a.mass + 1 / b.mass);
          a.vx -= (imp / a.mass) * nx;
          a.vz -= (imp / a.mass) * nz;
          b.vx += (imp / b.mass) * nx;
          b.vz += (imp / b.mass) * nz;
        }
      }
    }

    const pos = { x: 0, z: 0 };
    for (const b of bodies) {
      b.x += b.vx * dt;
      b.z += b.vz * dt;

      pos.x = b.x;
      pos.z = b.z;
      if (this.resolve(pos, b.r)) {
        const nx = pos.x - b.x;
        const nz = pos.z - b.z;
        const len = Math.hypot(nx, nz) || 1;
        const vn = (b.vx * nx + b.vz * nz) / len;
        if (vn < 0) {
          b.vx -= 1.5 * vn * (nx / len);
          b.vz -= 1.5 * vn * (nz / len);
        }
        b.x = pos.x;
        b.z = pos.z;
      }

      const ground = this.groundAt(b.x, b.z);
      const inWater = ground < -b.floatDepth;
      if (inWater) {
        const surface = Math.sin(time * 1.6 + b.x * 0.3) * 0.08 - b.floatDepth;
        b.vy += (surface - b.y) * 8 * dt;
        b.vy *= Math.exp(-3 * dt);
        b.y += b.vy * dt;
        const drag = Math.exp(-0.8 * dt);
        b.vx *= drag;
        b.vz *= drag;
        b.spin *= drag;
        b.tumble *= Math.exp(-2 * dt);
      } else {
        b.vy -= GRAVITY * dt;
        b.y += b.vy * dt;
        if (b.y <= ground) {
          b.y = ground;
          b.vy = b.vy < -3 ? -b.vy * 0.25 : 0;
          const friction = Math.exp(-4 * dt);
          b.vx *= friction;
          b.vz *= friction;
          b.spin *= Math.exp(-5 * dt);
          b.tumble *= Math.exp(-10 * dt);
        }
      }

      const speed = Math.hypot(b.vx, b.vz);
      if (speed < 0.02 && !inWater) {
        b.vx = 0;
        b.vz = 0;
      }

      const mesh = b.mesh;
      mesh.position.set(b.x, b.y + (b.lift || 0), b.z);
      if (b.roll) {
        if (speed > 0.01 && b.y <= ground + 0.05) {
          _axis.set(b.vz, 0, -b.vx).normalize();
          _quat.setFromAxisAngle(_axis, (speed * dt) / b.r);
          mesh.quaternion.premultiply(_quat);
        }
      } else {
        mesh.rotation.y += b.spin * dt;
        const rx = mesh.rotation.x;
        if (b.vy !== 0 || inWater) mesh.rotation.x = rx + b.tumble * dt;
        else {
          // settle onto the nearest flat face
          const rest = Math.round(rx / (Math.PI / 2)) * (Math.PI / 2);
          mesh.rotation.x = rest + (rx - rest) * Math.exp(-10 * dt);
        }
        if (inWater) mesh.rotation.z = Math.sin(time * 1.3 + b.z) * 0.15;
      }
    }
  }
}
