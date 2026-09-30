const HUMAN_SKINS = ['#f3d2b8', '#e2b294', '#c98e68', '#a86b45', '#7b4a2e', '#553222'];

export const RACES = {
  human: {
    label: 'Human',
    blurb: 'Adaptable and ambitious. Picks up a new framework every weekend.',
    height: 1,
    width: 1,
    head: 1,
    ears: 'round',
    skins: HUMAN_SKINS,
  },
  elf: {
    label: 'Elf',
    blurb: 'Graceful and long-lived — has seen jQuery rise and fall.',
    height: 1.06,
    width: 0.9,
    head: 0.95,
    ears: 'long',
    skins: ['#f6ddc8', '#e8c1a0', '#c99a78', '#8e6a8f', '#5a4a6e', '#3a3348'],
  },
  halfelf: {
    label: 'Half-Elf',
    blurb: 'Equally at home in design and development.',
    height: 1.02,
    width: 0.95,
    head: 1,
    ears: 'short',
    skins: HUMAN_SKINS,
  },
  dwarf: {
    label: 'Dwarf',
    blurb: 'Stout, stubborn, and writes rock-solid back-ends.',
    height: 0.8,
    width: 1.3,
    head: 1.05,
    ears: 'round',
    beard: true,
    skins: HUMAN_SKINS,
  },
  halfling: {
    label: 'Halfling',
    blurb: 'Small, lucky, and ships with zero console errors.',
    height: 0.7,
    width: 0.95,
    head: 1.05,
    ears: 'short',
    skins: HUMAN_SKINS,
  },
  gnome: {
    label: 'Gnome',
    blurb: 'Tinkerer supreme. Probably built a custom bundler.',
    height: 0.62,
    width: 0.9,
    head: 1.15,
    ears: 'long',
    skins: ['#f3d2b8', '#e2b294', '#c98e68', '#a86b45', '#b9a0c9'],
  },
  tiefling: {
    label: 'Tiefling',
    blurb: 'Infernal heritage, devilishly clean code.',
    height: 1.02,
    width: 1,
    head: 1,
    ears: 'short',
    horns: true,
    tail: 'thin',
    skins: ['#b8433f', '#8d2f3e', '#7a4f9a', '#4f5fa8', '#d98c7a', '#e2b294'],
  },
  halforc: {
    label: 'Half-Orc',
    blurb: 'Relentless. Refactors legacy code with bare hands.',
    height: 1.08,
    width: 1.25,
    head: 1.02,
    ears: 'short',
    tusks: true,
    skins: ['#7f9a5a', '#6b8a50', '#8a9a82', '#9aa27a', '#5c6e48'],
  },
  dragonborn: {
    label: 'Dragonborn',
    blurb: 'Breathes fire at failing builds.',
    height: 1.12,
    width: 1.2,
    head: 1.05,
    ears: 'none',
    snout: true,
    tail: 'thick',
    noHair: true,
    skins: ['#b0452f', '#c9a04a', '#3f6fa8', '#4f8a4a', '#8a8f99', '#2f2f36', '#b87333'],
  },
  githyanki: {
    label: 'Githyanki',
    blurb: 'Astral warrior. Tolerates no merge conflicts. Tsk\'va!',
    height: 1.05,
    width: 0.9,
    head: 0.98,
    ears: 'swept',
    skins: ['#b9c27a', '#a7b56a', '#c4c98f', '#98a86a'],
  },
};

/*
 * outfit:   robe | plate | chain | tunic | gi | bare
 * head:     none | wizardhat | hood | helmet | feathercap | circlet | leafcrown | headband
 * right / left: item held in that hand, back: item on the back
 */
