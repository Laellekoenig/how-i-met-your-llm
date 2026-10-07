import * as THREE from 'three';
import { toon, glow, box, mesh, roundedBox, cyl } from '../../engine/materials';
import { sign, speckle } from '../../engine/textures';
import { type StageSet, mark, nodes, v3 } from './common';
import { cityDrive } from './cityDrive';

/** An ordinary, unbranded sedan. See docs/car-reference.md for the windshield coverage. */
export function buildCar(): StageSet {
  const g = new THREE.Group(); g.name = 'car';
  const W = 1.02, REAR = -1.78, DASH = 1.05, ROOF = 1.62, SEAT = 0.42;
  const drive = cityDrive(g, -0.38);
  const paint = toon('#506b78'), trim = toon('#262b2e'), chrome = toon('#9caaae');
  const cloth = toon('#ffffff', { map: speckle('#797b76', [3, 3], 104, 0.12) });
  const cushion = toon('#8a8981'), lining = toon('#85837b');
  const glass = new THREE.MeshBasicMaterial({ color: '#b3cad5', transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide });

  g.add(mesh(box(W * 2, 0.25, 4.95), trim, 0, -0.13, 0.15, false));
  g.add(mesh(box(W * 2, 0.07, DASH - REAR), trim, 0, 0, (DASH + REAR) / 2, false));
  g.add(mesh(roundedBox(W * 2 + 0.12, 0.4, 1.35, 0.08), paint, 0, 0.42, DASH + 0.66, false));
  g.add(mesh(roundedBox(W * 2 + 0.12, 0.42, 0.8, 0.06), paint, 0, 0.38, REAR - 0.4, false));
  g.add(mesh(box(W * 2 + 0.12, 0.07, DASH - REAR + 0.1), paint, 0, ROOF + 0.04, (DASH + REAR) / 2, false));
  const ceiling = mesh(new THREE.PlaneGeometry(W * 2, DASH - REAR), lining, 0, ROOF, (DASH + REAR) / 2, false);
  ceiling.rotation.x = Math.PI / 2; g.add(ceiling);

  for (const side of [-1, 1]) {
    const x = side * W;
    g.add(mesh(box(0.09, 0.77, DASH - REAR + 0.5), paint, x, 0.36, (DASH + REAR) / 2, false));
    g.add(mesh(box(0.045, 0.58, DASH - REAR - 0.14), cloth, x - side * 0.05, 0.42, (DASH + REAR) / 2, false));
    g.add(mesh(box(0.075, 0.1, DASH - REAR), lining, x, ROOF - 0.05, (DASH + REAR) / 2, false));
    for (const z of [REAR, -0.54, DASH]) g.add(mesh(box(0.075, 0.84, 0.08), lining, x, 1.16, z, false));
    const window = mesh(new THREE.PlaneGeometry(DASH - REAR, 0.78), glass, x, 1.14, (DASH + REAR) / 2, false);
    window.rotation.y = Math.PI / 2; g.add(window);
    for (const z of [-1.15, 0.25]) {
      g.add(mesh(roundedBox(0.13, 0.07, 0.48, 0.025), trim, x - side * 0.11, 0.62, z, false));
      g.add(mesh(box(0.025, 0.035, 0.15), chrome, x - side * 0.08, 0.72, z + 0.22, false));
    }
    g.add(mesh(roundedBox(0.19, 0.13, 0.25, 0.03), paint, x + side * 0.11, 0.84, DASH - 0.02, false));
    for (const z of [REAR - 0.2, DASH + 0.65]) {
      g.add(mesh(cyl(0.33, 0.33, 0.2, 12).rotateZ(Math.PI / 2), trim, x, -0.05, z, false));
      g.add(mesh(cyl(0.18, 0.18, 0.21, 8).rotateZ(Math.PI / 2), chrome, x + side * 0.01, -0.05, z, false));
    }
    g.add(mesh(box(0.34, 0.14, 0.035), glow('#fff0c9', 1.1), side * 0.74, 0.47, DASH + 1.34, false));
    g.add(mesh(box(0.26, 0.12, 0.035), glow('#d83e32'), side * 0.76, 0.45, REAR - 0.8, false));
  }
  g.add(mesh(box(1.1, 0.16, 0.04), trim, 0, 0.38, DASH + 1.34, false));
  for (const y of [0.33, 0.39, 0.45]) g.add(mesh(box(1.04, 0.015, 0.045), chrome, 0, y, DASH + 1.35, false));
  g.add(mesh(box(W * 2, 0.82, 0.08), cloth, 0, 0.41, REAR, false));
  g.add(mesh(box(W * 2, 0.045, 0.33), trim, 0, 0.88, REAR + 0.12, false));
  for (const z of [REAR - 0.01, DASH + 0.06]) g.add(mesh(new THREE.PlaneGeometry(W * 2, 0.77), glass, 0, 1.20, z, false));
  for (const z of [REAR, DASH]) g.add(mesh(box(W * 2, 0.07, 0.08), lining, 0, ROOF - 0.035, z, false));

  // Front bucket seats, a normal console and a three-place rear bench.
  for (const x of [-0.53, 0.53]) {
    g.add(mesh(roundedBox(0.74, 0.34, 0.65, 0.06), trim, x, 0.19, 0.12));
    g.add(mesh(roundedBox(0.74, 0.11, 0.64, 0.055), cushion, x, SEAT - 0.055, 0.12));
    g.add(mesh(roundedBox(0.73, 0.62, 0.15, 0.055), cloth, x, SEAT + 0.27, -0.27));
    for (const dx of [-0.11, 0.11]) g.add(mesh(cyl(0.013, 0.013, 0.17, 6), chrome, x + dx, 1.04, -0.27, false));
    g.add(mesh(roundedBox(0.38, 0.24, 0.14, 0.045), cushion, x, 1.14, -0.28));
  }
  g.add(mesh(roundedBox(1.9, SEAT, 0.6, 0.04), cloth, 0, SEAT / 2, -1.22));
  g.add(mesh(roundedBox(1.9, 0.56, 0.16, 0.055), cloth, 0, SEAT + 0.26, -1.58));
  for (const x of [-0.65, 0.65]) g.add(mesh(roundedBox(0.34, 0.2, 0.12, 0.035), cushion, x, 1.06, -1.59));
  g.add(mesh(roundedBox(0.26, 0.33, 0.88, 0.025), trim, 0, 0.22, 0.22));
  for (const z of [0, 0.2]) g.add(mesh(cyl(0.065, 0.065, 0.01, 12), toon('#101416'), 0, 0.395, z, false));
  g.add(mesh(cyl(0.018, 0.02, 0.18, 6), chrome, 0, 0.44, 0.52, false));
  g.add(mesh(roundedBox(0.075, 0.055, 0.1, 0.02), trim, 0, 0.54, 0.52, false));

  // Low dashboard, radio, vents, wheel and the mirror at the top of the windshield frame.
  g.add(mesh(roundedBox(1.96, 0.28, 0.32, 0.035), trim, 0, 0.66, DASH - 0.1));
  for (const x of [-0.8, -0.2, 0.2, 0.8]) {
    g.add(mesh(box(0.19, 0.07, 0.025), toon('#111719'), x, 0.71, DASH - 0.27, false));
    for (const dy of [-0.02, 0, 0.02]) g.add(mesh(box(0.16, 0.006, 0.027), chrome, x, 0.71 + dy, DASH - 0.275, false));
  }
  g.add(mesh(new THREE.PlaneGeometry(0.28, 0.07), new THREE.MeshBasicMaterial({ map: sign('FM  101.1', '#a5bfac', '#10241e', 128, 32, '18px monospace') }), 0, 0.62, DASH - 0.27, false).rotateY(Math.PI));
  const wheel = mesh(new THREE.TorusGeometry(0.205, 0.024, 5, 20), trim, 0.53, 0.84, 0.67, false);
  wheel.rotation.x = -0.3; g.add(wheel);
  g.add(mesh(roundedBox(0.17, 0.08, 0.045, 0.02), trim, 0.53, 0.84, 0.67, false));
  g.add(mesh(box(0.018, 0.085, 0.025), trim, 0, 1.57, DASH - 0.04, false));
  g.add(mesh(roundedBox(0.32, 0.085, 0.04, 0.02), trim, 0, 1.5, DASH - 0.05, false));
  for (const side of [-1, 1]) {
    const wiper = mesh(box(0.68, 0.015, 0.02), trim, side * 0.47, 0.825, DASH + 0.09, false);
    wiper.rotation.z = side * 0.055; g.add(wiper);
  }

  const hemi = new THREE.HemisphereLight('#e0e9ef', '#403b34', 2.5); g.add(hemi);
  // Studio fill through the windshield: faces read even under the closed roof.
  const fill = new THREE.PointLight('#fff1da', 2.8, 5, 1.2); fill.position.set(0, 1.56, 0.85); g.add(fill);
  const backFill = new THREE.PointLight('#dce6ff', 1.3, 3, 1.3); backFill.position.set(0, 1.5, -0.7); g.add(backFill);
  const N = nodes({ front: [0, 0.2], front_door: [-0.85, 0.2], back: [0, -1.15], door: [-0.85, -1.15] });
  return {
    id: 'car', name: 'A Car', group: g, nodes: N,
    edges: [['front_door', 'front'], ['door', 'back']], door: 'door',
    entrances: { front: 'front_door', front_door: 'front_door' },
    marks: {
      driver: mark(0.53, 0.2, 0, 'front', 'driver of an ordinary car; explicitly cast whoever is driving', { seat: SEAT, pose: 'driving' }),
      front_passenger: mark(-0.53, 0.2, 0, 'front', 'front passenger beside the driver', { seat: SEAT }),
      back_left: mark(-0.63, -1.15, 0, 'back', 'rear bench, passenger side', { seat: SEAT }),
      back_middle: mark(0, -1.15, 0, 'back', 'rear bench, center', { seat: SEAT }),
      back_right: mark(0.63, -1.15, 0, 'back', 'rear bench, driver side', { seat: SEAT }),
      door: mark(-0.85, -1.15, 0, 'door', 'rear passenger door; entrance only', { seat: SEAT }),
      front_door: mark(-0.85, 0.2, 0, 'front_door', 'front passenger door; entrance only', { seat: SEAT }),
    },
    wides: [
      { label: 'Windshield · Front seats', pos: v3(0, 1.3, 2.35), target: v3(0, 1.12, 0.15), fov: 30 },
      // Roof rig behind the mirror, looking back: the only angle that clears the front row for both rear side seats.
      { label: 'Cabin · Full car', pos: v3(0, 1.5, 0.65), target: v3(0, 1.06, -0.55), fov: 68 },
      { label: 'Back seat · Three-shot', pos: v3(0, 1.36, -0.38), target: v3(0, 1.1, -1.25), fov: 70 },
      { label: 'Passenger-side windshield', pos: v3(-0.3, 1.35, 2.5), target: v3(0, 1.12, 0.1), fov: 30 },
    ],
    dialogueCameras: [v3(-0.53, 1.31, 1.7), v3(0.53, 1.31, 1.7), v3(0, 1.33, 2.35), v3(0, 1.28, -0.39), v3(-0.66, 1.28, -0.39), v3(0.66, 1.28, -0.39)],
    cameraBounds: new THREE.Box3(v3(-0.94, 0.85, REAR + 0.1), v3(0.94, ROOF - 0.1, 2.65)),
    ambience: 'car', doorSound: 'car', seated: true, background: [], reserved: ['driver', 'front_door', 'door'],
    setTime(t) {
      const night = t === 'night'; drive.setNight(night);
      hemi.color.set(night ? '#a4b6d3' : '#e0e9ef'); hemi.intensity = night ? 1.3 : 2.5;
      fill.intensity = night ? 2.2 : 2.8; backFill.intensity = night ? 1.1 : 1.3;
    },
    update(dt) { drive.update(dt); },
  };
}
