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

// Short closing cards, based on the original's lowercase, white-on-black crew credits.
// The creator billing carries over from this airing's opening; the crew are sound-alikes too.
export function closingCredits(creators: CreditCard): CreditCard[][] {
  const crew = (label: string, names: string[]): CreditCard => ({ label, name: pick(names) });
  return [
    [
      { label: 'executive producers', name: creators.name.replace(' &\n', '\n') },
      crew('directed by', ['Penelope Freeland', 'Patricia Feldman', 'Priscilla Fairmont']),
    ],
    [
      crew('unit production manager', ['Suzie Maren Greenfield', 'Sally Merryn Greenwell', 'Sylvie Morgan Greenspan']),
      crew('first assistant director', ['Mitchell Shay', 'Miles Shaw', 'Malcolm Shaye']),
      crew('second assistant director', ['Krista Hewitt', 'Kirsten Hume', 'Chrissy Hurst']),
    ],
    [
      crew('costume designer', ['Susannah Presto', 'Savannah Pruitt', 'Serena Prentice']),
      crew('dept. head make-up', ['Lena Jeffries', 'Lana Jessop', 'Leona Jeffersson']),
      crew('dept. head hairstylist', ['Tina Porter-Lindell', 'Tessa Palmer-Lindley', 'Tara Porter-Lennard']),
    ],
    [
      crew('music by', ['Jonas Swainhart', 'Johan Swinford', 'Julian Sweetland']),
      crew('theme music by', ['The Statics', 'The Stalwarts', 'The Sonicsmiths']),
    ],
  ];
}
