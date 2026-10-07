import * as THREE from 'three';
import type { LocationId, TimeOfDay, CharacterId } from '../../script/types';
import { toon, glow, box, mesh, roundedBox, cyl, occluder } from '../../engine/materials';
import { painting } from '../../engine/textures';
import type { SitPose } from '../actor';

export interface Mark {
  pos: THREE.Vector3;
  facing: number; // radians, 0 = facing the audience (+z)
  seat: number | null; // seat height if this is a seat
  node: string; // nav node used to reach this mark
  approach?: THREE.Vector3; // last point before stepping onto the mark
  hint: string; // description for the LLM
  pose?: SitPose; // how to sit here
  prop?: THREE.Object3D; // held in the lap by whoever sits here
}

export interface Shot {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  label?: string;
}

export type Ambience = 'bar' | 'apartment' | 'penthouse' | 'city' | 'office' | 'car' | 'none';
export type DoorSound = 'knock' | 'bell' | 'car' | 'elevator' | 'none';

export interface StageSet {
  id: LocationId;
  name: string;
  group: THREE.Group;
  marks: Record<string, Mark>;
  nodes: Record<string, THREE.Vector3>;
  edges: [string, string][];
  door: string;
  wides: Shot[];
  /** Closed sets (the cars): every generated angle keeps the camera inside this box, never outside the body. */
  cameraBounds?: THREE.Box3;
  /** Fixed windshield / cabin mounts. Vehicles use these for dialogue instead of orbiting the actors. */
  dialogueCameras?: THREE.Vector3[];
  /** The open side of a sitcom set, facing the cameras and the audience; positive is outside. Generated
   *  angles never look out through it. */
  openSide?: THREE.Plane;
  /** Keep generated two-shots near the actors; distant pairs get singles instead. */
  maxTwoShotDistance?: number;
  ambience: Ambience;
  background: { character: CharacterId; mark: string }[];
  /** What you hear when someone comes in (defaults to the doorbell). */
  doorSound?: DoorSound;
  /** Cars: there's no standing up. People slide between seats and get in and out through the door. */
  seated?: boolean;
  /** Marks nobody gets put on unless the script asks for them (the bartender's spot, the driver's seat). */
  reserved?: string[];
  /** Separate vehicle compartments use their own door. No route crosses a solid partition. */
  entrances?: Record<string, string>;
  setTime(t: TimeOfDay): void;
  update?(dt: number, t: number): void;
  /** Floor height at a point, for sets with raised areas (defaults to 0). */
  floorAt?(x: number, z: number): number;
}

export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function mark(x: number, z: number, facing: number, node: string, hint: string, opts: { seat?: number; approach?: [number, number]; pose?: SitPose; prop?: THREE.Object3D } = {}): Mark {
  return {
    pos: v3(x, 0, z),
    facing,
    seat: opts.seat ?? null,
    node,
    approach: opts.approach ? v3(opts.approach[0], 0, opts.approach[1]) : undefined,
    hint,
    pose: opts.pose,
    prop: opts.prop,
  };
}

export function nodes(def: Record<string, [number, number]>) {
  const out: Record<string, THREE.Vector3> = {};
  for (const [k, [x, z]] of Object.entries(def)) out[k] = v3(x, 0, z);
  return out;
}

/** Floor, three walls and a ceiling. The fourth wall is the audience. */
export function room(g: THREE.Group, o: {
  w: number; d: number; h: number; floor: THREE.Material; back: THREE.Material; left?: THREE.Material; right?: THREE.Material; ceiling?: string;
}) {
  const { w, d, h } = o;
  // Carry the shell past the master camera, including the ceiling above it.
  const backZ = -d / 2, frontZ = 16, depth = frontZ - backZ, centerZ = (frontZ + backZ) / 2;
  const floor = mesh(new THREE.PlaneGeometry(w, depth), o.floor, 0, 0, centerZ);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  g.add(floor);
  const back = mesh(new THREE.PlaneGeometry(w, h), o.back, 0, h / 2, -d / 2);
  back.castShadow = false;
  g.add(back);
  const left = mesh(new THREE.PlaneGeometry(depth, h), o.left ?? o.back, -w / 2, h / 2, centerZ);
  left.rotation.y = Math.PI / 2;
  left.castShadow = false;
  g.add(left);
  const right = mesh(new THREE.PlaneGeometry(depth, h), o.right ?? o.back, w / 2, h / 2, centerZ);
  right.rotation.y = -Math.PI / 2;
  right.castShadow = false;
  g.add(right);
  const ceil = mesh(new THREE.PlaneGeometry(w, depth), toon(o.ceiling ?? '#2a221c'), 0, h, centerZ);
  ceil.rotation.x = Math.PI / 2;
  ceil.castShadow = false;
  g.add(ceil);
}

