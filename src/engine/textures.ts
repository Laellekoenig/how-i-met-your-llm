import * as THREE from 'three';
import { mulberry32 } from '../util';

// Small procedural canvas textures. Kept deliberately low-res: the
// post-process pixelates everything anyway, and chunky texels sell the look.

function canvas(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

const shade = (hex: string, f: number) => {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
};

/** Small original wardrobe prints; all are generated locally, without reference photographs. */
export function wardrobePrint(base: string, kind: 'floral' | 'botanical' | 'sparkle' | 'stripes', accent = '#d6c7ad') {
  return canvas(64, 64, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    if (kind === 'stripes') {
      g.fillStyle = accent;
      for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 16);
    } else if (kind === 'sparkle') {
      const rand = mulberry32(74);
      for (let i = 0; i < 240; i++) {
        g.fillStyle = i % 3 ? '#b9986f' : '#ece0bf';
        g.fillRect(rand() * w, rand() * h, 1, 1.5);
      }
    } else if (kind === 'botanical') {
      // Lily's scattered blush/ivory flowers and sage leaves on a charcoal dress.
      // Irregular sprigs leave plenty of dark fabric visible between the clusters.
      for (const [x, y, tilt] of [[13, 16, -0.4], [45, 43, 0.5], [49, 8, -0.2]]) {
        g.save(); g.translate(x, y); g.rotate(tilt);
        g.strokeStyle = '#8c8970'; g.lineWidth = 0.7;
        g.beginPath(); g.moveTo(-3, 12); g.quadraticCurveTo(5, 2, 0, -8); g.stroke();
        for (const [lx, ly, angle] of [[-2, 7, -0.6], [4, 3, 0.7], [-2, -5, -0.7]]) {
          g.fillStyle = '#9b9f85';
          g.beginPath(); g.ellipse(lx, ly, 3, 1.3, angle, 0, Math.PI * 2); g.fill();
        }
        for (const [fx, fy, radius] of [[0, -4, 2.4], [3, 5, 1.8]]) {
          for (let i = 0; i < 5; i++) {
            const a = i * Math.PI * 2 / 5;
            g.fillStyle = i % 2 ? '#d1aca2' : '#ded2bd';
            g.beginPath(); g.ellipse(fx + Math.cos(a) * radius, fy + Math.sin(a) * radius, radius, radius * 0.65, a, 0, Math.PI * 2); g.fill();
          }
          g.fillStyle = '#b18d65'; g.fillRect(fx - 0.6, fy - 0.6, 1.2, 1.2);
        }
        g.restore();
      }
    } else {
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
        const x = 8 + col * 22 + (row % 2) * 5, y = 10 + row * 22;
        g.strokeStyle = '#6a836e'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x + 2, y - 2); g.stroke();
        g.fillStyle = (row + col) % 2 ? '#d3a563' : '#b8817b';
        for (let i = 0; i < 5; i++) {
          const a = i * Math.PI * 2 / 5;
          g.beginPath(); g.ellipse(x + Math.cos(a) * 2, y + Math.sin(a) * 2, 2, 1.5, a, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = '#f4dca1'; g.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  });
}

/** Small woven tie motifs, with UVs spanning the length of the tie. */
export function tieWeave(base: string, accent: string, pattern: 'stripes' | 'diamonds' | 'dots') {
  return canvas(32, 128, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    if (pattern === 'dots') {
      g.fillStyle = accent;
      for (let row = 0; row < 8; row++) {
        const x = row % 2 ? 23 : 9, y = row * 16 + 8;
        g.fillRect(x - 2, y - 1, 5, 2);
      }
      return;
    }
    g.strokeStyle = accent;
    g.lineWidth = pattern === 'stripes' ? 2 : 1.5;
    for (let y = -32; y < h + 32; y += pattern === 'stripes' ? 18 : 12) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 16); g.stroke();
      if (pattern === 'diamonds') {
        g.beginPath(); g.moveTo(w, y); g.lineTo(0, y + 16); g.stroke();
      }
    }
  });
}

/** Fine vertical stripes on a dress shirt; UVs use garment-space metres. */
export function shirtStripes(base: string, accent: string) {
  return canvas(32, 32, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = accent;
    for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h);
  });
}

/** Original kitchenware/fruit print inspired by Judy's cream cooking apron. */
export function kitchenPrint() {
  return canvas(64, 64, (g, w, h) => {
    g.fillStyle = '#eee5ce'; g.fillRect(0, 0, w, h);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x = col * 16 + 7, y = row * 16 + 8;
      const pot = (row + col) % 2 === 0;
      g.fillStyle = pot ? '#514139' : '#973944';
      g.beginPath(); g.ellipse(x, y, pot ? 5 : 3, 4, 0, 0, Math.PI * 2); g.fill();
      if (pot) {
        g.fillRect(x - 5, y - 5, 10, 2); g.fillRect(x - 1, y - 7, 2, 2);
        g.strokeStyle = '#514139'; g.strokeRect(x + 4, y - 2, 3, 3);
      } else {
        g.fillStyle = '#60714a'; g.fillRect(x, y - 6, 3, 2);
      }
    }
  });
}

export function planks(base: string, repeat: [number, number], seed = 1) {
  const r = mulberry32(seed);
  return canvas(64, 64, (g, w, h) => {
    const rows = 4;
    for (let i = 0; i < rows; i++) {
      let x = -r() * 40;
      while (x < w) {
        const len = 24 + r() * 30;
        g.fillStyle = shade(base, 0.8 + r() * 0.35);
        g.fillRect(x, (i * h) / rows, len, h / rows);
        g.fillStyle = shade(base, 0.55);
        g.fillRect(x, (i * h) / rows, 1, h / rows);
        x += len;
      }
      g.fillStyle = shade(base, 0.5);
      g.fillRect(0, (i * h) / rows, w, 1);
    }
  }, repeat);
}

export function paneling(base: string, repeat: [number, number]) {
  return canvas(32, 32, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.fillStyle = shade(base, 0.65);
    g.fillRect(3, 3, w - 6, h - 6);
    g.fillStyle = shade(base, 0.85);
    g.fillRect(5, 5, w - 10, h - 10);
    g.fillStyle = shade(base, 1.2);
    g.fillRect(3, 3, w - 6, 1);
  }, repeat);
}

export function brick(base: string, mortar: string, repeat: [number, number], seed = 3) {
  const r = mulberry32(seed);
  return canvas(64, 64, (g, w, h) => {
    g.fillStyle = mortar;
    g.fillRect(0, 0, w, h);
    const bh = 8, bw = 16;
    for (let y = 0; y < h; y += bh) {
      const off = (y / bh) % 2 ? bw / 2 : 0;
      for (let x = -bw; x < w + bw; x += bw) {
        g.fillStyle = shade(base, 0.75 + r() * 0.45);
        g.fillRect(x + off + 1, y + 1, bw - 2, bh - 2);
      }
    }
  }, repeat);
}

