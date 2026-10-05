import * as THREE from 'three';
import { Actor } from '../world/actor';
import { CHARACTERS, type CharacterDef } from '../world/characters';
import type { StageSet, Mark } from '../world/sets/common';
import { buildMaclarens } from '../world/sets/maclarens';
import { buildApartment } from '../world/sets/apartment';
import { buildBarneys } from '../world/sets/barneys';
import { CHARACTER_IDS, type CharacterId, type LocationId, type TimeOfDay } from '../script/types';
import { pick, rand } from '../util';

/** Owns the sets and actors; knows how to place and move people around. */
export class Stage {
  readonly sets: Record<LocationId, StageSet>;
  readonly actors = {} as Record<CharacterId, Actor>;
  readonly extras: { actor: Actor; set: LocationId; talkT: number }[] = [];
  current: StageSet;
  private occupancy = new Map<string, CharacterId>(); // mark -> character
  private actorMark = new Map<CharacterId, string>();
  private backgroundIds = new Set<CharacterId>();

  constructor(scene: THREE.Scene) {
    this.sets = { maclarens: buildMaclarens(), apartment: buildApartment(), barneys: buildBarneys() };
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

  /** Background patrons in MacLaren's, for atmosphere. */
  private buildExtras() {
    const looks: Partial<CharacterDef['look']>[] = [
      { female: false, hair: '#2a1a12', hairStyle: 'short', top: '#5a6b7a', topStyle: 'polo', skin: '#c48a64', height: 1.8 },
      { female: true, hair: '#1a1210', hairStyle: 'ponytail', top: '#9a3a4a', topStyle: 'tee', skin: '#e8b996', height: 1.68 },
      { female: false, hair: '#8a6a3a', hairStyle: 'messy', top: '#3a5a3a', topStyle: 'flannel', plaid: ['#1a2a1a', '#9a8a5a'], skin: '#f0c4a4', height: 1.85 },
    ];
    const spots: [number, number, number][] = [[-5.05, -3.0, 0.9], [-4.35, -3.35, -0.6], [3.25, -3.65, Math.PI / 2 - 0.3]];
    looks.forEach((l, i) => {
      const def: CharacterDef = {
        id: `extra${i}` as CharacterId,
        name: 'Patron',
        color: '#999',
        main: false,
        voice: CHARACTERS.carl.voice,
        look: { ...CHARACTERS.carl.look, extras: [], pants: '#2a2a30', build: 1, ...l } as CharacterDef['look'],
      };
      const a = new Actor(def);
      a.place(new THREE.Vector3(spots[i][0], 0, spots[i][1]), spots[i][2], null);
      a.holdingGlass = true;
      this.sets.maclarens.group.add(a.root);
      this.extras.push({ actor: a, set: 'maclarens', talkT: rand(0, 3) });
    });
    // they chat with each other
    this.extras[0].actor.lookAt = new THREE.Vector3(-4.35, 1.6, -3.35);
    this.extras[1].actor.lookAt = new THREE.Vector3(-5.05, 1.6, -3.0);
  }

  setLocation(id: LocationId, time: TimeOfDay) {
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
    const free = Object.keys(marks).filter((k) => this.isFree(k, forChar) && k !== this.current.door && k !== 'behind_bar');
    const seats = free.filter((k) => marks[k].seat !== null);
    return seats.length ? pick(seats) : free.length ? pick(free) : 'center';
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
    a.place(this.markPosition(m, name, id), m.facing, m.seat);
    a.root.visible = true;
    this.occupy(id, name);
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
    if (other && other !== id && this.onStage(other)) {
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
    if (a.isSitting && curMark?.approach) pts.push(curMark.approach.clone());
    const fromNode = this.nearestNode(pts[0] ?? start);
    const direct = (pts[0] ?? start).distanceTo(approach ?? dest) < 2.0;
    if (!direct) pts.push(...this.route(pts[0] ?? start, approach ?? dest, fromNode, node));
    if (approach) pts.push(approach.clone());
    pts.push(dest);
    return a.walk(pts, { facing, seat });
  }

  enter(id: CharacterId, target?: string): Promise<void> {
    const door = this.current.marks[this.current.door];
    const a = this.actors[id];
    a.place(door.pos.clone(), door.facing, null);
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
    for (const e of this.extras) {
      if (!this.sets[e.set].group.visible) continue;
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
