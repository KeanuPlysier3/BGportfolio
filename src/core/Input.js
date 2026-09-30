/*
 * Movement uses KeyboardEvent.code (physical key position), so WASD also works
 * as ZQSD on AZERTY keyboards. Shortcut letters use KeyboardEvent.key.
 */
const MOVE = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: 'jump',
};

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.enabled = false;
    this.joy = { x: 0, y: 0, active: false };
    this.actions = new Map();
    this.orbitDelta = 0;
    this.zoomDelta = 0;
    this.jumpQueued = false;

    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const move = MOVE[e.code];
      if (move) {
        if (this.enabled) e.preventDefault();
        if (move === 'jump' && !e.repeat) this.jumpQueued = true;
        this.keys.add(move);
      }
      const key = e.key.toLowerCase();
      const handler = this.actions.get(key) || this.actions.get(e.code);
      if (handler && !e.repeat) {
        if (handler(e) !== false) e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const move = MOVE[e.code];
      if (move) this.keys.delete(move);
    });
    window.addEventListener('blur', () => this.keys.clear());

    this._pointer(canvas);
    this._joystick();
  }

  on(key, handler) {
    this.actions.set(key, handler);
  }

  /** Movement vector in screen space: x right, y forward. */
  get move() {
    if (!this.enabled) return { x: 0, y: 0, run: false };
    let x = (this.keys.has('right') ? 1 : 0) - (this.keys.has('left') ? 1 : 0);
    let y = (this.keys.has('up') ? 1 : 0) - (this.keys.has('down') ? 1 : 0);
    let run = this.keys.has('run');
    if (this.joy.active) {
      x = this.joy.x;
      y = this.joy.y;
      run = Math.hypot(x, y) > 0.85;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y, run };
  }

  consumeJump() {
    const j = this.jumpQueued && this.enabled;
    this.jumpQueued = false;
    return j;
  }

  consumeOrbit() {
    const d = this.orbitDelta;
    this.orbitDelta = 0;
    return d;
  }

  consumeZoom() {
    const d = this.zoomDelta;
    this.zoomDelta = 0;
    return d;
  }

  _pointer(canvas) {
    let dragging = false;
    let lastX = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.orbitDelta += (e.clientX - lastX) * 0.006;
      lastX = e.clientX;
    });
    const end = () => (dragging = false);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoomDelta += Math.sign(e.deltaY) * 0.08;
      },
      { passive: false },
    );
  }

  _joystick() {
    const zone = document.getElementById('joystick');
    if (!zone) return;
    const knob = zone.querySelector('.joystick-knob');
    const ring = zone.querySelector('.joystick-ring');
    let id = null;
    let cx = 0;
    let cy = 0;
    const R = 50;
    zone.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      zone.setPointerCapture(id);
      const rect = zone.getBoundingClientRect();
      cx = e.clientX;
      cy = e.clientY;
      ring.style.left = `${cx - rect.left}px`;
      ring.style.top = `${cy - rect.top}px`;
      ring.classList.add('active');
      this.joy.active = true;
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) {
        dx = (dx / len) * R;
        dy = (dy / len) * R;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / R;
      this.joy.y = -dy / R;
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      this.joy.active = false;
      this.joy.x = this.joy.y = 0;
      knob.style.transform = '';
      ring.classList.remove('active');
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }
}
