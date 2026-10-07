import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import './helpers/sets';
import { Actor } from '../src/world/actor';
import { gestureDuration } from '../src/world/gestures';
import { CHARACTERS } from '../src/world/characters';
import { CHARACTER_IDS, GESTURES, PROPS, type Prop } from '../src/script/types';
import { GRIP } from '../src/world/props';

// Check the rendered rig and contact points, rather than the authored joint angles.
const make = (id: keyof typeof CHARACTERS = 'ted', seated = false) => {
  const a = new Actor(CHARACTERS[id]) as any;
  a.place(new THREE.Vector3(), 0, seated ? 0.47 : null);
  a.idleT = 999; a.blinkT = 999;
  return a;
};
const run = (a: Actor, duration: number) => {
  for (let t = 0; t < duration - 1e-6; t += 1 / 60) a.update(1 / 60, t);
  a.root.updateWorldMatrix(true, true);
};
const point = (o: THREE.Object3D, x = 0, y = 0, z = 0) => o.localToWorld(new THREE.Vector3(x, y, z));

describe('gesture contacts', () => {
  test('glass and bottle rims meet the lips for every character, standing and seated', () => {
    for (const id of CHARACTER_IDS) for (const seated of [false, true]) for (const prop of [null, 'glass', 'beer'] as const) {
      const a = make(id, seated);
      a.hold(prop);
      a.lookAt = new THREE.Vector3(0.7, 1.5, 2);
      a.doGesture('drink');
      run(a, 1);
      const rim = point(a.propObj ?? a.glass, 0, prop === 'beer' ? 0.195 : 0.09, prop === 'beer' ? 0 : -0.033);
      const mouth = point(a.mouthOpen);
      expect(rim.distanceTo(mouth), `${id} ${prop} seated=${seated}`).toBeLessThan(0.014);
    }
  });

  test('a phone rests against the ear with the screen facing the head', () => {
    for (const id of ['ted', 'lily', 'marshall', 'patrice'] as const) for (const prop of [null, 'phone', 'beer'] as const) {
      const a = make(id);
      a.hold(prop); a.doGesture('phone_call'); run(a, 1);
      const phone = prop === 'phone' ? a.propObj : a.callPhone;
      const side = prop === 'beer' ? 1 : -1;
      const ear = point(a.head, side * 0.38 * a.headH, 0.42 * a.headH * (a.def.look.face?.long ?? 1), 0);
      expect(point(phone, 0, 0.105, -0.007).distanceTo(ear)).toBeLessThan(0.012);
      const inward = new THREE.Vector3(-side, 0, 0).transformDirection(a.head.matrixWorld);
      const screen = new THREE.Vector3(0, 0, -1).transformDirection(phone.matrixWorld);
      expect(screen.dot(inward)).toBeGreaterThan(0.98);
    }
  });

  test('clapping brings the palms together on each audible beat', () => {
    const a = make();
    const gaps: number[] = [];
    a.onGestureBeat = () => gaps.push(point(a.lHand.palm).distanceTo(point(a.rHand.palm)));
    a.doGesture('slow_clap'); run(a, 3.3);
    expect(gaps.length).toBe(4);
    for (const gap of gaps) expect(gap).toBeLessThan(0.06);
  });

  test('pointing, thumbs up and air quotes articulate the intended fingers', () => {
    const a = make();
    a.doGesture('point'); run(a, 0.7);
    expect(Math.abs(a.rHand.fingers[3].base.rotation.z)).toBeLessThan(0.1);
    expect(Math.abs(a.rHand.fingers[2].base.rotation.z)).toBeGreaterThan(1);
    a.doGesture('thumbs_up'); run(a, 0.7);
    const thumb = point(a.rHand.thumb, 0, 0, 0.03).sub(point(a.rHand.thumb)).normalize();
    expect(thumb.y).toBeGreaterThan(0.9);
    a.doGesture('air_quotes'); run(a, 0.38);
    for (const hand of [a.lHand, a.rHand]) {
      expect(Math.abs(hand.fingers[0].base.rotation.z)).toBeGreaterThan(1);
      expect(Math.abs(hand.fingers[3].base.rotation.z)).toBeLessThan(0.7);
    }
  });

  test('paired high fives and fist bumps meet between the actors', () => {
    for (const g of ['high_five', 'fist_bump'] as const) {
      const a = make('ted'), b = make('lily');
      a.place(new THREE.Vector3(-0.32, 0, 0), Math.PI / 2, null);
      b.place(new THREE.Vector3(0.32, 0, 0), -Math.PI / 2, null);
      a.doGesture(g, { partner: true, target: b }); b.doGesture(g, { partner: true, target: a });
      for (let i = 0; i < 45; i++) { a.update(1 / 60, i / 60); b.update(1 / 60, i / 60); }
      const offset = g === 'fist_bump' ? -0.065 : -0.03;
      expect(point(a.rHand.wrist, 0, offset * a.height / 1.8, 0).distanceTo(point(b.rHand.wrist, 0, offset * b.height / 1.8, 0))).toBeLessThan(0.07);
    }
  });

  test('reaching for someone beside or behind never swings a hand behind the back', () => {
    for (const g of ['give', 'high_five', 'fist_bump', 'point', 'cheers', 'slap'] as const)
      for (const seated of [false, true]) for (const deg of [-150, -90, 90, 150, 180]) {
        const a = make('ted', seated), b = make('robin', seated);
        const angle = deg * Math.PI / 180;
        b.place(new THREE.Vector3(Math.sin(angle) * 0.8, 0, Math.cos(angle) * 0.8), angle + Math.PI, seated ? 0.47 : null);
        if (g === 'give') a.hold('book');
        if (!seated) a.faceTowards(b.position, 0.1);
        a.lookAt = b.headWorld;
        a.doGesture(g, { target: b, partner: g === 'high_five' || g === 'fist_bump' || g === 'cheers' });
        for (let i = 0; i < 60; i++) {
          a.update(1 / 60, i / 60); b.update(1 / 60, i / 60); a.root.updateWorldMatrix(true, true);
          for (const [sh, hand, side] of [[a.lSh, a.lHand, 1], [a.rSh, a.rHand, -1]] as const) {
            const wrist = a.spine.worldToLocal(point(hand.wrist));
            expect(wrist.z - sh.position.z, `${g} seated=${seated} ${deg}° frame ${i}`).toBeGreaterThan(-0.09);
            expect((wrist.x - sh.position.x) * side, `${g} seated=${seated} ${deg}° frame ${i}`).toBeGreaterThan(-0.45);
          }
        }
      }
  });

  test('a paired kiss stops at the lips without overlapping the faces', () => {
    const a = make('ted'), b = make('robin');
    a.place(new THREE.Vector3(-0.32, 0, 0), Math.PI / 2, null);
    b.place(new THREE.Vector3(0.32, 0, 0), -Math.PI / 2, null);
    a.doGesture('kiss', { partner: true, target: b }); b.doGesture('kiss', { partner: true, target: a });
    for (let i = 0; i < 60; i++) { a.update(1 / 60, i / 60); b.update(1 / 60, i / 60); }
    const left = point(a.mouthOpen), right = point(b.mouthOpen);
    expect(right.x - left.x).toBeGreaterThan(0.025);
    expect(left.distanceTo(right)).toBeLessThan(0.05);
  });
});

