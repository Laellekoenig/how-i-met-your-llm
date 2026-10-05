import * as THREE from 'three';
import { Actor } from '../world/actor';
import { CHARACTERS, type CharacterDef } from '../world/characters';
import type { StageSet, Mark } from '../world/sets/common';
import { buildMaclarens } from '../world/sets/maclarens';
import { buildApartment } from '../world/sets/apartment';
import { buildBarneys } from '../world/sets/barneys';
import { buildFuture, KID_MARKS } from '../world/sets/future';
import { buildRooftop } from '../world/sets/rooftop';
import { buildBarneysOffice } from '../world/sets/barneysOffice';
import { buildOffice } from '../world/sets/office';
import { buildLimo } from '../world/sets/limo';
import { buildTaxi } from '../world/sets/taxi';
import { CHARACTER_IDS, KIDS, type CharacterId, type LocationId, type TimeOfDay } from '../script/types';
import { pick, rand } from '../util';

/** Owns the sets and actors; knows how to place and move people around. */
export class Stage {
  readonly sets: Record<LocationId, StageSet>;
  readonly actors = {} as Record<CharacterId, Actor>;
  /** Background people. `chatty` ones talk among themselves; one with a `mark` gives it up to anyone the script puts there. */
  readonly extras: { actor: Actor; set: LocationId; talkT: number; chatty: boolean; mark?: string }[] = [];
  current: StageSet;
  private occupancy = new Map<string, CharacterId>(); // mark -> character
  private actorMark = new Map<CharacterId, string>();
  private backgroundIds = new Set<CharacterId>();
  /** The scene we cut away from while we're on the 2030 couch. */
  private paused: { set: StageSet; visible: CharacterId[] } | null = null;

  constructor(scene: THREE.Scene) {
    this.sets = {
      maclarens: buildMaclarens(), apartment: buildApartment(), barneys: buildBarneys(), rooftop: buildRooftop(),
      barneys_office: buildBarneysOffice(), office: buildOffice(), limo: buildLimo(), taxi: buildTaxi(), future: buildFuture(),
    };
    for (const s of Object.values(this.sets)) {
      s.group.visible = false;
      scene.add(s.group);
    }
    for (const id of CHARACTER_IDS) {
      const a = new Actor(CHARACTERS[id]);
      a.root.visible = false;
      scene.add(a.root);
      this.actors[id] = a;
    }
    this.buildExtras();
    this.current = this.sets.maclarens;
    this.current.group.visible = true;
  }

  private extra(i: number, name: string, look: Partial<CharacterDef['look']>) {
    const def: CharacterDef = {
      id: `extra${i}` as CharacterId,
      name,
      color: '#999',
      main: false,
      voice: CHARACTERS.carl.voice,
      look: { ...CHARACTERS.carl.look, extras: [], pants: '#2a2a30', build: 1, ...look } as CharacterDef['look'],
    };
    return new Actor(def);
  }

  /** Background patrons in MacLaren's, for atmosphere, and the cabbie. */
  private buildExtras() {
    const looks: Partial<CharacterDef['look']>[] = [
      { female: false, hair: '#2a1a12', hairStyle: 'short', top: '#5a6b7a', topStyle: 'polo', skin: '#c48a64', height: 1.8 },
      { female: true, hair: '#1a1210', hairStyle: 'ponytail', top: '#9a3a4a', topStyle: 'tee', skin: '#e8b996', height: 1.68 },
      { female: false, hair: '#8a6a3a', hairStyle: 'messy', top: '#3a5a3a', topStyle: 'flannel', plaid: ['#1a2a1a', '#9a8a5a'], skin: '#f0c4a4', height: 1.85 },
    ];
    // corner booth under the mural, and a floor table by the window
    const spots: [number, number, number, number][] = [[-6.42, -3.0, Math.PI / 2, 0.47], [-5.4, -3.92, 0, 0.47], [1.3, -3.78, 0, 0.48]];
    looks.forEach((l, i) => {
      const a = this.extra(i, 'Patron', l);
      a.place(new THREE.Vector3(spots[i][0], 0, spots[i][1]), spots[i][2], spots[i][3]);
      a.holdingGlass = true;
      this.sets.maclarens.group.add(a.root);
      this.extras.push({ actor: a, set: 'maclarens', talkT: rand(0, 3), chatty: true });
    });
    // they chat with each other
    this.extras[0].actor.lookAt = new THREE.Vector3(-5.4, 1.25, -3.92);
    this.extras[1].actor.lookAt = new THREE.Vector3(-6.42, 1.25, -3.0);

    // a cab always comes with a cabbie, unless Ranjit (or someone) takes the wheel
    const cabbie = this.extra(looks.length, 'Cabbie', {
      female: false, hair: '#3a2a20', hairStyle: 'receding', top: '#4a4238', topStyle: 'flannel', plaid: ['#2a2620', '#6a5a40'],
      skin: '#a8724c', height: 1.74, build: 1.15, extras: ['cap'],
    });
    const wheel = this.sets.taxi.marks.driver;
    cabbie.place(wheel.pos.clone(), wheel.facing, wheel.seat);
    this.sets.taxi.group.add(cabbie.root);
    this.extras.push({ actor: cabbie, set: 'taxi', talkT: 0, chatty: false, mark: 'driver' });
  }

