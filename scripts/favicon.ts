// Regenerates the favicons in public/: Ted's head, through the show's picture filter, on a transparent background.
// Usage: bun run favicon. Set CHROME to the browser binary if it isn't at the usual macOS path.
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';

const root = join(import.meta.dir, '..');
const out = join(root, 'public');
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
/** Pixels of the low-res picture per icon pixel: the small icons are drawn finer and boxed down so the face still reads,
 *  the big ones coarser and blown up so they keep the show's chunky pixels. */
const ICONS: { file: string | null; size: number; scale: number; backdrop?: boolean }[] = [
  { file: null, size: 16, scale: 4 },
  { file: null, size: 32, scale: 2 },
  { file: null, size: 48, scale: 2 },
  { file: 'icon-192.png', size: 192, scale: 1 / 2 },
  { file: 'apple-touch-icon.png', size: 180, scale: 1 / 2, backdrop: true },
];

const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 5191 } });
await server.listen();
const browser = await puppeteer.launch({ executablePath: chrome, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 800 });
  await page.goto(new URL('/?set=maclarens&time=night&mute', server.resolvedUrls!.local[0]).href);
  await page.waitForFunction(() => 'himyllm' in window, { timeout: 120_000 });
  const pngs = await page.evaluate(async (icons) => {
    document.querySelector<HTMLElement>('.set-preview')!.style.display = 'none';
    const { stage, renderer, player } = (window as unknown as { himyllm: any }).himyllm;
    const ted = stage.actors.ted;
    stage.place('ted', 'bar_standing');
    ted.setEmotion('happy');
    await new Promise((r) => setTimeout(r, 1500));
    player.paused = true;

    // only Ted: the set's lights stay on, everything solid goes
    for (const s of Object.values(stage.sets) as any[]) s.group.traverse((o: any) => { if (o.isMesh) o.visible = false; });
    for (const [id, a] of Object.entries(stage.actors) as [string, any][]) a.root.visible = id === 'ted';

    // a square picture, with Ted's head filling it: a long lens, a little above eye level and off to his left
    const view = document.getElementById('viewport')!;
    Object.assign(view.style, { position: 'fixed', left: '0', top: '0', width: '512px', height: '512px', zIndex: '99' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const cam = renderer.camera;
    const head = ted.headWorld;
    const f = ted.facing + 0.42;
    cam.fov = 11.5;
    cam.position.set(head.x + Math.sin(f) * 1.9, head.y + 0.12, head.z + Math.cos(f) * 1.9);
    cam.lookAt(head.x, head.y + 0.01, head.z);
    cam.updateProjectionMatrix();
    ted.lookAt = cam.position.clone();

    const canvas = renderer.gl.domElement as HTMLCanvasElement;
    const shot = (low: number, bg: string) => {
      renderer.setStyle({ pixelHeight: low, grain: 0, vignette: 0 });
      // (the picture is never this small in the show, so step past its 90-line floor)
      renderer.rt.setSize(low, low);
      renderer.post.uniforms.lowRes.value.set(low, low);
      renderer.scene.background.set(bg);
      renderer.render(10);
      const c = document.createElement('canvas');
      c.width = c.height = low;
      const g = c.getContext('2d')!;
      g.imageSmoothingEnabled = false;
      g.drawImage(canvas, 0, 0, low, low);
      return g.getImageData(0, 0, low, low);
    };

    return icons.map(({ size, scale, backdrop }) => {
      const low = Math.round(size * scale);
      // a difference matte: whatever changes with the background is background
      const dark = shot(low, '#000000'), light = shot(low, '#ffffff');
      const big = document.createElement('canvas');
      big.width = big.height = low;
      const bg = big.getContext('2d')!;
      const img = bg.createImageData(low, low);
      for (let i = 0; i < img.data.length; i += 4) {
        const same = Math.abs(dark.data[i] - light.data[i]) + Math.abs(dark.data[i + 1] - light.data[i + 1]) + Math.abs(dark.data[i + 2] - light.data[i + 2]) < 6;
        img.data.set(same ? [dark.data[i], dark.data[i + 1], dark.data[i + 2], 255] : [0, 0, 0, 0], i);
      }
      bg.putImageData(img, 0, 0);
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d')!;
      if (backdrop) {
        g.fillStyle = '#f5c518'; // the yellow umbrella
        g.fillRect(0, 0, size, size);
      }
      g.imageSmoothingEnabled = scale > 1;
      g.imageSmoothingQuality = 'high';
      g.drawImage(big, 0, 0, size, size);
      return c.toDataURL('image/png');
    });
  }, ICONS);

  await mkdir(out, { recursive: true });
  const files = ICONS.map((icon, i) => ({ ...icon, png: Buffer.from(pngs[i].split(',')[1], 'base64') }));
  for (const { file, png } of files) {
    if (!file) continue;
    await Bun.write(join(out, file), png);
    console.log(`public/${file}`);
  }
  // favicon.ico: the small ones (16, 32 and 48), packed in as PNGs
  const small = files.filter((f) => !f.file);
  const header = Buffer.alloc(6 + 16 * small.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(small.length, 4);
  let offset = header.length;
  small.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size, e);
    header.writeUInt8(size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(png.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += png.length;
  });
  await Bun.write(join(out, 'favicon.ico'), Buffer.concat([header, ...small.map((f) => f.png)]));
  console.log('public/favicon.ico');
} finally {
  await browser.close();
  await server.close();
}
