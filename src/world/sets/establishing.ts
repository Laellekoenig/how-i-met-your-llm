import * as THREE from 'three';
import { toon, glow, box, mesh, cyl } from '../../engine/materials';
import { facade, metroNewsLogo, sign, skyGradient, riverWater } from '../../engine/textures';
import { keyLight, v3 } from './common';
import type { LocationId, TimeOfDay } from '../../script/types';
import { mulberry32, pick, rand } from '../../util';
import { buildAtlanticCityExterior } from './atlanticCityExterior';
import { buildCampusExterior } from './campusExterior';
import { buildWalkupExterior } from './walkupExterior';

// The show's scene transitions: between scenes HIMYM cuts to New York itself, the skyline across the river or
// the outside of wherever we're headed, usually on a guitar sting, sometimes with Future Ted talking over it.
// These are those shots: no marks and no actors, just a camera move.

export interface EstablishingShot {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  /** Camera and aim drift in m/s: a slow pan across the city, or a tilt up a building. */
  move: THREE.Vector3;
  look: THREE.Vector3;
}

export interface Establishing {
  group: THREE.Group;
  show(kind: 'skyline' | 'exterior' | 'atlantic_city', location: LocationId, time: TimeOfDay): EstablishingShot;
  update(dt: number): void;
}

type Swap = { m: THREE.Mesh; day: THREE.Material; night: THREE.Material };

const shot = (pos: THREE.Vector3, target: THREE.Vector3, fov: number, move = v3(0, 0, 0), look = move.clone()): EstablishingShot => ({ pos, target, fov, move, look });

/** Day and night facades for a building of a given size, windows roughly a storey apart. */
function facadeMats(wall: string, seed: number, w: number, h: number) {
  const cols = Math.max(2, Math.round(w / 1.1)), rows = Math.max(3, Math.round(h / 1.4));
  return {
    day: toon('#ffffff', { map: facade(false, wall, seed, cols, rows) }),
    night: toon('#ffffff', { map: facade(true, wall, seed, cols, rows), emissive: '#ffffff', emissiveIntensity: 0.55 }),
  };
}

/** A thin rod from a to b (cables, wires). */
function rod(g: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const m = mesh(cyl(r, r, a.distanceTo(b), 3), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, false);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.add(m);
  return m;
}

export function buildEstablishing(): Establishing {
  const g = new THREE.Group();
  g.name = 'establishing';
  const swaps: Swap[] = [];
  const dn = (m: THREE.Mesh, day: THREE.Material, night: THREE.Material) => {
    swaps.push({ m, day, night });
    return m;
  };
  const nightOnly: THREE.Object3D[] = [];
  const nightLights: [THREE.Light, number][] = [];

  const skyline = buildSkyline(dn, nightOnly);
  const street = buildStreet(dn, nightOnly, nightLights);
  const campus = buildCampusExterior(dn, nightLights);
  const atlantic = buildAtlanticCityExterior(dn);
  g.add(skyline.group, street.group, campus, atlantic.group);

  const hemi = new THREE.HemisphereLight('#8a9ac8', '#2a2420', 1.0);
  g.add(hemi);
  const sun = keyLight(g, '#fff2dc', 2.4, [-14, 22, 18], [0, 0, -10]);
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -10;
  sun.shadow.camera.far = 60;

  const setTime = (t: TimeOfDay) => {
    const night = t === 'night';
    for (const s of swaps) s.m.material = night ? s.night : s.day;
    for (const o of nightOnly) o.visible = night;
    for (const [l, i] of nightLights) l.intensity = night ? i : 0;
    hemi.color.set(night ? '#6a7ab8' : '#cfe4ff');
    hemi.groundColor.set(night ? '#2a2420' : '#5a5048');
    hemi.intensity = night ? 0.9 : 2.2;
    sun.color.set(night ? '#a8b8ff' : '#fff2dc');
    sun.intensity = night ? 0.5 : 2.4;
  };

  return {
    group: g,
    show(kind, location, time) {
      setTime(time);
      const atAtlantic = kind === 'atlantic_city' || location === 'atlantic_city_casino';
      atlantic.group.visible = atAtlantic;
      // Interiors without an authored facade use New York geography, never the pub entrance.
      const cityOnly = ['hoser_hut', 'courtroom', 'lusty_leopard'].includes(location);
      const atCampus = !atAtlantic && kind === 'exterior' && location === 'lecture_hall';
      skyline.group.visible = !atAtlantic && (kind === 'skyline' || cityOnly);
      street.group.visible = !atAtlantic && !cityOnly && kind === 'exterior' && !atCampus;
      campus.visible = atCampus;
      // Keep the portico, steps and lawn inside the campus sun's shadow volume.
      sun.position.set(atCampus ? -24 : -14, atCampus ? 35 : 22, atCampus ? 24 : 18);
      sun.target.position.set(0, 0, atCampus ? 0 : -10);
      const shadow = sun.shadow.camera;
      shadow.left = atCampus ? -40 : -20; shadow.right = atCampus ? 40 : 20;
      shadow.top = atCampus ? 35 : 20; shadow.bottom = atCampus ? -35 : -10;
      shadow.far = atCampus ? 110 : 60;
      shadow.updateProjectionMatrix();
      if (atAtlantic) return shot(v3(-23, 10.2, 39), v3(2, 11, -8), 48, v3(.22, 0, -.11), v3(.06, 0, 0));
      if (cityOnly) return skyline.framing();
      if (atCampus) return shot(v3(-6, 5.6, 49), v3(0, 5, -9), 38, v3(0.13, 0.015, -0.22), v3(0.04, 0, 0));
      return kind === 'skyline' ? skyline.framing() : street.framing(location);
    },
    update(dt) {
      if (atlantic.group.visible) atlantic.update(dt);
      if (skyline.group.visible) skyline.update(dt);
      if (street.group.visible) street.update(dt);
    },
  };
}