export function stripes(a: string, b: string, repeat: [number, number], vertical = true) {
  return canvas(16, 16, (g, w, h) => {
    g.fillStyle = a;
    g.fillRect(0, 0, w, h);
    g.fillStyle = b;
    for (let i = 0; i < 16; i += 8) vertical ? g.fillRect(i, 0, 3, h) : g.fillRect(0, i, w, 3);
  }, repeat);
}

export function plaid(base: string, line1: string, line2: string) {
  return canvas(16, 16, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.globalAlpha = 0.7;
    g.fillStyle = line1;
    g.fillRect(0, 5, w, 3);
    g.fillRect(5, 0, 3, h);
    g.globalAlpha = 0.6;
    g.fillStyle = line2;
    g.fillRect(0, 12, w, 1);
    g.fillRect(12, 0, 1, h);
  }, [3, 3]);
}

/** Flecked herringbone-ish wool, for Ted's jacket. */
export function tweed(base: string, seed = 29) {
  const r = mulberry32(seed);
  return canvas(16, 16, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const band = Math.floor(x / 4) % 2 ? (x + y) % 4 < 2 : (x - y + 16) % 4 < 2;
        const f = (band ? 1.12 : 0.88) + (r() - 0.5) * 0.25;
        g.fillStyle = shade(base, f);
        g.fillRect(x, y, 1, 1);
      }
  });
}

/** Faint diagonal twill, for jeans. */
export function denim(base: string, seed = 31) {
  const r = mulberry32(seed);
  return canvas(16, 16, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const f = ((x + y) % 3 === 0 ? 1.1 : 0.96) + (r() - 0.5) * 0.12;
        g.fillStyle = shade(base, f);
        g.fillRect(x, y, 1, 1);
      }
  });
}

export function rug(a: string, b: string, c: string) {
  return canvas(32, 32, (g, w, h) => {
    g.fillStyle = a;
    g.fillRect(0, 0, w, h);
    g.fillStyle = b;
    g.fillRect(2, 2, w - 4, h - 4);
    g.fillStyle = a;
    g.fillRect(5, 5, w - 10, h - 10);
    g.fillStyle = c;
    for (let i = 0; i < 4; i++) g.fillRect(9 + i * 4, 9 + i * 2, 2, h - 18 - i * 4);
  });
}

/** City skyline through a window. */
export function skyline(night: boolean, seed = 7) {
  const r = mulberry32(seed);
  return canvas(96, 64, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    if (night) {
      sky.addColorStop(0, '#0b1030');
      sky.addColorStop(1, '#3a2a55');
    } else {
      sky.addColorStop(0, '#7fb2e8');
      sky.addColorStop(1, '#d9e6f0');
    }
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    for (let layer = 0; layer < 2; layer++) {
      let x = 0;
      while (x < w) {
        const bw = 6 + r() * 12;
        const bh = (layer ? 20 : 30) + r() * (layer ? 30 : 26);
        const col = night ? (layer ? '#141428' : '#232340') : layer ? '#5d6878' : '#8a95a5';
        g.fillStyle = col;
        g.fillRect(x, h - bh, bw, bh);
        for (let wy = h - bh + 3; wy < h - 2; wy += 4)
          for (let wx = x + 2; wx < x + bw - 2; wx += 3)
            if (r() < (night ? 0.35 : 0.5)) {
              g.fillStyle = night ? (r() < 0.8 ? '#f6d27a' : '#9ad0ff') : '#b9c6d6';
              g.fillRect(wx, wy, 1, 2);
            }
        x += bw + (layer ? 0 : r() * 4);
      }
    }
    if (night) {
      g.fillStyle = '#fff6d0';
      for (let i = 0; i < 20; i++) g.fillRect(r() * w, r() * h * 0.4, 1, 1);
    }
  });
}

/** The station's blue/yellow badge, drawn locally so the set has no external assets. */
export function metroNewsLogo() {
  return canvas(384, 128, (g, w, h) => {
    g.fillStyle = '#203956'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4b72a'; g.beginPath(); g.arc(295, 64, 55, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f8f3e5'; g.font = 'italic bold 43px Helvetica';
    g.fillText('METRO', 20, 58); g.fillText('NEWS', 20, 106);
    g.fillStyle = '#20478b'; g.font = 'italic bold 108px Helvetica'; g.fillText('1', 257, 106);
  });
}

/** Printed dusk Manhattan backdrop behind the Metro News One desk. */
export function metroNewsBackdrop() {
  const r = mulberry32(122);
  return canvas(640, 240, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#222b46'); sky.addColorStop(0.6, '#bc6a64'); sky.addColorStop(1, '#f2b985');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const building = (x: number, y: number, bw: number, color: string) => {
      g.fillStyle = color; g.fillRect(x, y, bw, h - y);
      for (let wy = y + 7; wy < h; wy += 9) for (let wx = x + 4; wx < x + bw - 3; wx += 7) {
        if (r() < 0.72) { g.fillStyle = r() < 0.8 ? '#c5ddd4' : '#ffdaa1'; g.fillRect(wx, wy, 3, 4); }
      }
    };
    for (let x = 0; x < w; x += 29) building(x, 90 + r() * 80, 24 + r() * 13, '#344555');
    for (let x = 0; x < w; x += 48) building(x, 125 + r() * 75, 38 + r() * 14, '#182d3a');
    // Empire State and Chrysler silhouettes, the recognizable peaks in the reference.
    for (const [x, top, bw] of [[169, 43, 34], [503, 32, 32]]) {
      building(x, top + 28, bw, '#283e49');
      building(x + 5, top + 12, bw - 10, '#42545b');
      g.fillStyle = '#f6ddb0'; g.fillRect(x + 10, top, bw - 20, 18);
      g.fillRect(x + bw / 2 - 1, top - 21, 2, 23);
    }
  });
}

export function lectureChalkboard() {
  return canvas(768, 256, (g, w, h) => {
    g.fillStyle = '#243734'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e3e6d5'; g.font = '30px cursive'; g.fillText('PROFESSOR MOSBY', 32, 48);
    g.font = '20px cursive'; g.fillText('ARCHITECTURE 101', 34, 91);
    g.fillText('Form  +  function  +  a good story', 34, 132);
    g.fillStyle = '#b9c6af'; g.font = '16px cursive'; g.fillText('Office hours: after class', 34, 215);
    g.strokeStyle = '#d7dfcd'; g.lineWidth = 2;
    // Chalk elevation of a classical building, plus a tower study.
    g.beginPath(); g.moveTo(445, 88); g.lineTo(553, 39); g.lineTo(661, 88); g.closePath(); g.stroke();
    g.strokeRect(443, 92, 220, 14); g.strokeRect(439, 208, 228, 12);
    for (let x = 460; x < 650; x += 43) { g.strokeRect(x, 110, 13, 95); }
    g.beginPath(); g.moveTo(697, 218); g.lineTo(702, 90); g.lineTo(719, 59); g.lineTo(735, 90); g.lineTo(741, 218); g.stroke();
    for (let y = 110; y < 212; y += 17) { g.beginPath(); g.moveTo(703, y); g.lineTo(735, y); g.stroke(); }
  });
}

