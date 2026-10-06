import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { testStage } from './helpers/sets';
import { Actor, gestureDuration, impliedEmotion } from '../src/world/actor';
import { CHARACTERS } from '../src/world/characters';
import { lipTrack } from '../src/world/lipsync';
import { EMOTIONS, GESTURES } from '../src/script/types';

testStage(); // stubs the canvas the textures draw on

// Reaching into the actor's private parts is the point here: what the face and body actually do.
type Inside = Actor & Record<string, any>;
const actor = (id: keyof typeof CHARACTERS = 'ted') => {
  const a = new Actor(CHARACTERS[id]) as Inside;
  a.place(new THREE.Vector3(), 0, null);
  return a;
};
const run = (a: Actor, seconds: number, from = 0) => {
  for (let t = 0; t < seconds; t += 1 / 30) a.update(1 / 30, from + t);
};

describe('lip sync', () => {
  test('the mouth opens on vowels and shuts on m, b and p', () => {
    const tr = lipTrack('Mom, bob.', 2);
    const samples = Array.from({ length: 200 }, (_, i) => tr.at((i / 200) * 2).open);
    expect(Math.max(...samples)).toBeGreaterThan(0.6);
    // "Mom" ends shut on the m: somewhere after its peak the lips meet
    const peak = samples.indexOf(Math.max(...samples.slice(0, 60)));
    expect(Math.min(...samples.slice(peak, 80))).toBeLessThan(0.05);
  });

  test('commas and full stops are pauses, and rounded vowels round the lips', () => {
    const tr = lipTrack('Go, go.', 2);
    const opens = Array.from({ length: 100 }, (_, i) => tr.at(i / 50));
    expect(opens.some((m) => m.round > 0.5)).toBe(true);
    // the comma's pause sits between the two words, mouth closed
    const quiet = opens.slice(25, 75).filter((m) => m.open === 0).length;
    expect(quiet).toBeGreaterThan(5);
    expect(tr.at(2.5).open).toBe(0);
  });

  test('a word boundary from the voice maps back to when that word starts', () => {
    const line = 'Suit up, everyone.';
    const tr = lipTrack(line, 3);
    const up = tr.wordAt(line.indexOf('up')), everyone = tr.wordAt(line.indexOf('everyone'));
    expect(up).toBeGreaterThan(0);
    expect(everyone).toBeGreaterThan(up);
    expect(everyone).toBeLessThan(3);
  });

  test('the actor pulls back into step when the voice reports a word', () => {
    const a = actor();
    const line = 'Suit up, everyone, right now.';
    const tr = lipTrack(line, 3);
    a.talking = true;
    a.speak(tr);
    run(a, 0.2);
    a.syncWord(line.indexOf('right'));
    expect(a.lipT).toBeCloseTo(tr.wordAt(line.indexOf('right')), 5);
  });
});

