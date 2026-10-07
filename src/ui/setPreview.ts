import type { Stage } from '../show/stage';
import type { Director } from '../show/director';
import type { CharacterId, LocationId } from '../script/types';

const previews = {
  car: [
    ['marshall', 'driver'],
    ['ted', 'front_passenger'],
    ['lily', 'back_middle'],
    ['robin', 'back_left'],
    ['barney', 'back_right'],
  ],
  taxi: [
    ['ted', 'back_left'],
    ['robin', 'back_right'],
    ['lily', 'back_middle'],
    ['barney', 'front_passenger'],
    ['ranjit', 'driver'],
  ],
  limo: [
    ['barney', 'rear_seat_left'],
    ['robin', 'rear_seat_right'],
    ['ted', 'bench_1'],
    ['lily', 'bench_2'],
    ['marshall', 'bench_3'],
    ['ranjit', 'driver'],
  ],
  maclarens_sidewalk: [
    ['ted', 'pub'],
    ['robin', 'friend'],
    ['marshall', 'stoop'],
    ['lily', 'stoop_friend'],
    ['barney', 'curb'],
  ],
  hoser_hut: [
    ['robin', 'table_left'],
    ['marshall', 'table_right'],
    ['lily', 'friend'],
    ['barney', 'bar_stool'],
  ],
  courtroom: [
    ['marshall', 'counsel'],
    ['lily', 'client'],
    ['brad', 'opposing_counsel'],
    ['ted', 'gallery_left'],
    ['barney', 'gallery_right'],
  ],
  atlantic_city_casino: [
    ['barney', 'player_center'],
    ['marshall', 'player_left'],
    ['lily', 'player_right'],
    ['ted', 'table_left'],
    ['robin', 'table_right'],
  ],
  lusty_leopard: [
    ['barney', 'table_left'],
    ['quinn', 'table_right'],
    ['ted', 'friend'],
  ],
} as const satisfies Partial<Record<LocationId, readonly (readonly [CharacterId, string])[]>>;
type PreviewId = keyof typeof previews | 'atlantic_city';

/** Optional, silent set tour. Episodes continue to use the normal player and show guide. */
export function setPreview(stage: Stage, director: Director) {
  const params = new URLSearchParams(location.search);
  const requested = params.get('set');
  if (!requested || (!Object.hasOwn(previews, requested) && requested !== 'atlantic_city')) return false;
  let current = requested as PreviewId;
  let time: 'day' | 'night' = params.get('time') === 'day' ? 'day' : 'night';
  const bar = document.createElement('div');
  bar.className = 'set-preview';
  bar.setAttribute('aria-label', 'Set preview');
  const title = document.createElement('span');
  title.textContent = 'ON LOCATION';
  bar.append(title);
  const places = document.createElement('select');
  places.setAttribute('aria-label', 'Location');
  for (const id of [...Object.keys(previews), 'atlantic_city'] as PreviewId[]) {
    const o = document.createElement('option');
    o.value = id;
    o.textContent = id === 'atlantic_city' ? 'Atlantic City · Arrival' : stage.sets[id].name;
    places.append(o);
  }
  places.value = current;
  bar.append(places);
  const shots = document.createElement('select');
  shots.setAttribute('aria-label', 'Camera angle');
  bar.append(shots);
  const daylight = document.createElement('button');
  daylight.type = 'button';
  bar.append(daylight);
  const guide = document.createElement('a');
  guide.href = `/${params.has('mute') ? '?mute' : ''}`;
  guide.textContent = 'TV guide';
  bar.append(guide);
  document.body.append(bar);
  const updateShot = () => {
    stage.endEstablishing();
    if (current === 'atlantic_city') {
      director.establish(stage.establish('atlantic_city', 'atlantic_city_casino', time), true);
      return;
    }
    const [kind, value] = shots.value.split(':');
    const cast = previews[current];
    if (kind === 'wide') director.wide(Number(value), 0);
    else if (kind === 'close') director.closeup(value as CharacterId);
    else {
      const [a, b] = value === 'reverse' ? [cast[1][0], cast[0][0]] : [cast[0][0], cast[1][0]];
      if (kind === 'two') director.twoShot(a, b);
      else director.overShoulder(a, b);
    }
  };
  const show = () => {
    const url = new URL(location.href);
    url.searchParams.set('set', current);
    url.searchParams.set('time', time);
    history.replaceState(null, '', url);
    daylight.textContent = time === 'night' ? 'Night · Switch to day' : 'Day · Switch to night';
    const previous = shots.value;
    shots.replaceChildren();
    if (current === 'atlantic_city') {
      const option = document.createElement('option');
      option.textContent = 'Boardwalk arrival';
      shots.append(option);
      shots.disabled = true;
    } else {
      shots.disabled = false;
      stage.setLocation(current, time);
      for (const [id, mark] of previews[current]) stage.place(id, mark);
      const options: [string, string][] = [
        ...stage.sets[current].wides.map((w, i): [string, string] => [
          `wide:${i}`,
          w.label ?? (i === 0 ? 'Master wide' : i === 1 ? 'Conversation wide' : `Reverse wide ${i - 1}`),
        ]),
        ...previews[current].map(([id]): [string, string] => [`close:${id}`, `${stage.actors[id].def.name} · Close-up`]),
        ['two:forward', 'Two-shot'],
        ['two:reverse', 'Reverse two-shot'],
        ['shoulder:forward', 'Over the shoulder'],
        ['shoulder:reverse', 'Reverse shoulder'],
      ];
      for (const [value, name] of options) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = name;
        shots.append(option);
      }
      if (options.some(([value]) => value === previous)) shots.value = previous;
    }
    updateShot();
  };
  places.addEventListener('change', () => {
    current = places.value as PreviewId;
    show();
  });
  shots.addEventListener('change', updateShot);
  daylight.addEventListener('click', () => {
    time = time === 'night' ? 'day' : 'night';
    show();
  });
  show();
  return true;
}