/** Abstract framed "painting". */
export function painting(seed: number) {
  const r = mulberry32(seed);
  const palettes = [
    ['#2d4a3e', '#c9a227', '#7a2e1f', '#e7d8b5'],
    ['#1f3550', '#d97b3a', '#e8d6a8', '#5a2c3e'],
    ['#3d2b1f', '#8fae6b', '#d7c38e', '#2e5f73'],
  ];
  const p = palettes[Math.floor(r() * palettes.length)];
  return canvas(24, 32, (g, w, h) => {
    g.fillStyle = p[0];
    g.fillRect(0, 0, w, h);
    const kind = Math.floor(r() * 3);
    if (kind === 0) {
      // landscape
      g.fillStyle = p[3];
      g.fillRect(0, 0, w, h * 0.5);
      g.fillStyle = p[1];
      g.beginPath();
      g.arc(w * 0.7, h * 0.3, 4, 0, 7);
      g.fill();
      g.fillStyle = p[2];
      g.fillRect(0, h * 0.55, w, h * 0.45);
    } else if (kind === 1) {
      // portrait
      g.fillStyle = p[2];
      g.fillRect(w * 0.3, h * 0.55, w * 0.4, h * 0.45);
      g.fillStyle = p[3];
      g.beginPath();
      g.arc(w * 0.5, h * 0.4, 5, 0, 7);
      g.fill();
    } else {
      for (let i = 0; i < 6; i++) {
        g.fillStyle = p[1 + Math.floor(r() * 3)];
        g.fillRect(r() * w, r() * h, 3 + r() * 10, 3 + r() * 10);
      }
    }
  });
}

/** Text sign (e.g. the MacLaren's window lettering, beer signs). */
export function sign(text: string, fg: string, bg: string, w = 128, h = 32, font = 'bold 20px Georgia') {
  return canvas(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = font;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 1);
  });
}

/** Bookshelf front: rows of colored spines. */
export function books(seed = 11) {
  const r = mulberry32(seed);
  const cols = ['#7a2e1f', '#2e4a6b', '#c9a227', '#3d5c3a', '#e7d8b5', '#5a2c3e', '#222', '#a85a32'];
  return canvas(32, 48, (g, w, h) => {
    g.fillStyle = '#3a2618';
    g.fillRect(0, 0, w, h);
    for (let row = 0; row < 4; row++) {
      let x = 1;
      const y0 = row * 12 + 2;
      while (x < w - 2) {
        const bw = 1 + Math.floor(r() * 3);
        const bh = 6 + Math.floor(r() * 4);
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.fillRect(x, y0 + (10 - bh), bw, bh);
        x += bw + (r() < 0.15 ? 2 : 0);
      }
      g.fillStyle = '#24170e';
      g.fillRect(0, y0 + 10, w, 2);
    }
  });
}

/** TV screen glow content. */
export function tvScreen() {
  return canvas(32, 18, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#2a5db0');
    gr.addColorStop(1, '#53c1d9');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8f6ff';
    g.fillRect(4, 12, 10, 2);
    g.fillRect(4, 4, 6, 6);
  });
}

/** Sepia WPA-style mural under a shallow arch (MacLaren's back wall). Outside the arch is wall colour. */
export function mural(wall: string, seed = 5) {
  const r = mulberry32(seed);
  return canvas(160, 56, (g, w, h) => {
    g.fillStyle = wall;
    g.fillRect(0, 0, w, h);
    g.save();
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, h * 0.5);
    g.quadraticCurveTo(w / 2, -h * 0.42, w, h * 0.5);
    g.lineTo(w, h);
    g.closePath();
    g.clip();
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#d2a860');
    sky.addColorStop(0.6, '#b07a3c');
    sky.addColorStop(1, '#6e4422');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // smoke and clouds
    g.fillStyle = '#e2c488';
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      g.arc(r() * w, 6 + r() * 16, 3 + r() * 6, 0, 7);
      g.fill();
    }
    // far skyline, smokestacks
    for (let x = 0; x < w; ) {
      const bw = 5 + r() * 9;
      const bh = 12 + r() * 20;
      g.fillStyle = shade('#8a5a30', 0.8 + r() * 0.35);
      g.fillRect(x, h - 14 - bh, bw, bh);
      x += bw + r() * 5;
    }
    // girders and cranes
    g.strokeStyle = '#3e2414';
    g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const x = r() * w;
      g.beginPath();
      g.moveTo(x, h - 8);
      g.lineTo(x + (r() - 0.5) * 50, 4 + r() * 14);
      g.stroke();
    }
    // workers
    for (let i = 0; i < 11; i++) {
      const x = 8 + (i * (w - 16)) / 10 + (r() - 0.5) * 6;
      const s = 0.8 + r() * 0.6;
      const y = h - 6 - r() * 6;
      g.fillStyle = ['#3a2214', '#5a3620', '#74502c'][Math.floor(r() * 3)];
      g.fillRect(x - 3 * s, y - 16 * s, 6 * s, 16 * s);
      g.fillRect(x - 3 * s + (r() < 0.5 ? -4 * s : 6 * s), y - 17 * s, 4 * s, 3 * s); // arm
      g.fillStyle = '#c69460';
      g.fillRect(x - 2 * s, y - 21 * s, 4 * s, 4 * s);
    }
    g.fillStyle = '#3e2414';
    g.fillRect(0, h - 5, w, 5);
    g.restore();
    g.strokeStyle = '#1c120a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(1, h);
    g.lineTo(1, h * 0.5);
    g.quadraticCurveTo(w / 2, -h * 0.42 + 1, w - 1, h * 0.5);
    g.lineTo(w - 1, h);
    g.stroke();
  });
}

/** Frosted amber multi-pane window with the street glowing behind it. */
export function paneGlass(night: boolean, cols = 6, rows = 3, seed = 9) {
  const r = mulberry32(seed);
  return canvas(96, 48, (g, w, h) => {
    const pw = w / cols, ph = h / rows;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        g.fillStyle = night ? shade('#9a7a44', 0.55 + r() * 0.4) : shade('#e6dcb4', 0.85 + r() * 0.2);
        g.fillRect(x * pw, y * ph, pw, ph);
      }
    if (night) {
      // neon from across the street bleeding through
      for (const [cx, cy, col] of [[w * 0.22, h * 0.45, '#ff6a7a'], [w * 0.8, h * 0.3, '#ffd9a0']] as const) {
        const gl = g.createRadialGradient(cx, cy, 1, cx, cy, 16);
        gl.addColorStop(0, col);
        gl.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = 0.55;
        g.fillStyle = gl;
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 1;
      }
    }
    g.fillStyle = '#1c120a';
    for (let x = 1; x < cols; x++) g.fillRect(x * pw - 1, 0, 2, h);
    for (let y = 1; y < rows; y++) g.fillRect(0, y * ph - 1, w, 2);
  });
}