describe('emotions', () => {
  test('every emotion and gesture is staged', () => {
    for (const g of GESTURES) if (g !== 'none' && g !== 'sit' && g !== 'stand') expect(gestureDuration(g), g).toBeGreaterThan(0);
    for (const e of EMOTIONS) {
      const a = actor();
      a.setEmotion(e);
      expect(a.emotion).toBe(e);
    }
  });

  test('a look holds for a while, then they relax back to their own resting face', () => {
    const a = actor('barney');
    a.setEmotion('surprised');
    run(a, 2);
    expect(a.emotion).toBe('surprised');
    run(a, 6, 2);
    expect(a.emotion).toBe('neutral');
    run(a, 6, 8);
    // Barney's rest is a smirk, so even relaxed he smiles more than Ted does
    const ted = actor('ted');
    run(ted, 1);
    expect(a.face.smirk).toBeGreaterThan(0.3);
    expect(a.face.smirk).toBeGreaterThan(ted.face.smirk);
  });

  test('a drunk stays drunk, and a speaker holds their look through the line', () => {
    const a = actor();
    a.setEmotion('drunk');
    run(a, 30);
    expect(a.emotion).toBe('drunk');
    const b = actor();
    b.setEmotion('surprised');
    b.talking = true;
    run(b, 8);
    expect(b.emotion).toBe('surprised');
  });

  test('the body follows the mood: slumped when sad, hands on hips when smug, shoulders up when scared', () => {
    const shoulder = (e: (typeof EMOTIONS)[number]) => {
      const a = actor();
      a.setEmotion(e);
      run(a, 1.5);
      return { spine: a.spine.rotation.x, lSh: a.lSh.rotation.toArray().slice(0, 3) as number[], lift: a.lSh.position.y - a.shY0 };
    };
    const calm = shoulder('neutral');
    expect(shoulder('sad').spine).toBeGreaterThan(calm.spine + 0.08);
    expect(shoulder('smug').lSh[0]).toBeGreaterThan(0.6);
    expect(shoulder('scared').lift).toBeGreaterThan(calm.lift + 0.015);
  });

  test('blushing, crying and anger show in the skin', () => {
    const a = actor();
    a.setEmotion('embarrassed');
    run(a, 1.5);
    expect(a.cheeks.every((c: THREE.Mesh) => c.visible)).toBe(true);
    a.setEmotion('crying');
    run(a, 1.5);
    expect(a.tears.every((t: { mesh: THREE.Mesh }) => t.mesh.visible)).toBe(true);
    const skin = a.faceSkin.color.clone();
    a.setEmotion('angry');
    run(a, 1.5);
    expect(a.faceSkin.color.r - a.faceSkin.color.g).toBeGreaterThan(skin.r - skin.g);
  });
});

describe('eyes', () => {
  test('the irises turn toward whoever they look at', () => {
    const iris = (x: number) => {
      const a = actor();
      a.root.updateWorldMatrix(true, true);
      a.lookAt = new THREE.Vector3(x, 1.6, 1.5);
      // no darting about, for the measurement
      a.saccade = { x: 0, y: 0, t: 99 };
      a.idleT = 99;
      run(a, 1);
      return a.eyeParts[0].iris.position.x;
    };
    // the character's left is +x
    expect(iris(1.5)).toBeGreaterThan(iris(-1.5) + 0.002);
  });

  test('eyes narrow when bored, widen in surprise and shut in a blink', () => {
    const open = (e: (typeof EMOTIONS)[number]) => {
      const a = actor();
      a.setEmotion(e);
      run(a, 1.5);
      a.blinkT = 10;
      a.update(1 / 60, 2);
      return a.eyes.scale.y;
    };
    expect(open('bored')).toBeLessThan(open('neutral') - 0.25);
    expect(open('surprised')).toBeGreaterThan(open('neutral') + 0.15);
    const a = actor();
    a.blinkT = 0.1;
    a.update(1 / 60, 3);
    expect(a.eyes.scale.y).toBeLessThan(0.2);
  });
});

describe('gestures', () => {
  test('the new ones bring their own face', () => {
    expect(impliedEmotion('crack_up')?.emotion).toBe('laughing');
    expect(impliedEmotion('sob')?.emotion).toBe('crying');
    expect(impliedEmotion('double_take')?.at).toBeGreaterThan(0);
    expect(impliedEmotion('wave')).toBeUndefined();
  });

  test('a slow clap claps four times', () => {
    const a = actor();
    const beats: string[] = [];
    a.onGestureBeat = (g) => beats.push(g);
    a.doGesture('slow_clap');
    run(a, 3.5);
    expect(beats).toEqual(['slow_clap', 'slow_clap', 'slow_clap', 'slow_clap']);
  });

  test('a sip of their own while waiting never fires the last scripted gesture\'s beat', () => {
    const a = actor();
    let fired = 0;
    a.onGestureBeat = () => fired++;
    a.doGesture('drink', { silent: true });
    run(a, 2.5);
    expect(fired).toBe(0);
  });

  test('a reaction can land a moment later, on the actor\'s own clock', () => {
    const a = actor();
    a.later(0.3, () => a.setEmotion('surprised'));
    run(a, 0.2);
    expect(a.emotion).toBe('neutral');
    run(a, 0.2, 0.2);
    expect(a.emotion).toBe('surprised');
  });
});
