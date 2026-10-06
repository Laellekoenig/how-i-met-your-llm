import * as THREE from 'three';
import { toon, mesh } from '../../engine/materials';
import { street, road, skyline, speckle } from '../../engine/textures';
import { scroll, lampposts } from './vehicle';

/** Moving city plates and passing light, shared by the sedan and yellow cab. */
export function cityDrive(g: THREE.Group, GROUND: number) {
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

  return {
    setNight(night: boolean) {
      for (const sd of sides) sd.m.material = night ? sd.matNight : sd.matDay;
      far.material = night ? farNight : farDay;
      lampsL.setNight(night);
      lampsR.setNight(night);
    },
    update(dt: number) {
      for (const sd of sides) {
        scroll(sd.night, SIDE_L, dt, sd.dir);
        sd.day.offset.x = sd.night.offset.x;
      }
      scroll(roadTex, RD_L, dt, -1);
      lampsL.update(dt, -1);
      lampsR.update(dt, -1);
    },
  };
}
