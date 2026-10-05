import * as THREE from 'three';
import type { Stage } from './stage';
import type { Actor } from '../world/actor';
import type { EstablishingShot } from '../world/sets/establishing';
import type { CharacterId } from '../script/types';
import { damp, noise1 } from '../util';

type ShotKind = 'wide' | 'closeup' | 'two' | 'ots' | 'establishing' | 'selfie';

interface ActiveShot {
  kind: ShotKind;
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  follow?: Actor;
  followOffset?: THREE.Vector3;
  push: number; // dolly speed toward target, m/s
  subject?: CharacterId;
  drift?: EstablishingShot;
  subjects?: CharacterId[];
  followHead?: THREE.Vector3;
  /** Where a jogged shot was originally framed. */
  base?: { pos: THREE.Vector3; target: THREE.Vector3; fov: number };
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
    s.followHead = s.follow?.headWorld;
    this.shot = s;
    this.lastCut = this.time;
    this.apply(0);
    this.onCut?.();
  }

  wide(index = 0, push = 0.04) {
    const w = this.stage.current.wides[index] ?? this.stage.current.wides[0];
    this.cut({ kind: 'wide', pos: w.pos.clone(), target: w.target.clone(), fov: w.fov, push, subjects: this.stage.castIds() });
  }

  establish(s: EstablishingShot, moving = true) {
    this.cut({ kind: 'establishing', pos: s.pos.clone(), target: s.target.clone(), fov: s.fov, push: 0, drift: moving ? s : undefined });
  }

  /** Prefer a tight authored angle only when every subject is framed and unobstructed. */
  coverage(ids: CharacterId[], allowCloseup = true) {
    const actors = ids.filter(id => this.stage.onStage(id)).map(id => this.stage.actors[id]);
    if (!actors.length) return this.wide(0);
    const wides = this.stage.current.wides;
    const moving = actors.filter(a => a.isWalking);
    let best = 0, score = -1;
    for (let i = wides.length - 1; i >= 0; i--) {
      const shot = wides[i];
      const visible = actors.filter(a => this.covers(shot, [a]));
      if (visible.length === actors.length) { best = i; break; }
      const value = visible.length + visible.filter(a => a.isWalking).length * (actors.length + 1);
      if (value >= score) { score = value; best = i; }
    }
    const priority = moving.length ? moving : actors.slice(0, 1);
    if (allowCloseup && !priority.every(a => this.covers(wides[best], [a]))) return this.closeup(priority[0].def.id);
    this.wide(best);
    this.shot!.subjects = actors.map(a => a.def.id);
  }

  private framePoints(actors: Actor[]) {
    return actors.flatMap(a => {
      const head = a.headWorld;
      return [head.clone().add(new THREE.Vector3(0, 0.1, 0)), head.clone().add(new THREE.Vector3(0, -0.35, 0))];
    });
  }

  private covers(shot: { pos: THREE.Vector3; target: THREE.Vector3; fov: number }, actors: Actor[]) {
    return this.allInFrame(shot.pos, shot.target, shot.fov, this.framePoints(actors)) &&
      actors.every(a => this.clear(shot.pos, a.headWorld, [a]) &&
        this.clear(shot.pos, a.headWorld.add(new THREE.Vector3(0, -0.25, 0)), [a]));
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
      return Math.abs(v.x) < 0.85 && Math.abs(v.y) < 0.85 && v.z > -1 && v.z < 1;
    });
  }

  /** Reverse angles must have scenery behind the subject, not the missing fourth wall. */
  private hasBackdrop(shot: { pos: THREE.Vector3; target: THREE.Vector3; fov: number }) {
    const cam = this.camera.clone();
    cam.position.copy(shot.pos); cam.fov = shot.fov; cam.lookAt(shot.target);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const objects = this.stage.occluders();
    let covered = 0;
    this.ray.near = 0.2; this.ray.far = 60;
    // Include the sides and lower background: a ceiling alone must not approve a
    // reverse that exposes the missing fourth wall behind a standing speaker.
    for (const x of [-0.85, 0, 0.85]) for (const y of [-0.1, 0.25, 0.7]) {
      this.ray.setFromCamera(new THREE.Vector2(x, y), cam);
      if (this.ray.intersectObjects(objects, false).length) covered++;
    }
    return covered === 9;
  }

  private clear(from: THREE.Vector3, to: THREE.Vector3, ignore: Actor[]) {
    const dir = to.clone().sub(from), distance = dir.length();
    if (distance < 0.3) return false;
    const objects: THREE.Object3D[] = this.stage.occluders();
    const actors = [...Object.values(this.stage.actors),
      ...this.stage.extras.filter(e => e.set === this.stage.current.id).map(e => e.actor)];
    for (const a of actors) if (a.root.visible && !ignore.includes(a)) {
      a.root.updateWorldMatrix(true, true);
      objects.push(...a.bodyMeshes);
    }
    // Leave room for the small camera sway instead of accepting a ray that grazes a wall.
    for (const [dx, dy] of [[0, 0], [-0.025, 0], [0.025, 0], [0, -0.02], [0, 0.02]]) {
      const origin = from.clone().add(new THREE.Vector3(dx, dy, 0));
      dir.copy(to).sub(origin);
      this.ray.near = 0;
      this.ray.far = dir.length() - 0.12;
      dir.normalize();
      this.ray.set(origin, dir);
      if (this.ray.intersectObjects(objects, false).length) return false;
      // Back faces also matter: otherwise a camera outside a wall sees through it.
      this.ray.set(to, dir.clone().negate());
      if (this.ray.intersectObjects(objects, false).some(hit => hit.distance >= 0.12 && !hit.object.userData.cameraBackdrop)) return false;
    }
    return true;
  }

  closeup(id: CharacterId, toward?: CharacterId): void {
    const a = this.stage.actors[id];
    if (!a?.root.visible) return this.wide(0);
    const head = a.headWorld;
    const look = new THREE.Vector3(Math.sin(a.facing), 0, Math.cos(a.facing));
    if (toward && this.stage.onStage(toward)) {
      const t = this.stage.actors[toward].headWorld.sub(head).setY(0);
      if (t.lengthSq() > 0.01) look.copy(t.normalize());
    }
    const forward = new THREE.Vector3(Math.sin(a.facing), 0, Math.cos(a.facing));
    const audience = new THREE.Vector3(0, 0, 1);
    // Keep reverse coverage for students and chairs facing into the room.
    const candidates = [forward.clone().lerp(look, 0.35).normalize(),
      ...[0.65, -0.65, 1.1, -1.1].map(angle => forward.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)),
      ...[0.3, 0.65, 1].map(blend => look.clone().lerp(audience, blend).normalize())];
    for (const dist of [2.35, 1.65, 1.15]) for (const d of candidates) {
      if (d.lengthSq() < 0.1 || d.dot(forward) < 0.05) continue;
      const pos = head.clone().addScaledVector(d, dist);
      pos.y = head.y + 0.08;
      const target = head.clone().add(new THREE.Vector3(0, -0.16, 0));
      const fov = dist < 1.5 ? 44 : 32;
      if (this.covers({ pos, target, fov }, [a]) && this.hasBackdrop({ pos, target, fov })) {
        this.cut({ kind: 'closeup', pos, target, fov, follow: a,
          followOffset: new THREE.Vector3(0, -0.16, 0), push: 0.02, subject: id, subjects: [id] });
        return;
      }
    }
    this.coverage([id], false);
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
    const target = mid.add(new THREE.Vector3(0, -0.2, 0));
    if (!this.covers({ pos, target, fov: 42 }, [A, B]) || !this.hasBackdrop({ pos, target, fov: 42 })) return this.closeup(a, b);
    this.cut({ kind: 'two', pos, target, fov: 42, push: 0.03, subject: a, subjects: [a, b] });
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
    const target = hs.clone().add(new THREE.Vector3(0, -0.08, 0));
    // Validate reverse angles against the current walls and furniture too.
    if (!this.allInFrame(pos, target, 36, this.framePoints([S])) || !this.clear(pos, hs, [S]) || !this.clear(pos, hs.clone().add(new THREE.Vector3(0, -0.25, 0)), [S]) || !this.hasBackdrop({ pos, target, fov: 36 })) return this.closeup(speaker, listener);
    this.cut({ kind: 'ots', pos, target, fov: 36, follow: S, followOffset: new THREE.Vector3(0, -0.08, 0), push: 0.01, subject: speaker, subjects: [speaker] });
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

  /** Right up in the gang's faces, like someone holding the camera at arm's length: for the main titles. */
  selfie(heads: THREE.Vector3[], o: { dist: number; yaw: number; lift: number; fov: number; aim?: number }) {
    const target = heads.reduce((sum, h) => sum.add(h), new THREE.Vector3()).divideScalar(Math.max(1, heads.length));
    target.y += o.aim ?? -0.06;
    const pos = target.clone().add(new THREE.Vector3(Math.sin(o.yaw) * o.dist, o.lift, Math.cos(o.yaw) * o.dist));
    this.cut({ kind: 'selfie', pos, target, fov: o.fov, push: 0 });
  }

  /** The next photo in a burst: the same shot, taken from a hand's width away and a hair tighter or looser. */
  jog(amount = 0.06) {
    const s = this.shot;
    if (!s) return;
    s.base ??= { pos: s.pos.clone(), target: s.target.clone(), fov: s.fov };
    const r = () => (Math.random() * 2 - 1) * amount;
    s.pos.copy(s.base.pos).add(new THREE.Vector3(r(), r() * 0.5, r() * 0.5));
    s.target.copy(s.base.target).add(new THREE.Vector3(r() * 0.5, r() * 0.3, 0));
    s.fov = s.base.fov * (1 + r() * 0.6);
    this.apply(0);
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
    const s = this.shot;
    if (s && s.kind !== 'establishing' && !s.follow && this.time - this.lastCut > 0.5) {
      const ids = s.subjects?.filter(id => this.stage.onStage(id)) ?? [];
      const moving = ids.map(id => this.stage.actors[id]).filter(a => a.isWalking);
      if (moving.length && !this.covers(s, moving)) this.coverage(ids);
    }
    this.apply(dt);
  }

  private apply(dt: number) {
    const s = this.shot;
    if (!s) return;
    // Exterior backdrops sit beyond the indoor camera's clipping plane.
    const far = s.kind === 'establishing' ? 600 : 60;
    if (this.camera.far !== far) {
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
    // Settle the camera after a short move if a voice-over runs long.
    if (s.drift && this.time - this.lastCut < 4) {
      s.pos.addScaledVector(s.drift.move, dt);
      s.target.addScaledVector(s.drift.look, dt);
    }
    if (s.follow && s.followOffset) {
      const head = s.follow.headWorld;
      if (s.followHead) {
        const displacement = head.clone().sub(s.followHead);
        const moved = s.pos.clone().add(displacement);
        if (displacement.lengthSq() > 0.000001 &&
          (!this.clear(moved, head, [s.follow]) || !this.clear(moved, head.clone().add(new THREE.Vector3(0, -0.25, 0)), [s.follow]))) {
          this.closeup(s.subject!);
          return;
        }
        s.pos.copy(moved);
      }
      s.followHead = head.clone();
      s.target.lerp(head.add(s.followOffset), damp(4, dt || 1));
    }
    if (dt > 0 && s.push && this.time - this.lastCut < 4) {
      const dir = s.target.clone().sub(s.pos);
      const next = s.pos.clone().addScaledVector(dir.normalize(), s.push * dt);
      const actors = (s.subjects ?? []).filter(id => this.stage.onStage(id)).map(id => this.stage.actors[id]);
      if (next.distanceTo(s.target) > 1 && this.covers({ ...s, pos: next }, actors)) s.pos.copy(next);
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