// ---------------------------------------------------------------------------------------------------------
// Manhattan across the East River: a wall of towers with the Empire State and the Chrysler sticking up out
// of it, and a bridge striding off toward it on the left.

function buildSkyline(dn: (m: THREE.Mesh, day: THREE.Material, night: THREE.Material) => THREE.Mesh, nightOnly: THREE.Object3D[]) {
  const g = new THREE.Group();
  const r = mulberry32(2005);

  const sky = dn(mesh(new THREE.PlaneGeometry(170, 70), toon('#ffffff'), 0, 22, -52, false),
    toon('#ffffff', { map: skyGradient(false), emissive: '#ffffff', emissiveIntensity: 0.9 }),
    toon('#ffffff', { map: skyGradient(true), emissive: '#ffffff', emissiveIntensity: 0.9 }));
  sky.receiveShadow = false;
  g.add(sky);

  const waterDay = riverWater(false), waterNight = riverWater(true);
  const water = dn(mesh(new THREE.PlaneGeometry(170, 40), toon('#ffffff'), 0, 0, -2, false),
    toon('#ffffff', { map: waterDay }),
    toon('#ffffff', { map: waterNight, emissive: '#ffffff', emissiveIntensity: 0.7 }));
  water.rotation.x = -Math.PI / 2;
  g.add(water);
  // the Manhattan seawall
  g.add(mesh(box(170, 0.7, 2), toon('#3a3634'), 0, 0.35, -22.5, false));

  // ---- the towers: a near row, a far row, sized and colored at random ---------------------------------
  const walls = ['#a89a8a', '#8a7a6a', '#9a9aa8', '#7a8090', '#b8ab95', '#6a6a78', '#a88a72', '#c8c0b0'];
  const tower = (x: number, z: number, w: number, d: number, h: number, wall: string, seed: number) => {
    const f = facadeMats(wall, seed, w, h);
    const m = dn(mesh(box(w, h, d), f.night, x, h / 2, z, false), f.day, f.night);
    g.add(m);
    g.add(mesh(box(w + 0.15, 0.3, d + 0.15), toon('#2e2a28'), x, h + 0.15, z, false));
    if (r() < 0.25) g.add(mesh(cyl(0.45, 0.45, 0.8, 7), toon('#3a2e26'), x + rand(-w / 4, w / 4), h + 0.7, z, false));
    return m;
  };
  const ESB_X = 3, ESB_Z = -29, CHRYSLER_X = -10, CHRYSLER_Z = -33;
  const row = (z0: number, z1: number, hMin: number, hMax: number, seed: number) => {
    let x = -60;
    let i = 0;
    while (x < 60) {
      const w = 2.2 + r() * 3.2;
      const cx = x + w / 2;
      const z = z0 + r() * (z1 - z0);
      // leave room for the landmarks
      if (Math.abs(cx - ESB_X) > 3.4 && Math.abs(cx - CHRYSLER_X) > 2.4) {
        const mid = Math.exp(-((cx - ESB_X) * (cx - ESB_X)) / 900); // Midtown bulks up around the Empire State
        tower(cx, z, w, 2 + r() * 2.5, hMin + r() * (hMax - hMin) * (0.5 + mid), pick(walls), seed + i);
      }
      x += w + r() * 0.6;
      i++;
    }
  };
  row(-24, -27, 3, 8, 300);
  row(-34, -40, 7, 15, 400);

  // ---- the Empire State Building ------------------------------------------------------------------------
  const esbStone = '#b8ab95';
  const tiers: [number, number, number][] = [[5, 3.6, 9], [3.6, 2.8, 5], [2.6, 2.2, 3], [1.7, 1.7, 1.2], [1.1, 1.1, 0.9]];
  let y = 0;
  tiers.forEach(([w, d, h], i) => {
    if (i < 3) {
      const f = facadeMats(esbStone, 500 + i, w, h);
      g.add(dn(mesh(box(w, h, d), f.night, ESB_X, y + h / 2, ESB_Z, false), f.day, f.night));
    } else {
      // the lit crown
      g.add(dn(mesh(box(w, h, d), toon(esbStone), ESB_X, y + h / 2, ESB_Z, false), toon(esbStone), glow(i === 3 ? '#fff4d8' : '#ffd890', 1.1)));
    }
    y += h;
  });
  g.add(dn(mesh(cyl(0.3, 0.45, 1.6, 8), toon('#c8c0b0'), ESB_X, y + 0.8, ESB_Z, false), toon('#c8c0b0'), glow('#e8f0ff', 1.2)));
  g.add(mesh(cyl(0.05, 0.1, 3.2, 4), toon('#5a5a60'), ESB_X, y + 3.2, ESB_Z, false));
  const beacon = mesh(new THREE.SphereGeometry(0.12, 6, 4), glow('#ff3a2a', 2), ESB_X, y + 4.85, ESB_Z, false);
  g.add(beacon);
  nightOnly.push(beacon);

  // ---- the Chrysler Building: a shaft and a stepped steel crown --------------------------------------------
  const chH = 13;
  const chF = facadeMats('#a8a8a8', 520, 3, chH);
  g.add(dn(mesh(box(3, chH, 2.6), chF.night, CHRYSLER_X, chH / 2, CHRYSLER_Z, false), chF.day, chF.night));
  const steel = toon('#d8dce0');
  const crown: [number, number, number][] = [[1.15, 1.45, 1.2], [0.8, 1.15, 1.1], [0.5, 0.8, 1.0], [0.18, 0.5, 1.0]];
  let cy = chH;
  crown.forEach(([rt, rb, h], i) => {
    g.add(dn(mesh(cyl(rt, rb, h, 8), steel, CHRYSLER_X, cy + h / 2, CHRYSLER_Z, false), steel, i % 2 ? glow('#f0f4ff', 1.0) : toon('#8a8e94')));
    cy += h;
  });
  g.add(mesh(cyl(0.02, 0.1, 2.6, 4), steel, CHRYSLER_X, cy + 1.3, CHRYSLER_Z, false));

  // ---- a suspension bridge, receding toward Manhattan on the left ----------------------------------------
  const bridge = new THREE.Group();
  bridge.position.set(-21, 0, -6);
  bridge.rotation.y = Math.atan2(30, 20);
  const stone = toon('#a89a82');
  const L = 40, DECK = 2.4, TOWER_X = 11, TOP = 8;
  bridge.add(mesh(box(L, 0.45, 2.8), toon('#4a4440'), 0, DECK, 0, false));
  for (const tx of [-TOWER_X, TOWER_X]) {
    for (const s of [-1, 1]) bridge.add(mesh(box(1.0, TOP, 1.0), stone, tx, TOP / 2, s * 1.15, false));
    bridge.add(mesh(box(1.1, 1.4, 3.4), stone, tx, TOP - 0.2, 0, false));
    bridge.add(mesh(box(1.1, 0.5, 3.4), stone, tx, DECK + 2.2, 0, false));
    bridge.add(mesh(box(1.6, 0.6, 3.6), stone, tx, 0.3, 0, false));
  }
  // the main cables: up to the first tower, a sagging span, up to the second, down to the far end
  const cableAt = (x: number) => {
    const ax = Math.abs(x);
    if (ax > TOWER_X) return TOP - 0.5 - ((ax - TOWER_X) / (L / 2 - TOWER_X)) * (TOP - 0.5 - DECK - 0.3);
    const u = x / TOWER_X;
    return DECK + 1.2 + (TOP - 0.5 - DECK - 1.2) * u * u;
  };
  const cable = toon('#2a2a2e');
  const cableLight = glow('#fff0c0', 1.6);
  for (const s of [-1, 1]) {
    const N = 24;
    let prev = v3(-L / 2, cableAt(-L / 2), s * 1.2);
    for (let i = 1; i <= N; i++) {
      const x = -L / 2 + (L * i) / N;
      const p = v3(x, cableAt(x), s * 1.2);
      rod(bridge, prev, p, 0.05, cable);
      if (i % 2 === 0) rod(bridge, p, v3(p.x, DECK, p.z), 0.015, cable); // suspenders
      const bulb = mesh(new THREE.SphereGeometry(0.09, 4, 3), cableLight, p.x, p.y, p.z, false);
      bridge.add(bulb);
      nightOnly.push(bulb);
      prev = p;
    }
  }
  g.add(bridge);

  const FRAMINGS = [
    // across the river, panning along the skyline
    () => shot(v3(-7, 2.4, 12), v3(2, 7.5, -30), 42, v3(0.75, 0, 0)),
    // pushing in on the Empire State, tilting up
    () => shot(v3(-1, 3, 14), v3(ESB_X, 10, ESB_Z), 42, v3(0.15, 0.1, -0.7), v3(0, 0.3, 0)),
    // the bridge in the foreground, drifting toward Midtown
    () => shot(v3(-12, 3.0, 11), v3(-6, 6, -24), 46, v3(0.8, 0, -0.1), v3(1.1, 0, 0)),
  ];
  return {
    group: g,
    framing: () => pick(FRAMINGS)(),
    update(dt: number) {
      // the river shimmers
      waterDay.offset.x = (waterDay.offset.x + dt * 0.02) % 1;
      waterNight.offset.x = (waterNight.offset.x + dt * 0.02) % 1;
      waterNight.offset.y = (Math.sin(performance.now() / 700) * 0.01 + 1) % 1;
    },
  };
}