/** Glass-block window. */
export function glassBlock(night: boolean, cols = 6, rows = 5, seed = 13) {
  const r = mulberry32(seed);
  return canvas(cols * 8, rows * 8, (g, w, h) => {
    g.fillStyle = '#2a2a2a';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const tint = night ? (y > 1 && x > 2 && r() < 0.7 ? (r() < 0.5 ? '#e8788a' : '#f0a070') : '#8ea6b4') : '#dbe8ee';
        g.fillStyle = shade(tint, 0.8 + r() * 0.3);
        g.fillRect(x * 8 + 1, y * 8 + 1, 7, 7);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fillRect(x * 8 + 2, y * 8 + 2, 3, 2);
      }
  });
}

/** Neon bar sign: two shamrocks over a beer-logo oval. Transparent background. */
export function neonShamrock() {
  return canvas(64, 40, (g, w) => {
    g.fillStyle = '#5dff7a';
    for (const cx of [w / 2 - 10, w / 2 + 10]) {
      for (const [dx, dy] of [[-4, 0], [4, 0], [0, -5]]) {
        g.beginPath();
        g.arc(cx + dx, 10 + dy, 3.6, 0, 7);
        g.fill();
      }
      g.fillRect(cx - 1, 11, 2, 7);
    }
    g.strokeStyle = '#ff4a3a';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(w / 2, 29, 26, 8, 0, 0, 7);
    g.stroke();
    g.fillStyle = '#4aa8ff';
    g.fillRect(w / 2 - 16, 27, 32, 4);
  });
}

/** Tall sash window onto the street with the blinds pulled a third of the way down. */
export function blindsWindow(night: boolean, seed = 3) {
  const view = skyline(night, seed);
  return canvas(48, 72, (g, w, h) => {
    g.drawImage(view.image as HTMLCanvasElement, 24, 0, 48, 64, 0, 0, w, h);
    view.dispose();
    const drop = Math.round(h * 0.38);
    for (let y = 0; y < drop; y += 3) {
      g.fillStyle = night ? '#6e6658' : '#e6dfcc';
      g.fillRect(0, y, w, 2);
      g.fillStyle = night ? '#3a352c' : '#b8ae98';
      g.fillRect(0, y + 2, w, 1);
    }
    g.fillStyle = night ? '#4a4338' : '#cfc6b0';
    g.fillRect(0, drop, w, 2);
    g.fillRect(w - 6, drop, 1, 12);
  });
}

/** Patchwork rug of warm squares (the apartment's living-room rug). */
export function patchRug(seed = 17) {
  const r = mulberry32(seed);
  const cols = ['#c8752a', '#9a5a22', '#7a7a32', '#d9a24a', '#8a3a1e', '#b8863a', '#5a4a2a', '#c9a060'];
  return canvas(40, 28, (g, w, h) => {
    g.fillStyle = '#6a3a1a';
    g.fillRect(0, 0, w, h);
    for (let y = 2; y < h - 2; y += 4)
      for (let x = 2; x < w - 2; x += 4) {
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.fillRect(x, y, 4 - (r() < 0.3 ? 1 : 0), 4 - (r() < 0.3 ? 1 : 0));
      }
  });
}

/** Black-and-white checkerboard tile. */
export function checker(a: string, b: string, repeat: [number, number]) {
  return canvas(8, 8, (g) => {
    g.fillStyle = a;
    g.fillRect(0, 0, 8, 8);
    g.fillStyle = b;
    g.fillRect(0, 0, 4, 4);
    g.fillRect(4, 4, 4, 4);
  }, repeat);
}

/** Fridge door buried in snapshots, takeout menus and magnets. */
export function fridgePhotos(seed = 23) {
  const r = mulberry32(seed);
  return canvas(24, 56, (g, w, h) => {
    g.fillStyle = '#ecebe4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#b8b6ac';
    g.fillRect(0, 19, w, 1);
    g.fillRect(w - 3, 6, 1, 10);
    g.fillRect(w - 3, 24, 1, 22);
    for (let i = 0; i < 16; i++) {
      const x = 1 + r() * (w - 9), y = 2 + r() * (h - 14);
      const pw = 4 + r() * 4, ph = 4 + r() * 5;
      g.fillStyle = r() < 0.3 ? '#f4f0e0' : ['#c9a27a', '#7a9ab8', '#b86a5a', '#8ab07a', '#d9c060'][Math.floor(r() * 5)];
      g.fillRect(x, y, pw, ph);
      g.fillStyle = ['#d93a2a', '#2a6ad9', '#e0c020', '#2a9a4a'][Math.floor(r() * 4)];
      g.fillRect(x + pw / 2, y - 1, 1, 1);
    }
  });
}

/** One side of a red K6 telephone box: glazing bars and the TELEPHONE header. */
export function phoneBox() {
  return canvas(16, 40, (g, w, h) => {
    g.fillStyle = '#c4161c';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1a1a1a';
    g.fillRect(2, 2, w - 4, 3);
    g.fillStyle = '#f4f0e0';
    g.fillRect(4, 3, w - 8, 1);
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 3; x++) {
        g.fillStyle = y === 2 && x === 1 ? '#f4f0e0' : '#9ab0b8';
        g.fillRect(3 + x * 4, 8 + y * 3.6, 3, 2.6);
      }
  });
}

/** Ted's blueprint for the GNB tower, pinned to his drafting table. */
export function blueprint() {
  return canvas(32, 40, (g, w, h) => {
    g.fillStyle = '#e8eef2';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2a5a9a';
    g.lineWidth = 1;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
    // a tall, tapering tower with a spire
    g.beginPath();
    g.moveTo(10, h - 4);
    g.lineTo(12, 10);
    g.lineTo(16, 4);
    g.lineTo(20, 10);
    g.lineTo(22, h - 4);
    g.closePath();
    g.stroke();
    for (let y = 12; y < h - 5; y += 3) {
      g.beginPath();
      g.moveTo(11.5, y + 0.5);
      g.lineTo(20.5, y + 0.5);
      g.stroke();
    }
    g.fillStyle = '#2a5a9a';
    g.fillRect(3, h - 4, 26, 1);
    g.fillRect(24, 5, 5, 1);
    g.fillRect(24, 7, 4, 1);
  });
}

/** Simple wall clock face. */
export function clockFace() {
  return canvas(16, 16, (g) => {
    g.fillStyle = '#f2eee2';
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#1a1a1a';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(8 + Math.sin(a) * 6 - 0.5, 8 - Math.cos(a) * 6 - 0.5, 1, 1);
    }
    g.fillRect(7.5, 4, 1, 4.5);
    g.fillRect(8, 7.5, 3, 1);
  });
}

