// Regenerates the README screenshot (docs/screenshot.png): the gang in the MacLaren's booth, in headless Chrome.
// Usage: bun run screenshot. Set CHROME to the browser binary if it isn't at the usual macOS path.
import { join } from 'node:path';
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';

const root = join(import.meta.dir, '..');
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 5190 } });
await server.listen();
const browser = await puppeteer.launch({ executablePath: chrome, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(new URL('/?set=maclarens&time=night&mute', server.resolvedUrls!.local[0]).href);
  await page.waitForFunction(() => 'himyllm' in window, { timeout: 120_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.querySelector<HTMLElement>('.set-preview')!.style.display = 'none';
    const { stage, director, player } = (window as unknown as { himyllm: any }).himyllm;
    const gang: [string, string, string, string][] = [
      ['ted', 'booth_end', 'excited', 'cheers'],
      ['marshall', 'booth_left_front', 'laughing', 'crack_up'],
      ['lily', 'booth_left_back', 'laughing', 'cheers'],
      ['robin', 'booth_right_back', 'smug', 'eye_roll'],
      ['barney', 'booth_side', 'proud', 'thumbs_up'],
    ];
    for (const [id, mark] of gang) stage.place(id, mark);
    await new Promise((r) => setTimeout(r, 1500));
    director.fresh();
    director.wide(3, 0);
    for (const [id, , emotion, gesture] of gang) {
      stage.actors[id].setEmotion(emotion);
      stage.actors[id].doGesture(gesture);
    }
    // freeze mid-gesture
    await new Promise((r) => setTimeout(r, 900));
    player.paused = true;
  });
  await (await page.$('#screen'))!.screenshot({ path: join(root, 'docs/screenshot.png') });
  console.log('docs/screenshot.png');
} finally {
  await browser.close();
  await server.close();
}