  setLocation(id: LocationId, time: TimeOfDay) {
    this.paused = null;
    for (const s of Object.values(this.sets)) s.group.visible = false;
    this.current = this.sets[id] ?? this.sets.maclarens;
    this.current.group.visible = true;
    this.current.setTime(time);
    for (const a of Object.values(this.actors)) {
      a.root.visible = false;
      a.place(new THREE.Vector3(0, 0, 0), 0, null);
      a.emotion = 'neutral';
      a.holdingGlass = false;
    }
    this.occupancy.clear();
    this.actorMark.clear();
    this.backgroundIds.clear();
  }

  onStage(id: CharacterId) {
    return this.actors[id]?.root.visible ?? false;
  }

  onStageIds(): CharacterId[] {
    return CHARACTER_IDS.filter((id) => this.onStage(id));
  }

  /** On-stage characters who are part of the scene (excludes background like Carl behind the bar). */
  castIds(): CharacterId[] {
    return this.onStageIds().filter((id) => !this.backgroundIds.has(id));
  }

  setBackground(id: CharacterId, on: boolean) {
    if (on) this.backgroundIds.add(id);
    else this.backgroundIds.delete(id);
  }

  markOf(id: CharacterId) {
    return this.actorMark.get(id);
  }

  /** Resolve a mark name loosely (LLMs improvise). Falls back to a free standing spot. */
  resolveMark(name: string | undefined, forChar?: CharacterId): string {
    const marks = this.current.marks;
    if (name && marks[name] && this.isFree(name, forChar)) return name;
    if (name) {
      const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const hit = Object.keys(marks).find((k) => k === n) ?? Object.keys(marks).find((k) => k.includes(n) || n.includes(k));
      if (hit && this.isFree(hit, forChar)) return hit;
      // occupied: look for a free mark of the same family (booth_*, couch_*, bar_stool_*)
      const family = (hit ?? n).split('_')[0];
      const sibling = Object.keys(marks).find((k) => k.startsWith(family) && this.isFree(k, forChar));
      if (sibling) return sibling;
    }
    const reserved = this.current.reserved ?? [];
    const free = Object.keys(marks).filter((k) => this.isFree(k, forChar) && k !== this.current.door && !reserved.includes(k));
    const seats = free.filter((k) => marks[k].seat !== null);
    if (seats.length) return pick(seats);
    if (free.length) return pick(free);
    // a full house: squeeze in somewhere
    return marks.center ? 'center' : pick(Object.keys(marks).filter((k) => k !== this.current.door && !reserved.includes(k)));
  }

  private isFree(mark: string, forChar?: CharacterId) {
    const who = this.occupancy.get(mark);
    return !who || who === forChar;
  }

  private occupy(id: CharacterId, mark: string | null) {
    const prev = this.actorMark.get(id);
    if (prev && this.occupancy.get(prev) === id) this.occupancy.delete(prev);
    this.actorMark.delete(id);
    if (mark) {
      this.occupancy.set(mark, id);
      this.actorMark.set(id, mark);
    }
  }

  /** Standing spot near a mark, nudged if a standing mark is taken (people can share floor space). */
  private markPosition(m: Mark, name: string, id: CharacterId) {
    const p = m.pos.clone();
    if (m.seat === null) {
      const who = this.occupancy.get(name);
      if (who && who !== id) p.add(new THREE.Vector3(rand(-0.6, 0.6), 0, rand(0.3, 0.6)));
    }
    return p;
  }

