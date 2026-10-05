import * as THREE from 'three';
import type { Stage } from './stage';
import type { Actor } from '../world/actor';
import type { CharacterId } from '../script/types';
import { damp, noise1, rand } from '../util';

type ShotKind = 'wide' | 'closeup' | 'two' | 'ots';

interface ActiveShot {
  kind: ShotKind;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  follow?: Actor;
  followOffset?: THREE.Vector3;
  push: number; // dolly speed toward target, m/s
  subject?: CharacterId;
}

/** Multi-camera sitcom coverage: wides, singles, two-shots, over-the-shoulders. */
export class Director {
  private shot: ActiveShot | null = null;
  private lastCut = 0;
  private time = 0;
  private ray = new THREE.Raycaster();
  onCut: (() => void) | null = null;

  constructor(private camera: THREE.PerspectiveCamera, private stage: Stage) {}

  private cut(s: ActiveShot) {
    this.shot = s;
    this.lastCut = this.time;
    this.apply(0);
    this.onCut?.();
  }

  wide(index = 0, push = 0.04) {
    const w = this.stage.current.wides[index] ?? this.stage.current.wides[0];
    this.cut({ kind: 'wide', pos: w.pos.clone(), target: w.target.clone(), fov: w.fov, push });
  }

  /** Wide that best covers the given characters. */
  coverage(ids: CharacterId[]) {
    const wides = this.stage.current.wides;
    if (!ids.length) return this.wide(0);
    const pts = ids.filter((i) => this.stage.onStage(i)).map((i) => this.stage.actors[i].headWorld);
    let best = 0;
    for (let i = wides.length - 1; i >= 1; i--) {
      if (this.allInFrame(wides[i].pos, wides[i].target, wides[i].fov, pts)) {
        best = i;
        break;
      }
    }
    this.wide(best, best ? 0.06 : 0.04);
  }

  private allInFrame(pos: THREE.Vector3, target: THREE.Vector3, fov: number, pts: THREE.Vector3[]) {
    const cam = this.camera.clone();
    cam.position.copy(pos);
    cam.fov = fov;
    cam.lookAt(target);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return pts.every((p) => {
      const v = p.clone().project(cam);
      return Math.abs(v.x) < 0.85 && Math.abs(v.y) < 0.85 && v.z < 1;
    });
  }

  private clear(from: THREE.Vector3, to: THREE.Vector3, ignore: Actor[]) {
    const dir = to.clone().sub(from);
    const dist = dir.length();
    this.ray.set(from, dir.normalize());
    this.ray.far = dist - 0.25;
    const objs: THREE.Object3D[] = this.stage.occluders();
    for (const a of Object.values(this.stage.actors)) if (a.root.visible && !ignore.includes(a)) objs.push(...a.bodyMeshes);
    return this.ray.intersectObjects(objs, false).length === 0;
  }

  closeup(id: CharacterId, toward?: CharacterId) {
    const a = this.stage.actors[id];
    if (!a?.root.visible) return this.wide(0);
    const head = a.headWorld;
    const look = new THREE.Vector3(Math.sin(a.facing), 0, Math.cos(a.facing));
    if (toward && this.stage.onStage(toward)) {
      const t = this.stage.actors[toward].headWorld.sub(head).setY(0);
      if (t.lengthSq() > 0.01) look.copy(t.normalize());
    }
    const candidates = [0.3, 0.55, 0.8, 1.0].map((blend) => {
      const d = look.clone().lerp(new THREE.Vector3(0, 0, 1), blend).setY(0);
      if (d.z < 0.3) d.z = 0.3;
      return d.normalize();
    });
    const dist = rand(2.1, 2.6);
    for (const d of candidates) {
      const pos = head.clone().addScaledVector(d, dist);
      pos.y = head.y - 0.02;
      if (this.clear(pos, head, [a])) {
        this.cut({ kind: 'closeup', pos, target: head.clone().add(new THREE.Vector3(0, -0.16, 0)), fov: 32, follow: a, followOffset: new THREE.Vector3(0, -0.16, 0), push: 0.02, subject: id });
        return;
      }
    }
    this.coverage([id]);
  }

