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
