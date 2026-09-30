import { SPOTS, DOCK } from '../world/layout.js';
import { PROFILE, CONTACT, PROJECTS, ARSENAL, EDUCATION, EXPERIENCE } from './portfolio.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const link = (l) => (l?.href ? `<a class="btn btn-link" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} <span aria-hidden="true">↗</span></a>` : '');
const tags = (list) => `<ul class="tags">${list.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
const score = (dots) => 8 + dots * 2;
const mod = (s) => {
  const m = Math.floor((s - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
};

function projectBody(p) {
  return `
    <p class="kicker">${esc(p.role)} · ${esc(p.client)}</p>
    <p>${esc(p.summary)}</p>
    <h3>Tools of the trade</h3>
    ${tags(p.stack)}
    <div class="actions">${link(p.link)}</div>`;
}

export const LOCATIONS = [
  {
    id: 'campfire',
    name: 'The Campfire',
    kind: 'Character sheet',
    prompt: 'Rest by the fire',
    x: SPOTS.campfire.x,
    z: SPOTS.campfire.z,
    radius: 3.4,
    labelY: 2.6,
    body: () => `
      <p class="kicker">${esc(PROFILE.title)} — ${esc(PROFILE.school)}</p>
      ${PROFILE.about.map((p) => `<p>${esc(p)}</p>`).join('')}
      <h3>Ability scores</h3>
      <div class="abilities">
        ${PROFILE.abilities
          .map(
            (a) => `<div class="ability" title="${esc(a.name)}: ${a.dots}/5">
              <span class="ability-short">${esc(a.short)}</span>
              <span class="ability-score">${score(a.dots)}</span>
              <span class="ability-mod">${mod(score(a.dots))}</span>
              <span class="ability-name">${esc(a.name)}</span>
            </div>`,
          )
          .join('')}
      </div>
      <h3>Traits</h3>
      ${tags(PROFILE.traits)}
      <h3>Languages</h3>
      <ul class="plain">${PROFILE.languages.map((l) => `<li><strong>${esc(l.name)}</strong> — ${esc(l.level)}</li>`).join('')}</ul>`,
  },
  {
    id: 'questboard',
    name: 'Quest Board',
    kind: 'Contact',
    prompt: 'Read the quest board',
    x: SPOTS.questboard.x,
    z: SPOTS.questboard.z,
    radius: 3.2,
    labelY: 3.3,
    body: () => `
      <div class="wanted">
        <p class="wanted-title">Party member wanted</p>
        <p>A development <strong>internship</strong> from <strong>${esc(PROFILE.internship.from)}</strong> to <strong>${esc(PROFILE.internship.to)}</strong>.</p>
        <p class="wanted-reward">Reward: one driven, fast-learning web developer.</p>
      </div>
      <h3>Send a raven</h3>
      <ul class="contact">
        ${CONTACT.map(
          (c) => `<li><span class="contact-label">${esc(c.label)}</span>${
            c.href ? `<a href="${esc(c.href)}" ${c.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${esc(c.value)}</a>` : `<span>${esc(c.value)}</span>`
          }</li>`,
        ).join('')}
      </ul>
      <div class="actions"><a class="btn" href="mailto:keanu.plysier@gmail.com?subject=Internship%20quest">Accept quest</a></div>`,
  },
  {
    id: 'planA',
    name: 'The War Table',
    kind: 'Quest · Plan A',
    prompt: 'Study the war table',
    x: SPOTS.planA.x,
    z: SPOTS.planA.z,
    radius: 3.4,
    labelY: 2.4,
    title: PROJECTS.planA.name,
    body: () => projectBody(PROJECTS.planA),
  },
  {
    id: 'momu',
    name: "The Tailor's Pavilion",
    kind: 'Quest · MoMu',
    prompt: 'Browse the collection',
    x: SPOTS.momu.x,
    z: SPOTS.momu.z,
    radius: 4.2,
    labelY: 4.6,
    title: PROJECTS.momu.name,
    body: () => projectBody(PROJECTS.momu),
  },
  {
    id: 'ml',
    name: 'The Arcane Circle',
    kind: 'Quest · Machine Learning',
    prompt: 'Commune with the orb',
    x: SPOTS.ml.x,
    z: SPOTS.ml.z,
    radius: 4,
    labelY: 3.6,
    title: PROJECTS.ml.name,
    body: () => projectBody(PROJECTS.ml),
  },
  {
    id: 'armory',
    name: 'The Armory',
    kind: 'Inventory · Technologies',
    prompt: 'Inspect the arsenal',
    x: SPOTS.armory.x,
    z: SPOTS.armory.z,
    radius: 3.6,
    labelY: 3,
    body: () => `
      <p>Every adventurer needs a well-kept arsenal. These are the tools I reach for.</p>
      ${ARSENAL.map(
        (g) => `<h3>${esc(g.group)} <small>${esc(g.subtitle)}</small></h3>
        <ul class="inventory">${g.items.map((i) => `<li><span>${esc(i)}</span></li>`).join('')}</ul>`,
      ).join('')}`,
  },
  {
    id: 'library',
    name: "The Scholar's Nook",
    kind: 'Lore · Education',
    prompt: 'Read the tomes',
    x: SPOTS.library.x,
    z: SPOTS.library.z,
    radius: 3.6,
    labelY: 3.8,
    body: () => `
      <ol class="timeline">
        ${EDUCATION.map(
          (e) => `<li>
            <span class="timeline-when">${esc(e.period)}</span>
            <strong>${esc(e.school)}</strong>
            <span>${esc(e.course)}</span>
            ${e.detail ? `<em>${esc(e.detail)}</em>` : ''}
          </li>`,
        ).join('')}
      </ol>`,
  },
  {
    id: 'wagon',
    name: "The Merchant's Wagon",
    kind: 'Journal · Experience',
    prompt: 'Check the travel log',
    x: SPOTS.wagon.x,
    z: SPOTS.wagon.z,
    radius: 3.8,
    labelY: 3,
    body: () => `
      <ol class="timeline">
        ${EXPERIENCE.map(
          (e) => `<li>
            <span class="timeline-when">${esc(e.period)}</span>
            <strong>${esc(e.company)} — ${esc(e.role)}</strong>
            <span>${esc(e.detail)}</span>
          </li>`,
        ).join('')}
      </ol>
      <p class="muted">The next entry in this log could be yours — see the Quest Board.</p>`,
  },
  {
    id: 'waypoint',
    name: 'Waypoint',
    kind: 'Fast travel',
    prompt: 'Use the waypoint',
    x: SPOTS.waypoint.x,
    z: SPOTS.waypoint.z,
    radius: 2.8,
    labelY: 3.9,
    waypoint: true,
  },
  {
    id: 'dock',
    name: 'The Old Dock',
    kind: 'A quiet place',
    prompt: 'Look out over the sea',
    x: DOCK.x,
    z: DOCK.zEnd - 1.5,
    radius: 2.2,
    labelY: 2.4,
    body: () => `
      <p>The waves lap against the posts. Somewhere past the horizon, the next adventure waits.</p>
      <p class="muted">This camp was built with Three.js, a handful of primitives and procedurally generated music — no models or audio files were harmed.</p>
      <div class="actions">${link({ label: 'Source on GitHub', href: 'https://github.com/KeanuPlysier3' })}</div>`,
  },
];

export const LOCATION_BY_ID = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));
