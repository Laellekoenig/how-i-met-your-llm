import * as THREE from 'three';
import { toon, glow, box, mesh, roundedBox, cyl, occluder } from '../../engine/materials';
import { speckle, tiles, sign, whiteboard, monitorScreen, blindsWindow, painting } from '../../engine/textures';
import { type StageSet, mark, nodes, door, plant, keyLight, v3 } from './common';

// A generic open-plan office, good for any of the gang's jobs (Marshall's law firm, Ted's architecture
// firm, a newsroom, a temp job). Grey-blue carpet, a drop ceiling of fluorescent panels, beige walls.
// Stage left, a row of three cubicles whose occupants swivel round to face the room; stage right,
// the meeting table with a whiteboard on the wall. Along the back: blinds, the water cooler, the
// copier and the elevator people arrive by. The manager's door is on the left wall.
export function buildOffice(): StageSet {
  const g = new THREE.Group();
  g.name = 'office';
  const H = 2.9;
  const LEFT = -7, RIGHT = 7, BACK = -4.2, FRONT = 4.5;

  const wall = toon('#d8ceb8');
  const fabric = toon('#6a7480');
  const fabricDark = toon('#4e565e');
  const laminate = toon('#c8b89a');
  const black = toon('#1c1c1e');
  const grey = toon('#9a9a9a');

  // ---- shell -------------------------------------------------------------------------------
  const floor = mesh(new THREE.PlaneGeometry(RIGHT - LEFT, FRONT - BACK), toon('#ffffff', { map: speckle('#5a6878', [10, 7], 53, 0.18) }), 0, 0, (FRONT + BACK) / 2);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  g.add(floor);
  const ceil = mesh(new THREE.PlaneGeometry(RIGHT - LEFT, FRONT - BACK), toon('#ffffff', { map: tiles('#d0ccc4', '#8e8a82', [14, 9]) }), 0, H, (FRONT + BACK) / 2, false);
  ceil.rotation.x = Math.PI / 2;
  g.add(ceil);
  g.add(mesh(new THREE.PlaneGeometry(RIGHT - LEFT, H), wall, 0, H / 2, BACK, false));
  for (const [x, rot] of [[LEFT, Math.PI / 2], [RIGHT, -Math.PI / 2]] as const) {
    const w = mesh(new THREE.PlaneGeometry(FRONT - BACK, H), wall, x, H / 2, (FRONT + BACK) / 2, false);
    w.rotation.y = rot;
    g.add(w);
  }
  // baseboards
  g.add(mesh(box(RIGHT - LEFT, 0.1, 0.02), toon('#4a4a4a'), 0, 0.05, BACK + 0.01, false));
  for (const x of [LEFT + 0.01, RIGHT - 0.01]) g.add(mesh(box(0.02, 0.1, FRONT - BACK), toon('#4a4a4a'), x, 0.05, (FRONT + BACK) / 2, false));
  // fluorescent panels
  const tube = glow('#f4f8ff', 1.25);
  for (const x of [-4.5, -1.5, 1.5, 4.5]) for (const z of [-2.4, 0.6]) g.add(mesh(box(1.2, 0.02, 0.6), tube, x, H - 0.01, z, false));

  // ---- back wall: windows with blinds, water cooler, copier, clock, elevator ------------------------
  const blindsNight = toon('#ffffff', { map: blindsWindow(true, 5), emissive: '#ffffff', emissiveIntensity: 0.4 });
  const blindsDay = toon('#ffffff', { map: blindsWindow(false, 5), emissive: '#ffffff', emissiveIntensity: 0.6 });
  const panes: THREE.Mesh[] = [];
  for (const x of [-5.6, -4.1, -2.6]) {
    const p = mesh(new THREE.PlaneGeometry(1.2, 1.5), blindsNight, x, 1.75, BACK + 0.01, false);
    g.add(p);
    panes.push(p);
    g.add(mesh(box(1.3, 0.06, 0.08), toon('#e8e4dc'), x, 0.98, BACK + 0.04, false));
    g.add(mesh(box(1.3, 0.04, 0.04), toon('#e8e4dc'), x, 2.52, BACK + 0.02, false));
  }
  // the water cooler
  const WCX = -0.9;
  g.add(mesh(box(0.34, 0.95, 0.34), toon('#e8e8e4'), WCX, 0.475, BACK + 0.3));
  g.add(mesh(cyl(0.15, 0.15, 0.45, 10), toon('#8ac0e8', { emissive: '#204060', emissiveIntensity: 0.4 }), WCX, 1.2, BACK + 0.3, false));
  g.add(mesh(cyl(0.06, 0.15, 0.06, 10), toon('#8ac0e8', { emissive: '#204060', emissiveIntensity: 0.4 }), WCX, 0.98, BACK + 0.3, false));
  for (const [dx, c] of [[-0.06, '#3a6ad8'], [0.06, '#d83a3a']] as const) g.add(mesh(box(0.03, 0.04, 0.04), toon(c), WCX + dx, 0.78, BACK + 0.48, false));
  g.add(mesh(cyl(0.04, 0.04, 0.3, 6), toon('#f0f0f0'), WCX + 0.25, 0.85, BACK + 0.2, false)); // paper cups
  // the copier
  const CPX = 1.2;
  g.add(occluder(mesh(roundedBox(0.95, 0.95, 0.7, 0.03), toon('#d8d6d0'), CPX, 0.475, BACK + 0.45)));
  g.add(mesh(box(0.9, 0.08, 0.6), toon('#3a3a3c'), CPX, 1.0, BACK + 0.42, false));
  g.add(mesh(box(0.3, 0.12, 0.04), toon('#2a3a2a', { emissive: '#3aa05a', emissiveIntensity: 0.6 }), CPX + 0.25, 0.9, BACK + 0.81, false));
  g.add(mesh(box(0.35, 0.04, 0.3), toon('#f4f4f0'), CPX - 0.6, 0.72, BACK + 0.45, false)); // output tray
  for (let i = 0; i < 4; i++) g.add(mesh(box(0.9, 0.015, 0.02), grey, CPX, 0.2 + i * 0.16, BACK + 0.81, false));
  // a clock and a corkboard
  g.add(mesh(cyl(0.18, 0.18, 0.03, 12).rotateX(Math.PI / 2), toon('#f4f4f0'), 0.1, 2.35, BACK + 0.02, false));
  g.add(mesh(box(0.012, 0.13, 0.01), black, 0.1, 2.39, BACK + 0.04, false).rotateZ(0.6));
  g.add(mesh(box(0.012, 0.09, 0.01), black, 0.1, 2.37, BACK + 0.04, false).rotateZ(-1.4));
  g.add(mesh(box(1.1, 0.75, 0.03), toon('#b08a5a'), 2.6, 1.6, BACK + 0.02, false));
  for (const [x, y, c] of [[2.3, 1.75, '#f4f0a0'], [2.65, 1.5, '#f4f4f0'], [2.9, 1.8, '#f0b0c8'], [2.45, 1.38, '#a0d0f0']] as const)
    g.add(mesh(box(0.22, 0.24, 0.005), toon(c), x, y, BACK + 0.04, false).rotateZ((x - 2.6) * 0.2));
  // the elevator
  const EX = 4.7;
  const steel = toon('#a8acb0');
  g.add(mesh(box(1.5, 2.35, 0.08), toon('#5a5e62'), EX, 1.175, BACK + 0.02, false));
  const leftDoor = mesh(box(0.6, 2.15, 0.04), steel, EX - 0.31, 1.075, BACK + 0.07, false);
  const rightDoor = mesh(box(0.6, 2.15, 0.04), steel, EX + 0.31, 1.075, BACK + 0.07, false);
  g.add(leftDoor, rightDoor);
  g.add(mesh(box(0.6, 0.12, 0.03), toon('#1a1a1a', { emissive: '#d8a030', emissiveIntensity: 0.6 }), EX, 2.48, BACK + 0.03, false));
  g.add(mesh(box(0.1, 0.22, 0.03), steel, EX + 0.95, 1.2, BACK + 0.03, false));
  g.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), glow('#ffcf6a', 1.3), EX + 0.95, 1.25, BACK + 0.05, false));
  // a framed "company" print and a plant
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), new THREE.MeshBasicMaterial({ map: sign('Suite 2400', '#2a2a2e', '#d8ceb8', 128, 32, 'bold 18px Helvetica') }));
  logo.position.set(EX, 2.72, BACK + 0.02);
  g.add(logo);
  plant(g, 6.4, BACK + 0.45, 1.6);

  // ---- left: the manager's door, filing cabinets ---------------------------------------------------
  door(g, LEFT + 0.02, 1.2, Math.PI / 2, '#8a6a4a', { frameColor: '#e8e4dc' });
  const mgr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.12), new THREE.MeshBasicMaterial({ map: sign('MANAGER', '#e8e4dc', '#2a2a2e', 96, 24, 'bold 14px Helvetica') }));
  mgr.position.set(LEFT + 0.04, 1.65, 1.2);
  mgr.rotation.y = Math.PI / 2;
  g.add(mgr);
  for (const z of [2.6, 3.1]) {
    g.add(mesh(box(0.6, 1.3, 0.48), toon('#8a8e92'), LEFT + 0.32, 0.65, z));
    for (let i = 0; i < 4; i++) g.add(mesh(box(0.02, 0.03, 0.14), black, LEFT + 0.63, 0.25 + i * 0.3, z, false));
  }
  g.add(mesh(box(0.6, 1.0, 0.04), toon('#ffffff', { map: painting(97) }), LEFT + 0.03, 1.8, -1.8, false).rotateY(Math.PI / 2));

  // ---- the cubicles -------------------------------------------------------------------------------
  const CUB_W = 1.75, CUB_D = 1.6, PART_H = 1.3, CUB_BACK = -2.35;
  const CUBES = [-5.1, -3.35, -1.6];
  /** Fabric partition panel with an aluminium cap. */
  const panel = (x: number, z: number, len: number, rotY: number) => {
    const p = new THREE.Group();
    p.position.set(x, 0, z);
    p.rotation.y = rotY;
    p.add(occluder(mesh(box(len, PART_H, 0.06), fabric, 0, PART_H / 2, 0)));
    p.add(mesh(box(len, 0.03, 0.08), grey, 0, PART_H + 0.015, 0, false));
    g.add(p);
  };
  panel((CUBES[0] + CUBES[2]) / 2, CUB_BACK, CUB_W * 3, 0);
  for (let i = 0; i <= 3; i++) panel(CUBES[0] - CUB_W / 2 + i * CUB_W, CUB_BACK + CUB_D / 2, CUB_D, Math.PI / 2);
  const chairs: THREE.Group[] = [];
  CUBES.forEach((x, i) => {
    // desk along the back panel
    g.add(mesh(box(CUB_W - 0.12, 0.04, 0.65), laminate, x, 0.74, CUB_BACK + 0.37));
    g.add(mesh(box(0.45, 0.7, 0.6), fabricDark, x + CUB_W / 2 - 0.32, 0.36, CUB_BACK + 0.37, false));
    // monitor, keyboard, a mug, papers
    const mx = x - 0.25 + (i % 2) * 0.3;
    g.add(mesh(box(0.48, 0.32, 0.04), black, mx, 1.0, CUB_BACK + 0.24, false));
    g.add(mesh(new THREE.PlaneGeometry(0.43, 0.27), toon('#ffffff', { map: monitorScreen(90 + i), emissive: '#ffffff', emissiveIntensity: 0.6 }), mx, 1.0, CUB_BACK + 0.265, false));
    g.add(mesh(box(0.05, 0.1, 0.05), black, mx, 0.8, CUB_BACK + 0.22, false));
    g.add(mesh(box(0.42, 0.02, 0.14), toon('#3a3a3c'), mx, 0.77, CUB_BACK + 0.5, false));
    g.add(mesh(cyl(0.04, 0.035, 0.1, 8), toon(['#c83a2a', '#f0f0ec', '#2a5aa8'][i]), x + 0.55, 0.81, CUB_BACK + 0.5, false));
    g.add(mesh(box(0.22, 0.03, 0.3), toon('#f4f4f0'), x - 0.62, 0.775, CUB_BACK + 0.4, false).rotateY(0.2));
    // a family photo pinned to the partition, a name plate on the end
    g.add(mesh(new THREE.PlaneGeometry(0.16, 0.12), toon('#ffffff', { map: painting(110 + i) }), x - 0.2, 1.15, CUB_BACK + 0.035, false));
    // swivel chair, turned to face the room
    const c = new THREE.Group();
    c.position.set(x, 0, CUB_BACK + 1.05);
    c.rotation.y = 0.15 * (i - 1);
    c.add(mesh(roundedBox(0.5, 0.08, 0.48, 0.03), black, 0, 0.46, 0));
    c.add(mesh(roundedBox(0.46, 0.5, 0.06, 0.03), black, 0, 0.78, -0.25));
    c.add(mesh(cyl(0.03, 0.03, 0.36, 6), grey, 0, 0.25, 0, false));
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      c.add(mesh(box(0.04, 0.03, 0.28), grey, Math.sin(a) * 0.13, 0.05, Math.cos(a) * 0.13, false).rotateY(a));
    }
    g.add(c);
    chairs.push(c);
  });

  // ---- the meeting table, whiteboard -----------------------------------------------------------------
  const TX = 3.2, TZ = -0.6, TL = 2.6, TW = 1.1;
  g.add(occluder(mesh(roundedBox(TL, 0.05, TW, 0.02), toon('#5a4030'), TX, 0.74, TZ)));
  for (const s of [-1, 1]) g.add(mesh(box(0.08, 0.72, TW - 0.3), black, TX + s * (TL / 2 - 0.35), 0.36, TZ, false));
  // legal pads, a speakerphone, a box of donuts
  g.add(mesh(cyl(0.16, 0.2, 0.05, 3), black, TX, 0.79, TZ, false));
  g.add(mesh(box(0.42, 0.08, 0.42), toon('#f0e8d8'), TX + 0.75, 0.8, TZ + 0.1, false));
  g.add(mesh(box(0.42, 0.005, 0.42), toon('#e85a8a'), TX + 0.75, 0.845, TZ + 0.1, false));
  for (const [dx, dz] of [[-0.8, -0.3], [-0.2, -0.35], [0.4, -0.3]] as const) g.add(mesh(box(0.2, 0.01, 0.28), toon('#f4e87a'), TX + dx, 0.77, TZ + dz, false));
  /** Stacking chair with a fabric seat, facing local +z. */
  const meetChair = (x: number, z: number, rotY: number) => {
    const c = new THREE.Group();
    c.position.set(x, 0, z);
    c.rotation.y = rotY;
    c.add(mesh(roundedBox(0.46, 0.06, 0.44, 0.02), toon('#3a4a6a'), 0, 0.46, 0));
    c.add(mesh(roundedBox(0.46, 0.38, 0.05, 0.02), toon('#3a4a6a'), 0, 0.76, -0.22));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.add(mesh(box(0.025, 0.46, 0.025), grey, sx * 0.2, 0.23, sz * 0.19, false));
    g.add(c);
  };
  const MEET: [number, number, number][] = [
    [TX - 0.6, TZ - TW / 2 - 0.35, 0], [TX + 0.6, TZ - TW / 2 - 0.35, 0], [TX - TL / 2 - 0.4, TZ + 0.1, Math.PI / 2 - 0.35], [TX + TL / 2 + 0.4, TZ + 0.1, -Math.PI / 2 + 0.35],
  ];
  for (const m of MEET) meetChair(...m);
  const wb = mesh(new THREE.PlaneGeometry(2.0, 1.1), toon('#ffffff', { map: whiteboard(73) }), RIGHT - 0.03, 1.55, -0.3, false);
  wb.rotation.y = -Math.PI / 2;
  g.add(wb);
  g.add(mesh(box(0.04, 1.2, 2.1), toon('#c8ccd0'), RIGHT - 0.02, 1.55, -0.3, false));
  g.add(mesh(box(0.1, 0.03, 1.2), toon('#c8ccd0'), RIGHT - 0.06, 0.98, -0.3, false));

  // ---- lights ------------------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight('#f0f4ff', '#4a4a48', 1.6);
  g.add(hemi);
  keyLight(g, '#f8fbff', 1.7, [1, 7, 7], [-0.5, 0, -1.5]);
  for (const [x, z] of [[-3.3, -0.6], [3.2, -0.6], [0, 1.5]] as const) {
    const l = new THREE.PointLight('#eef4ff', 2.6, 6, 1.3);
    l.position.set(x, H - 0.3, z);
    g.add(l);
  }

  const N = nodes({
    door: [EX, BACK + 0.6], back_r: [3.2, -2.6], back: [0.2, -2.9], cube_front: [-3.35, -0.2], center: [0.3, 0.3], front: [0, 2.2],
    table: [3.2, 0.6], table_r: [5.6, -0.4], table_l: [1.2, -0.5], mgr: [-6.2, 1.2], cooler: [-0.6, -3.2],
  });
  const cubeMark = (i: number, hint: string) =>
    mark(CUBES[i], CUB_BACK + 1.0, 0.15 * (i - 1), 'cube_front', hint, { seat: 0.47, approach: [CUBES[i], CUB_BACK + 1.6] });
  const meetMark = (i: number, hint: string, approach: [number, number]) => {
    const [x, z, r] = MEET[i];
    return mark(x + Math.sin(r) * 0.05, z + Math.cos(r) * 0.05, r, i < 2 ? 'back_r' : i === 2 ? 'table_l' : 'table_r', hint, { seat: 0.47, approach });
  };
  return {
    id: 'office',
    name: 'The Office',
    group: g,
    nodes: N,
    edges: [
      ['door', 'back_r'], ['door', 'back'], ['back', 'cooler'], ['back', 'center'], ['back_r', 'table_l'], ['back_r', 'table_r'], ['table_l', 'center'],
      ['table', 'center'], ['table', 'table_r'], ['table', 'table_l'], ['center', 'front'], ['center', 'cube_front'], ['cube_front', 'mgr'], ['front', 'mgr'],
      ['table', 'front'],
    ],
    door: 'door',
    marks: {
      cubicle_1: cubeMark(0, 'desk chair in the left cubicle, swivelled round to face the room'),
      cubicle_2: cubeMark(1, 'desk chair in the middle cubicle, swivelled round to face the room'),
      cubicle_3: cubeMark(2, 'desk chair in the right cubicle, nearest the water cooler'),
      cubicle_lean: mark(-2.5, -0.55, 0.4, 'cube_front', 'leaning on the end of the cubicle partitions, chatting over them'),
      water_cooler: mark(WCX + 0.15, BACK + 0.85, 0.25, 'cooler', 'at the water cooler (office gossip central)'),
      copier: mark(CPX - 0.2, BACK + 1.15, -0.2, 'back', 'at the copier, which is jammed again'),
      meeting_back_left: meetMark(0, 'meeting table, upstage chair on the left, facing the room', [TX - 0.6, TZ - TW / 2 - 0.85]),
      meeting_back_right: meetMark(1, 'meeting table, upstage chair on the right, facing the room', [TX + 0.6, TZ - TW / 2 - 0.85]),
      meeting_head_left: meetMark(2, 'meeting table, chair at the left end', [TX - TL / 2 - 0.5, TZ + 0.7]),
      meeting_head_right: meetMark(3, 'meeting table, chair at the right end near the whiteboard', [TX + TL / 2 + 0.5, TZ + 0.7]),
      whiteboard: mark(RIGHT - 0.7, 0.6, -Math.PI / 2 + 0.7, 'table_r', 'presenting at the whiteboard on the right wall'),
      managers_door: mark(LEFT + 0.8, 1.2, Math.PI / 2 + 0.3, 'mgr', "outside the manager's office door"),
      center: mark(0.3, 0.3, 0, 'center', 'middle of the office floor'),
      door: mark(EX, BACK + 0.35, 0, 'door', 'the elevator doors on the back wall'),
    },
    wides: [
      { pos: v3(0.2, 1.9, 7.6), target: v3(0.2, 1.2, -2.0), fov: 48 },
      { pos: v3(-3.0, 1.5, 3.4), target: v3(-3.3, 1.0, -1.6), fov: 44 },
      { pos: v3(2.0, 1.5, 3.6), target: v3(3.4, 1.0, -1.0), fov: 44 },
      { pos: v3(2.8, 1.6, 3.6), target: v3(-2.6, 1.2, -2.2), fov: 48 },
    ],
    ambience: 'office',
    background: [],
    doorSound: 'elevator',
    setTime(t) {
      for (const p of panes) p.material = t === 'night' ? blindsNight : blindsDay;
    },
  };
}
