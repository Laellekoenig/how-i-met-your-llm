import { pick } from '../util';

// Opening credits, HIMYM-style: the creators over the main titles, then the cast one name at a time over the first scene.
// Nobody here is real: each slot is a different name that sounds like the original billing, picked fresh every airing.

const CAST = [
  ['Jack Radford', 'Jesse Raynard', 'Joel Redmond', 'Jake Ratner'],
  ['Mason Siegler', 'Jasper Seeger', 'Jared Spiegel', 'Jensen Seagrave'],
  ['Colby Smothers', 'Corey Saunders', 'Coco Schneider', 'Kobi Snyder'],
  ['Noel Padraig Harrison', 'Niles Fitzpatrick Harper', 'Neville Pierce Harrington', 'Nolan Patrice Harmon'],
  ['Allison Hanrahan', 'Ellison Halligan', 'Alicia Flanagan', 'Madison Hennessy'],
];
const CREATORS = [
  ['Parker Bates', 'Chester Hayes', 'Carver Mays', 'Archer Bale'],
  ['Greg Tomlin', 'Clay Thompson', 'Graham Thomason', 'Grant Toomey'],
];

export interface CreditCard {
  label?: string;
  name: string;
}

/** The cast, one name at a time over the first scene, and the creators, over the main titles. */
export function openingCredits(): { cast: CreditCard[]; creators: CreditCard } {
  const [f, g] = CREATORS.map(pick);
  return { cast: CAST.map((variants) => ({ name: pick(variants) })), creators: { label: 'created by', name: `${f} &\n${g}` } };
}
