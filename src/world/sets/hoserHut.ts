import * as THREE from 'three';
import { box, cyl, mesh, toon } from '../../engine/materials';
import { brick, planks } from '../../engine/textures';
import { bottles, door, frame, keyLight, mark, nodes, pendant, type StageSet, v3 } from './common';
import { label } from './furnishings';
import { interior, table } from './interior';
import { beer, mapleFlag, rod, roundSeat, roundTable, sconce } from './venueDetails';

/** Little Minnesota / Duel Citizenship: a Canadian neighbourhood pub, not a second MacLaren's. */
export function buildHoserHut(): StageSet {
  const g = new THREE.Group(); g.name = 'hoser_hut';
  const timber = toon('#39281f'), brickwork = toon('#ffffff', { map: brick('#6e4b40', '#453a33', [8, 3]) });
  interior(g, 14, 10, 3.65, toon('#ffffff', { map: planks('#735641', [5, 5]) }), brickwork, '#302a25');
  for (const y of [0.14, 1.18, 3.3]) g.add(mesh(box(14, .14, .13), timber, 0, y, -4.88));
  for (const x of [-6.8, -3.5, .9, 4.3, 6.8]) g.add(mesh(box(.18, 3.4, .16), timber, x, 1.7, -4.86));
  // Left-hand bar, black iron stools, and the bottle shelves visible in the episode.
  g.add(mesh(box(1.05, 1.0, 5.1), toon('#563727'), -5.45, .5, -1.55));
  g.add(mesh(box(1.25, .11, 5.3), timber, -5.45, 1.04, -1.55));
  for (const z of [-3.4, -2.0, -.6]) { roundSeat(g, -4.35, z, -Math.PI / 2, .73, false); beer(g, -4.95, 1.1, z + .1); }
  for (const y of [.75, 1.65, 2.48]) {
    g.add(mesh(box(.35, .075, 4.8), timber, -6.72, y, -1.8));
    for (let i = 0; i < 8; i++) bottles(g, -6.67, y + .04, -3.9 + i * .58, 1, .2, 0, i + 3);
  }
  for (const z of [-3.0, -.4]) pendant(g, -5.4, 2.72, z, '#614d30', { color: '#ffce90', intensity: 2, distance: 5 });
  // Maple leaves, hockey sweaters, stick rack and mounted antlers distinguish Robin's refuge.
  mapleFlag(g, -.25, 2.48, -4.77, 1.35);
  for (const [x, color, number] of [[-2.6, '#263e65', '16'], [2.8, '#d9c6ac', '99']] as const) {
    frame(g, x, 2.23, -4.78, 1.25, 1.7, 25, 0, '#2d231d');
    g.add(mesh(box(.62, .94, .03), toon(color), x, 2.23, -4.73));
    for (const dx of [-.42, .42]) g.add(mesh(box(.27, .65, .04), toon(color), x + dx, 2.43, -4.71).rotateZ(-Math.sign(dx) * .4));
    label(g, number, x, 2.25, -4.69, .42, .3, '#eee4cb', color);
    label(g, x < 0 ? 'VANCOUVER' : 'CANADA', x, 1.65, -4.68, 1.03, .17, '#d4c9a8', '#2c2723');
  }
  const deer = new THREE.Group(); deer.position.set(-4.8, 2.72, -4.63);
  deer.add(mesh(new THREE.IcosahedronGeometry(.25, 0), toon('#977957'), 0, -.07, .06));
  deer.add(mesh(cyl(.08, .15, .35, 6), toon('#775437'), 0, -.24, .15).rotateX(.5));
  for (const s of [-1, 1]) {
    rod(deer, v3(s * .1, .05, 0), v3(s * .5, .48, 0), .025, toon('#c5b496'));
    for (let i = 0; i < 3; i++) rod(deer, v3(s * (.19 + i * .11), .14 + i * .12, 0), v3(s * (.13 + i * .11), .37 + i * .13, .04), .02, toon('#c5b496'));
  }
  g.add(deer);
  door(g, 5.6, -4.85, 0, '#483027', { frameColor: '#28231e' });
  label(g, 'THE HOSER HUT', 5.6, 2.7, -4.68, 2.1, .34, '#f2d899', '#314d3b');
  label(g, 'BEER', 3.4, 3.04, -4.69, 1.1, .27, '#96d99d', '#263a2c');
  for (const x of [-1.4, 3.3]) {
    table(g, x, -1.4, 1.35, 1.0, .74, '#3c2b24');
    roundSeat(g, x - 1, -1.4, Math.PI / 2); roundSeat(g, x + 1, -1.4, -Math.PI / 2);
    beer(g, x - .3, .78, -1.3); beer(g, x + .3, .78, -1.5);
  }
  // Small foreground tables and hanging lamps give the room the pub's intimate scale.
  for (const x of [-3.1, 3.3]) {
    roundTable(g, x, 3.5, .53, .74, '#463027');
    roundSeat(g, x - .8, 3.5, Math.PI / 2); roundSeat(g, x + .8, 3.5, -Math.PI / 2);
    beer(g, x, .77, 3.5);
  }
  for (const z of [-1.8, 2.7]) {
    g.add(mesh(box(14,.18,.22),timber,0,3.38,z));
    for (const x of [-2, 2.7]) pendant(g,x,2.72,z,'#405243',{color:'#ecd1a6',intensity:1.2,distance:5});
  }
  for (const side of [-1,1]) for (const z of [-2,1.5,4.7]) frame(g,side*6.91,2.08,z,1.05,.8,23,side<0?Math.PI/2:-Math.PI/2);
  // Karaoke corner (Glitter), with a low microphone and Canadian beer posters.
  g.add(mesh(box(.6, .8, .45), toon('#222622'), 5.9, .4, .3));
  for (const y of [.23, .59]) g.add(mesh(new THREE.CircleGeometry(.16, 12), toon('#4c4e48'), 5.9, y, .54));
  g.add(mesh(cyl(.017, .017, 1.45, 8), toon('#999483'), 5.0, .725, .9));
  g.add(mesh(cyl(.22, .25, .045, 12), toon('#252b26'), 5, .025, .9));
  g.add(mesh(new THREE.SphereGeometry(.055, 8, 6), toon('#a5a294'), 5, 1.48, .9));
  for (const x of [-3.8, 0, 3.8]) {
    const p = label(g, x === 0 ? 'O CANADA' : x < 0 ? 'HOCKEY NIGHT' : 'KARAOKE • THURSDAYS', x, 2.05, 6.76, 2.3, .65, '#e5d9ba', '#3f4b35').rotateY(Math.PI);
    p.userData.cameraBackdrop = true;
  }
  for (const x of [-3.4, 4.3]) sconce(g, x, 2.6, -4.71);
  g.add(new THREE.HemisphereLight('#e4d7bc', '#58413a', 1.45));
  keyLight(g, '#f9e9d1', 2.3, [-2, 6, 6], [0, 1, -2]);
  const green = new THREE.PointLight('#5fbd78', 1.5, 5); green.position.set(3.3, 2.8, -4); g.add(green);
  // A connected aisle around the tables and around the open end of the bar.
  return {
    id: 'hoser_hut', name: 'The Hoser Hut', group: g,
    nodes: nodes({ door: [5.6,-3.8], back: [0,-3.25], bar: [-3.65,-3.25], bar_front: [-3.65,1.6], front: [0,1.6], right: [4.9,1.6], bartender: [-6.2,1.6], behind: [-6.2,-1.7] }),
    edges: [['door','back'],['back','bar'],['bar','bar_front'],['bar_front','front'],['front','right'],['right','door'],['bar_front','bartender'],['bartender','behind']], door: 'door',
    marks: {
      table_left: mark(-2.4,-1.4,Math.PI/2,'front','Robin’s table, left chair',{seat:.49,approach:[-2.4,.1]}),
      table_right: mark(-.4,-1.4,-Math.PI/2,'front','across the small wooden table',{seat:.49,approach:[-.4,.1]}),
      friend: mark(.2,.6,-.6,'front','standing beside Robin’s table'),
      bar_stool: mark(-4.35,-2,-Math.PI/2,'bar','red stool at the left-hand bar',{seat:.73,approach:[-3.65,-2]}),
      bar_friend: mark(-4.35,-.6,-Math.PI/2,'bar_front','next red bar stool',{seat:.73,approach:[-3.65,-.6]}),
      bartender: mark(-6.2,-1.7,Math.PI/2,'behind','behind the Canadian beer taps'),
      patron_left: mark(2.3,-1.4,Math.PI/2,'front','second table',{seat:.49,approach:[2.3,.1]}),
      patron_right: mark(4.3,-1.4,-Math.PI/2,'right','second table, opposite seat',{seat:.49,approach:[4.3,.1]}),
      karaoke: mark(5,1.4,0,'right','at the karaoke microphone'),
      door: mark(5.6,-3.8,0,'door','coming into the Hoser Hut'),
    },
    wides: [{pos:v3(.3,2.3,8.0),target:v3(-.1,1.2,-1.9),fov:57},{pos:v3(-.6,1.9,4.2),target:v3(-1.7,1.15,-1.8),fov:53},{pos:v3(-.5,2,-3.4),target:v3(.5,1.25,0),fov:56}],
    ambience:'bar',background:[],reserved:['bartender'],maxTwoShotDistance:5, setTime() {},
  };
}
