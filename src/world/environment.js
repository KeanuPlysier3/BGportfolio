import * as THREE from 'three';
import { SHORE_T } from './layout.js';

/* ------------------------------------------------------------------ water */
export function createWater() {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uShoreT: { value: SHORE_T },
      uDeep: { value: new THREE.Color('#14325a') },
      uShallow: { value: new THREE.Color('#2f8fa0') },
      uFoam: { value: new THREE.Color('#e8f4f2') },
      uMoon: { value: new THREE.Color('#cfe0ff') },
    },
  ]);

  const material = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      uniform float uTime;
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        wp.y += sin(wp.x * 0.25 + uTime * 0.9) * 0.05 + sin(wp.z * 0.31 + uTime * 1.1) * 0.05;
        vWorld = wp.xyz;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform float uShoreT;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uFoam;
      uniform vec3 uMoon;
      varying vec3 vWorld;

      // keep in sync with islandRadius() in layout.js
      float islandR(float a) {
        return 58.0 + 5.0 * sin(3.0 * a + 1.3) + 3.5 * sin(5.0 * a + 0.4) + 1.5 * sin(11.0 * a + 2.1);
      }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }

      void main() {
        vec2 p = vWorld.xz;
        float r = length(p);
        float a = atan(p.y, p.x);
        float d = r - uShoreT * islandR(a);

        vec3 col = mix(uShallow, uDeep, smoothstep(-1.0, 16.0, d));

        // animated foam: a solid lip plus bands rolling toward the beach
        float n = noise(p * 0.6 + uTime * 0.15);
        float lip = 1.0 - smoothstep(0.0, 0.9 + n * 0.6, d);
        float band = sin(d * 1.7 + uTime * 1.5 + n * 2.0);
        float bands = smoothstep(0.82, 0.95, band) * (1.0 - smoothstep(1.0, 7.0, d));
        float foam = clamp(lip + bands * 0.8, 0.0, 1.0);

        // sparkles of moonlight on the open water
        float s = noise(p * 1.8 + vec2(uTime * 0.4, -uTime * 0.3)) * noise(p * 2.7 - uTime * 0.2);
        col += uMoon * smoothstep(0.5, 0.75, s) * 0.35 * smoothstep(4.0, 12.0, d);

        col = mix(col, uFoam, foam * 0.9);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }
    `,
  });

  const geo = new THREE.PlaneGeometry(600, 600, 150, 150);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'water';
  return { mesh, update: (t) => (uniforms.uTime.value = t) };
}

/* -------------------------------------------------------------------- sky */
export function createSky(fogColor) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color('#0b1233') },
      uMid: { value: new THREE.Color('#3a3470') },
      uHorizon: { value: fogColor.clone() },
      uMoonDir: { value: new THREE.Vector3(-0.5, 0.45, -0.75).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uMoonDir;
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
      void main() {
        float h = vDir.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.25, h));
        col = mix(col, uTop, smoothstep(0.25, 0.8, h));
        // stars
        vec3 cell = floor(vDir * 180.0);
        float star = step(0.9965, hash(cell)) * smoothstep(0.05, 0.3, h);
        col += star * vec3(1.2, 1.15, 1.0);
        // moon + halo
        float m = dot(normalize(vDir), uMoonDir);
        col += vec3(1.0, 0.97, 0.9) * smoothstep(0.9985, 0.999, m) * 2.5;
        col += vec3(0.45, 0.5, 0.8) * pow(max(m, 0.0), 60.0) * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), material);
  mesh.name = 'sky';
  mesh.frustumCulled = false;
  return mesh;
}

/* ------------------------------------------------------------------ grass */
export function createGrass(points) {
  // one tuft = three crossed blades
  const blade = new THREE.BufferGeometry();
  const verts = [];
  const cols = [];
  const base = new THREE.Color('#4d7a33');
  const tip = new THREE.Color('#b8d46a');
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI + 0.3;
    const cx = Math.cos(a) * 0.07;
    const cz = Math.sin(a) * 0.07;
    const lean = (i - 1) * 0.06;
    const h = 0.3 + i * 0.04;
    // both windings so the blade is lit the same from either side
    verts.push(-cx, 0, -cz, cx, 0, cz, lean, h, lean * 0.5);
    verts.push(cx, 0, cz, -cx, 0, -cz, lean, h, lean * 0.5);
    for (let k = 0; k < 2; k++) cols.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  blade.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  blade.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(verts.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));

  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const uniforms = { uTime: { value: 0 } };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float wind = sin(uTime * 1.6 + ip.x * 0.35 + ip.z * 0.25) * 0.6 + sin(uTime * 3.3 + ip.x * 1.3) * 0.2;
        transformed.x += wind * position.y * 0.35;
        transformed.z += wind * position.y * 0.18;`,
      );
  };

  const mesh = new THREE.InstancedMesh(blade, material, points.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const c = new THREE.Color();
  points.forEach(([x, y, z, s, hue], i) => {
    q.setFromAxisAngle(up, (x * 13.7 + z * 7.1) % (Math.PI * 2));
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.8 + hue * 0.5), s));
    mesh.setMatrixAt(i, m);
    c.setHSL(0.23 + hue * 0.06, 0.45, 0.6 + hue * 0.2);
    mesh.setColorAt(i, c);
  });
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return { mesh, update: (t) => (uniforms.uTime.value = t) };
}

