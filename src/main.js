import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { Physics } from './core/physics.js';
import { Player } from './core/Player.js';
import { CameraRig } from './core/CameraRig.js';
import { Input } from './core/Input.js';
import { World } from './world/World.js';
import { heightAt } from './world/terrain.js';
import { SPAWN, islandRadius } from './world/layout.js';
import { Character } from './character/Character.js';
import { defaultConfig, randomConfig, sanitizeConfig } from './character/options.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { Creator } from './ui/Creator.js';
import { Hud } from './ui/Hud.js';
import { Modal } from './ui/Modal.js';
import { LOCATIONS, LOCATION_BY_ID } from './data/locations.js';
import { smoothstep } from './utils/math.js';

const store = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode etc. — progress just won't persist */
    }
  },
};

const $ = (id) => document.getElementById(id);

class App {
  constructor() {
    this.canvas = $('scene');
    this.state = 'intro'; // intro | creator | play | modal
    this.time = 0;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    document.body.classList.toggle('touch', this.isTouch);

    this._setupRenderer();
    this.physics = new Physics();
    this.world = new World(this.scene, this.physics);

    this.config = sanitizeConfig(store.get('camp.character') || defaultConfig());
    this.character = new Character(this.config);
    this.scene.add(this.character.root);
    this.player = new Player(this.physics, this.character, SPAWN);
    this.rig = new CameraRig(this.camera);
    this.input = new Input(this.canvas);
    this.audio = new AudioEngine();
    this.soundOn = store.get('camp.sound') !== false;
    this.audio.setMuted(!this.soundOn);

    this.discovered = new Set((store.get('camp.discovered') || []).filter((id) => LOCATION_BY_ID[id]));
    this.hud = new Hud(LOCATIONS);
    this.hud.setSound(this.soundOn);
    for (const id of this.discovered) this.hud.markDiscovered(id);
    this.hud.setDiscovered(this.discovered.size, LOCATIONS.length);

    this.modal = new Modal({
      onClose: () => this._onModalClose(),
      onTravel: (id) => this.travel(id),
      onRead: (id) => (id === '__all' ? this.modal.openAll() : this.modal.openLocation(LOCATION_BY_ID[id])),
    });
    this.creator = new Creator({ onChange: (cfg, key) => this._onCreatorChange(cfg, key) });

    this._bindUi();
    this.timer = new THREE.Timer();
    this.frameTimes = [];
    this.renderer.setAnimationLoop((t) => this._frame(t));

    requestAnimationFrame(() => {
      $('loading').classList.add('done');
      $('intro').classList.remove('hidden');
      setTimeout(() => $('loading').remove(), 700);
    });
    if (import.meta.env.DEV) window.__app = this;
  }

  /* --------------------------------------------------------------- setup */
  _setupRenderer() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(this._fov(w / h), w / h, 0.1, 1500);

    const target = new THREE.WebGLRenderTarget(w * this.pixelRatio, h * this.pixelRatio, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.55, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    window.addEventListener('resize', () => this._resize());
  }

  /** Portrait phones get a wider lens so the camp doesn't feel cramped. */
  _fov(aspect) {
    return aspect < 0.8 ? 52 : aspect < 1.2 ? 44 : 36;
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.fov = this._fov(w / h);
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
  }