// ---------------------------------------------------------------------------------------------------------
// One New York block, seen from across the avenue, with time-lapse traffic streaming past. The building in
// the middle is whichever one we're cutting to: the gang's walk-up with MacLaren's on the ground floor,
// Barney's luxury high-rise, or a glass office tower (GNB, when it's Barney's office).

type Hero = 'walkup' | 'highrise' | 'glass' | 'store' | 'restaurant' | 'studio';

function buildStreet(
  dn: (m: THREE.Mesh, day: THREE.Material, night: THREE.Material) => THREE.Mesh,
  nightOnly: THREE.Object3D[],
  nightLights: [THREE.Light, number][],
) {
  const g = new THREE.Group();
  const r = mulberry32(1987);
  const FRONT = -6; // building line
  const CURB = -3.2;

  // Huge, with plain sky piled on top: tilting steeply up the towers, the top corners of the frame skim
  // along the backdrop and land hundreds of metres out.
  const skyMap = { wide: 2.5, zenith: 2 };
  const sky = dn(mesh(new THREE.PlaneGeometry(400 * skyMap.wide, 200 * (1 + skyMap.zenith)), toon('#ffffff'), 0, 35 + 100 * skyMap.zenith, -55, false),
    toon('#ffffff', { map: skyGradient(false, 97, skyMap), emissive: '#ffffff', emissiveIntensity: 0.9 }),
    toon('#ffffff', { map: skyGradient(true, 97, skyMap), emissive: '#ffffff', emissiveIntensity: 0.9 }));
  g.add(sky);

  // ---- ground: avenue, sidewalks ------------------------------------------------------------------------
  const road = mesh(new THREE.PlaneGeometry(140, 12.8), toon('#2a2a2e'), 0, 0, CURB + 6.4);
  road.rotation.x = -Math.PI / 2;
  road.castShadow = false;
  g.add(road);
  for (let x = -66; x < 66; x += 6) g.add(mesh(box(3, 0.01, 0.12), toon('#d8d0a0'), x, 0.006, 0, false)); // lane dashes
  // The walk-up supplies its own paving around the basement stairwell.
  const sidewalk = toon('#8a8682');
  for (const x of [-37.75, 37.75]) g.add(mesh(box(64.5, 0.16, CURB - FRONT), sidewalk, x, 0.08, (FRONT + CURB) / 2));
  const centerPaving = mesh(box(11, 0.16, CURB - FRONT), sidewalk, 0, 0.08, (FRONT + CURB) / 2);
  g.add(centerPaving);
  g.add(mesh(box(140, 0.18, 0.2), toon('#a8a49e'), 0, 0.09, CURB, false));
  g.add(mesh(box(140, 0.16, 2.5), toon('#8a8682'), 0, 0.08, 10.2)); // the near sidewalk, under the camera

  // ---- the neighbors -----------------------------------------------------------------------------------
  const walls = ['#7a3a28', '#8a5a40', '#6a4a3a', '#a89a7a', '#5a4a48', '#9a6a4a', '#7a6a5a'];
  const awnings = ['#a82a22', '#2a6a3a', '#2a3a7a', '#c88a22', '#3a3a3a'];
  const shopLit = glow('#ffd890', 1.0);
  const neighbor = (x0: number, w: number, seed: number) => {
    const h = 9 + r() * 12;
    const x = x0 + w / 2;
    const f = facadeMats(pick(walls), seed, w, h);
    g.add(dn(mesh(box(w - 0.08, h, 8), f.night, x, h / 2, FRONT - 4, false), f.day, f.night));
    g.add(mesh(box(w + 0.1, 0.45, 0.4), toon('#3a3430'), x, h - 0.2, FRONT + 0.15, false)); // cornice
    // shopfront with an awning
    g.add(dn(mesh(box(w - 0.8, 2.3, 0.1), toon('#3a4048'), x, 1.35, FRONT + 0.06, false), toon('#3a4048'), shopLit));
    g.add(mesh(box(w - 0.5, 0.18, 1.0), toon(pick(awnings)), x, 2.75, FRONT + 0.5, false));
    if (r() < 0.4) fireEscape(g, x - w / 4, w / 2.2, Math.floor((h - 3.4) / 2.7), FRONT);
  };
  for (const [from, to] of [[-62, -5.5], [5.5, 62]] as const) {
    let x = from;
    let i = 0;
    while (x < to - 0.01) {
      const proposed = 5 + r() * 4;
      const w = to - x - proposed < 3 ? to - x : proposed;
      neighbor(x, w, 600 + i + (from > 0 ? 50 : 0));
      x += w;
      i++;
    }
  }
  // Midtown towers looming behind the block
  for (let i = 0; i < 12; i++) {
    const x = -44 + i * 8 + r() * 4, w = 5 + r() * 4, h = 26 + r() * 22;
    const f = facadeMats(pick(['#8a8a9a', '#7a8090', '#a89a8a', '#5a6070']), 700 + i, w, h);
    g.add(dn(mesh(box(w, h, 5), f.night, x, h / 2, -22 - r() * 10, false), f.day, f.night));
  }

  // ---- streetlamps along the far curb ---------------------------------------------------------------------
  const pole = toon('#2a2c30');
  // Leave the hero entrance unobstructed; these poles line up with the curb lights below.
  for (let x = -54; x <= 54; x += 12) {
    g.add(mesh(cyl(0.07, 0.1, 4.6, 6), pole, x, 2.3, CURB + 0.35, false));
    g.add(mesh(box(0.06, 0.06, 1.1), pole, x, 4.55, CURB + 0.85, false));
    g.add(dn(mesh(box(0.2, 0.08, 0.36), toon('#b8b4a8'), x, 4.48, CURB + 1.35, false), toon('#b8b4a8'), glow('#ffd890', 1.6)));
  }
  for (const x of [-6, 6]) {
    const l = new THREE.PointLight('#ffcf80', 0, 12, 1.3);
    l.position.set(x, 4.2, CURB + 1.3);
    g.add(l);
    nightLights.push([l, 8]);
  }

  // ---- the hero buildings -----------------------------------------------------------------------------
  const heroes: Record<Hero, THREE.Group> = { walkup: new THREE.Group(), highrise: new THREE.Group(), glass: new THREE.Group(), store: new THREE.Group(), restaurant: new THREE.Group(), studio: new THREE.Group() };
  for (const [name, h] of Object.entries(heroes)) { h.name = `exterior_${name}`; g.add(h); }
  const apt = buildWalkupExterior(heroes.walkup, dn, nightLights, FRONT, CURB);
  buildHighrise(heroes.highrise, dn, FRONT);
  const gnb = buildGlassTower(heroes.glass, dn, FRONT);
  for (const kind of ['store', 'restaurant', 'studio'] as const) buildPublicExterior(heroes[kind], kind, dn, FRONT);

  // ---- time-lapse traffic --------------------------------------------------------------------------------
  const cars: { grp: THREE.Group; dir: number; speed: number }[] = [];
  const SPAN = 120;
  const headOff = toon('#d8d8c8'), headOn = glow('#fff2c0', 2.0);
  const tailOff = toon('#7a1a1a'), tailOn = glow('#ff2a1a', 1.6);
  const trailHead = glow('#fff0d0', 1.3), trailTail = glow('#ff3a2a', 1.2);
  const car = (cab: boolean, color: string) => {
    const c = new THREE.Group();
    const body = toon(cab ? '#e8b812' : color);
    c.add(mesh(box(4.2, 0.62, 1.8), body, 0, 0.6, 0, false));
    c.add(mesh(box(2.3, 0.55, 1.62), toon('#2a3440'), -0.2, 1.18, 0, false));
    c.add(mesh(box(2.1, 0.08, 1.64), body, -0.2, 1.48, 0, false));
    for (const sx of [-1.3, 1.3]) for (const sz of [-0.82, 0.82]) {
      const wheel = mesh(cyl(0.32, 0.32, 0.22, 8), toon('#141416'), sx, 0.32, sz, false);
      wheel.rotation.x = Math.PI / 2;
      c.add(wheel);
    }
    if (cab) c.add(mesh(box(0.6, 0.2, 0.3), toon('#f8f0c0'), -0.2, 1.62, 0, false));
    for (const sz of [-0.6, 0.6]) {
      c.add(dn(mesh(box(0.06, 0.14, 0.32), headOff, 2.11, 0.68, sz, false), headOff, headOn));
      c.add(dn(mesh(box(0.06, 0.14, 0.3), tailOff, -2.11, 0.7, sz, false), tailOff, tailOn));
    }
    // long-exposure light trails, stretched out behind the car
    const trails = new THREE.Group();
    trails.add(mesh(box(9, 0.07, 0.07), trailHead, -2.4, 0.68, 0.6, false), mesh(box(9, 0.07, 0.07), trailHead, -2.4, 0.68, -0.6, false));
    trails.add(mesh(box(11, 0.07, 0.07), trailTail, -7.6, 0.7, 0.6, false), mesh(box(11, 0.07, 0.07), trailTail, -7.6, 0.7, -0.6, false));
    c.add(trails);
    nightOnly.push(trails);
    return c;
  };
  const colors = ['#1a1a1e', '#a8acb0', '#7a1a1a', '#1a2a4a', '#e8e8e4', '#2a3a2a'];
  for (const [lane, dir] of [[-1.6, 1], [1.7, -1]] as const) {
    for (let i = 0; i < 7; i++) {
      const c = car(r() < 0.45, pick(colors));
      c.position.set(-SPAN / 2 + (i + r() * 0.6) * (SPAN / 7), 0, lane);
      c.rotation.y = dir > 0 ? 0 : Math.PI;
      g.add(c);
      cars.push({ grp: c, dir, speed: 15 + r() * 7 });
    }
  }

  const framings: Record<string, () => EstablishingShot> = {
    // The same building establishes both destinations: the sunken pub, then the raised apartment stoop.
    maclarens: () => shot(v3(-4.8, 3.1, 3.4), apt.pub.clone().add(v3(0.2, 0.25, 0)), 39, v3(0.09, 0, -0.08), v3(0.04, 0.01, 0)),
    apartment: () => shot(v3(-3.3, 3.7, 6.3), apt.entrance.clone().add(v3(-0.5, -0.25, 0)), 44, v3(0.06, 0.015, -0.1), v3(0, 0.07, 0)),
    rooftop: () => shot(v3(-3.4, 4, 12), apt.roof.clone().add(v3(0, -2, 0)), 54, v3(0, 0, -0.1), v3(0, 0.5, 0)),
    barneys: () => shot(v3(-3.6, 0.9, 8), v3(0, 7, FRONT), 56, v3(0.1, 0, -0.1), v3(0, 1.3, 0)),
    office: () => shot(v3(3.6, 1.0, 8), v3(0, 8, FRONT), 56, v3(-0.1, 0, -0.1), v3(0, 1.3, 0)),
    storefront: () => shot(v3(-3.5, 1.7, 8), v3(0, 2.9, FRONT), 48, v3(0.24, 0, -0.14)),
    studio: () => shot(v3(3.2, 1.6, 9), v3(0, 4.2, FRONT), 50, v3(-0.2, 0.08, -0.1)),
    // the cars: a high, wide look down the avenue as the traffic streams by
    cars: () => shot(v3(-9, 5.5, 9.5), v3(0, 1.4, -2), 50, v3(0.9, 0, 0)),
  };
  const HERO: Partial<Record<LocationId, Hero>> = { barneys: 'highrise', barneys_office: 'glass', office: 'glass', limo: 'highrise', metro_news_one: 'studio', store: 'store', restaurant: 'restaurant' };
  const FRAMING: Partial<Record<LocationId, string>> = { barneys_office: 'office', limo: 'cars', taxi: 'cars', car: 'cars', metro_news_one: 'studio', store: 'storefront', restaurant: 'storefront' };

  return {
    group: g,
    framing(location: LocationId) {
      const hero = HERO[location] ?? 'walkup';
      centerPaving.visible = hero !== 'walkup';
      for (const [k, grp] of Object.entries(heroes)) grp.visible = k === hero;
      gnb.visible = location === 'barneys_office';
      return (framings[FRAMING[location] ?? location] ?? framings.maclarens)();
    },
    update(dt: number) {
      for (const c of cars) {
        const p = c.grp.position;
        p.x += c.dir * c.speed * dt;
        if (p.x > SPAN / 2) p.x -= SPAN;
        if (p.x < -SPAN / 2) p.x += SPAN;
      }
    },
  };
}