/** Lower wall band (wainscoting / baseboard) along a wall. */
export function band(g: THREE.Group, mat: THREE.Material, x: number, z: number, len: number, height: number, rotY = 0, depth = 0.06) {
  const m = mesh(box(len, height, depth), mat, x, height / 2, z);
  m.rotation.y = rotY;
  m.castShadow = false;
  g.add(m);
  return m;
}

export function frame(g: THREE.Group, x: number, y: number, z: number, w: number, h: number, seed: number, rotY = 0, frameColor = '#2a1b10') {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  grp.add(mesh(box(w + 0.08, h + 0.08, 0.04), toon(frameColor), 0, 0, 0, false));
  grp.add(mesh(new THREE.PlaneGeometry(w, h), toon('#ffffff', { map: painting(seed) }), 0, 0, 0.022, false));
  g.add(grp);
  return grp;
}

export function pendant(g: THREE.Group, x: number, y: number, z: number, shade = '#2c4a34', light?: { color: string; intensity: number; distance?: number }) {
  g.add(mesh(cyl(0.008, 0.008, 3.4 - y, 4), toon('#111'), x, y + (3.4 - y) / 2, z, false));
  g.add(mesh(cyl(0.06, 0.24, 0.2, 8), toon(shade), x, y, z, false));
  g.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), glow('#ffd28a', 1.6), x, y - 0.1, z, false));
  if (light) {
    const l = new THREE.PointLight(light.color, light.intensity, light.distance ?? 7, 1.4);
    l.position.set(x, y - 0.2, z);
    g.add(l);
    return l;
  }
  return null;
}

export function window_(g: THREE.Group, x: number, y: number, z: number, w: number, h: number, mat: THREE.Material, frameColor = '#e9e2d0', rotY = 0, mullions = 2) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;
  const pane = mesh(new THREE.PlaneGeometry(w, h), mat, 0, 0, 0.01, false);
  grp.add(pane);
  const fm = toon(frameColor);
  grp.add(mesh(box(w + 0.12, 0.08, 0.1), fm, 0, h / 2, 0.03, false));
  grp.add(mesh(box(w + 0.2, 0.08, 0.2), fm, 0, -h / 2, 0.06, false));
  grp.add(mesh(box(0.08, h, 0.1), fm, -w / 2, 0, 0.03, false));
  grp.add(mesh(box(0.08, h, 0.1), fm, w / 2, 0, 0.03, false));
  for (let i = 1; i <= mullions; i++) grp.add(mesh(box(0.04, h, 0.05), fm, -w / 2 + (w * i) / (mullions + 1), 0, 0.03, false));
  grp.add(mesh(box(w, 0.04, 0.05), fm, 0, h * 0.1, 0.03, false));
  g.add(grp);
  return pane;
}

export function door(g: THREE.Group, x: number, z: number, rotY: number, color: string, opts: { glass?: THREE.Material; frameColor?: string } = {}) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  const fm = toon(opts.frameColor ?? '#e8dfcc');
  grp.add(mesh(box(1.05, 2.25, 0.06), toon(color), 0, 1.12, 0.03, false));
  grp.add(mesh(box(0.1, 2.35, 0.1), fm, -0.56, 1.17, 0.05, false));
  grp.add(mesh(box(0.1, 2.35, 0.1), fm, 0.56, 1.17, 0.05, false));
  grp.add(mesh(box(1.22, 0.1, 0.1), fm, 0, 2.33, 0.05, false));
  grp.add(mesh(new THREE.SphereGeometry(0.035, 6, 4), toon('#c9a227'), 0.38, 1.05, 0.09, false));
  if (opts.glass) grp.add(mesh(new THREE.PlaneGeometry(0.6, 0.8), opts.glass, 0, 1.6, 0.065, false));
  else {
    grp.add(mesh(box(0.7, 0.8, 0.02), toon(new THREE.Color(color).multiplyScalar(0.8)), 0, 1.6, 0.065, false));
    grp.add(mesh(box(0.7, 0.7, 0.02), toon(new THREE.Color(color).multiplyScalar(0.8)), 0, 0.6, 0.065, false));
  }
  g.add(grp);
  return grp;
}