  _bindUi() {
    $('enter').addEventListener('click', () => this.enter());
    $('skip').addEventListener('click', () => this.modal.openAll());
    $('begin').addEventListener('click', () => this.begin());
    $('randomize').addEventListener('click', () => {
      const cfg = randomConfig(this.config.name);
      this.creator.open(cfg);
      this._onCreatorChange(cfg, 'all');
    });
    $('prompt').addEventListener('click', () => this.interact());

    document.querySelector('.hud-buttons').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (btn) this._action(btn.dataset.action);
    });

    const inGame = () => this.state === 'play';
    this.input.on('e', () => (inGame() ? this.interact() : false));
    this.input.on('j', () => (inGame() ? this._action('journal') : false));
    this.input.on('c', () => (inGame() ? this._action('character') : false));
    this.input.on('m', () => this._action('sound'));
    this.input.on('h', () => (inGame() ? this._action('help') : false));
    this.input.on('?', () => (inGame() ? this._action('help') : false));
    this.input.on('escape', () => (this.modal.isOpen ? this.modal.close() : false));
    this.input.on('enter', (e) => {
      if (this.state === 'intro' && !this.modal.isOpen) return this.enter();
      if (this.state === 'creator' && e.target.id === 'char-name') return this.begin();
      return false;
    });
  }

  _action(action) {
    if (action === 'journal') this._openModal(() => this.modal.openJournal(this.discovered));
    else if (action === 'help') this._openModal(() => this.modal.openHelp());
    else if (action === 'character') this.openCreator();
    else if (action === 'sound') {
      this.soundOn = !this.soundOn;
      this.audio.setMuted(!this.soundOn);
      this.hud.setSound(this.soundOn);
      store.set('camp.sound', this.soundOn);
    }
  }

  /* ---------------------------------------------------------- game flow */
  enter() {
    this.audio.start();
    $('intro').classList.add('hidden');
    this.openCreator();
  }

  openCreator() {
    if (this.modal.isOpen) this.modal.close();
    this.state = 'creator';
    this.input.enabled = false;
    this.hud.hide();
    document.body.classList.remove('playing');
    const yaw = this.rig.mode === 'follow' ? this.rig.yaw : 0;
    this.player.yaw = yaw;
    this.player.sync();
    this.rig.portraitYaw = yaw;
    this.rig.portraitHeight = this.character.height;
    this.rig.target.copy(this.player.pos);
    this.rig.setMode('portrait', 1.8);
    this.creator.open(this.config);
    $('creator').classList.remove('hidden');
  }

  _onCreatorChange(cfg, key) {
    this.config = cfg;
    if (key === 'name') return;
    this.character.set(cfg);
    this.rig.portraitHeight = this.character.height;
    if (this.audio.started) this.audio.chime();
  }

  begin() {
    this.config.name = (this.config.name || '').trim() || 'Tav';
    this.config = sanitizeConfig(this.config);
    store.set('camp.character', this.config);
    this.hud.setCharacter(this.config);
    $('creator').classList.add('hidden');

    const first = this.state === 'creator' && !this.hasPlayed;
    this.state = 'play';
    this.input.enabled = true;
    this.rig.target.copy(this.player.pos);
    this.rig.snapFollow();
    this.rig.yaw = this.rig.portraitYaw;
    this.rig.setMode('follow', 1.8);
    this.hud.show();
    document.body.classList.add('playing');
    this.canvas.focus({ preventScroll: true });
    if (first) {
      this.hasPlayed = true;
      setTimeout(() => this.hud.toast('Welcome to camp', this.config.name, 'Explore the island — or press J to open the journal.', 5200), 1200);
    }
  }

  _openModal(fn) {
    if (this.state !== 'play' && this.state !== 'modal') return;
    fn();
    this.state = 'modal';
    this.input.enabled = false;
    this.hud.setPrompt(null);
    this.audio.chime();
  }

  interact() {
    if (this.state !== 'play' || !this.near) return;
    const loc = this.near;
    this._openModal(() => (loc.waypoint ? this.modal.openJournal(this.discovered) : this.modal.openLocation(loc)));
  }

  _onModalClose() {
    this.audio.close();
    if (this.state === 'modal') {
      this.state = 'play';
      this.input.enabled = true;
    }
  }

  travel(id) {
    const loc = LOCATION_BY_ID[id];
    if (!loc) return;
    this.modal.close();
    this.audio.whoosh();
    $('fade').classList.add('on');
    setTimeout(() => {
      let dx = -loc.x;
      let dz = -loc.z;
      const len = Math.hypot(dx, dz);
      if (len < 0.1) {
        dx = 0;
        dz = 1;
      } else {
        dx /= len;
        dz /= len;
      }
      const pos = { x: loc.x + dx * loc.radius * 0.85, z: loc.z + dz * loc.radius * 0.85 };
      for (let i = 0; i < 4; i++) this.physics.resolve(pos, this.player.radius);
      this.player.teleport(pos.x, pos.z, Math.atan2(loc.x - pos.x, loc.z - pos.z));
      this.rig.target.copy(this.player.pos);
      this.rig.snapFollow();
      $('fade').classList.remove('on');
    }, 480);
  }

  _discover(loc) {
    this.discovered.add(loc.id);
    store.set('camp.discovered', [...this.discovered]);
    this.hud.markDiscovered(loc.id);
    this.hud.setDiscovered(this.discovered.size, LOCATIONS.length);
    this.audio.discover();
    if (this.discovered.size === LOCATIONS.length) {
      this.hud.toast('Inspiration gained', 'Every place discovered', 'Now go accept the quest on the Quest Board.', 5500);
    } else {
      this.hud.toast('Location discovered', loc.name, loc.kind);
    }
  }

  /* ---------------------------------------------------------------- loop */
  _frame(timestamp) {
    this.timer.update(timestamp);
    const dt = Math.min(this.timer.getDelta(), 0.05);
    this.time += dt;
    const orbit = this.input.consumeOrbit();
    const zoom = this.input.consumeZoom();

    if (this.state === 'play') {
      this.player.update(dt, this.input.move, this.input.consumeJump(), this.rig.yaw);
    } else {
      if (this.state === 'creator') this.player.yaw -= orbit;
      this.player.idle(dt);
    }
    this.physics.step(dt, this.player, this.time);
    this.world.update(dt, this.time);

    this.rig.target.copy(this.player.pos);
    const playing = this.state === 'play' || this.state === 'modal';
    this.rig.update(dt, playing ? { orbit, zoom } : {});
    this.world.follow(this.rig.mode === 'orbit' ? new THREE.Vector3(0, 0, 0) : this.player.pos);

    if (playing) this._updateGameplay();

    this.composer.render(dt);
    this._adaptQuality(dt);
  }

  _updateGameplay() {
    const p = this.player.pos;
    let near = null;
    let best = Infinity;
    for (const loc of LOCATIONS) {
      const d = Math.hypot(p.x - loc.x, p.z - loc.z);
      if (d < loc.radius && d < best) {
        best = d;
        near = loc;
      }
      if (!this.discovered.has(loc.id) && d < loc.radius + 3) this._discover(loc);
    }
    this.near = near;
    if (this.state === 'play') this.hud.setPrompt(near);
    this.hud.updateLabels(this.camera, p, heightAt, near?.id);

    const r = Math.hypot(p.x, p.z);
    const fire = 1 - smoothstep(3, 18, r);
    const waves = smoothstep(0.7, 0.93, r / islandRadius(Math.atan2(p.z, p.x)));
    this.audio.setProximity(fire, waves);
  }

  /** Drop the resolution a notch if the device is struggling. */
  _adaptQuality(dt) {
    if (this.state !== 'play' || this.pixelRatio <= 0.75) return;
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 120) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    if (avg > 1 / 40) {
      this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.25);
      this._resize();
    }
  }
}

new App();
