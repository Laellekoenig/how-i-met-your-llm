import * as THREE from 'three';
import { box, cyl, glow, mesh, toon } from '../../engine/materials';
import { mulberry32 } from '../../util';

/** Original procedural surface patterns, traced in spirit from the episode stills. */
export function venuePattern(kind: 'leopard' | 'casino' | 'lattice', repeat: [number, number]) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = kind === 'leopard' ? '#bd9360' : kind === 'casino' ? '#4b202b' : '#a3aaa0';
  ctx.fillRect(0, 0, 256, 256);
  if (kind === 'leopard') {
    const r = mulberry32(71);
    for (let y = 20; y < 256; y += 45) for (let x = 18; x < 256; x += 48) {
      ctx.strokeStyle = '#322720'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.ellipse(x + r() * 12, y + r() * 10, 10 + r() * 5, 8, r() * 3, 0.3, 5.5); ctx.stroke();
    }
  } else if (kind === 'casino') {
    ctx.strokeStyle = '#a18050'; ctx.lineWidth = 3;
    for (let y = -64; y < 320; y += 64) for (let x = -32; x < 320; x += 64) {
      ctx.beginPath(); ctx.ellipse(x + (y % 128 ? 32 : 0), y, 24, 40, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#c49759'; ctx.fillRect(x - 3, y - 3, 6, 6);
    }
  } else {
    ctx.strokeStyle = '#666b60'; ctx.lineWidth = 3;
    for (let i = -256; i <= 512; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - 256, 256); ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
  return t;
}

export function rod(g: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const m = mesh(cyl(r, r, a.distanceTo(b), 6), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.add(m); return m;
}

export function roundTable(g: THREE.Group, x: number, z: number, r = 0.6, h = 0.75, color = '#312b2c') {
  g.add(mesh(cyl(r, r, 0.055, 24), toon('#9f9a87'), x, h - 0.025, z));
  g.add(mesh(cyl(r - 0.025, r - 0.025, 0.018, 24), toon(color), x, h + 0.008, z));
  g.add(mesh(cyl(0.045, 0.045, h, 8), toon('#8a8581'), x, h / 2, z));
  g.add(mesh(cyl(0.31, 0.35, 0.055, 16), toon('#383136'), x, 0.03, z));
}

/** Red circular stools at the Hoser Hut; chrome-backed chairs at the Leopard. */
export function roundSeat(g: THREE.Group, x: number, z: number, facing = 0, h = 0.49, back = true, chrome = false, backRise = .28) {
  const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = facing;
  const metal = toon(chrome ? '#a9a3a0' : '#252426'), leather = toon('#772e36');
  c.add(mesh(cyl(0.27, 0.27, 0.095, 16), leather, 0, h - 0.045, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.add(mesh(cyl(0.021, 0.021, h - 0.08, 6), metal, sx * 0.18, (h - 0.08) / 2, sz * 0.18));
  if (back) {
    c.add(mesh(new THREE.TorusGeometry(0.245, 0.022, 5, 16), metal, 0, h + backRise, -0.22));
    c.add(mesh(new THREE.CircleGeometry(0.22, 16), toon('#772e36', { side: THREE.DoubleSide }), 0, h + backRise, -0.22));
    for (const x of [-0.21, 0.21]) c.add(mesh(cyl(0.018, 0.018, 0.43, 6), metal, x, h + 0.13, -0.22));
  } else c.add(mesh(new THREE.TorusGeometry(0.22, 0.02, 4, 12), metal, 0, 0.26, 0).rotateX(Math.PI / 2));
  g.add(c); return c;
}

export function beer(g: THREE.Group, x: number, y: number, z: number) {
  g.add(mesh(cyl(0.052, 0.037, 0.15, 8), toon('#d49a3e'), x, y + 0.075, z));
  g.add(mesh(cyl(0.052, 0.052, 0.025, 8), toon('#e7dab1'), x, y + 0.155, z));
}

export function sconce(g: THREE.Group, x: number, y: number, z: number) {
  g.add(mesh(box(0.12, 0.4, 0.09), toon('#9a773a'), x, y, z));
  g.add(mesh(cyl(0.075, 0.075, 0.42, 10), glow('#ebca89', 0.85), x, y + 0.07, z + 0.13));
  for (const dy of [-0.15, 0.29]) g.add(mesh(cyl(0.09, 0.09, 0.035, 10), toon('#a7854c'), x, y + dy, z + 0.13));
}

export function mapleFlag(g: THREE.Group, x: number, y: number, z: number, scale = 1) {
  const f = new THREE.Group(); f.position.set(x, y, z); f.scale.setScalar(scale);
  f.add(mesh(box(1.5, 0.85, 0.025), toon('#e8dcc8')));
  for (const sx of [-0.57, 0.57]) f.add(mesh(box(0.36, 0.85, 0.035), toon('#b43b3e'), sx));
  const shape = new THREE.Shape();
  [[0,.33],[.09,.15],[.18,.2],[.15,.03],[.29,.08],[.23,-.05],[.29,-.1],[.04,-.2],[.025,-.31],[-.025,-.31],[-.04,-.2],[-.29,-.1],[-.23,-.05],[-.29,.08],[-.15,.03],[-.18,.2],[-.09,.15]].forEach(([a,b], i) => i ? shape.lineTo(a,b) : shape.moveTo(a,b));
  shape.closePath(); f.add(mesh(new THREE.ShapeGeometry(shape), toon('#b43b3e'), 0, 0, .025)); g.add(f);
}