/** Distinct public destinations, so arriving at a new set never cuts through MacLaren's. */
function buildPublicExterior(g: THREE.Group, kind: 'store' | 'restaurant' | 'studio',
  dn: (m: THREE.Mesh, day: THREE.Material, night: THREE.Material) => THREE.Mesh, front: number) {
  const studio = kind === 'studio';
  const color = studio ? '#727d8b' : kind === 'store' ? '#9f7553' : '#905d49';
  const f = facadeMats(color, studio ? 842 : 841, 10, 18);
  g.add(dn(mesh(box(10, 18, 7), f.day, 0, 9, front - 3.5, false), f.day, f.night));
  const trim = toon(studio ? '#bac2ca' : '#435c4d');
  const day = toon('#73858b'), night = glow('#f6d09b', 0.9);
  g.add(mesh(box(10.25, 0.35, 0.45), trim, 0, 4.5, front + 0.18, false));
  g.add(mesh(box(10, 4.2, 0.15), toon(color), 0, 2.1, front + 0.06, false));
  for (const x of [-3.2, 3.2]) {
    g.add(dn(mesh(new THREE.PlaneGeometry(2.75, 2.4), day, x, 1.8, front + 0.15, false), day, night));
    for (const dx of [-1.4, 0, 1.4]) g.add(mesh(box(0.09, 2.55, 0.07), trim, x + dx, 1.8, front + 0.19, false));
  }
  g.add(mesh(box(1.7, 2.8, 0.12), toon('#34473f'), 0, 1.4, front + 0.17, false));
  g.add(dn(mesh(new THREE.PlaneGeometry(1.3, 1.7), day, 0, 1.7, front + 0.24, false), day, night));
  g.add(mesh(box(0.06, 2.6, 0.04), trim, 0, 1.4, front + 0.26, false));
  const title = studio ? 'METRO NEWS ONE' : kind === 'store' ? 'NEIGHBORHOOD GOODS' : 'THE RESTAURANT';
  const signBg = kind === 'restaurant' ? '#613329' : '#253f38';
  g.add(mesh(new THREE.PlaneGeometry(8.6, 0.68), new THREE.MeshBasicMaterial({ map: sign(title, '#f3ddb1', signBg, 512, 64, 'bold 33px Georgia') }), 0, 3.83, front + 0.25, false));
  if (studio) {
    g.add(mesh(new THREE.PlaneGeometry(3.4, 1.15), new THREE.MeshBasicMaterial({ map: metroNewsLogo() }), 0, 5.65, front + 0.18, false));
    g.add(mesh(cyl(0.9, 0.25, 0.25, 12), toon('#c4c8ca'), 2.4, 18.45, front - 1.6, false).rotateZ(0.55));
  } else {
    const awning = mesh(box(9.6, 0.14, 1.4), toon(kind === 'store' ? '#51765a' : '#853f35'), 0, 3.2, front + 0.85, false);
    awning.rotation.x = 0.16; g.add(awning);
    g.add(mesh(box(9.6, 0.3, 0.06), toon(kind === 'store' ? '#385b41' : '#693127'), 0, 2.95, front + 1.55, false));
  }
}

