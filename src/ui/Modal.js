import { LOCATIONS } from '../data/locations.js';
import { PROFILE } from '../data/portfolio.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * One dialog used for location panels, the journal, the controls sheet and
 * the "just show me everything" view.
 */
export class Modal {
  constructor({ onClose, onTravel, onRead }) {
    this.el = document.getElementById('modal');
    this.kind = document.getElementById('modal-kind');
    this.title = document.getElementById('modal-title');
    this.body = document.getElementById('modal-body');
    this.onClose = onClose;
    this.isOpen = false;
    this.lastFocus = null;

    this.el.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) this.close();
      const travel = e.target.closest('[data-travel]');
      if (travel) onTravel(travel.dataset.travel);
      const read = e.target.closest('[data-read]');
      if (read) onRead(read.dataset.read);
    });
    this.el.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') this._trapFocus(e);
    });
  }

  open(kind, title, html) {
    this.kind.textContent = kind;
    this.title.textContent = title;
    this.body.innerHTML = html;
    this.body.scrollTop = 0;
    if (!this.isOpen) this.lastFocus = document.activeElement;
    this.el.classList.remove('hidden');
    this.isOpen = true;
    requestAnimationFrame(() => this.el.querySelector('.modal-footer .btn').focus({ preventScroll: true }));
  }

  close() {
    if (!this.isOpen) return;
    this.el.classList.add('hidden');
    this.isOpen = false;
    if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus({ preventScroll: true });
    this.onClose();
  }

  openLocation(loc) {
    this.open(loc.kind, loc.title || loc.name, loc.body());
  }

  openJournal(discovered, { travel = true } = {}) {
    const rows = LOCATIONS.filter((l) => !l.waypoint)
      .map((l) => {
        const found = discovered.has(l.id);
        return `<li class="${found ? 'found' : ''}">
          <span class="journal-mark" aria-hidden="true"></span>
          <span class="journal-text"><strong>${esc(l.title || l.name)}</strong><span>${esc(l.kind)}${found ? '' : ' · undiscovered'}</span></span>
          <button class="btn" data-read="${l.id}">Read</button>
          ${travel ? `<button class="btn" data-travel="${l.id}">Travel</button>` : ''}
        </li>`;
      })
      .join('');
    this.open(
      'Journal',
      'Places of Interest',
      `<p class="kicker">Read any entry directly, or fast-travel there and explore.</p>
       <ul class="journal">${rows}</ul>
       <div class="actions"><button class="btn" data-read="__all">Read the whole journal</button></div>`,
    );
  }

  openAll() {
    const sections = LOCATIONS.filter((l) => l.body)
      .map(
        (l) => `<section>
          <p class="section-kind">${esc(l.kind)}</p>
          <h2>${esc(l.title || l.name)}</h2>
          ${l.body()}
        </section>`,
      )
      .join('');
    this.open(PROFILE.tagline, PROFILE.name, `<div class="journal-all">${sections}</div>`);
  }

  openHelp() {
    this.open(
      'How to play',
      'Controls',
      `<div class="help-grid">
        <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows</span><span>Walk (ZQSD works on AZERTY)</span>
        <span><kbd>Shift</kbd></span><span>Run</span>
        <span><kbd>Space</kbd></span><span>Jump</span>
        <span><kbd>E</kbd></span><span>Interact with a place</span>
        <span>Drag · scroll</span><span>Turn and zoom the camera</span>
        <span><kbd>J</kbd></span><span>Journal &amp; fast travel</span>
        <span><kbd>C</kbd></span><span>Change your character</span>
        <span><kbd>M</kbd></span><span>Toggle sound</span>
        <span><kbd>Esc</kbd></span><span>Close a window</span>
      </div>
      <p class="muted">On a phone: drag on the left half of the screen to walk, tap the prompt to interact.</p>
      <p class="muted">Tip: run into crates, barrels and the big red d20 at the campfire.</p>`,
    );
  }

  _trapFocus(e) {
    const focusables = [...this.el.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])')].filter((n) => n.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}
