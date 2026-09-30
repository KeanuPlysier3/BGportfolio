import * as THREE from 'three';
import { clamp, damp, easeInOutCubic } from '../utils/math.js';

const PITCH = 0.72; // ~41° looking down, Bruno-style
const DISTANCE = 19;
const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();

/**
 * Three modes:
 *  - orbit:    slow cinematic circle around the island (title screen)
 *  - portrait: close-up of the character (character creator)
 *  - follow:   angled third-person camera that trails the player
 * Switching modes blends smoothly between the two poses.
 */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.mode = 'orbit';
    this.yaw = 0;
    this.zoom = 1;
    this.target = new THREE.Vector3();
    this.smoothTarget = new THREE.Vector3();
    this.portraitYaw = 0;
    this.portraitHeight = 1.7;
    this.orbitT = 0;

    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.currentLook = new THREE.Vector3();
    this.fromPos = new THREE.Vector3();
    this.fromLook = new THREE.Vector3();
    this.blend = 1;
    this.blendDuration = 1;
  }

  setMode(mode, duration = 1.6) {
    if (mode === this.mode) return;
    this.fromPos.copy(this.camera.position);
    this.fromLook.copy(this.currentLook);
    this.mode = mode;
    this.blend = 0;
    this.blendDuration = duration;
  }

  _pose(dt, outPos, outLook) {
    if (this.mode === 'orbit') {
      this.orbitT += dt * 0.05;
      const a = this.orbitT + 0.6;
      outLook.set(0, 1, 2);
      outPos.set(Math.sin(a) * 54, 34, Math.cos(a) * 54);
    } else if (this.mode === 'portrait') {
      const h = this.portraitHeight;
      const wide = window.innerWidth > 900;
      const dist = (2.6 + h * 1.7) * (wide ? 1 : 1.25);
      // on narrow screens the panels sit below, so frame the character in the top half
      outLook.copy(this.target).add(new THREE.Vector3(0, h * (wide ? 0.52 : 0.05), 0));
      outPos.set(Math.sin(this.portraitYaw) * dist, h * 0.7, Math.cos(this.portraitYaw) * dist).add(this.target);
    } else {
      this.smoothTarget.x = damp(this.smoothTarget.x, this.target.x, 6, dt);
      this.smoothTarget.z = damp(this.smoothTarget.z, this.target.z, 6, dt);
      this.smoothTarget.y = damp(this.smoothTarget.y, this.target.y, 3, dt);
      const d = DISTANCE * this.zoom;
      outLook.copy(this.smoothTarget).add(new THREE.Vector3(0, 0.9, 0));
      outPos.set(Math.sin(this.yaw) * Math.cos(PITCH) * d, Math.sin(PITCH) * d, Math.cos(this.yaw) * Math.cos(PITCH) * d).add(outLook);
    }
  }

  update(dt, { orbit = 0, zoom = 0 } = {}) {
    if (this.mode === 'follow') {
      this.yaw += orbit;
      this.zoom = clamp(this.zoom + zoom, 0.55, 1.6);
    }
    this._pose(dt, this.pos, this.look);

    let pos = this.pos;
    let look = this.look;
    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / this.blendDuration);
      const k = easeInOutCubic(this.blend);
      pos = _pos.lerpVectors(this.fromPos, this.pos, k);
      look = _look.lerpVectors(this.fromLook, this.look, k);
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(look);
    this.currentLook.copy(look);
  }

  snapFollow() {
    this.smoothTarget.copy(this.target);
  }
}