export const CLASSES = {
  barbarian: {
    label: 'Barbarian',
    blurb: 'Rages through deadlines.',
    outfit: 'bare',
    head: 'none',
    right: 'greataxe',
    primary: '#5a3d2b',
    secondary: '#8a6a48',
  },
  bard: {
    label: 'Bard',
    blurb: 'Charms stakeholders with a well-told demo.',
    outfit: 'tunic',
    head: 'feathercap',
    right: 'rapier',
    back: 'lute',
    primary: '#8e2c48',
    secondary: '#e0b45a',
  },
  cleric: {
    label: 'Cleric',
    blurb: 'Heals broken builds. Blessed be the CI.',
    outfit: 'chain',
    head: 'none',
    right: 'mace',
    left: 'shield',
    chest: 'symbol',
    primary: '#e8e0cc',
    secondary: '#c9a44a',
  },
  druid: {
    label: 'Druid',
    blurb: 'Grows organic, sustainable codebases.',
    outfit: 'robe',
    head: 'leafcrown',
    right: 'druidstaff',
    primary: '#4f6b3a',
    secondary: '#8a6a3e',
  },
  fighter: {
    label: 'Fighter',
    blurb: 'Disciplined. Tests everything twice.',
    outfit: 'plate',
    head: 'helmet',
    right: 'sword',
    left: 'shield',
    primary: '#3c5a8a',
    secondary: '#b83a3a',
  },
  monk: {
    label: 'Monk',
    blurb: 'Zero dependencies. Pure vanilla JS.',
    outfit: 'gi',
    head: 'headband',
    primary: '#c9772e',
    secondary: '#3a3a3a',
  },
  paladin: {
    label: 'Paladin',
    blurb: 'Swore an oath to accessible web design.',
    outfit: 'plate',
    head: 'none',
    right: 'warhammer',
    cape: true,
    primary: '#2f4f8f',
    secondary: '#d6a84a',
  },
  ranger: {
    label: 'Ranger',
    blurb: 'Tracks bugs across the entire stack.',
    outfit: 'tunic',
    head: 'hood',
    left: 'bow',
    back: 'quiver',
    cape: true,
    primary: '#3f5f35',
    secondary: '#6b4a2b',
  },
  rogue: {
    label: 'Rogue',
    blurb: 'Sneaks features past code review.',
    outfit: 'tunic',
    head: 'hood',
    right: 'dagger',
    left: 'dagger',
    primary: '#2e2e36',
    secondary: '#7a1f2a',
  },
  sorcerer: {
    label: 'Sorcerer',
    blurb: 'Innate magic. Knows GSAP by heart.',
    outfit: 'robe',
    head: 'circlet',
    right: 'flame',
    primary: '#7a2a2a',
    secondary: '#e0a040',
  },
  warlock: {
    label: 'Warlock',
    blurb: 'Made a pact with the Stack Overflow patron.',
    outfit: 'robe',
    head: 'hood',
    right: 'eldritch',
    left: 'tome',
    cape: true,
    primary: '#3a2448',
    secondary: '#9b7bd1',
  },
  wizard: {
    label: 'Wizard',
    blurb: 'Studies the ancient docs. Actually reads them.',
    outfit: 'robe',
    head: 'wizardhat',
    right: 'staff',
    primary: '#2e3f7a',
    secondary: '#d9b85a',
  },
};

export const HAIR_STYLES = {
  short: 'Short',
  long: 'Long',
  ponytail: 'Ponytail',
  bun: 'Bun',
  mohawk: 'Mohawk',
  bald: 'Bald',
};

export const HAIR_COLORS = ['#1e1611', '#4a2e1c', '#8a5a2e', '#c9a063', '#e8e0c8', '#9b2f22', '#3d3f5a', '#6b3f8a'];

export const CLOTH_COLORS = ['#2e3f7a', '#3c5a8a', '#2f6b6b', '#3f5f35', '#4f6b3a', '#7a2a2a', '#8e2c48', '#3a2448', '#6b4a8a', '#c9772e', '#5a3d2b', '#2e2e36', '#e8e0cc'];
export const ACCENT_COLORS = ['#d9b85a', '#c9a44a', '#e0a040', '#b83a3a', '#7a1f2a', '#9b7bd1', '#6fd3ff', '#8a6a48', '#e8e0cc', '#3a3a3a'];

export function defaultConfig() {
  return {
    name: 'Tav',
    race: 'halfelf',
    cls: 'wizard',
    skin: RACES.halfelf.skins[2],
    hairStyle: 'short',
    hairColor: HAIR_COLORS[1],
    beard: false,
    primary: CLASSES.wizard.primary,
    secondary: CLASSES.wizard.secondary,
  };
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function randomConfig(name) {
  const race = pick(Object.keys(RACES));
  const cls = pick(Object.keys(CLASSES));
  return {
    name: name || pick(['Tav', 'Durge', 'Vex', 'Elowen', 'Brakka', 'Nym', 'Corvin', 'Sable', 'Ixa']),
    race,
    cls,
    skin: pick(RACES[race].skins),
    hairStyle: pick(Object.keys(HAIR_STYLES)),
    hairColor: pick(HAIR_COLORS),
    beard: RACES[race].beard ? true : Math.random() < 0.25,
    primary: CLASSES[cls].primary,
    secondary: CLASSES[cls].secondary,
  };
}

export function sanitizeConfig(cfg) {
  const base = defaultConfig();
  if (!cfg || typeof cfg !== 'object') return base;
  const out = { ...base, ...cfg };
  if (!RACES[out.race]) out.race = base.race;
  if (!CLASSES[out.cls]) out.cls = base.cls;
  if (!HAIR_STYLES[out.hairStyle]) out.hairStyle = base.hairStyle;
  const hex = /^#[0-9a-f]{6}$/i;
  for (const k of ['skin', 'hairColor', 'primary', 'secondary']) if (!hex.test(out[k])) out[k] = base[k];
  out.name = String(out.name || 'Tav').slice(0, 18);
  out.beard = Boolean(out.beard);
  return out;
}