  twoShot(a: CharacterId, b: CharacterId) {
    const A = this.stage.actors[a], B = this.stage.actors[b];
    if (!A?.root.visible || !B?.root.visible) return this.closeup(a);
    const ha = A.headWorld, hb = B.headWorld;
    const mid = ha.clone().add(hb).multiplyScalar(0.5);
    const sep = ha.distanceTo(hb);
    const along = hb.clone().sub(ha).setY(0).normalize();
    const perp = new THREE.Vector3(-along.z, 0, along.x);
    if (perp.z < 0) perp.negate();
    perp.lerp(new THREE.Vector3(0, 0, 1), 0.45).normalize();
    const dist = Math.max(2.3, sep * 1.25 + 1.3);
    const pos = mid.clone().addScaledVector(perp, dist);
    pos.y = mid.y + 0.1;
    if (!this.clear(pos, ha, [A, B]) || !this.clear(pos, hb, [A, B])) return this.closeup(a, b);
    this.cut({ kind: 'two', pos, target: mid.add(new THREE.Vector3(0, -0.2, 0)), fov: 36, push: 0.03, subject: a });
  }

  /** Over the listener's shoulder onto the speaker. */
  overShoulder(speaker: CharacterId, listener: CharacterId) {
    const S = this.stage.actors[speaker], L = this.stage.actors[listener];
    if (!S?.root.visible || !L?.root.visible) return this.closeup(speaker);
    const hs = S.headWorld, hl = L.headWorld;
    const back = hl.clone().sub(hs).setY(0);
    if (back.length() > 3.5 || back.length() < 0.5) return this.closeup(speaker, listener);
    back.normalize();
    const side = new THREE.Vector3(-back.z, 0, back.x);
    if (side.z < 0) side.negate();
    const pos = hl.clone().addScaledVector(back, 1.1).addScaledVector(side, 0.45);
    pos.y = hl.y + 0.05;
    // stay on the audience side of the speaker (sets have no fourth wall)
    if (pos.z < hs.z + 0.4 || !this.clear(pos, hs, [S, L])) return this.closeup(speaker, listener);
    this.cut({ kind: 'ots', pos, target: hs.clone().add(new THREE.Vector3(0, -0.08, 0)), fov: 36, follow: S, followOffset: new THREE.Vector3(0, -0.08, 0), push: 0.01, subject: speaker });
  }

  /** Pick coverage for a line of dialogue. */
  onLine(speaker: CharacterId, to?: CharacterId) {
    const s = this.shot;
    const since = this.time - this.lastCut;
    if (s && s.subject === speaker && s.kind !== 'wide' && Math.random() < 0.65) return;
    if (s && s.subject === speaker && since < 2.5) return;
    const r = Math.random();
    const listener = to && to !== speaker && this.stage.onStage(to) ? to : undefined;
    const crowd = this.stage.castIds().length;
    if (listener) {
      if (r < 0.38) this.closeup(speaker, listener);
      else if (r < 0.6) this.overShoulder(speaker, listener);
      else if (r < 0.82) this.twoShot(speaker, listener);
      else this.coverage(this.stage.castIds());
    } else {
      if (r < (crowd > 3 ? 0.5 : 0.65)) this.closeup(speaker);
      else this.coverage(this.stage.castIds());
    }
  }

  /** The couch is nearly always the locked-off two-shot; now and then a single on whoever's talking. */
  onCouchLine(speaker: CharacterId) {
    const s = this.shot;
    if (s?.kind === 'closeup' && s.subject === speaker) return;
    if (Math.random() < 0.3) this.closeup(speaker);
    else if (s?.kind !== 'wide') this.wide(0, 0.02);
  }

  get current() {
    return this.shot;
  }

  /** Go back to a shot held earlier, e.g. after cutting away to the kids. */
  resume(shot: ActiveShot | null) {
    if (shot) this.cut(shot);
    else this.wide(0);
  }

  update(dt: number) {
    this.time += dt;
    this.apply(dt);
  }

  private apply(dt: number) {
    const s = this.shot;
    if (!s) return;
    if (s.follow && s.followOffset) {
      const want = s.follow.headWorld.add(s.followOffset);
      s.target.lerp(want, damp(4, dt || 1));
    }
    if (dt > 0 && s.push) {
      const dir = s.target.clone().sub(s.pos);
      if (dir.length() > 1.0) s.pos.addScaledVector(dir.normalize(), s.push * dt);
    }
    const t = this.time;
    const sway = new THREE.Vector3(noise1(t * 0.35) * 0.012, noise1(t * 0.3 + 5) * 0.008, 0);
    this.camera.position.copy(s.pos).add(sway);
    if (this.camera.fov !== s.fov) {
      this.camera.fov = s.fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.lookAt(s.target);
  }
}
