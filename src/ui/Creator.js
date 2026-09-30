import { RACES, CLASSES, HAIR_STYLES, HAIR_COLORS, CLOTH_COLORS, ACCENT_COLORS } from '../character/options.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function choices(name, entries, current, three = false) {
  return `<div class="choice-grid${three ? ' three' : ''}" role="group">
    ${entries
      .map(
        ([value, label, gem]) =>
          `<button type="button" class="choice" data-set="${name}" data-value="${value}" aria-pressed="${value === current}">
            ${gem ? `<span class="choice-gem" style="background:${gem}"></span>` : ''}${esc(label)}
          </button>`,
      )
      .join('')}
  </div>`;
}

function swatches(name, colors, current, label) {
  return `<div class="swatches" role="group" aria-label="${esc(label)}">
    ${colors
      .map(
        (c) =>
          `<button type="button" class="swatch" data-set="${name}" data-value="${c}" style="background:${c}" aria-pressed="${c.toLowerCase() === String(current).toLowerCase()}" aria-label="${esc(label)} ${c}"></button>`,
      )
      .join('')}
  </div>`;
}

/**
 * Character creation panels. Emits a full config object on every change.
 */
export class Creator {
  constructor({ onChange }) {
    this.left = document.getElementById('creator-left');
    this.right = document.getElementById('creator-right');
    this.onChange = onChange;
    this.config = null;

    const handle = (e) => {
      const btn = e.target.closest('[data-set]');
      if (!btn) return;
      this._set(btn.dataset.set, btn.dataset.value);
    };
    this.left.addEventListener('click', handle);
    this.right.addEventListener('click', handle);
    this.left.addEventListener('input', (e) => {
      if (e.target.name === 'name') {
        this.config.name = e.target.value.slice(0, 18);
        this.onChange({ ...this.config }, 'name');
      }
    });
    this.right.addEventListener('change', (e) => {
      if (e.target.name === 'beard') this._set('beard', e.target.checked);
    });
  }

  open(config) {
    this.config = { ...config };
    this.render();
  }

  _set(key, value) {
    const cfg = this.config;
    if (key === 'race') {
      cfg.race = value;
      const skins = RACES[value].skins;
      if (!skins.includes(cfg.skin)) cfg.skin = skins[Math.min(1, skins.length - 1)];
    } else if (key === 'cls') {
      cfg.cls = value;
      cfg.primary = CLASSES[value].primary;
      cfg.secondary = CLASSES[value].secondary;
    } else {
      cfg[key] = value;
    }
    this.render();
    this.onChange({ ...cfg }, key);
  }

  render() {
    const cfg = this.config;
    const race = RACES[cfg.race];
    const cls = CLASSES[cfg.cls];
    const active = document.activeElement;
    const focused = active?.name === 'name';
    const refocus = active?.dataset?.set ? `[data-set="${active.dataset.set}"][data-value="${active.dataset.value}"]` : null;

    this.left.innerHTML = `
      <h2 class="creator-heading">Create your Adventurer</h2>
      <div class="creator-section">
        <label class="section-title" for="char-name">Name</label>
        <input id="char-name" class="name-input" name="name" maxlength="18" autocomplete="off" spellcheck="false" value="${esc(cfg.name)}" />
      </div>
      <div class="creator-section">
        <p class="section-title">Race</p>
        ${choices('race', Object.entries(RACES).map(([k, r]) => [k, r.label]), cfg.race)}
      </div>
      <div class="creator-section">
        <p class="section-title">Class</p>
        ${choices('cls', Object.entries(CLASSES).map(([k, c]) => [k, c.label, c.primary]), cfg.cls)}
      </div>`;

    this.right.innerHTML = `
      <h2 class="creator-heading">Appearance</h2>
      <div class="creator-section">
        <p class="section-title">${race.snout ? 'Scales' : 'Skin'}</p>
        ${swatches('skin', race.skins, cfg.skin, 'Skin colour')}
      </div>
      ${
        race.noHair
          ? ''
          : `<div class="creator-section">
        <p class="section-title">Hair</p>
        ${choices('hairStyle', Object.entries(HAIR_STYLES), cfg.hairStyle, true)}
        <div style="height:10px"></div>
        ${swatches('hairColor', HAIR_COLORS, cfg.hairColor, 'Hair colour')}
        ${
          race.beard
            ? '<p class="muted" style="margin:10px 0 0">A dwarf without a beard? Unthinkable.</p>'
            : `<label class="toggle" style="margin-top:12px"><input type="checkbox" name="beard" ${cfg.beard ? 'checked' : ''}/> Beard</label>`
        }
      </div>`
      }
      <div class="creator-section">
        <p class="section-title">Garb dye</p>
        ${swatches('primary', CLOTH_COLORS, cfg.primary, 'Main colour')}
      </div>
      <div class="creator-section">
        <p class="section-title">Accent dye</p>
        ${swatches('secondary', ACCENT_COLORS, cfg.secondary, 'Accent colour')}
      </div>
      <div class="lore">
        <h4>${esc(race.label)} ${esc(cls.label)}</h4>
        <p>${esc(race.blurb)}</p>
        <p>${esc(cls.blurb)}</p>
      </div>`;

    if (focused) {
      const input = this.left.querySelector('#char-name');
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (refocus) {
      (this.left.querySelector(refocus) || this.right.querySelector(refocus))?.focus({ preventScroll: true });
    }
  }
}
