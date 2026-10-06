import * as THREE from 'three';

export interface StyleSettings {
  enabled: boolean;
  pixelHeight: number; // vertical resolution of the internal render
  outline: number;
  dither: number; // 0..1
  levels: number; // color levels per channel
  scanlines: number;
  vignette: number;
  grain: number;
  aberration: number;
  warmth: number;
}

export const DEFAULT_STYLE: StyleSettings = {
  enabled: true,
  pixelHeight: 270,
  outline: 0.85,
  dither: 0.85,
  levels: 10,
  scanlines: 0.22,
  vignette: 0.55,
  grain: 0.05,
  aberration: 1.0,
  warmth: 0.12,
};

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */ `
precision highp float;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 lowRes;
uniform vec2 screenRes;
uniform float cameraNear;
uniform float cameraFar;
uniform float time;
uniform float uOutline, uDither, uLevels, uScan, uVignette, uGrain, uAberr, uWarmth, uStylize, uFade, uRewind, uDream, uRipple, uMemory, uSnap, uTrail, uStill, uWhip, uVideo;
uniform sampler2D tPrev;
varying vec2 vUv;

float linDepth(vec2 uv) {
  float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
}

float bayer4(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int i = x + y * 4;
  float m[16];
  m[0]=0.0; m[1]=8.0; m[2]=2.0; m[3]=10.0;
  m[4]=12.0; m[5]=4.0; m[6]=14.0; m[7]=6.0;
  m[8]=3.0; m[9]=11.0; m[10]=1.0; m[11]=9.0;
  m[12]=15.0; m[13]=7.0; m[14]=13.0; m[15]=5.0;
  for (int k = 0; k < 16; k++) if (k == i) return m[k] / 16.0;
  return 0.0;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 px = 1.0 / lowRes;
  vec2 cell = floor(vUv * lowRes);
  vec2 uv = mix(vUv, (cell + 0.5) * px, uStylize);
  // the wavy dissolve into (and out of) somebody's imagination
  if (uRipple > 0.0) uv.x = clamp(uv.x + sin(uv.y * 38.0 + time * 9.0) * 0.012 * uRipple, 0.001, 0.999);
  // tape: each line wobbles sideways a little
  if (uVideo > 0.0) uv.x = clamp(uv.x + (hash(vec2(floor(vUv.y * lowRes.y), floor(time * 24.0))) - 0.5) * px.x * 1.6 * uVideo, 0.001, 0.999);

  // chromatic aberration grows toward the edges
  vec2 dir = (uv - 0.5);
  float ca = uAberr * uStylize * length(dir) * 1.6;
  vec3 col;
  col.r = texture2D(tColor, uv + dir * px * ca).r;
  col.g = texture2D(tColor, uv).g;
  col.b = texture2D(tColor, uv - dir * px * ca).b;

  // A brief horizontal smear for a narrated jump back in time. Works with the picture filter off too.
  if (uRewind > 0.0) {
    vec3 smear = vec3(0.0);
    for (int i = -4; i <= 4; i++) {
      vec2 sampleUv = clamp(uv + vec2(float(i) * uRewind * 0.055, 0.0), vec2(0.001), vec2(0.999));
      smear += texture2D(tColor, sampleUv).rgb;
    }
    col = mix(col, smear / 9.0, uRewind);
  }

  // A whip pan: the picture tears sideways into a streak (-1..1 is the direction it travels).
  if (uWhip != 0.0) {
    float w = abs(uWhip);
    vec2 base = uv + vec2(uWhip * 0.3, 0.0);
    vec3 streak = vec3(0.0);
    for (int i = -6; i <= 6; i++) {
      streak += texture2D(tColor, clamp(base + vec2(float(i) * w * 0.035, 0.0), vec2(0.001), vec2(0.999))).rgb;
    }
    col = mix(col, streak / 13.0, smoothstep(0.0, 0.3, w));
  }

  // imagined: a soft bloom, as if remembered through a smudged lens
  if (uDream > 0.0) {
    vec3 soft = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398;
      soft += texture2D(tColor, clamp(uv + vec2(cos(a), sin(a)) * px * 2.5, vec2(0.001), vec2(0.999))).rgb;
    }
    col = mix(col, max(col, soft / 8.0) * 1.12 + 0.015, uDream * 0.7);
  }

  // the main titles: blown-out, glowing party snapshots
  if (uSnap > 0.0) {
    vec3 soft = vec3(0.0);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398 + 0.39;
      soft += texture2D(tColor, clamp(uv + vec2(cos(a), sin(a)) * px * 3.5, vec2(0.001), vec2(0.999))).rgb;
    }
    col = mix(col, max(col, soft / 8.0) * 1.12, uSnap * 0.45);
  }

  // tone map + grade (scene is rendered linear)
  col = aces(col * mix(1.05, 0.68, uSnap));
  col = toSRGB(col);
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, 1.0 + 0.15 * uStylize);
  col = (col - 0.5) * (1.0 + 0.08 * uStylize) + 0.5;
  col += uWarmth * uStylize * vec3(0.05, 0.015, -0.04);

  // the cutaway grades: a pastel haze with glowing edges for a fantasy, faded warm film for a memory
  vec2 cv = vUv - 0.5;
  if (uDream > 0.0) {
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, mix(vec3(l), col, 0.75) * 0.9 + vec3(0.1, 0.08, 0.12), uDream * 0.65);
    col = mix(col, vec3(1.0, 0.95, 0.98), uDream * smoothstep(0.12, 0.42, dot(cv, cv)) * 0.7);
  }
  if (uMemory > 0.0) {
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 sepia = vec3(l * 1.1 + 0.05, l * 0.94 + 0.03, l * 0.72 + 0.01);
    col = mix(col, mix(sepia, col, 0.12), uMemory * 0.9);
    col = mix(col, col * 0.45, uMemory * smoothstep(0.08, 0.4, dot(cv, cv)));
  }

  // footage on a TV: washed-out tape color, lifted blacks, a rolling tracking band and heavy lines
  if (uVideo > 0.0) {
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 tape = mix(vec3(l), col, 0.7) * vec3(1.04, 1.0, 0.9) * 0.86 + 0.07;
    col = mix(col, tape, uVideo);
    float band = 1.0 - smoothstep(0.0, 0.035, abs(fract(vUv.y + time * 0.09) - 0.5));
    col += band * (hash(vec2(floor(vUv.x * lowRes.x * 0.5), floor(time * 30.0))) - 0.35) * 0.16 * uVideo;
    col *= 1.0 - 0.22 * uVideo * step(0.5, fract(vUv.y * lowRes.y * 0.5));
    col *= 1.0 - uVideo * smoothstep(0.1, 0.32, dot(cv * vec2(1.0, 1.3), cv * vec2(1.0, 1.3))) * 0.6;
  }

  // a freeze frame: the color drains a little while Future Ted talks over it
  if (uStill > 0.0) {
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, mix(vec3(l), col, 0.5) * vec3(1.03, 1.0, 0.95) + 0.02, uStill);
  }

  // ...graded hot yellow-orange with greenish shadows, crushed blacks and a heavy vignette
  if (uSnap > 0.0) {
    float l = dot(col, vec3(0.299, 0.587, 0.114));
    vec3 hot = vec3(l * 1.1 + 0.03, l * 0.97 + 0.02, l * 0.42) + vec3(-0.03, 0.04, -0.01) * (1.0 - l);
    col = mix(col, mix(hot, col * vec3(1.08, 0.98, 0.6), 0.5), uSnap * 0.75);
    col = mix(col, smoothstep(vec3(0.05), vec3(1.0), col), uSnap * 0.6);
    col *= 1.0 - uSnap * smoothstep(0.06, 0.42, dot(cv, cv)) * 0.85;
  }

  // depth-based ink outlines
  if (uOutline > 0.0 && uStylize > 0.5) {
    float d = linDepth(uv);
    float dl = linDepth(uv - vec2(px.x, 0.0));
    float dr = linDepth(uv + vec2(px.x, 0.0));
    float du = linDepth(uv + vec2(0.0, px.y));
    float dd = linDepth(uv - vec2(0.0, px.y));
    float diff = max(max(dl - d, dr - d), max(du - d, dd - d));
    float edge = smoothstep(0.05, 0.12, diff / max(d, 0.001));
    // the ink smears away with the picture in a whip pan or rewind
    edge *= 1.0 - smoothstep(0.0, 0.3, max(abs(uWhip), uRewind));
    col = mix(col, vec3(0.07, 0.045, 0.04), edge * uOutline);
  }

  // ordered dither + posterize
  if (uStylize > 0.5) {
    float b = bayer4(cell) - 0.5;
    float L = max(uLevels, 2.0) - 1.0;
    col = floor(col * L + 0.5 + b * uDither) / L;
  }

  // scanlines per low-res row, vignette, grain
  float row = fract(vUv.y * lowRes.y);
  col *= 1.0 - uScan * uStylize * smoothstep(0.55, 1.0, abs(row - 0.5) * 2.0);
  vec2 v = vUv - 0.5;
  col *= 1.0 - uVignette * uStylize * dot(v, v) * 1.6;
  col += (hash(vUv * screenRes + time * 61.0) - 0.5) * uGrain * uStylize;
  col *= uFade;
  // fast-motion smear: the last frames linger
  if (uTrail > 0.0) col = mix(col, texture2D(tPrev, vUv).rgb, uTrail);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export class Renderer {
  readonly gl: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  readonly scene = new THREE.Scene();
  style: StyleSettings = { ...DEFAULT_STYLE };
  fade = 1;
  rewind = 0;
  /** Imagined-cutaway look (0..1). */
  dream = 0;
  /** The wavy dissolve in and out of an imagined cutaway (0..1). */
  ripple = 0;
  /** Flashback look (0..1). */
  memory = 0;
  /** Freeze-frame grade (0..1). */
  still = 0;
  /** A whip pan's streak (-1..1, the sign is the direction). */
  whip = 0;
  /** The look of footage playing on a TV (0..1). */
  video = 0;
  /**
   * A split screen: each panel shows its own set and people through its own camera, side by side. `show` makes
   * only that panel's set and people visible; `panelsDone` puts things back once they've all rendered.
   */
  panels: { camera: THREE.PerspectiveCamera; show(): void }[] | null = null;
  panelsDone: (() => void) | null = null;
  /** The main titles' hot, glowing snapshot grade (0..1). */
  snap = 0;
  /** How much of the previous frame lingers (0..1): the smear of a fast-motion photo burst. */
  trail = 0;
  /** The last two finished frames, for the smear. */
  private history: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private historyValid = false;
  private copy: THREE.Mesh;
  private copyScene = new THREE.Scene();
  private lastTime = 0;
  private rt: THREE.WebGLRenderTarget;
  private post: THREE.ShaderMaterial;
  private postScene = new THREE.Scene();
  private postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.gl = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(this.gl.domElement);
    this.camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 60);
    this.scene.background = new THREE.Color('#050403');

    this.rt = new THREE.WebGLRenderTarget(16, 9, {
      type: THREE.HalfFloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthTexture: new THREE.DepthTexture(16, 9),
    });
    this.post = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        tColor: { value: this.rt.texture },
        tDepth: { value: this.rt.depthTexture },
        lowRes: { value: new THREE.Vector2(16, 9) },
        screenRes: { value: new THREE.Vector2(16, 9) },
        cameraNear: { value: this.camera.near },
        cameraFar: { value: this.camera.far },
        time: { value: 0 },
        uOutline: { value: 0 }, uDither: { value: 0 }, uLevels: { value: 8 }, uScan: { value: 0 },
        uVignette: { value: 0 }, uGrain: { value: 0 }, uAberr: { value: 0 }, uWarmth: { value: 0 },
        uStylize: { value: 1 }, uFade: { value: 1 }, uRewind: { value: 0 },
        uDream: { value: 0 }, uRipple: { value: 0 }, uMemory: { value: 0 }, uSnap: { value: 0 }, uTrail: { value: 0 }, uStill: { value: 0 },
        uWhip: { value: 0 }, uVideo: { value: 0 },
        tPrev: { value: null },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.post);
    quad.frustumCulled = false;
    this.postScene.add(quad);
    this.history = [new THREE.WebGLRenderTarget(16, 9), new THREE.WebGLRenderTarget(16, 9)];
    // a plain blit (no color-space conversion: the post pass already wrote display-ready values)
    this.copy = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = texture2D(map, vUv); }',
      uniforms: { map: { value: null } },
      depthTest: false,
      depthWrite: false,
    }));
    this.copy.frustumCulled = false;
    this.copyScene.add(this.copy);

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.gl.setSize(w, h, false);
    this.gl.domElement.style.width = '100%';
    this.gl.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.updateTarget();
  }

  updateTarget() {
    const w = this.container.clientWidth || 16;
    const h = this.container.clientHeight || 9;
    const pr = this.gl.getPixelRatio();
    let lh = this.style.enabled ? this.style.pixelHeight : Math.round(h * pr);
    lh = Math.max(90, Math.min(lh, Math.round(h * pr)));
    const lw = Math.round(lh * (w / h));
    this.rt.setSize(lw, lh);
    const filter = this.style.enabled ? THREE.NearestFilter : THREE.LinearFilter;
    this.rt.texture.minFilter = this.rt.texture.magFilter = filter;
    this.rt.texture.needsUpdate = true;
    this.post.uniforms.lowRes.value.set(lw, lh);
    this.post.uniforms.screenRes.value.set(w * pr, h * pr);
    for (const t of this.history) t.setSize(Math.round(w * pr), Math.round(h * pr));
    this.historyValid = false;
  }

  setStyle(s: Partial<StyleSettings>) {
    const resChanged = s.pixelHeight !== undefined || s.enabled !== undefined;
    Object.assign(this.style, s);
    if (resChanged) this.updateTarget();
  }

  render(time: number) {
    const u = this.post.uniforms;
    const s = this.style;
    u.time.value = time;
    u.uStylize.value = s.enabled ? 1 : 0;
    u.uOutline.value = s.outline * (1 - this.snap * 0.45);
    u.uDither.value = s.dither * (1 - this.snap * 0.7);
    u.uLevels.value = s.levels + this.snap * 8;
    u.uScan.value = s.scanlines * (1 - this.snap * 0.85);
    u.uVignette.value = s.vignette;
    u.uGrain.value = s.grain;
    u.uAberr.value = s.aberration;
    u.uWarmth.value = s.warmth;
    u.uFade.value = this.fade;
    u.uRewind.value = this.rewind;
    u.uDream.value = this.dream;
    u.uRipple.value = this.ripple;
    u.uMemory.value = this.memory;
    u.uStill.value = this.still;
    u.uWhip.value = this.whip;
    u.uVideo.value = this.video;
    u.cameraNear.value = this.camera.near;
    u.cameraFar.value = this.camera.far;

    u.uSnap.value = this.snap;
    this.lastTime = time;

    this.gl.setRenderTarget(this.rt);
    if (this.panels?.length) this.renderPanels(this.panels);
    else this.gl.render(this.scene, this.camera);
    if (this.trail <= 0) {
      this.historyValid = false;
      u.uTrail.value = 0;
      this.gl.setRenderTarget(null);
      this.gl.render(this.postScene, this.postCam);
      return;
    }
    // smear: finish into one history buffer, mixing in the other, then show it
    const [next, prev] = this.history;
    u.tPrev.value = prev.texture;
    u.uTrail.value = this.historyValid ? this.trail : 0;
    this.gl.setRenderTarget(next);
    this.gl.render(this.postScene, this.postCam);
    (this.copy.material as THREE.ShaderMaterial).uniforms.map.value = next.texture;
    this.gl.setRenderTarget(null);
    this.gl.render(this.copyScene, this.postCam);
    this.history = [prev, next];
    this.historyValid = true;
  }

  /** Side-by-side strips of the low-res target, with a thin black bar between them. */
  private renderPanels(panels: NonNullable<Renderer['panels']>) {
    const rt = this.rt, w = rt.width, h = rt.height;
    const gap = Math.max(1, Math.round(w * 0.008));
    rt.scissorTest = true;
    rt.viewport.set(0, 0, w, h);
    rt.scissor.set(0, 0, w, h);
    this.gl.setRenderTarget(rt);
    this.gl.setClearColor(0x000000, 1);
    this.gl.clear();
    try {
      panels.forEach((p, i) => {
        const x = Math.round((i * w) / panels.length) + (i ? Math.ceil(gap / 2) : 0);
        const right = Math.round(((i + 1) * w) / panels.length) - (i < panels.length - 1 ? Math.floor(gap / 2) : 0);
        rt.viewport.set(x, 0, right - x, h);
        rt.scissor.set(x, 0, right - x, h);
        this.gl.setRenderTarget(rt);
        p.show();
        p.camera.aspect = (right - x) / h;
        p.camera.updateProjectionMatrix();
        this.gl.render(this.scene, p.camera);
      });
    } finally {
      rt.scissorTest = false;
      rt.viewport.set(0, 0, w, h);
      rt.scissor.set(0, 0, w, h);
      this.gl.setRenderTarget(rt);
      this.panelsDone?.();
    }
  }

  /** A frozen print; render faces at photo resolution, then restore the viewer's picture settings. */
  photo(width = 1280) {
    const src = this.gl.domElement;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = Math.round(width * src.height / Math.max(1, src.width));
    const pixelHeight = this.style.pixelHeight;
    this.setStyle({ pixelHeight: Math.max(pixelHeight, Math.min(720, c.height)) });
    try {
      this.render(this.lastTime);
      c.getContext('2d')?.drawImage(src, 0, 0, c.width, c.height);
      return c;
    } finally {
      this.setStyle({ pixelHeight });
    }
  }
}