/** The arched niche above the kitchen sink: a warm-lit recess with a shelf of knick-knacks. */
export function archNiche() {
  return canvas(24, 36, (g, w, h) => {
    g.fillStyle = '#e6dcc0';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#7a5a3a';
    g.beginPath();
    g.moveTo(2, h);
    g.lineTo(2, 12);
    g.arc(w / 2, 12, w / 2 - 2, Math.PI, 0);
    g.lineTo(w - 2, h);
    g.fill();
    const gl = g.createLinearGradient(0, 4, 0, h);
    gl.addColorStop(0, '#f2c880');
    gl.addColorStop(1, '#b8915a');
    g.fillStyle = gl;
    g.beginPath();
    g.moveTo(4, h);
    g.lineTo(4, 12);
    g.arc(w / 2, 12, w / 2 - 4, Math.PI, 0);
    g.lineTo(w - 4, h);
    g.fill();
    g.fillStyle = '#5a3a20';
    g.fillRect(4, 22, w - 8, 1);
    for (const [x, c, hh] of [[7, '#c94a3a', 5], [11, '#e8e2d0', 7], [15, '#3a6aa8', 4]] as const) {
      g.fillStyle = c;
      g.fillRect(x, 22 - hh, 2, hh);
    }
  });
}

/** Glass-fronted upper cabinet: cream frames with dishes behind the panes. */
export function glassCabinet(doors = 2) {
  return canvas(doors * 12, 20, (g, w, h) => {
    g.fillStyle = '#e6dcc0';
    g.fillRect(0, 0, w, h);
    for (let d = 0; d < doors; d++) {
      const x = d * 12;
      g.fillStyle = '#d4c8a8';
      g.fillRect(x, 0, 1, h);
      g.fillStyle = '#8a8270';
      g.fillRect(x + 2, 2, 8, h - 4);
      g.fillStyle = '#efe9dc';
      for (const y of [4, 10]) for (let i = 0; i < 3; i++) g.fillRect(x + 3 + i * 2.5, y, 2, 4);
      g.fillStyle = '#d4c8a8';
      g.fillRect(x + 2, 9, 8, 1);
    }
  });
}

/** Button-tufted leather: rows of diamond puffs with a button at every crease. */
export function tufted(base: string, repeat: [number, number]) {
  return canvas(16, 16, (g, w, h) => {
    g.fillStyle = shade(base, 0.7);
    g.fillRect(0, 0, w, h);
    const puff = (cx: number, cy: number) => {
      for (const [r, f] of [[7, 1], [5, 1.25], [2, 1.6]] as const) {
        g.fillStyle = shade(base, f);
        g.beginPath();
        g.moveTo(cx, cy - r);
        g.lineTo(cx + r, cy);
        g.lineTo(cx, cy + r);
        g.lineTo(cx - r, cy);
        g.fill();
      }
    };
    for (const [x, y] of [[8, 8], [0, 0], [16, 0], [0, 16], [16, 16]]) puff(x, y);
    g.fillStyle = shade(base, 0.35);
    for (const [x, y] of [[0, 8], [16, 8], [8, 0], [8, 16]]) g.fillRect(x - 1, y - 1, 2, 2);
  }, repeat);
}

/** Wide multi-color awning stripes, for a throw pillow. */
export function pillowStripes(cols: string[], repeat = 2) {
  return canvas(24, 8, (g, w, h) => {
    const widths = [4, 1, 2, 1, 3, 1];
    let x = 0, i = 0;
    while (x < w) {
      g.fillStyle = cols[i % cols.length];
      g.fillRect(x, 0, widths[i % widths.length], h);
      x += widths[i % widths.length];
      i++;
    }
  }, [repeat, 1]);
}

/** A kid's drawing or school certificate behind glass: paper, a scribbled sun or house, a few lines of writing. */
export function kidsArt(seed: number) {
  const r = mulberry32(seed);
  const crayons = ['#d8402a', '#2a6ad8', '#e8b82a', '#3aa04a', '#9a3ab0'];
  return canvas(20, 26, (g, w, h) => {
    g.fillStyle = '#f4efe0';
    g.fillRect(0, 0, w, h);
    if (r() < 0.5) {
      g.fillStyle = crayons[2];
      g.beginPath();
      g.arc(5 + r() * 4, 6, 3, 0, 7);
      g.fill();
      g.fillStyle = crayons[0];
      g.fillRect(8, 12, 8, 6);
      g.fillStyle = crayons[1];
      g.beginPath();
      g.moveTo(7, 12);
      g.lineTo(12, 8);
      g.lineTo(17, 12);
      g.fill();
      g.fillStyle = crayons[3];
      g.fillRect(0, h - 5, w, 5);
    } else {
      g.fillStyle = '#b8342a';
      g.fillRect(3, 3, w - 6, 2);
      g.fillStyle = '#5a5a5a';
      for (let y = 8; y < h - 6; y += 3) g.fillRect(3, y, 6 + r() * (w - 10), 1);
      g.fillStyle = crayons[Math.floor(r() * crayons.length)];
      g.beginPath();
      g.arc(w - 6, h - 6, 3, 0, 7);
      g.fill();
    }
  });
}

/** Gold plaster plaque with a child's handprint pressed into it. */
export function handprint() {
  return canvas(24, 24, (g, w, h) => {
    g.fillStyle = '#c9a85a';
    g.beginPath();
    g.arc(w / 2, h / 2, w / 2, 0, 7);
    g.fill();
    g.fillStyle = '#a8883e';
    g.beginPath();
    g.ellipse(12, 15, 4.5, 4, 0, 0, 7);
    g.fill();
    for (const [x, y, a] of [[7, 13, -0.9], [9, 8, -0.25], [12, 7, 0], [15, 8, 0.25], [17, 10, 0.5]] as const) {
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.fillRect(-1, -3, 2.2, 5);
      g.restore();
    }
  });
}

/** Noisy flecked surface: roof gravel, office carpet. */
export function speckle(base: string, repeat: [number, number], seed = 37, contrast = 0.25) {
  const r = mulberry32(seed);
  return canvas(32, 32, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = shade(base, 1 - contrast + r() * contrast * 2);
      g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1 + (r() < 0.2 ? 1 : 0), 1);
    }
  }, repeat);
}

/** Square tiles with grout lines (drop ceilings, roof pavers). */
export function tiles(base: string, line: string, repeat: [number, number]) {
  return canvas(16, 16, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.fillStyle = line;
    g.fillRect(0, 0, w, 1);
    g.fillRect(0, 0, 1, h);
  }, repeat);
}

