import * as THREE from 'three';
import { Character } from '../character/Character.js';
import { RACES, CLASSES } from '../character/options.js';

const _v = new THREE.Vector3();

/** Renders a small bust of the character for the HUD, with its own tiny renderer. */
class PortraitRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = null;
  }

  render(config) {
    try {
      if (!this.renderer) {
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
        this.renderer.setPixelRatio(1);
        this.renderer.setSize(this.canvas.width, this.canvas.height, false);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.scene = new THREE.Scene();
        this.scene.add(new THREE.HemisphereLight('#c9d4ff', '#4a3040', 1.6));
        const key = new THREE.DirectionalLight('#ffd9b0', 2.4);
        key.position.set(1.5, 2, 3);
        this.scene.add(key);
        this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
      }
      if (this.character) {
        this.scene.remove(this.character.root);
        this.character.dispose();
      }
      this.character = new Character(config);
      this.character.update(0.016, 0, true);
      this.character.root.rotation.y = -0.35;
      this.scene.add(this.character.root);
      const h = this.character.height;
      this.camera.position.set(0.25, h * 0.86, 1.35 + h * 0.2);
      this.camera.lookAt(0, h * 0.8, 0);
      this.renderer.render(this.scene, this.camera);
    } catch {
      /* portrait is decorative — ignore WebGL context limits */
    }
  }
}

export class Hud {
  constructor(locations) {
    this.el = document.getElementById('hud');
    this.promptEl = document.getElementById('prompt');
    this.promptText = document.getElementById('prompt-text');
    this.hint = document.getElementById('controls-hint');
    this.portrait = new PortraitRenderer(document.getElementById('portrait'));
    this.toastsEl = document.getElementById('toasts');
    this.labelsEl = document.getElementById('labels');
    this.promptId = null;

    this.labels = locations.map((loc) => {
      const el = document.createElement('div');
      el.className = 'poi-label undiscovered';
      el.innerHTML = `${loc.name}<small>${loc.kind}</small>`;
      this.labelsEl.appendChild(el);
      return { loc, el, visible: false, pos: new THREE.Vector3(loc.x, 0, loc.z) };
    });
  }

  show() {
    this.el.classList.remove('hidden');
    clearTimeout(this.hintTimer);
    this.hint.classList.remove('faded');
    this.hintTimer = setTimeout(() => this.hint.classList.add('faded'), 12000);
  }

  hide() {
    this.el.classList.add('hidden');
    this.setPrompt(null);
    for (const l of this.labels) l.el.style.opacity = 0;
  }

  setCharacter(config) {
    document.getElementById('hud-name').textContent = config.name || 'Tav';
    document.getElementById('hud-class').textContent = `Level 7 ${RACES[config.race].label} ${CLASSES[config.cls].label}`;
    this.portrait.render(config);
  }

  setDiscovered(count, total) {
    document.getElementById('hud-discovered').textContent = `${count} / ${total} places discovered`;
    document.getElementById('hud-xp-bar').style.width = `${(count / total) * 100}%`;
  }

  markDiscovered(id) {
    const l = this.labels.find((x) => x.loc.id === id);
    if (l) l.el.classList.remove('undiscovered');
  }

  setSound(on) {
    document.getElementById('sound-icon').textContent = on ? '♪' : '✕';
    document.getElementById('sound-label').textContent = on ? 'Sound on' : 'Sound off';
  }

  setPrompt(loc) {
    const id = loc ? loc.id : null;
    if (id === this.promptId) return;
    this.promptId = id;
    if (!loc) {
      this.promptEl.classList.add('hidden');
      return;
    }
    this.promptText.textContent = loc.prompt;
    this.promptEl.classList.remove('hidden');
    // restart the entry animation
    this.promptEl.style.animation = 'none';
    void this.promptEl.offsetWidth;
    this.promptEl.style.animation = '';
  }

  toast(kind, title, sub = '', duration = 3600) {
    const el = document.createElement('div');
    el.className = 'toast frame';
    el.innerHTML = `<div class="toast-kind"></div><div class="toast-title"></div>${sub ? '<div class="toast-sub"></div>' : ''}`;
    el.querySelector('.toast-kind').textContent = kind;
    el.querySelector('.toast-title').textContent = title;
    if (sub) el.querySelector('.toast-sub').textContent = sub;
    this.toastsEl.appendChild(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 500);
    }, duration);
  }

  /** Project location labels to the screen. */
  updateLabels(camera, playerPos, heightAt, nearId) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const l of this.labels) {
      const d = Math.hypot(playerPos.x - l.loc.x, playerPos.z - l.loc.z);
      const show = d < 20;
      if (!show) {
        if (l.visible) {
          l.el.style.opacity = 0;
          l.visible = false;
        }
        continue;
      }
      _v.set(l.loc.x, heightAt(l.loc.x, l.loc.z) + l.loc.labelY, l.loc.z).project(camera);
      if (_v.z > 1) {
        l.el.style.opacity = 0;
        l.visible = false;
        continue;
      }
      const x = (_v.x * 0.5 + 0.5) * w;
      const y = (-_v.y * 0.5 + 0.5) * h;
      l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      l.el.style.opacity = Math.min(1, (20 - d) / 5).toFixed(2);
      l.el.classList.toggle('near', l.loc.id === nearId);
      l.visible = true;
    }
  }
}
