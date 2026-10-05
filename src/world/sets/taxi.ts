import * as THREE from 'three';
import { toon, glow, box, mesh, roundedBox, cyl, occluder } from '../../engine/materials';
import { street, road, skyline, sign, speckle } from '../../engine/textures';
import { type StageSet, mark, nodes, keyLight, v3 } from './common';
import { scroll, lampposts } from './vehicle';

// A yellow cab heading uptown, shot through the windshield: the cabbie at the wheel on the right
// (a generic cabbie, unless Ranjit is driving), the front passenger seat on the left, and behind the
// scuffed plexiglass partition the back seat, three across, knees against the partition. Out the rear
// window the avenue recedes; streetlamps flick past on both sides. Everyone sits: people slide along
// the seat, and get in and out by the curbside back door.
export function buildTaxi(): StageSet {
  const g = new THREE.Group();
  g.name = 'taxi';
  const L = -0.86, R = 0.86, REAR = -1.4, DASH = 0.95, ROOF = 1.64;
  const SILL = 0.82, HEAD = 1.32;
  const GROUND = -0.36;

  const yellow = toon('#f2c21a');
  const vinyl = toon('#1e1e20');
  const vinylHi = toon('#2e2e30');
  const trimGrey = toon('#3a3a3e');
  const chrome = toon('#b8bcc0');
  const tint = new THREE.MeshBasicMaterial({ color: '#8aa0b8', transparent: true, opacity: 0.12, depthWrite: false });
  const plexi = new THREE.MeshBasicMaterial({ color: '#d0dce8', transparent: true, opacity: 0.14, depthWrite: false });

  // ---- the avenue -------------------------------------------------------------------------------
  const roadTex = road(58);
  roadTex.repeat.set(10, 1);
  roadTex.offset.y = 0.32; // the lane line off to the cab's left
  const RD_L = 40;
  const roadMesh = mesh(new THREE.PlaneGeometry(RD_L, 9), toon('#ffffff', { map: roadTex }), 0, GROUND, -12, false);
  roadMesh.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  roadMesh.receiveShadow = true;
  g.add(roadMesh);
  for (const s of [-1, 1]) {
    const sw = mesh(new THREE.PlaneGeometry(3, RD_L), toon('#ffffff', { map: speckle('#6a6866', [1, 14], 59, 0.2) }), s * 6, GROUND + 0.15, -12, false);
    sw.rotation.x = -Math.PI / 2;
    g.add(sw);
  }
  // buildings down both sides, sliding back
  const SIDE_L = 36;
  const sides = [-1, 1].map((s) => {
    const night = street(true, 53 + s), day = street(false, 53 + s);
    for (const t of [night, day]) t.repeat.set(1.4, 1);
    const matNight = toon('#ffffff', { map: night, emissive: '#ffffff', emissiveIntensity: 0.7 });
    const matDay = toon('#ffffff', { map: day, emissive: '#ffffff', emissiveIntensity: 0.55 });
    const m = mesh(new THREE.PlaneGeometry(SIDE_L, 9), matNight, s * 7.5, GROUND + 4.5 - 0.1, -12, false);
    m.rotation.y = -s * Math.PI / 2;
    g.add(m);
    // the two planes face each other, so their textures run opposite ways along the street
    return { m, night, day, matNight, matDay, dir: s };
  });
  // looking back down the avenue
  const farNight = toon('#ffffff', { map: skyline(true, 77), emissive: '#ffffff', emissiveIntensity: 0.9 });
  const farDay = toon('#ffffff', { map: skyline(false, 77), emissive: '#ffffff', emissiveIntensity: 0.85 });
  const far = mesh(new THREE.PlaneGeometry(22, 12), farNight, 0, GROUND + 5.5, -30, false);
  g.add(far);
  const lampsL = lampposts(g, { axis: 'z', across: -5.2, armDir: 1, from: -26, to: 6, count: 2, ground: GROUND + 0.15 });
  const lampsR = lampposts(g, { axis: 'z', across: 5.2, armDir: -1, from: -18, to: 14, count: 2, ground: GROUND + 0.15 });

  // ---- the body -----------------------------------------------------------------------------------
  const floor = mesh(new THREE.PlaneGeometry(R - L, DASH - REAR), toon('#2a2a2c'), 0, 0, (REAR + DASH) / 2);
  floor.rotation.x = -Math.PI / 2;
  floor.castShadow = false;
  g.add(floor);
  g.add(mesh(box(R - L + 0.12, 0.1, DASH - REAR + 0.1), yellow, 0, ROOF + 0.05, (REAR + DASH) / 2 - 0.05, false));
  const headliner = mesh(new THREE.PlaneGeometry(R - L, DASH - REAR), toon('#8a867e'), 0, ROOF - 0.005, (REAR + DASH) / 2, false);
  headliner.rotation.x = Math.PI / 2;
  g.add(headliner);
  // the roof light
  const roofSignOn = new THREE.MeshBasicMaterial({ map: sign('TAXI', '#1a1a1a', '#fff2b0', 64, 20, 'bold 15px Helvetica') });
  const roofSignOff = new THREE.MeshBasicMaterial({ map: sign('TAXI', '#3a3a3a', '#c8c0a0', 64, 20, 'bold 15px Helvetica') });
  g.add(mesh(box(0.6, 0.2, 0.18), toon('#e8e0c0'), 0, ROOF + 0.2, -0.3, false));
  const roofSign = mesh(new THREE.PlaneGeometry(0.56, 0.17), roofSignOn, 0, ROOF + 0.2, -0.205, false);
  g.add(roofSign);
  // under the car
  g.add(mesh(box(R - L + 0.1, 0.3, DASH - REAR + 2.4), toon('#141414'), 0, -0.15, (REAR + DASH) / 2 + 0.5, false));
  // sides: yellow below the sill, a header above the windows, pillars between
  for (const s of [-1, 1]) {
    const x = s * (R + 0.04);
    const side = (z0: number, z1: number, y0: number, y1: number, mat: THREE.Material = yellow) =>
      g.add(mesh(box(0.08, y1 - y0, z1 - z0), mat, x, (y0 + y1) / 2, (z0 + z1) / 2, false));
    side(REAR - 0.5, DASH + 1.4, -0.3, SILL);
    side(REAR, DASH, HEAD, ROOF, trimGrey);
    for (const [z0, z1] of [[REAR, REAR + 0.12], [-0.42, -0.28], [DASH - 0.08, DASH]] as const) side(z0, z1, SILL, HEAD, trimGrey);
    g.add(mesh(new THREE.PlaneGeometry(DASH - REAR, HEAD - SILL), tint, x, (SILL + HEAD) / 2, (REAR + DASH) / 2, false).rotateY(Math.PI / 2));
    // inside door panels, with an armrest
    g.add(mesh(box(0.04, SILL - 0.1, DASH - REAR - 0.2), vinylHi, s * (R - 0.02), (SILL - 0.1) / 2 + 0.1, (REAR + DASH) / 2, false));
    g.add(mesh(box(0.08, 0.05, 0.4), vinyl, s * (R - 0.06), 0.62, -0.85, false));
    // the black-and-white checker stripe on the outside
    g.add(mesh(box(0.01, 0.06, DASH - REAR + 1.6), toon('#1a1a1a'), x + s * 0.045, 0.52, (REAR + DASH) / 2 + 0.6, false));
  }
  // rear: parcel shelf, rear window, trunk
  g.add(mesh(box(R - L, 0.95, 0.06), vinylHi, 0, 0.475, REAR - 0.03, false));
  g.add(mesh(box(R - L, 0.04, 0.3), trimGrey, 0, 0.97, REAR + 0.1, false));
  g.add(mesh(new THREE.PlaneGeometry(R - L, ROOF - 1.0), tint, 0, (ROOF + 1.0) / 2, REAR - 0.02, false));
  g.add(mesh(roundedBox(R - L + 0.12, 0.45, 0.9, 0.06), yellow, 0, 0.3, REAR - 0.5, false));
  for (const s of [-1, 1]) g.add(mesh(box(0.2, 0.12, 0.04), glow('#ff3030', 1.1), s * 0.7, 0.42, REAR - 0.96, false));
  // the windshield is the fourth wall: just the A-pillars and the header
  for (const s of [-1, 1]) {
    const p = mesh(box(0.07, 0.95, 0.07), trimGrey, s * (R - 0.02), (0.72 + ROOF) / 2, DASH + 0.08, false);
    p.rotation.x = -0.17;
    g.add(p);
  }
  g.add(mesh(box(R - L, 0.06, 0.08), trimGrey, 0, ROOF - 0.03, DASH, false));
  // hood, fenders, headlights, the front wheels
  g.add(mesh(roundedBox(R - L + 0.12, 0.42, 1.5, 0.08), yellow, 0, 0.5, DASH + 0.85, false));
  g.add(mesh(box(R - L, 0.2, 0.06), chrome, 0, 0.3, DASH + 1.6, false));
  for (const s of [-1, 1]) {
    g.add(mesh(box(0.22, 0.1, 0.04), glow('#fff4d0', 1.3), s * 0.6, 0.48, DASH + 1.61, false));
    g.add(mesh(cyl(0.33, 0.33, 0.22, 12).rotateZ(Math.PI / 2), toon('#141414'), s * (R + 0.02), GROUND + 0.33, DASH + 1.0, false));
    g.add(mesh(cyl(0.17, 0.17, 0.23, 8).rotateZ(Math.PI / 2), chrome, s * (R + 0.03), GROUND + 0.33, DASH + 1.0, false));
  }

  // ---- seats -----------------------------------------------------------------------------------------
  const SEAT = 0.44;
  // back bench, three across (raised a little so the back row clears the front row's heads on camera)
  const BZ = -0.98, BACK_SEAT = 0.56;
  g.add(occluder(mesh(roundedBox(R - L - 0.06, BACK_SEAT - 0.06, 0.55, 0.03), vinyl, 0, (BACK_SEAT - 0.06) / 2, BZ)));
  g.add(mesh(roundedBox(R - L - 0.1, 0.08, 0.52, 0.04), vinylHi, 0, BACK_SEAT - 0.03, BZ + 0.02));
  g.add(occluder(mesh(roundedBox(R - L - 0.06, 0.55, 0.14, 0.04), vinyl, 0, BACK_SEAT + 0.27, REAR + 0.1)));
  for (const x of [-0.29, 0.29]) g.add(mesh(box(0.01, 0.5, 0.01), vinylHi, x, BACK_SEAT + 0.27, REAR + 0.175, false));
  // front bench with a split back
  const FZ = 0.22;
  g.add(mesh(roundedBox(R - L - 0.06, SEAT - 0.06, 0.52, 0.03), vinyl, 0, (SEAT - 0.06) / 2, FZ));
  for (const s of [-1, 1]) {
    g.add(mesh(roundedBox(0.76, 0.08, 0.5, 0.04), vinylHi, s * 0.41, SEAT - 0.03, FZ + 0.02));
    g.add(mesh(roundedBox(0.76, 0.6, 0.12, 0.04), vinyl, s * 0.41, SEAT + 0.28, FZ - 0.3));
  }
  // the partition: steel frame, scratched plexiglass, the little payment window, the taxi TV
  const PZ = FZ - 0.42;
  g.add(mesh(box(R - L, 0.04, 0.05), chrome, 0, SEAT + 0.6, PZ, false));
  g.add(mesh(box(0.04, ROOF - SEAT - 0.6, 0.05), chrome, 0, (ROOF + SEAT + 0.6) / 2, PZ, false));
  g.add(mesh(new THREE.PlaneGeometry(R - L, ROOF - SEAT - 0.6), plexi, 0, (ROOF + SEAT + 0.6) / 2, PZ, false));
  g.add(mesh(box(0.3, 0.12, 0.08), chrome, 0.3, SEAT + 0.68, PZ, false)); // payment tray
  g.add(mesh(box(0.26, 0.17, 0.05), toon('#141414'), -0.35, SEAT + 0.48, PZ - 0.06, false)); // the taxi TV, facing the back seat
  g.add(mesh(box(0.15, 0.1, 0.01), toon('#f0ece0'), 0.55, 1.12, PZ - 0.03, false)); // hack license

  // ---- the dash -----------------------------------------------------------------------------------------
  g.add(occluder(mesh(box(R - L, 0.3, 0.32), trimGrey, 0, 0.74, DASH - 0.12)));
  g.add(mesh(box(R - L, 0.04, 0.36), vinyl, 0, 0.9, DASH - 0.1, false));
  // the meter, glowing red
  g.add(mesh(box(0.22, 0.08, 0.1), toon('#141414'), 0, 0.96, DASH - 0.2, false));
  g.add(mesh(new THREE.PlaneGeometry(0.18, 0.05), new THREE.MeshBasicMaterial({ map: sign('$12.50', '#ff3a2a', '#1a0404', 48, 16, 'bold 12px monospace') }), 0, 0.96, DASH - 0.26, false).rotateY(Math.PI));
  // steering wheel at the cabbie
  const wheel = mesh(new THREE.TorusGeometry(0.18, 0.022, 4, 14), toon('#141414'), 0.42, 0.88, DASH - 0.38, false);
  wheel.rotation.x = -0.35;
  g.add(wheel);
  g.add(mesh(cyl(0.025, 0.025, 0.3, 4), toon('#141414'), 0.42, 0.88, DASH - 0.25, false).rotateX(1.2));
  // rear-view mirror and the pine-tree air freshener
  g.add(mesh(box(0.2, 0.055, 0.03), toon('#2a2a2c'), 0, ROOF - 0.1, DASH - 0.05, false));
  g.add(mesh(box(0.012, 0.06, 0.012), toon('#2a2a2c'), 0, ROOF - 0.04, DASH - 0.05, false));
  const freshener = new THREE.Group();
  freshener.position.set(0.05, ROOF - 0.13, DASH - 0.05);
  freshener.add(mesh(box(0.003, 0.08, 0.003), toon('#e8e8e0'), 0, -0.04, 0, false));
  freshener.add(mesh(new THREE.ConeGeometry(0.035, 0.1, 3), toon('#2a8a3a'), 0, -0.13, 0, false));
  g.add(freshener);

  // ---- lights -------------------------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight('#a8b0d0', '#1a1814', 1.2);
  g.add(hemi);
  const key = keyLight(g, '#e8ecff', 1.0, [-2, 6, 7], [0, 0.6, -0.4]);
  const dome = new THREE.PointLight('#ffe8c0', 1.6, 3, 1.4);
  dome.position.set(0, ROOF - 0.15, -0.6);
  g.add(dome);
  const meterGlow = new THREE.PointLight('#ff4a3a', 0.6, 1.2, 1.4);
  meterGlow.position.set(0, 1.05, DASH - 0.35);
  g.add(meterGlow);
  const tvGlow = new THREE.PointLight('#6aaeff', 0.6, 1.4, 1.4);
  tvGlow.position.set(-0.35, 0.95, PZ - 0.25);
  g.add(tvGlow);

  const N = nodes({ back: [0, BZ + 0.05], door: [-0.72, BZ + 0.05], front: [0, FZ + 0.05], front_door: [-0.74, FZ + 0.05] });
  return {
    id: 'taxi',
    name: 'A Cab',
    group: g,
    nodes: N,
    edges: [['door', 'back'], ['front_door', 'front']],
    door: 'door',
    entrances: { front: 'front_door', front_door: 'front_door' },
    marks: {
      front_door: mark(-0.74, FZ + 0.05, 0, 'front_door', 'curbside front door', { seat: SEAT }),
      back_left: mark(-0.5, BZ + 0.05, 0.08, 'back', 'back seat, left (curb side, by the door)', { seat: BACK_SEAT }),
      back_middle: mark(0, BZ + 0.05, 0, 'back', 'back seat, squeezed into the middle hump', { seat: BACK_SEAT + 0.03 }),
      back_right: mark(0.5, BZ + 0.05, -0.08, 'back', 'back seat, right (street side)', { seat: BACK_SEAT }),
      front_passenger: mark(-0.42, FZ + 0.05, 0, 'front', 'front passenger seat, beside the driver', { seat: SEAT }),
      driver: mark(0.42, FZ + 0.05, 0, 'front', "the driver's seat (a cabbie drives unless the script puts someone else there, e.g. Ranjit)", { seat: SEAT }),
      door: mark(-0.74, BZ + 0.05, 0.3, 'door', 'the curbside back door', { seat: BACK_SEAT }),
    },
    wides: [
      { pos: v3(0, 1.5, 2.5), target: v3(0, 1.05, -0.5), fov: 46 },
      { pos: v3(-0.15, 1.55, 1.9), target: v3(0, 1.15, -0.95), fov: 40 },
      { pos: v3(0, 1.3, 1.9), target: v3(0, 1.05, 0.2), fov: 42 },
      { pos: v3(0.5, 1.5, 2.1), target: v3(-0.25, 1.05, -0.7), fov: 44 },
    ],
    ambience: 'car',
    background: [],
    doorSound: 'car',
    seated: true,
    reserved: ['driver', 'front_door'],
    setTime(t) {
      const night = t === 'night';
      for (const sd of sides) sd.m.material = night ? sd.matNight : sd.matDay;
      far.material = night ? farNight : farDay;
      roofSign.material = night ? roofSignOn : roofSignOff;
      lampsL.setNight(night);
      lampsR.setNight(night);
      hemi.color.set(night ? '#a8b0d0' : '#eef2ff');
      hemi.intensity = night ? 1.2 : 2.3;
      key.intensity = night ? 0.9 : 2.2;
      dome.intensity = night ? 1.6 : 0;
    },
    update(dt, t) {
      // the city slides back past both sides
      for (const sd of sides) {
        scroll(sd.night, SIDE_L, dt, sd.dir);
        sd.day.offset.x = sd.night.offset.x;
      }
      scroll(roadTex, RD_L, dt, -1);
      lampsL.update(dt, -1);
      lampsR.update(dt, -1);
      freshener.rotation.z = Math.sin(t * 1.7) * 0.15 + Math.sin(t * 4.1) * 0.05;
    },
  };
}