/** A strip of city going past a car window: storefronts, lit windows, streetlamps. Tiles horizontally. */
export function street(night: boolean, seed = 51) {
  const r = mulberry32(seed);
  const t = canvas(128, 48, (g, w, h) => {
    g.fillStyle = night ? '#141626' : '#a8c4dc';
    g.fillRect(0, 0, w, h);
    let x = 0;
    while (x < w) {
      const bw = Math.min(w - x, 14 + Math.floor(r() * 18));
      const top = Math.floor(r() * 10);
      g.fillStyle = night ? shade('#2a2836', 0.7 + r() * 0.6) : shade('#8a7a6a', 0.75 + r() * 0.5);
      g.fillRect(x, top, bw, h - top);
      // upper-floor windows
      for (let wy = top + 3; wy < h - 18; wy += 6)
        for (let wx = x + 2; wx < x + bw - 3; wx += 5) {
          const lit = r() < (night ? 0.45 : 0);
          g.fillStyle = lit ? (r() < 0.8 ? '#f6d27a' : '#9ad0ff') : night ? '#1a1a26' : '#5a6878';
          g.fillRect(wx, wy, 3, 3);
        }
      // shopfront with an awning
      g.fillStyle = night ? (r() < 0.6 ? '#ffd890' : '#ff8a6a') : '#c8d8e0';
      g.fillRect(x + 2, h - 14, bw - 4, 9);
      g.fillStyle = ['#a82a22', '#2a6a3a', '#2a3a7a', '#c88a22'][Math.floor(r() * 4)];
      g.fillRect(x + 1, h - 16, bw - 2, 3);
      g.fillStyle = night ? '#0a0a10' : '#3a3a3a';
      g.fillRect(x, h - 5, bw, 5);
      x += bw;
    }
    // streetlamps
    for (let lx = 10; lx < w; lx += 42) {
      g.fillStyle = '#1a1a1e';
      g.fillRect(lx, 14, 1, h - 19);
      g.fillRect(lx, 14, 4, 1);
      g.fillStyle = night ? '#fff0b0' : '#d0d0c0';
      g.fillRect(lx + 3, 15, 2, 1);
    }
  });
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Face of an apartment or office tower: a grid of windows, some lit. */
export function facade(night: boolean, wall: string, seed = 61, cols = 6, rows = 10) {
  const r = mulberry32(seed);
  return canvas(cols * 4, rows * 4, (g, w, h) => {
    g.fillStyle = night ? shade(wall, 0.35) : wall;
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const lit = night && r() < 0.4;
        g.fillStyle = lit ? (r() < 0.75 ? '#f6d27a' : '#9ad0ff') : night ? '#12121c' : shade('#5a6a80', 0.8 + r() * 0.4);
        g.fillRect(x * 4 + 1, y * 4 + 1, 2, 2);
      }
  });
}

/** Whiteboard covered in marker: a sketchy chart, boxes and arrows, someone's scrawl. */
export function whiteboard(seed = 71) {
  const r = mulberry32(seed);
  return canvas(64, 32, (g, w, h) => {
    g.fillStyle = '#f2f2ee';
    g.fillRect(0, 0, w, h);
    const ink = ['#2a3a8a', '#1a1a1a', '#b82a2a', '#2a7a3a'];
    // a bar chart going up
    g.fillStyle = ink[0];
    g.fillRect(4, 26, 22, 1);
    g.fillRect(4, 6, 1, 20);
    for (let i = 0; i < 4; i++) g.fillRect(7 + i * 5, 25 - (4 + i * 4 + r() * 3), 3, 4 + i * 4);
    // boxes and an arrow
    g.fillStyle = ink[1];
    g.strokeStyle = ink[1];
    g.strokeRect(32.5, 5.5, 10, 6);
    g.strokeRect(48.5, 5.5, 10, 6);
    g.fillRect(43, 8, 5, 1);
    g.fillStyle = ink[2];
    for (let y = 16; y < 28; y += 3) g.fillRect(32, y, 10 + Math.floor(r() * 18), 1);
    g.fillStyle = ink[3];
    g.beginPath();
    g.arc(56, 21, 4, 0, 7);
    g.fill();
  });
}

/** A computer screen: desktop, a window, a spreadsheet. */
export function monitorScreen(seed = 81) {
  const r = mulberry32(seed);
  return canvas(24, 18, (g, w, h) => {
    g.fillStyle = '#2a6aa8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8ecf0';
    g.fillRect(3, 2, 18, 13);
    g.fillStyle = '#1a3a8a';
    g.fillRect(3, 2, 18, 2);
    g.fillStyle = '#9aa8b8';
    for (let y = 6; y < 14; y += 2) for (let x = 4; x < 20; x += 4) if (r() < 0.8) g.fillRect(x, y, 3, 1);
    g.fillStyle = '#c8c8c8';
    g.fillRect(0, h - 2, w, 2);
  });
}

export type PosterArt = 'penguins' | 'jets' | 'jet' | 'hands' | 'climber' | 'column' | 'flames' | 'sunset' | 'propeller' | 'skydivers';

/**
 * Barney's office-supply-catalog motivational posters: black frame and mat, a stock photo, and the
 * title in spaced serif caps inside a thin ruled box, with a line of small print under it.
 */
export function poster(title: string, art: PosterArt, opts: { titleColor?: string; wide?: boolean } = {}) {
  const W = opts.wide ? 80 : 64, H = opts.wide ? 64 : 80;
  return canvas(W, H, (g, w, h) => {
    g.fillStyle = '#0a0a0c';
    g.fillRect(0, 0, w, h);
    const px = 6, py = 5, pw = w - 12, ph = h - 25;
    g.save();
    g.beginPath();
    g.rect(px, py, pw, ph);
    g.clip();
    g.translate(px, py);
    posterArt(g, art, pw, ph);
    g.restore();
    g.strokeStyle = '#5a5a5e';
    g.strokeRect(px - 0.5, py - 0.5, pw + 1, ph + 1);
    // the title box
    const by = h - 17;
    g.strokeStyle = '#8a8a8e';
    g.strokeRect(10.5, by + 0.5, w - 21, 9);
    g.fillStyle = opts.titleColor ?? '#f2f0ea';
    g.font = 'bold 7px Georgia';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const spaced = title.split('').join(String.fromCharCode(8202));
    g.fillText(spaced, w / 2, by + 5.5, w - 24);
    // the small print
    g.fillStyle = '#6a6a6e';
    g.fillRect(14, h - 5, w - 28, 1);
  });
}