  place(id: CharacterId, markName: string) {
    const name = this.resolveMark(markName, id);
    const m = this.current.marks[name];
    const a = this.actors[id];
    const pos = this.markPosition(m, name, id);
    pos.y = this.current.floorAt?.(pos.x, pos.z) ?? 0;
    a.place(pos, m.facing, m.seat, { pose: m.pose, prop: m.prop });
    a.root.visible = true;
    this.occupy(id, name);
  }

  /** Penny and Luke, in their spots on the couch. */
  seatKids() {
    for (const id of KIDS) {
      const m = this.sets.future.marks[KID_MARKS[id]];
      const a = this.actors[id];
      a.place(m.pos.clone(), m.facing, m.seat, { pose: m.pose, prop: m.prop });
      a.setEmotion('bored');
      a.root.visible = true;
    }
  }

  get inCutaway() {
    return this.paused !== null;
  }

  /** Cut to the kids on the couch in 2030, freezing the scene in progress. */
  cutToKids() {
    if (this.paused) return;
    const visible = this.onStageIds();
    this.paused = { set: this.current, visible };
    for (const id of visible) this.actors[id].root.visible = false;
    this.current.group.visible = false;
    this.current = this.sets.future;
    this.current.group.visible = true;
    this.current.setTime('night');
    this.seatKids();
  }

  /** Back to the story, exactly where we left it. */
  cutBack() {
    if (!this.paused) return;
    for (const id of KIDS) this.actors[id].root.visible = false;
    this.current.group.visible = false;
    this.current = this.paused.set;
    this.current.group.visible = true;
    for (const id of this.paused.visible) this.actors[id].root.visible = true;
    this.paused = null;
  }

  /** A* is overkill: Dijkstra over a tiny hand-made graph. */
  private route(from: THREE.Vector3, to: THREE.Vector3, fromNode: string, toNode: string) {
    const N = this.current.nodes;
    const adj = new Map<string, string[]>();
    for (const [a, b] of this.current.edges) {
      adj.set(a, [...(adj.get(a) ?? []), b]);
      adj.set(b, [...(adj.get(b) ?? []), a]);
    }
    const dist = new Map<string, number>([[fromNode, 0]]);
    const prev = new Map<string, string>();
    const open = new Set(Object.keys(N));
    while (open.size) {
      let u: string | null = null;
      for (const k of open) if (dist.has(k) && (u === null || dist.get(k)! < dist.get(u)!)) u = k;
      if (u === null) break;
      open.delete(u);
      if (u === toNode) break;
      for (const v of adj.get(u) ?? []) {
        const d = dist.get(u)! + N[u].distanceTo(N[v]);
        if (d < (dist.get(v) ?? Infinity)) {
          dist.set(v, d);
          prev.set(v, u);
        }
      }
    }
    const nodePath: string[] = [];
    let cur: string | undefined = toNode;
    while (cur) {
      nodePath.unshift(cur);
      if (cur === fromNode) break;
      cur = prev.get(cur);
    }
    if (nodePath[0] !== fromNode) nodePath.unshift(fromNode);
    const pts = nodePath.map((k) => N[k].clone());
    // skip the first node if we're already past it towards the second
    if (pts.length > 1 && from.distanceTo(pts[1]) < pts[0].distanceTo(pts[1])) pts.shift();
    if (pts.length > 1 && to.distanceTo(pts[pts.length - 2]) < pts[pts.length - 1].distanceTo(pts[pts.length - 2])) pts.pop();
    return pts;
  }