describe('held props in motion', () => {
  test('an implicit drink stays in hand and the arm returns without a one-frame jump', () => {
    const a = make(); a.doGesture('drink');
    let previous = point(a.rHand.wrist);
    for (let i = 0; i < 150; i++) {
      a.update(1 / 60, i / 60);
      const current = point(a.rHand.wrist);
      expect(current.distanceTo(previous), `frame ${i}`).toBeLessThan(0.09);
      previous = current;
    }
    expect(a.glass.visible).toBe(true);
    expect(a.holdingGlass).toBe(true);
    expect(point(a.glass).distanceTo(point(a.rHand.socket))).toBeLessThan(0.001);
  });

  test('all hand and hanging props stay upright while raised, lowered and gesturing', () => {
    for (const prop of PROPS.filter(p => GRIP[p] !== 'arms')) {
      const a = make(); a.hold(prop);
      for (const g of ['hands_up', 'cheers', 'give', 'dance', 'shrug', 'facepalm'] as const) {
        a.doGesture(g);
        const frames = Math.ceil((gestureDuration(g) + 0.2) * 30);
        for (let i = 0; i < frames; i++) {
          a.update(1 / 30, i / 30); a.root.updateWorldMatrix(true, true);
          const up = new THREE.Vector3(0, 1, 0).transformDirection(a.propObj.matrixWorld);
          expect(up.y, `${prop} ${g} frame ${i}`).toBeGreaterThan(0.999);
          expect(a.propObj.parent).toBe(a.rHand.socket);
        }
      }
    }
  });

  test('carried props remain supported by both hands through upper-body gestures', () => {
    for (const prop of PROPS.filter(p => GRIP[p] === 'arms') as Prop[]) {
      const a = make('lily', true); a.hold(prop);
      for (const g of ['hands_up', 'dance', 'facepalm', 'phone_call'] as const) {
        a.doGesture(g); run(a, 0.6);
        const box = new THREE.Box3().setFromObject(a.propObj);
        for (const hand of [a.lHand, a.rHand]) expect(box.distanceToPoint(point(hand.palm)), prop).toBeLessThan(0.045);
        expect(a.callPhone).toBeNull();
      }
    }
  });

  test('a drink action never brings an unrelated prop to the mouth', () => {
    const a = make(); a.hold('book'); run(a, 0.8);
    const before = point(a.propObj);
    a.doGesture('drink'); run(a, 0.9);
    expect(point(a.propObj).distanceTo(before)).toBeLessThan(0.025);
    expect(a.glass.visible).toBe(false);
  });

  test('every gesture stays finite and preserves the rig lengths on different body types', () => {
    for (const id of ['lily', 'marshall', 'patrice', 'brad', 'luke'] as const) {
      const a = make(id);
      for (const g of GESTURES) {
        a.doGesture(g); run(a, Math.max(0.1, gestureDuration(g) * 0.5));
        a.root.traverse((o: THREE.Object3D) => expect(o.matrixWorld.elements.every(Number.isFinite), `${id} ${g} ${o.name}`).toBe(true));
        expect(a.lSh.scale.toArray()).toEqual([1, 1, 1]);
        expect(a.rEl.scale.toArray()).toEqual([1, 1, 1]);
      }
    }
  });
});