function posterArt(g: CanvasRenderingContext2D, art: PosterArt, w: number, h: number) {
  const sky = (top: string, bottom: string) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bottom);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  };
  /** A jet seen from above-ish, nose toward angle a, with a contrail behind it. */
  const jet = (x: number, y: number, s: number, a: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.fillRect(-14 * s, -0.5, 12 * s, 1);
    g.fillStyle = '#1e2a4a';
    g.beginPath();
    g.moveTo(4 * s, 0);
    g.lineTo(-3 * s, -3.5 * s);
    g.lineTo(-2 * s, 0);
    g.lineTo(-3 * s, 3.5 * s);
    g.closePath();
    g.fill();
    g.fillRect(-4 * s, -0.7 * s, 8 * s, 1.4 * s);
    g.restore();
  };
  switch (art) {
    case 'penguins': {
      sky('#9ab0c4', '#c8d4dc');
      g.fillStyle = '#e8eef2';
      g.fillRect(0, h * 0.72, w, h);
      // a row of identical penguins
      const n = 7;
      for (let i = 0; i < n; i++) {
        const x = 4 + (i * (w - 8)) / (n - 1), y = h * 0.42;
        g.fillStyle = '#16181c';
        g.beginPath();
        g.ellipse(x, y + 7, 3.4, 9, 0, 0, 7);
        g.fill();
        g.beginPath();
        g.arc(x, y - 3, 2.4, 0, 7);
        g.fill();
        g.fillStyle = '#f4f4f0';
        g.beginPath();
        g.ellipse(x + 0.6, y + 8, 2, 7, 0, 0, 7);
        g.fill();
        g.fillStyle = '#e8b830';
        g.fillRect(x, y - 1, 1.5, 1.5);
      }
      break;
    }
    case 'jets':
      sky('#4a7ac8', '#9ac0ea');
      for (let i = 0; i < 4; i++) jet(w * 0.75 - i * w * 0.15, h * 0.22 + i * h * 0.19, 1.1, -0.35);
      break;
    case 'jet':
      sky('#3a6ac0', '#a8c8ee');
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(0, h * 0.82, w, h);
      jet(w * 0.62, h * 0.4, 1.8, -0.6);
      break;
    case 'hands': {
      g.fillStyle = '#f4f2ee';
      g.fillRect(0, 0, w, h);
      // four forearms gripping each other's wrists in a square
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.24;
      const skins = ['#e0a888', '#c88a64', '#e8b898', '#b07850'];
      for (let i = 0; i < 4; i++) {
        g.save();
        g.translate(cx, cy);
        g.rotate((i * Math.PI) / 2);
        g.fillStyle = '#7a4a30';
        g.fillRect(-r - 1, -r - 5, 2 * r + 8, 10);
        g.fillStyle = skins[i];
        g.fillRect(-r, -r - 4, 2 * r + 6, 8);
        g.fillStyle = '#8a5a40';
        g.beginPath();
        g.arc(r + 3, -r, 5.5, 0, 7);
        g.fill();
        g.fillStyle = skins[i];
        g.beginPath();
        g.arc(r + 3, -r, 4.5, 0, 7);
        g.fill();
        g.restore();
      }
      break;
    }
    case 'climber': {
      sky('#a88a64', '#7a5a3e');
      g.strokeStyle = '#5a4028';
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.moveTo((i * w) / 5, 0);
        g.lineTo((i * w) / 5 + 6, h * 0.5);
        g.lineTo((i * w) / 5 - 2, h);
        g.stroke();
      }
      g.fillStyle = '#f0ece4';
      g.fillRect(w * 0.3, h * 0.4, 4, 5);
      g.fillStyle = '#2a2a3a';
      g.fillRect(w * 0.3, h * 0.4 + 5, 4, 5);
      g.fillStyle = '#d8a888';
      g.fillRect(w * 0.31, h * 0.4 - 3, 2.5, 3);
      g.fillRect(w * 0.3 + 4, h * 0.4 - 4, 1, 5);
      break;
    }
    case 'column': {
      sky('#2a2a2e', '#4a4a50');
      g.fillStyle = '#c8c4bc';
      g.fillRect(w * 0.3, h * 0.18, w * 0.4, h);
      g.fillStyle = '#e0dcd4';
      g.fillRect(w * 0.24, h * 0.1, w * 0.52, h * 0.1);
      g.fillStyle = '#9a968e';
      for (let x = w * 0.33; x < w * 0.7; x += 4) g.fillRect(x, h * 0.2, 1, h);
      break;
    }
    case 'flames': {
      sky('#1a0a04', '#8a2a08');
      for (let i = 0; i < 9; i++) {
        const x = (i * w) / 8;
        g.fillStyle = i % 2 ? '#f0a020' : '#e85a10';
        g.beginPath();
        g.moveTo(x - 6, h);
        g.quadraticCurveTo(x + 4, h * 0.5, x, h * (0.15 + (i % 3) * 0.1));
        g.quadraticCurveTo(x + 2, h * 0.6, x + 7, h);
        g.fill();
      }
      g.fillStyle = '#141414';
      g.fillRect(w * 0.42, h * 0.45, 9, h * 0.55);
      g.beginPath();
      g.arc(w * 0.42 + 4.5, h * 0.42, 4, 0, 7);
      g.fill();
      g.fillRect(w * 0.42 - 2, h * 0.4, 13, 2);
      break;
    }
    case 'sunset': {
      sky('#f0c060', '#c8742a');
      g.fillStyle = '#fff0b0';
      g.beginPath();
      g.arc(w * 0.68, h * 0.45, 6, 0, 7);
      g.fill();
      g.fillStyle = '#3a2210';
      g.beginPath();
      g.moveTo(0, h * 0.65);
      g.quadraticCurveTo(w * 0.4, h * 0.5, w, h * 0.7);
      g.lineTo(w, h);
      g.lineTo(0, h);
      g.fill();
      g.fillStyle = '#141008';
      g.fillRect(w * 0.3, h * 0.56, 2, 6);
      break;
    }
    case 'propeller': {
      sky('#6a9ad0', '#c0d8f0');
      g.fillStyle = '#3a4a5a';
      g.save();
      g.translate(w * 0.45, h * 0.5);
      for (let i = 0; i < 3; i++) {
        g.rotate((Math.PI * 2) / 3);
        g.fillRect(-2, 0, 4, h * 0.36);
      }
      g.beginPath();
      g.arc(0, 0, 4, 0, 7);
      g.fill();
      g.restore();
      break;
    }
    case 'skydivers': {
      sky('#2a5aa8', '#8ab8e8');
      g.fillStyle = '#f4f4f4';
      g.fillRect(0, h * 0.85, w, h);
      const cols = ['#e8302a', '#f0d020', '#2ab04a', '#f07a20', '#c83ab0'];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const x = w / 2 + Math.cos(a) * w * 0.22, y = h * 0.45 + Math.sin(a) * h * 0.18;
        g.fillStyle = cols[i];
        g.fillRect(x - 2, y - 2, 5, 5);
        g.fillRect(x + Math.cos(a + Math.PI) * 4, y + Math.sin(a + Math.PI) * 4, 3, 3);
      }
      break;
    }
  }
}

/** Wood veneer wall panels: vertical grain, a dark reveal between panels. */
export function veneer(base: string, repeat: [number, number], seed = 67) {
  const r = mulberry32(seed);
  return canvas(32, 64, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x++) {
      g.fillStyle = shade(base, 0.88 + r() * 0.2);
      g.fillRect(x, 0, 1, h);
    }
    for (let i = 0; i < 10; i++) {
      g.fillStyle = shade(base, 0.8);
      g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 6 + Math.floor(r() * 14));
    }
    g.fillStyle = shade(base, 0.35);
    g.fillRect(0, 0, 1, h);
  }, repeat);
}

/** Asphalt with a dashed lane line along the middle. Tiles in both directions. */
export function road(seed = 57) {
  const r = mulberry32(seed);
  return canvas(32, 32, (g, w, h) => {
    g.fillStyle = '#26262a';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      g.fillStyle = shade('#26262a', 0.7 + r() * 0.7);
      g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1);
    }
    g.fillStyle = '#d8d0a0';
    g.fillRect(0, h / 2 - 1, w / 2, 2);
  }, [1, 1]);
}

