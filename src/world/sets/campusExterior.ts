import * as THREE from 'three';
import { box, cyl, glow, mesh, toon } from '../../engine/materials';
import { sign, skyGradient, speckle } from '../../engine/textures';
import { mulberry32 } from '../../util';

/** Low Library from South Lawn: the Columbia destination for Ted's classes.
 * Original procedural scenery; photographic references are documented in README. */
export function buildCampusExterior(
  dn: (m: THREE.Mesh, day: THREE.Material, night: THREE.Material) => THREE.Mesh,
  nightLights: [THREE.Light, number][],
) {
  const g = new THREE.Group(); g.name = 'exterior_campus';
  const stone = toon('#c5b99b'), trim = toon('#e1d3ae'), recess = toon('#9c937e');
  const paving = toon('#b8a58a'), iron = toon('#293b35');
  const glassDay = toon('#344d50'), glassNight = glow('#bd9b60', 0.6);
  const block = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
    const m = mesh(box(w, h, d), material, x, y, z); g.add(m); return m;
  };
  const sky = dn(mesh(new THREE.PlaneGeometry(240, 100), toon('#ffffff'), 0, 33, -65, false),
    new THREE.MeshBasicMaterial({ map: skyGradient(false, 1754), color: '#a1e6f0' }),
    new THREE.MeshBasicMaterial({ map: skyGradient(true, 1754) }));
  g.add(sky);

  // The campus owns its ground and background, away from the avenue's traffic and towers.
  block(160, 0.14, 160, paving, 0, -0.09, 0);
  const grass = toon('#ffffff', { map: speckle('#568c31', [12, 12], 1754, 0.055) });
  for (const side of [-1, 1]) {
    block(25, 0.12, 36, grass, side * 14.5, 0.035, 37);
    block(25.2, 0.12, 0.22, trim, side * 14.5, 0.06, 19);
    block(0.22, 0.12, 36, trim, side * 2, 0.06, 37);
    block(13, 0.18, 23, grass, side * 25, 0.07, 3);
  }

  // Broad, low wings and the square drum beneath the shallow granite dome.
  block(31, 8.2, 16, stone, 0, 7.1, -18);
  block(31.8, 0.35, 16.6, trim, 0, 11.3, -18);
  block(30.5, 0.8, 15.3, stone, 0, 11.85, -18);
  block(31, 0.2, 15.8, trim, 0, 12.35, -18);
  block(17.2, 4.7, 17.2, stone, 0, 14.25, -17.5);
  block(17.7, 0.28, 17.7, recess, 0, 16.55, -17.5);
  block(18, 0.3, 18, trim, 0, 16.83, -17.5);
  for (let x = -8.5; x <= 8.5; x += 0.65) block(0.23, 0.28, 0.35, trim, x, 16.28, -8.75);
  const dome = mesh(new THREE.SphereGeometry(8.25, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon('#b5af95'), 0, 17.05, -17.5);
  dome.scale.y = 0.57; g.add(dome);
  g.add(mesh(cyl(8.35, 8.5, 0.24, 32), recess, 0, 17.07, -17.5));
  // Stone courses follow the dome, instead of reading as an unbroken half-sphere.
  for (const theta of [0.32, 0.58, 0.84, 1.1, 1.34]) {
    const course = mesh(new THREE.TorusGeometry(8.26 * Math.sin(theta), 0.025, 3, 48), recess,
      0, 17.05 + 4.7 * Math.cos(theta), -17.5, false);
    course.rotation.x = Math.PI / 2; g.add(course);
  }

  // The semicircular gridded window is visible above the portico's flat attic.
  const arch = new THREE.Shape();
  arch.moveTo(-4, 0); arch.absarc(0, 0, 4, Math.PI, 0, true); arch.lineTo(-4, 0);
  g.add(dn(mesh(new THREE.ShapeGeometry(arch, 24), glassDay, 0, 12.02, -8.86, false), glassDay, glassNight));
  const archTrim = mesh(new THREE.TorusGeometry(4.12, 0.18, 5, 24, Math.PI), trim, 0, 12.02, -8.73);
  g.add(archTrim);
  for (let x = -3.5; x <= 3.5; x += 0.5) {
    const h = Math.sqrt(16 - x * x);
    block(0.08, h, 0.1, recess, x, 12.02 + h / 2, -8.7);
  }
  for (const y of [0.8, 1.6, 2.4, 3.2]) block(Math.sqrt(16 - y * y) * 2, 0.08, 0.1, recess, 0, 12.02 + y, -8.69);

  // Recessed doors and windows behind ten Ionic columns.
  block(24, 0.35, 7.2, trim, 0, 2.95, -7.6);
  block(23.4, 7.1, 0.18, recess, 0, 6.6, -9.87);
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 2.2;
    block(1.25, 5.65, 0.15, trim, x, 6.1, -9.72);
    g.add(dn(mesh(box(0.94, 5.3, 0.12), glassDay, x, 6.1, -9.6, false), glassDay, glassNight));
    for (const y of [4.8, 6.5, 8]) block(1, 0.1, 0.14, recess, x, y, -9.51);
  }
  for (let i = 0; i < 10; i++) {
    const x = (i - 4.5) * 2.2, z = -6.7;
    block(1.03, 0.26, 1.03, trim, x, 3.25, z);
    g.add(mesh(cyl(0.5, 0.53, 0.2, 16), trim, x, 3.48, z));
    g.add(mesh(cyl(0.34, 0.43, 6.0, 16), stone, x, 6.55, z));
    g.add(mesh(cyl(0.5, 0.36, 0.24, 12), trim, x, 9.63, z));
    block(1.03, 0.22, 0.98, trim, x, 9.84, z);
    for (const dx of [-0.37, 0.37]) {
      g.add(mesh(new THREE.TorusGeometry(0.15, 0.075, 4, 8), trim, x + dx, 9.68, z + 0.4));
    }
  }
  block(24, 0.42, 5.5, trim, 0, 10.13, -7.85);
  block(23.7, 0.75, 5.3, stone, 0, 10.71, -7.85);
  block(24.5, 0.28, 5.8, trim, 0, 11.23, -7.85);
  block(22.6, 1.03, 4.5, stone, 0, 11.88, -8);
  block(23, 0.22, 4.8, trim, 0, 12.5, -8);
  for (let x = -11.5; x <= 11.5; x += 0.62) block(0.25, 0.2, 0.28, trim, x, 11.02, -4.98);
  g.add(mesh(new THREE.PlaneGeometry(19, 0.42), toon('#ffffff', {
    map: sign('THE LIBRARY OF COLUMBIA UNIVERSITY', '#766b53', '#c5b99b', 1024, 32, '25px Georgia'),
  }), 0, 10.72, -5.19, false));
  for (const side of [-1, 1]) {
    for (const x of [12.8, 14.5]) {
      block(0.42, 7.1, 0.45, trim, side * x, 6.9, -9.75);
    }
    for (const y of [5.1, 8.3]) {
      g.add(dn(mesh(box(1.05, 1.95, 0.15), glassDay, side * 13.65, y, -9.85, false), glassDay, glassNight));
    }
  }

  // Two flights of Low Steps, with a landing around the Alma Mater pedestal.
  block(33, 1.62, 12, paving, 0, 0.8, -1);
  const steps = (start: number, count: number, rise: number, run: number, base: number, width: number) => {
    for (let i = 0; i < count; i++) {
      const h = base + (count - i) * rise;
      block(width, h, run + 0.015, trim, 0, h / 2, start + (i + 0.5) * run);
      block(width, rise * 0.65, 0.025, paving, 0, h - rise * 0.45, start + (i + 1) * run + 0.012);
    }
  };
  steps(-4, 8, 0.18, 0.65, 1.6, 23.8);
  steps(5, 10, 0.16, 0.72, 0, 33);
  for (const side of [-1, 1]) {
    block(3.5, 1.72, 12, stone, side * 15, 0.86, -1);
    block(3.65, 0.2, 12.2, trim, side * 15, 1.8, -1);
    block(1.1, 2.4, 1.4, stone, side * 12.55, 2.8, -3.4);
    block(1.35, 0.22, 1.65, trim, side * 12.55, 4.1, -3.4);
  }
  const bronze = toon('#466c5d');
  block(1.85, 0.25, 1.8, trim, 0, 1.75, 3.3);
  block(1.25, 0.9, 1.25, stone, 0, 2.3, 3.3);
  block(0.9, 1.05, 0.28, bronze, 0, 3.15, 3.15);
  g.add(mesh(cyl(0.25, 0.62, 1.15, 7), bronze, 0, 3.22, 3.6));
  g.add(mesh(new THREE.IcosahedronGeometry(0.23, 1), bronze, 0, 3.96, 3.4));
  for (const side of [-1, 1]) {
    const arm = mesh(cyl(0.095, 0.12, 0.62, 6), bronze, side * 0.4, 3.53, 3.48);
    arm.rotation.z = side * 1.05; g.add(arm);
  }

  // Campus lanterns and hedges edge the paths, leaving the library silhouette open.
  for (const z of [12.8, 21, 33]) for (const side of [-1, 1]) {
    const x = side * (z === 12.8 ? 13.9 : 2.8);
    g.add(mesh(cyl(0.18, 0.3, 0.45, 8), iron, x, 0.225, z));
    g.add(mesh(cyl(0.06, 0.11, 2.9, 8), iron, x, 1.8, z));
    g.add(mesh(cyl(0.28, 0.16, 0.16, 6), iron, x, 3.28, z));
    g.add(dn(mesh(new THREE.SphereGeometry(0.25, 6, 4), trim, x, 3.65, z, false), trim, glow('#ffe2a3', 1.4)));
    g.add(mesh(cyl(0, 0.28, 0.24, 6), iron, x, 3.98, z));
    const lamp = new THREE.PointLight('#ffd69a', 0, 9, 2); lamp.position.set(x, 3.6, z);
    g.add(lamp); nightLights.push([lamp, 9]);
  }
  for (const side of [-1, 1]) {
    block(23.5, 0.65, 0.7, toon('#335f2e'), side * 15, 0.42, 18.9);
    for (let x = 3.5; x <= 26; x += 1.5) block(0.045, 0.9, 0.045, iron, side * x, 0.5, 19.35);
    block(23.5, 0.04, 0.05, iron, side * 15, 0.93, 19.35);
  }
  const rng = mulberry32(1897), foliage = ['#386638', '#527b39', '#668c42', '#447343'].map(c => toon(c));
  for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
    const grove = mesh(new THREE.IcosahedronGeometry(4.8, 1), foliage[i % foliage.length], side * (19 + i * 6), 3.7, -24);
    grove.scale.set(1.2, 0.95, 1); g.add(grove);
  }
  for (const [x, z, size] of [[-21, -8, 1.2], [22, -10, 1.25], [-24, 7, 1.05], [24, 8, 1.12], [-27, 25, 0.95], [29, 29, 1.05]] as const) {
    g.add(mesh(cyl(0.2, 0.4, 6 * size, 7), toon('#6c6248'), x, 3 * size, z));
    for (let i = 0; i < 8; i++) {
      const a = i * 2.4, radius = i === 0 ? 0 : 2.6 * size;
      const leaf = mesh(new THREE.IcosahedronGeometry((2.5 + rng()) * size, 1), foliage[i % foliage.length],
        x + Math.cos(a) * radius, (6.5 + rng() * 2) * size, z + Math.sin(a) * radius);
      leaf.scale.y = 0.85; g.add(leaf);
    }
  }

  // Small, static campus occupants provide scale without joining the scene's speaking cast.
  const student = (x: number, y: number, z: number, shirt: string, seated: boolean, yaw: number) => {
    const s = new THREE.Group(), top = toon(shirt), jeans = toon('#354252'), skin = toon(rng() > 0.5 ? '#c6926b' : '#825d45');
    s.position.set(x, y, z); s.rotation.y = yaw;
    const hip = seated ? 0.28 : 0.65;
    s.add(mesh(cyl(0.18, 0.22, 0.5, 6), top, 0, hip + 0.25, 0));
    s.add(mesh(new THREE.IcosahedronGeometry(0.17, 1), skin, 0, hip + 0.68, 0));
    s.add(mesh(new THREE.SphereGeometry(0.18, 6, 4, 0, Math.PI * 2, 0, 1.6), toon('#443629'), 0, hip + 0.74, 0));
    for (const side of [-1, 1]) {
      s.add(mesh(box(0.14, seated ? 0.14 : 0.64, seated ? 0.55 : 0.17), jeans, side * 0.12, seated ? 0.16 : 0.32, seated ? 0.2 : 0));
      const arm = mesh(cyl(0.07, 0.075, 0.43, 5), top, side * 0.25, hip + 0.22, 0.08);
      arm.rotation.x = seated ? -0.85 : -0.12; s.add(arm);
    }
    if (seated) s.add(mesh(box(0.36, 0.035, 0.26), toon('#eadfbc'), 0, 0.4, 0.35));
    g.add(s);
  };
  student(-7, 0.13, 28, '#c7b189', true, 0.5);
  student(-8.1, 0.13, 28.5, '#536d90', true, -0.6);
  student(8.5, 0.13, 25, '#ac6652', true, -0.4);
  student(10, 0.13, 26, '#dbd0b3', true, -1.1);
  student(16, 0.13, 32, '#6f7698', true, 0.8);
  student(-1, 0, 17, '#3d8291', false, -0.5);
  student(3.6, 0, 14, '#bc975c', false, 1.4);
  student(-7.5, 1.6, 4, '#9b5650', true, 0.15);
  student(6.8, 0.8, 8.6, '#bfb9a4', true, -0.2);
  student(8.1, 0.8, 8.6, '#4d6582', true, 0.2);
  return g;
}