/** Zig-zag iron fire escape down the front of a building. */
function fireEscape(g: THREE.Group, x: number, w: number, floors: number, front: number) {
  const iron = toon('#1e1e22');
  for (let i = 0; i < floors; i++) {
    const y = 3.4 + i * 2.7;
    g.add(mesh(box(w, 0.06, 1.0), iron, x, y, front + 0.55, false));
    g.add(mesh(box(w, 0.04, 0.04), iron, x, y + 0.95, front + 1.05, false));
    for (let px = -w / 2; px <= w / 2 + 0.01; px += w / 6) g.add(mesh(box(0.03, 0.95, 0.03), iron, x + px, y + 0.47, front + 1.05, false));
    if (i < floors - 1) {
      // the ladder up to the next landing
      const len = Math.hypot(2.7, w * 0.7);
      const ladder = mesh(box(len, 0.05, 0.45), iron, x, y + 1.35, front + 0.55, false);
      ladder.rotation.z = Math.atan2(2.7, w * 0.7) * (i % 2 ? -1 : 1);
      g.add(ladder);
    }
  }
}

/** Barney's building: a limestone luxury tower with a canopy out to the curb. */
function buildHighrise(g: THREE.Group, dn: (m: THREE.Mesh, day: THREE.Material, night: THREE.Material) => THREE.Mesh, FRONT: number) {
  const W = 10, H = 46;
  const f = facadeMats('#c8bca8', 811, W, H);
  g.add(dn(mesh(box(W, H, 8), f.night, 0, H / 2, FRONT - 4, false), f.day, f.night));
  const stone = toon('#d8ccb8');
  for (let x = -W / 2; x <= W / 2 + 0.01; x += 2) g.add(mesh(box(0.25, H - 4, 0.25), stone, x, 4 + (H - 4) / 2, FRONT + 0.1, false)); // piers
  g.add(mesh(box(W + 0.4, 4, 0.4), stone, 0, 2, FRONT + 0.15, false));
  // the lobby: glass, brass, a revolving door
  const lobbyDay = toon('#6a7a88'), lobbyNight = glow('#ffe6b0', 0.9);
  g.add(dn(mesh(new THREE.PlaneGeometry(6, 2.8), lobbyDay, 0, 1.5, FRONT + 0.36, false), lobbyDay, lobbyNight));
  g.add(mesh(cyl(0.9, 0.9, 2.6, 10), toon('#2a2a2a'), 0, 1.3, FRONT + 0.4, false));
  const brass = toon('#c9a227');
  g.add(mesh(box(4, 0.3, 3.6), toon('#141414'), 0, 3.2, FRONT + 2.1, false));
  g.add(mesh(box(4.05, 0.08, 3.65), brass, 0, 3.0, FRONT + 2.1, false));
  for (const sx of [-1.9, 1.9]) g.add(mesh(cyl(0.05, 0.05, 3.0, 6), brass, sx, 1.5, FRONT + 3.8, false));
  g.add(mesh(new THREE.PlaneGeometry(4, 0.25), toon('#ffffff', { map: sign('PRIVATE RESIDENCES', '#c9a227', '#141414', 128, 16, 'bold 11px Georgia') }), 0, 3.2, FRONT + 3.91, false));
}