/** Simple upholstered couch along x, facing +z. Returns its group. */
export function couch(g: THREE.Group, x: number, z: number, len: number, fabric: string, frame = '#3a2a1e', rotY = 0, seatH = 0.45) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = rotY;
  const f = toon(fabric);
  const dark = toon(new THREE.Color(fabric).multiplyScalar(0.8));
  grp.add(occluder(mesh(roundedBox(len, seatH - 0.1, 0.9, 0.04), dark, 0, (seatH - 0.1) / 2 + 0.08, 0)));
  const cushions = Math.max(1, Math.round(len / 0.85));
  const cw = (len - 0.3) / cushions;
  for (let i = 0; i < cushions; i++)
    grp.add(mesh(roundedBox(cw - 0.03, 0.14, 0.7, 0.05), f, -len / 2 + 0.15 + cw * (i + 0.5), seatH - 0.05, 0.08));
  grp.add(occluder(mesh(roundedBox(len, 0.55, 0.22, 0.06), f, 0, seatH + 0.22, -0.36)));
  for (const s of [1, -1]) grp.add(occluder(mesh(roundedBox(0.2, 0.32, 0.9, 0.06), f, s * (len / 2 - 0.1), seatH + 0.08, 0)));
  for (const sx of [1, -1]) for (const sz of [1, -1]) grp.add(mesh(box(0.06, 0.08, 0.06), toon(frame), sx * (len / 2 - 0.08), 0.04, sz * 0.38));
  g.add(grp);
  return grp;
}

export function armchair(g: THREE.Group, x: number, z: number, rotY: number, fabric: string) {
  return couch(g, x, z, 1.05, fabric, '#2a1e14', rotY);
}

export function bottles(g: THREE.Group, x0: number, y: number, z: number, count: number, spacing: number, rotY = 0, seed = 1) {
  const cols = ['#3d6b2e', '#7a3b12', '#c9a227', '#2e4a6b', '#d9d0b8', '#5a1e1e', '#b8742a'];
  const grp = new THREE.Group();
  grp.position.set(x0, y, z);
  grp.rotation.y = rotY;
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const h = 0.22 + r * 0.14;
    const c = cols[Math.floor(r * 97) % cols.length];
    const m = toon(c, { emissive: c, emissiveIntensity: 0.25 });
    grp.add(mesh(cyl(0.04, 0.045, h, 6), m, i * spacing, h / 2, 0, false));
    grp.add(mesh(cyl(0.015, 0.02, 0.08, 4), m, i * spacing, h + 0.04, 0, false));
  }
  g.add(grp);
  return grp;
}

export function plant(g: THREE.Group, x: number, z: number, scale = 1) {
  g.add(mesh(cyl(0.16 * scale, 0.12 * scale, 0.3 * scale, 8), toon('#8a4a2a'), x, 0.15 * scale, z));
  const leaf = toon('#3f7a3a');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const l = mesh(box(0.08 * scale, 0.5 * scale, 0.02), leaf, x + Math.cos(a) * 0.08 * scale, 0.5 * scale, z + Math.sin(a) * 0.08 * scale);
    l.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5);
    g.add(l);
  }
}

export function keyLight(g: THREE.Group, color: string, intensity: number, pos: [number, number, number], target: [number, number, number]) {
  const l = new THREE.DirectionalLight(color, intensity);
  l.position.set(...pos);
  l.target.position.set(...target);
  l.castShadow = true;
  l.shadow.mapSize.set(1024, 1024);
  const c = l.shadow.camera;
  c.left = -8; c.right = 8; c.top = 6; c.bottom = -6; c.near = 0.5; c.far = 30;
  l.shadow.bias = -0.0008;
  l.shadow.normalBias = 0.02;
  g.add(l, l.target);
  return l;
}