/** Open sky behind the establishing shots: dusky blue with the city's glow on the horizon at night. */
/** A day or night sky. For backdrops the camera tilts up past, `wide` makes it that many skies wide and
 *  `zenith` stacks that many skies' worth of plain upper sky on top, at the same scale. */
export function skyGradient(night: boolean, seed = 89, { wide = 1, zenith = 0 } = {}) {
  const r = mulberry32(seed);
  const h = 256, top = Math.round(h * zenith);
  return canvas(Math.round(512 * wide), top + h, (g, w) => {
    const sky = g.createLinearGradient(0, top, 0, top + h);
    if (night) {
      sky.addColorStop(0, '#05081c');
      sky.addColorStop(0.55, '#141a44');
      sky.addColorStop(0.85, '#3a2a5a');
      sky.addColorStop(1, '#6a3a5a');
    } else {
      sky.addColorStop(0, '#4a8ad0');
      sky.addColorStop(0.7, '#9cc4ea');
      sky.addColorStop(1, '#dce8f0');
    }
    g.fillStyle = sky;
    g.fillRect(0, 0, w, top + h);
    if (night) {
      for (let i = 0; i < 40 * wide; i++) {
        g.fillStyle = r() < 0.8 ? '#fff6d0' : '#a8c8ff';
        g.fillRect(Math.floor(r() * w), top + Math.floor(r() * h * 0.6), 1, 1);
      }
      for (let i = 0; i < 40 * wide * zenith; i++) {
        g.fillStyle = r() < 0.8 ? '#fff6d0' : '#a8c8ff';
        g.fillRect(Math.floor(r() * w), Math.floor(r() * top), 1, 1);
      }
    } else {
      // a few flat streaky clouds
      g.fillStyle = 'rgba(255,255,255,0.55)';
      for (let i = 0; i < 6 * wide; i++) g.fillRect(Math.floor(r() * w), top + Math.floor(h * 0.15 + r() * h * 0.45), 48 + Math.floor(r() * 72), 3 + Math.floor(r() * 5));
    }
  });
}

/** The river at the skyline's feet: dashes of reflected light on dark water. Tiles in both directions. */
export function riverWater(night: boolean, seed = 93) {
  const r = mulberry32(seed);
  return canvas(64, 32, (g, w, h) => {
    g.fillStyle = night ? '#080c1c' : '#3a5a72';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < (night ? 70 : 50); i++) {
      g.fillStyle = night ? (r() < 0.7 ? '#e8b860' : r() < 0.5 ? '#9ac0ff' : '#ff8a6a') : r() < 0.6 ? '#8aa8c0' : '#c8dcea';
      g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 2 + Math.floor(r() * 5), 1);
    }
  }, [10, 4]);
}

/** A lit glass-door drinks fridge: door frames with rows of bottles and cans behind the glass. */
export function drinksCooler(doors = 3, seed = 97) {
  const r = mulberry32(seed);
  const cols = ['#c83a2a', '#2a7ac8', '#e8c040', '#3aa05a', '#e8e8e0', '#8a3ac8', '#f08a2a'];
  return canvas(doors * 16, 48, (g, w, h) => {
    g.fillStyle = '#d8ecf0';
    g.fillRect(0, 0, w, h);
    for (let row = 0; row < 5; row++) {
      const y = 3 + row * 9;
      for (let x = 1; x < w - 1; x += 2) {
        if (r() < 0.12) continue;
        const tall = r() < 0.6;
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.fillRect(x, y + (tall ? 0 : 3), 2 - (r() < 0.3 ? 1 : 0), tall ? 7 : 4);
      }
      g.fillStyle = '#9aa8ac';
      g.fillRect(0, y + 7, w, 1);
    }
    for (let d = 0; d <= doors; d++) {
      g.fillStyle = '#3a3e42';
      g.fillRect(d * 16 - 1, 0, 2, h);
      if (d < doors) g.fillRect(d * 16 + 13, 18, 1, 12); // handle
    }
    g.fillRect(0, 0, w, 2);
    g.fillRect(0, h - 2, w, 2);
  });
}

/** A wire newsstand rack: overlapping rows of magazine covers and folded papers. */
export function magazineRack(seed = 101) {
  const r = mulberry32(seed);
  const cols = ['#c83a3a', '#2a5aa8', '#e8c040', '#f0f0e8', '#3a8a5a', '#e86a9a', '#1a1a1a', '#f08a2a'];
  return canvas(48, 40, (g, w, h) => {
    g.fillStyle = '#4a4a4c';
    g.fillRect(0, 0, w, h);
    for (let row = 0; row < 3; row++) {
      const y = 2 + row * 13;
      for (let x = 1; x < w - 6; x += 8) {
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.fillRect(x, y, 7, 11);
        g.fillStyle = r() < 0.5 ? '#ffffff' : '#1a1a1a';
        g.fillRect(x + 1, y + 1, 5, 2); // masthead
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.fillRect(x + 2, y + 4, 3, 5); // cover star
      }
      g.fillStyle = '#9a9a9c';
      g.fillRect(0, y + 11, w, 1);
    }
  });
}

/** Chalkboard with handwritten lines (restaurant specials, store prices). */
export function chalkMenu(title: string, lines: string[], w = 128, h = 160) {
  return canvas(w, h, (g) => {
    g.fillStyle = '#1e2a26';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    g.fillRect(6, 10, w - 20, 8);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#f2e6c0';
    g.font = 'bold 20px Georgia';
    g.fillText(title, w / 2, 20);
    g.fillStyle = '#e8a87a';
    g.fillRect(w * 0.2, 34, w * 0.6, 1);
    g.font = 'italic 13px Georgia';
    const step = (h - 52) / Math.max(1, lines.length);
    lines.forEach((line, i) => {
      g.fillStyle = i % 2 ? '#bfe0d0' : '#f4f0e0';
      g.fillText(line, w / 2, 50 + step * (i + 0.5));
    });
  });
}

/** Wall wine rack: a lattice of cubbies holding bottle ends. */
export function wineRack(seed = 103) {
  const r = mulberry32(seed);
  return canvas(32, 48, (g, w, h) => {
    g.fillStyle = '#3a2418';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 6) for (let x = 0; x < w; x += 6) {
      g.fillStyle = '#1a0e08';
      g.fillRect(x + 1, y + 1, 5, 5);
      if (r() < 0.82) {
        g.fillStyle = r() < 0.6 ? '#2a3a1e' : '#4a1a22';
        g.beginPath(); g.arc(x + 3.5, y + 3.5, 2, 0, 7); g.fill();
        g.fillStyle = r() < 0.5 ? '#c9a227' : '#8a1a1a';
        g.fillRect(x + 3, y + 3, 1, 1);
      }
    }
  });
}
