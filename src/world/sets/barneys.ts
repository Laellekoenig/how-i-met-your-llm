import * as THREE from 'three';
import { toon, glow, box, mesh, roundedBox, cyl, occluder } from '../../engine/materials';
import { planks, skyline, sign, tvScreen } from '../../engine/textures';
import { type StageSet, mark, nodes, room, band, door, couch, bottles, keyLight, window_, v3 } from './common';

/** Barney's bachelor pad: dark, sleek, a TV the size of a wall. */
export function buildBarneys(): StageSet {
  const g = new THREE.Group();
  g.name = 'barneys';
  const W = 11, D = 8, H = 3.4;
  room(g, {
    w: W, d: D, h: H,
    floor: toon('#ffffff', { map: planks('#2c2a2e', [7, 5], 13) }),
    back: toon('#2b2e36'),
    left: toon('#23262c'),
    right: toon('#2b2e36'),
    ceiling: '#141519',
  });
  band(g, toon('#111216'), 0, -D / 2 + 0.03, W, 0.1);

  // floor-to-ceiling windows
  const night = toon('#ffffff', { map: skyline(true, 77), emissive: '#ffffff', emissiveIntensity: 0.7 });
  const day = toon('#ffffff', { map: skyline(false, 77), emissive: '#ffffff', emissiveIntensity: 0.7 });
  const pane = window_(g, -0.4, 1.75, -D / 2 + 0.02, 5.4, 2.7, night, '#15161a', 0, 4);

  // white leather couch + glass table
  couch(g, -0.2, -2.9, 2.4, '#ecebe6', '#111');
  g.add(occluder(mesh(roundedBox(1.3, 0.04, 0.7, 0.01), toon('#9fb4c0', { emissive: '#203038', emissiveIntensity: 0.4 }), -0.2, 0.4, -1.65)));
  g.add(mesh(box(1.1, 0.36, 0.05), toon('#111'), -0.2, 0.19, -1.65));
  // the playbook
  g.add(mesh(box(0.22, 0.04, 0.3), toon('#7a1e1e'), 0.1, 0.44, -1.6, false));

  // giant TV on the left wall
  g.add(mesh(box(0.08, 1.5, 2.7), toon('#0c0c0e'), -5.45, 1.6, -1.6));
  const screen = mesh(new THREE.PlaneGeometry(2.55, 1.38), new THREE.MeshBasicMaterial({ map: tvScreen() }), -5.4, 1.6, -1.6, false);
  screen.rotation.y = Math.PI / 2;
  g.add(screen);
  const tvGlow = new THREE.PointLight('#5ab0ff', 3, 5, 1.4);
  tvGlow.position.set(-4.8, 1.6, -1.6);
  g.add(tvGlow);
  g.add(occluder(mesh(box(0.5, 0.4, 2.2), toon('#16171b'), -5.2, 0.2, -1.6)));

  // home bar on the right
  g.add(occluder(mesh(box(1.6, 1.0, 0.5), toon('#16171b'), 3.6, 0.5, -3.65)));
  g.add(mesh(box(1.65, 0.04, 0.55), toon('#c9c9cf'), 3.6, 1.02, -3.65));
  bottles(g, 3.0, 1.04, -3.65, 6, 0.24, 0, 99);
  g.add(mesh(box(1.6, 0.04, 0.3), toon('#1a1b20'), 3.6, 1.8, -3.82, false));
  bottles(g, 3.0, 1.82, -3.82, 7, 0.2, 0, 42);

  // framed "SUIT UP" poster + a white armored statue
  const poster = mesh(new THREE.PlaneGeometry(1.0, 0.6), new THREE.MeshBasicMaterial({ map: sign('SUIT UP', '#f2f2f2', '#7a1e1e', 128, 64, 'bold 30px Georgia') }), 4.4, 2.55, -3.97, false);
  g.add(poster);
  g.add(mesh(box(1.08, 0.68, 0.03), toon('#c9a227'), 4.4, 2.55, -3.99, false));
  const statue = new THREE.Group();
  const white = toon('#f2f2f2');
  const black = toon('#151515');
  statue.add(mesh(roundedBox(0.32, 0.5, 0.2, 0.04), white, 0, 1.25, 0));
  statue.add(mesh(roundedBox(0.24, 0.26, 0.24, 0.05), white, 0, 1.65, 0));
  statue.add(mesh(box(0.18, 0.05, 0.02), black, 0, 1.68, 0.12, false));
  for (const s of [1, -1]) {
    statue.add(mesh(roundedBox(0.11, 0.5, 0.11, 0.03), white, s * 0.22, 1.2, 0));
    statue.add(mesh(roundedBox(0.13, 0.95, 0.13, 0.03), white, s * 0.09, 0.48, 0));
  }
  statue.add(mesh(box(0.34, 0.08, 0.22), black, 0, 1.0, 0));
  statue.position.set(-3.2, 0, -3.5);
  statue.rotation.y = 0.5;
  g.add(statue);

  // front door
  door(g, W / 2 - 0.02, -0.6, -Math.PI / 2, '#16171b', { frameColor: '#0d0d10' });

  // lights: cool, moody, recessed
  const hemi = new THREE.HemisphereLight('#c8d4ff', '#1a1a22', 1.0);
  g.add(hemi);
  const key = keyLight(g, '#eef2ff', 1.6, [1, 7, 7], [0, 0, -2]);
  for (const x of [-2.5, 0, 2.5]) {
    g.add(mesh(cyl(0.12, 0.12, 0.02, 8), glow('#fff2d6', 1.4), x, H - 0.01, -2.0, false));
    const l = new THREE.PointLight('#ffe6c0', 3, 5, 1.4);
    l.position.set(x, 2.9, -2.0);
    g.add(l);
  }
  const strip = mesh(box(1.6, 0.02, 0.02), glow('#a070ff', 1.5), 3.6, 0.03, -3.38, false);
  g.add(strip);

  const N = nodes({
    center: [0, -0.8], couch_l: [-1.8, -2.2], couch_r: [1.5, -2.2], door: [4.1, -0.6], tv: [-3.3, -1.0], bar: [2.8, -2.4],
  });

  return {
    id: 'barneys',
    name: "Barney's Apartment",
    group: g,
    nodes: N,
    edges: [['center', 'couch_l'], ['center', 'couch_r'], ['couch_l', 'couch_r'], ['center', 'door'], ['center', 'tv'], ['tv', 'couch_l'], ['couch_r', 'bar'], ['bar', 'door']],
    door: 'door',
    marks: {
      couch_left: mark(-0.75, -2.8, 0, 'couch_l', 'white leather couch, left', { seat: 0.45, approach: [-0.75, -2.2] }),
      couch_right: mark(0.35, -2.8, 0, 'couch_r', 'white leather couch, right', { seat: 0.45, approach: [0.35, -2.2] }),
      bar_cart: mark(3.2, -3.0, 0.4, 'bar', 'at the home bar pouring scotch'),
      tv: mark(-3.9, -1.2, -1.0, 'tv', 'by the giant TV'),
      window: mark(-1.9, -3.45, Math.PI - 0.3, 'couch_l', 'by the floor-to-ceiling windows'),
      center: mark(0.9, -1.0, 0, 'center', 'middle of the room'),
      door: mark(4.8, -0.6, -Math.PI / 2, 'door', 'the front door'),
    },
    wides: [
      { pos: v3(0, 1.75, 5.8), target: v3(-0.3, 1.1, -2.0), fov: 46 },
      { pos: v3(0.8, 1.4, 2.2), target: v3(-0.2, 0.95, -2.9), fov: 46 },
      { pos: v3(-1.2, 1.6, 2.4), target: v3(3.2, 1.1, -2.6), fov: 46 },
    ],
    ambience: 'penthouse',
    background: [],
    setTime(t) {
      pane.material = t === 'night' ? night : day;
      hemi.intensity = t === 'night' ? 1.4 : 2.0;
      key.intensity = t === 'night' ? 1.4 : 2.2;
    },
  };
}