export function createFlowers(points) {
  const geo = new THREE.IcosahedronGeometry(0.07, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ flatShading: true }), points.length);
  const m = new THREE.Matrix4();
  const colors = ['#e8d45c', '#d97ab8', '#f2f0ea', '#8f7ae8', '#e86f5c'].map((h) => new THREE.Color(h));
  points.forEach(([x, y, z], i) => {
    m.makeTranslation(x, y + 0.25, z);
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, colors[i % colors.length]);
  });
  return mesh;
}

/* ---------------------------------------------------------------- effects */
function dotTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const DOT = typeof document !== 'undefined' ? dotTexture() : null;

export function createFire(position) {
  const group = new THREE.Group();
  group.position.copy(position);

  const flames = [];
  const specs = [
    ['#ff5a14', 0.55, 1.3, 0, 0, 2.2],
    ['#ff8a24', 0.4, 1.05, 0.18, 0.1, 2.6],
    ['#ff8a24', 0.35, 0.9, -0.2, -0.1, 2.6],
    ['#ffc861', 0.28, 0.8, 0.02, 0.05, 3.2],
    ['#fff0b8', 0.14, 0.45, 0, 0, 3.4],
  ];
  for (const [color, r, h, x, z, k] of specs) {
    const geo = new THREE.ConeGeometry(r, h, 6);
    geo.translate(0, h / 2, 0);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) }));
    mesh.position.set(x, 0.15, z);
    mesh.userData = { h, seed: Math.random() * 10 };
    group.add(mesh);
    flames.push(mesh);
  }

  // embers
  const count = 60;
  const emberGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const vel = new Float32Array(count * 3);
  const reset = (i) => {
    pos[i * 3] = (Math.random() - 0.5) * 0.6;
    pos[i * 3 + 1] = 0.4 + Math.random() * 0.4;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    vel[i * 3] = (Math.random() - 0.5) * 0.4;
    vel[i * 3 + 1] = 1 + Math.random() * 1.6;
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    life[i] = Math.random() * 2.5;
  };
  for (let i = 0; i < count; i++) reset(i);
  emberGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const embers = new THREE.Points(
    emberGeo,
    new THREE.PointsMaterial({ color: new THREE.Color('#ffa040').multiplyScalar(4), size: 0.12, map: DOT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  embers.frustumCulled = false;
  group.add(embers);

  // smoke puffs
  const puffs = [];
  for (let i = 0; i < 7; i++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshLambertMaterial({ color: '#6f6a78', transparent: true, opacity: 0, depthWrite: false, flatShading: true }));
    puff.userData.t = i / 7;
    group.add(puff);
    puffs.push(puff);
  }

  const light = new THREE.PointLight('#ff8a3a', 60, 26, 1.5);
  light.position.set(0, 1.4, 0);
  group.add(light);

  const update = (dt, t) => {
    for (const f of flames) {
      const s = f.userData.seed;
      const flicker = 0.8 + Math.sin(t * 9 + s) * 0.12 + Math.sin(t * 17.3 + s * 2) * 0.08;
      f.scale.set(1 + Math.sin(t * 6 + s) * 0.08, flicker, 1 + Math.cos(t * 7 + s) * 0.08);
      f.rotation.y = t * 0.8 + s;
      f.rotation.z = Math.sin(t * 3 + s) * 0.08;
    }
    for (let i = 0; i < count; i++) {
      life[i] -= dt;
      if (life[i] <= 0) reset(i);
      pos[i * 3] += (vel[i * 3] + Math.sin(t * 2 + i) * 0.3) * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    emberGeo.attributes.position.needsUpdate = true;
    for (const p of puffs) {
      p.userData.t = (p.userData.t + dt * 0.14) % 1;
      const k = p.userData.t;
      p.position.set(Math.sin(k * 6 + t * 0.2) * 0.3 + k * 0.8, 1.6 + k * 5, k * 0.5);
      p.scale.setScalar(0.6 + k * 2.2);
      p.material.opacity = Math.sin(k * Math.PI) * 0.35;
      p.rotation.set(k * 2, k * 3, 0);
    }
    light.intensity = 55 + Math.sin(t * 8) * 8 + Math.sin(t * 13.7) * 6 + Math.sin(t * 23) * 3;
  };
  return { group, update };
}

export function createFireflies(points) {
  const count = points.length;
  const geo = new THREE.BufferGeometry();
  const base = new Float32Array(count * 3);
  const pos = new Float32Array(count * 3);
  points.forEach(([x, y, z], i) => {
    base.set([x, y, z], i * 3);
    pos.set([x, y, z], i * 3);
  });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const material = new THREE.PointsMaterial({
    color: new THREE.Color('#d9ff7a').multiplyScalar(3),
    size: 0.22,
    map: DOT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Points(geo, material);
  mesh.frustumCulled = false;
  const update = (dt, t) => {
    for (let i = 0; i < count; i++) {
      const k = i * 1.37;
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.5 + k) * 1.2;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.9 + k * 2) * 0.5;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.4 + k) * 1.2;
    }
    geo.attributes.position.needsUpdate = true;
    material.opacity = 0.75 + Math.sin(t * 2) * 0.25;
  };
  return { mesh, update };
}
