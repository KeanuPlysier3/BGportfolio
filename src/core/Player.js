import * as THREE from 'three';
import { damp, dampAngle } from '../utils/math.js';

const WALK = 4.2;
const RUN = 7.4;
const GRAVITY = 22;
const JUMP = 7;
const DEEP_WATER = -0.45;

export class Player {
  constructor(physics, character, spawn) {
    this.physics = physics;
    this.character = character;
    this.radius = 0.38;
    this.pos = new THREE.Vector3(spawn.x, physics.groundAt(spawn.x, spawn.z), spawn.z);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.grounded = true;
    this.speed = 0;
    this.root = character.root;
    this.sync();
  }

  teleport(x, z, yaw = this.yaw) {
    this.pos.set(x, this.physics.groundAt(x, z), z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.sync();
  }

  update(dt, move, jump, camYaw) {
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    const rx = Math.cos(camYaw);
    const rz = -Math.sin(camYaw);
    let mx = rx * move.x + fx * move.y;
    let mz = rz * move.x + fz * move.y;
    const input = Math.hypot(mx, mz);
    if (input > 1) {
      mx /= input;
      mz /= input;
    }

    const max = move.run ? RUN : WALK;
    const accel = input > 0.01 ? (this.grounded ? 12 : 4) : this.grounded ? 14 : 1;
    this.vel.x = damp(this.vel.x, mx * max, accel, dt);
    this.vel.z = damp(this.vel.z, mz * max, accel, dt);

    const prevX = this.pos.x;
    const prevZ = this.pos.z;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.physics.resolve(this.pos, this.radius);

    // don't wade into deep water — slide along the shoreline instead
    if (this.physics.groundAt(this.pos.x, this.pos.z) < DEEP_WATER) {
      if (this.physics.groundAt(this.pos.x, prevZ) >= DEEP_WATER) this.pos.z = prevZ;
      else if (this.physics.groundAt(prevX, this.pos.z) >= DEEP_WATER) this.pos.x = prevX;
      else {
        this.pos.x = prevX;
        this.pos.z = prevZ;
      }
    }

    const ground = this.physics.groundAt(this.pos.x, this.pos.z);
    if (jump && this.grounded) {
      this.vel.y = JUMP;
      this.grounded = false;
    }
    if (this.grounded) {
      // stick to the ground on slopes, but fall off ledges (like the dock)
      if (this.pos.y - ground > 0.35) this.grounded = false;
      else this.pos.y = ground;
    }
    if (!this.grounded) {
      this.vel.y -= GRAVITY * dt;
      this.pos.y += this.vel.y * dt;
      if (this.pos.y <= ground) {
        this.pos.y = ground;
        this.vel.y = 0;
        this.grounded = true;
      }
    }

    this.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.speed > 0.3 && input > 0.01) this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 12, dt);

    this.character.update(dt, this.speed, this.grounded);
    this.sync();
  }

  /** Idle animation only (menus, creator). */
  idle(dt) {
    this.speed = 0;
    this.vel.set(0, 0, 0);
    this.character.update(dt, 0, true);
    this.sync();
  }

  sync() {
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;
  }
}
