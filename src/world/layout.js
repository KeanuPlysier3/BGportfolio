import { fbm, smoothstep } from '../utils/math.js';

/* ---------------------------------------------------------------------------
 * Island shape
 * The same radius formula lives in the water shader (see water.js) so the
 * foam line always hugs the shore. Keep both in sync.
 * ------------------------------------------------------------------------- */
export function islandRadius(angle) {
  return (
    58 +
    5 * Math.sin(3 * angle + 1.3) +
    3.5 * Math.sin(5 * angle + 0.4) +
    1.5 * Math.sin(11 * angle + 2.1)
  );
}

export const PLATEAU = 1.0;
const smooth = (t) => t * t * (3 - 2 * t);

/** Height profile along a ray from the island centre, t = r / islandRadius. */
export function profile(t) {
  if (t < 0.8) return PLATEAU;
  if (t < 0.92) return PLATEAU + (0.35 - PLATEAU) * smooth((t - 0.8) / 0.12);
  return 0.35 + (-3.5 - 0.35) * smooth(Math.min((t - 0.92) / 0.2, 1));
}

/** Normalised radius where the profile crosses the water line (y = 0). */
export const SHORE_T = (() => {
  let lo = 0.92;
  let hi = 1.12;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (profile(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
})();

export const shoreRadius = (angle) => SHORE_T * islandRadius(angle);

/* ---------------------------------------------------------------------------
 * Points of interest. `r` is the flattened clearing radius.
 * ------------------------------------------------------------------------- */
export const SPOTS = {
  campfire: { x: 0, z: 0, r: 8 },
  questboard: { x: -10, z: 13, r: 4 },
  waypoint: { x: 9, z: 12.5, r: 3.5 },
  planA: { x: 23, z: -3, r: 6 },
  momu: { x: -23, z: -4, r: 6.5 },
  ml: { x: 0, z: -26, r: 7 },
  armory: { x: 17, z: -19, r: 6 },
  library: { x: -17, z: -19, r: 6 },
  wagon: { x: 20, z: 16, r: 6 },
};

export const SPAWN = { x: 0, z: 10.5 };
export const CAMP_RING = 6.8;

const southShore = shoreRadius(Math.PI / 2);
export const DOCK = {
  x: 0,
  zStart: southShore - 5,
  zEnd: southShore + 9,
  y: 0.78,
  width: 2.4,
};

/* ---------------------------------------------------------------------------
 * Dirt paths: straight segments from the camp ring to every spot, plus a
 * ring around the fire and a trail down to the dock.
 * ------------------------------------------------------------------------- */
const SEGMENTS = [];
for (const [id, s] of Object.entries(SPOTS)) {
  if (id === 'campfire') continue;
  const len = Math.hypot(s.x, s.z);
  SEGMENTS.push([(s.x / len) * CAMP_RING, (s.z / len) * CAMP_RING, s.x, s.z]);
}
SEGMENTS.push([0, CAMP_RING, 0, DOCK.zStart + 1]);

export const PATH_SEGMENTS = SEGMENTS;

function distToSegment(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / (abx * abx + abz * abz)));
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

/** 0..1 how much of a dirt path is at this point. */
export function pathMask(x, z) {
  const wobble = fbm(x * 0.3, z * 0.3, 2) * 0.5;
  let d = Math.abs(Math.hypot(x, z) - CAMP_RING);
  for (const [ax, az, bx, bz] of SEGMENTS) d = Math.min(d, distToSegment(x, z, ax, az, bx, bz));
  let m = 1 - smoothstep(0.75, 1.7, d + wobble);

  for (const [id, s] of Object.entries(SPOTS)) {
    const plaza = id === 'campfire' ? 4.6 : s.r * 0.55;
    const dd = Math.hypot(x - s.x, z - s.z) + wobble * 2;
    m = Math.max(m, (1 - smoothstep(plaza * 0.7, plaza, dd)) * 0.8);
  }
  return m;
}