  private nearestNode(p: THREE.Vector3) {
    let best = '';
    let bd = Infinity;
    for (const [k, v] of Object.entries(this.current.nodes)) {
      const d = v.distanceTo(p);
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  }

  /** Walk to a mark or next to another character. */
  moveTo(id: CharacterId, target: string): Promise<void> {
    const a = this.actors[id];
    if (!a.root.visible) return this.enter(id, target);
    const prevMarkName = this.actorMark.get(id);
    let name: string;
    let dest: THREE.Vector3;
    let facing: number;
    let seat: number | null = null;
    let approach: THREE.Vector3 | undefined;
    let node: string;
    const other = (CHARACTER_IDS as readonly string[]).includes(target) ? (target as CharacterId) : null;
    // in a car you can't go stand next to someone: slide over to the free seat nearest them
    if (other && this.current.seated) target = this.seatNear(other, id) ?? (prevMarkName || target);
    if (other && other !== id && this.onStage(other) && !this.current.seated) {
      const o = this.actors[other];
      const op = o.position.clone();
      // stand in front of/next to them, on the audience side
      const side = Math.sign(op.x - a.position.x) || 1;
      dest = op.clone().add(new THREE.Vector3(-side * 0.75, 0, 0.55));
      facing = Math.atan2(op.x - dest.x, op.z - dest.z) * 0.6;
      node = this.nearestNode(dest);
      this.occupy(id, null);
      name = '';
    } else {
      name = this.resolveMark(target, id);
      const m = this.current.marks[name];
      dest = this.markPosition(m, name, id);
      facing = m.facing;
      seat = m.seat;
      approach = m.approach;
      node = m.node;
      this.occupy(id, name);
    }
    const curMark = prevMarkName && prevMarkName !== name ? this.current.marks[prevMarkName] : undefined;
    const pts: THREE.Vector3[] = [];
    const start = a.position.clone();
    const scoot = !!this.current.seated;
    if (scoot) {
      // straight along the seats (through the set's nodes on longer trips), never standing up
      if (start.distanceTo(dest) > 2.0) pts.push(...this.route(start, dest, this.nearestNode(start), node));
      pts.push(dest);
      return a.walk(pts, { facing, seat: seat ?? a.seatHeight, scoot });
    }
    if (a.isSitting && curMark?.approach) pts.push(curMark.approach.clone());
    const fromNode = this.nearestNode(pts[0] ?? start);
    const direct = (pts[0] ?? start).distanceTo(approach ?? dest) < 2.0;
    if (!direct) pts.push(...this.route(pts[0] ?? start, approach ?? dest, fromNode, node));
    if (approach) pts.push(approach.clone());
    pts.push(dest);
    return a.walk(pts, { facing, seat });
  }

  /** The free seat closest to someone (for sliding over to them in a car). */
  private seatNear(other: CharacterId, id: CharacterId) {
    if (!this.onStage(other)) return undefined;
    const p = this.actors[other].position;
    const reserved = this.current.reserved ?? [];
    let best: string | undefined;
    let bd = Infinity;
    for (const [k, m] of Object.entries(this.current.marks)) {
      if (m.seat === null || k === this.current.door || reserved.includes(k) || !this.isFree(k, id)) continue;
      const d = m.pos.distanceTo(p);
      if (d > 0.1 && d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  }

  enter(id: CharacterId, target?: string): Promise<void> {
    const door = this.current.marks[this.current.door];
    const a = this.actors[id];
    // climbing into a car: they appear sitting by the door and slide over
    a.place(door.pos.clone(), door.facing, this.current.seated ? door.seat : null);
    a.root.visible = true;
    this.occupy(id, null);
    return this.moveTo(id, target && target !== this.current.door ? target : 'center');
  }

  async exit(id: CharacterId) {
    if (!this.onStage(id)) return;
    await this.moveTo(id, this.current.door);
    this.actors[id].root.visible = false;
    this.occupy(id, null);
  }

  update(dt: number, t: number) {
    for (const a of Object.values(this.actors)) a.update(dt, t);
    // step actors up onto raised floors
    const floorAt = this.current.floorAt;
    if (floorAt)
      for (const a of Object.values(this.actors)) {
        const p = a.root.position;
        p.y += (floorAt(p.x, p.z) - p.y) * Math.min(1, dt * 14);
      }
    for (const e of this.extras) {
      if (!this.sets[e.set].group.visible) continue;
      if (e.mark) e.actor.root.visible = !this.occupancy.has(e.mark);
      if (!e.chatty) {
        e.actor.update(dt, t);
        continue;
      }
      e.talkT -= dt;
      if (e.talkT < 0) {
        e.actor.talking = !e.actor.talking;
        e.talkT = e.actor.talking ? rand(1, 3) : rand(1.5, 5);
        if (!e.actor.talking && Math.random() < 0.3) e.actor.doGesture('drink');
        if (Math.random() < 0.15) e.actor.setEmotion(pick(['happy', 'neutral', 'neutral'] as const));
      }
      e.actor.update(dt, t);
    }
    this.current.update?.(dt, t);
  }

  occluders(): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    this.current.group.traverse((o) => {
      if (o.userData.occluder) out.push(o);
    });
    return out;
  }
}
