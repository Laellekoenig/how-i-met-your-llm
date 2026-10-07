import * as THREE from 'three';
import { box, cyl, mesh, roundedBox, toon } from '../../engine/materials';
import { brick, plaid, poster, rug, street } from '../../engine/textures';
import { door, keyLight, mark, nodes, type StageSet, v3, window_ } from './common';
import { chair, label, mug } from './furnishings';
import { interior, table } from './interior';

/** College, 1996: metal bunks, plaid blankets, gig flyers, a CRT and cassette stereo. */
export function buildWesleyanDorm(): StageSet {
  const g = new THREE.Group(); g.name = 'wesleyan_dorm';
  const cream = toon('#ffffff', { map: brick('#d4cab2', '#bdb59f', [9, 4]) });
  const steel = toon('#47484c'), oak = toon('#a27a4c');
  interior(g, 10, 7, 3.3, toon('#706c63'), cream, '#c4bca8');
  const day = toon('#ffffff', { map: street(false, 196), emissive: '#eee4b6', emissiveIntensity: 0.25 });
  const night = toon('#ffffff', { map: street(true, 196), emissive: '#758aa9', emissiveIntensity: 0.25 });
  const pane = window_(g, 0, 2.04, -3.43, 1.8, 1.65, day, '#77684f', 0, 1);
  for (const x of [-1.08, 1.08]) g.add(mesh(box(0.35, 1.95, 0.14), toon('#7c4438'), x, 1.96, -3.3));
  for (let i = 0; i < 11; i++) g.add(mesh(box(0.1, 0.54, 0.21), toon('#b4b1a1'), -0.72 + i * 0.14, 0.32, -3.15));
  // (hinged by the corner, so it opens against the side wall)
  const front = door(g, 4.3, -3.43, 0, '#937444', { hinge: 1 });
  label(front.leaf, '212', -front.hinge * 0.525, 1.92, 0.03, 0.38, 0.2, '#fff0c7', '#6c4b31');
  label(g, 'WESLEYAN', -2.75, 2.91, -3.37, 2.6, 0.35, '#fff3d0', '#982d34', 'bold 68px Georgia');
  label(g, 'COLLEGE RADIO  /  88.1 FM', 2.34, 2.73, -3.36, 1.42, 0.3, '#171d29', '#dab65d');
  label(g, 'FALL 1996', 2.34, 2.41, -3.35, 1.42, 0.28, '#e8e0c5', '#364b54');

  // The lower bunk doubles as a sofa; nothing hangs over its seated actors' heads.
  const bedX = -2.95, bedZ = -2.53;
  for (const x of [bedX - 1.48, bedX + 1.48]) for (const z of [bedZ - 0.51, bedZ + 0.51])
    g.add(mesh(cyl(0.033, 0.033, 2.58), steel, x, 1.29, z));
  for (const y of [0.44, 1.98]) {
    g.add(mesh(box(3.0, 0.12, 1.05), steel, bedX, y - 0.05, bedZ));
    g.add(mesh(roundedBox(2.91, 0.17, 1.03, 0.04), toon('#e0d4b4'), bedX, y + 0.09, bedZ));
    g.add(mesh(box(2.36, 0.025, 1.07), toon('#ffffff', { map: plaid('#476a62', '#a99366', '#243c42') }), bedX + 0.24, y + 0.19, bedZ));
    g.add(mesh(roundedBox(0.47, 0.12, 0.75, 0.04), toon('#d9c9a7'), bedX - 1.15, y + 0.23, bedZ));
  }
  for (let i = 0; i < 6; i++) g.add(mesh(box(0.4, 0.035, 0.04), steel, -4.4, 0.3 + i * 0.39, -1.97));
  for (const x of [-4.55, -4.25]) g.add(mesh(cyl(0.023, 0.023, 2.48), steel, x, 1.24, -1.97));
  g.add(mesh(box(2.94, 0.035, 0.035), steel, bedX, 2.51, bedZ - 0.5));

  // Study desk and a very pre-laptop computer, clear of the main conversation floor.
  table(g, 2.35, -2.67, 1.8, 0.85);
  g.add(mesh(box(0.65, 0.53, 0.52), toon('#d4cdb4'), 2.28, 1.1, -2.82));
  g.add(mesh(box(0.51, 0.36, 0.02), toon('#283e38', { emissive: '#5c8b69', emissiveIntensity: 0.25 }), 2.28, 1.12, -2.548));
  label(g, 'C:\\> thesis.txt', 2.28, 1.13, -2.531, 0.48, 0.12, '#a8cf9b', '#283e38', '22px monospace');
  g.add(mesh(box(0.64, 0.04, 0.21), toon('#c1baa3'), 2.26, 0.82, -2.31));
  chair(g, 2.35, -1.75, Math.PI, '#706744');
  mug(g, 2.94, 0.8, -2.44, '#9d3d31');
  // Low stereo cabinet and a milk crate full of records.
  g.add(mesh(box(0.88, 0.64, 0.62), oak, 4.36, 0.32, -0.5));
  g.add(mesh(box(0.76, 0.24, 0.35), toon('#303139'), 4.36, 0.77, -0.5));
  for (const x of [4.08, 4.64]) g.add(mesh(new THREE.CircleGeometry(0.085, 12), toon('#151820'), x, 0.79, -0.317));
  label(g, 'MIX 96', 4.36, 0.8, -0.313, 0.26, 0.1, '#bbab70', '#20242a');
  g.add(mesh(box(0.6, 0.36, 0.58), toon('#4c5863'), -4.22, 0.18, 0.15));
  for (let i = 0; i < 8; i++) g.add(mesh(box(0.47, 0.42, 0.025), toon(['#b54a3d', '#d4b668', '#446877'][i % 3]), -4.22, 0.29, -0.05 + i * 0.045));
  const carpet = mesh(new THREE.PlaneGeometry(4.3, 2.8), toon('#ffffff', { map: rug('#8e4339', '#c1aa79', '#3d5958') }), 0, 0.012, 0.6, false).rotateX(-Math.PI / 2); g.add(carpet);
  table(g, -0.5, 0.05, 1.3, 0.67, 0.36, '#876348');
  g.add(mesh(box(0.48, 0.05, 0.35), toon('#dad0b0'), -0.66, 0.43, 0.03));
  label(g, 'PIZZA', -0.66, 0.46, 0.03, 0.36, 0.17, '#a73b30', '#dad0b0').rotateX(-Math.PI / 2);
  for (let i = 0; i < 4; i++) g.add(mesh(box(0.29, 0.055, 0.38), toon(['#39475f', '#ad6949', '#b3a471', '#4e6a56'][i]), 1.03, 0.05 + i * 0.06, 0.12));
  // Flyers on the side wall remain legible in the reverse angles.
  for (const [z, text, color] of [[-0.7, 'BATTLE OF THE BANDS', '#c8a852'], [0.45, 'POETRY NIGHT', '#788d96'], [1.6, 'SAVE THE PLANET', '#778b62']] as const)
    label(g, text, -4.94, 1.94, z, 0.85, 0.66, '#24302b', color).rotateY(Math.PI / 2);
  for (const [z, title, art] of [[-0.6, 'CHICAGO', 'column'], [1.05, 'NASSAU', 'sunset']] as const)
    g.add(mesh(new THREE.PlaneGeometry(0.92, 1.25), toon('#ffffff', { map: poster(title, art) }), 4.94, 2.1, z, false).rotateY(-Math.PI / 2));
  const hemi = new THREE.HemisphereLight('#ead6aa', '#595340', 1.55); g.add(hemi);
  keyLight(g, '#ffe0aa', 2.4, [-2, 5, 4], [0, 0, -1]);
  return {
    id: 'wesleyan_dorm', name: 'Wesleyan Dorm · College, 1996', group: g,
    nodes: nodes({ door: [4.3, -2.7], right: [3.4, -1], desk: [2.35, -1.2], back: [0, -1.4], bed: [-2.7, -1.3], left: [-2.7, 1.2], center: [0, 1.3] }),
    edges: [['door', 'right'], ['right', 'desk'], ['desk', 'back'], ['back', 'bed'], ['bed', 'left'], ['left', 'center'], ['center', 'right']], door: 'door', doors: { door: front },
    marks: {
      bed_left: mark(-3.6, -2.25, 0.1, 'bed', 'sitting on the lower bunk, left', { seat: 0.58, approach: [-3.6, -1.3] }),
      bed_right: mark(-2.3, -2.25, 0.1, 'bed', 'sitting on the lower bunk, right', { seat: 0.58, approach: [-2.3, -1.3] }),
      desk: mark(2.35, -1.81, Math.PI, 'desk', 'at the beige CRT computer', { seat: 0.49, approach: [2.35, -1.2] }),
      center: mark(-0.5, 1.3, 0, 'center', 'on the rug beside the pizza table'),
      roommate: mark(1.15, 1.2, -0.45, 'center', 'beside the textbooks on the rug'),
      stereo: mark(3.35, -0.35, -0.4, 'right', 'next to the cassette stereo'),
      door: mark(4.3, -2.95, 0, 'door', 'dorm room doorway'),
    },
    maxTwoShotDistance: 6.5,
    wides: [
      { pos: v3(0, 2.05, 5.8), target: v3(0, 1.35, -1.4), fov: 49 },
      { pos: v3(-1.7, 1.65, 2.4), target: v3(-2.85, 1.2, -2.2), fov: 48 },
      { pos: v3(0.2, 1.9, 1.1), target: v3(3, 1.35, -1.9), fov: 54 },
    ], ambience: 'apartment', background: [], doorSound: 'none',
    setTime(t) { pane.material = t === 'day' ? day : night; hemi.intensity = t === 'day' ? 1.55 : 1.1; },
  };
}