/** A blue-glass office tower; GNB's when the sign over the door is up. Returns the sign. */
function buildGlassTower(g: THREE.Group, dn: (m: THREE.Mesh, day: THREE.Material, night: THREE.Material) => THREE.Mesh, FRONT: number) {
  const W = 11, H = 50;
  const f = facadeMats('#2e4658', 822, W * 1.4, H);
  g.add(dn(mesh(box(W, H, 9), f.night, 0, H / 2, FRONT - 4.5, false), f.day, f.night));
  const mull = toon('#8a9aa8');
  for (let x = -W / 2; x <= W / 2 + 0.01; x += 1.1) g.add(mesh(box(0.08, H - 4.5, 0.12), mull, x, 4.5 + (H - 4.5) / 2, FRONT + 0.06, false));
  for (let y = 4.5; y < H; y += 2.8) g.add(mesh(box(W, 0.12, 0.12), mull, 0, y, FRONT + 0.06, false));
  // a double-height glass lobby
  const lobbyDay = toon('#5a7a90'), lobbyNight = glow('#e8f0ff', 0.9);
  g.add(dn(mesh(new THREE.PlaneGeometry(W - 1, 4.2), lobbyDay, 0, 2.1, FRONT + 0.02, false), lobbyDay, lobbyNight));
  for (let x = -W / 2 + 0.5; x <= W / 2 - 0.4; x += 1.4) g.add(mesh(box(0.1, 4.2, 0.1), toon('#3a4a58'), x, 2.1, FRONT + 0.06, false));
  g.add(mesh(box(W + 0.2, 0.3, 0.6), toon('#3a4a58'), 0, 4.4, FRONT + 0.25, false));
  const gnb = new THREE.Group();
  gnb.add(mesh(new THREE.PlaneGeometry(3.4, 0.9), toon('#ffffff', { map: sign('GNB', '#ffffff', '#1a2a44', 96, 24, 'bold 18px Arial'), emissive: '#ffffff', emissiveIntensity: 0.35 }), 0, 5.2, FRONT + 0.1, false));
  g.add(gnb);
  return gnb;
}
