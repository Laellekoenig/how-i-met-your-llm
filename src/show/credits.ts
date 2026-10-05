import { pick } from '../util';

// Opening credits, HIMYM-style: the creators over the main titles, then the cast one name at a time over the first scene.
// Nobody here is real: every airing gets a freshly made-up cast and crew.

const FIRST = [
  'Jesse', 'Dana', 'Morgan', 'Casey', 'Avery', 'Jordan', 'Riley', 'Quinn', 'Hayden', 'Emerson', 'Rowan', 'Sloane',
  'Parker', 'Reese', 'Blair', 'Drew', 'Logan', 'Shea', 'Marlowe', 'Tatum', 'Spencer', 'Cameron', 'Ellis', 'Peyton',
  'Lane', 'Kendall', 'Harper', 'Toby', 'Nadia', 'Felix', 'Iris', 'Owen', 'Greta', 'Milo', 'Vera', 'Theo',
];
const LAST = [
  'Whitaker', 'Castellano', 'Brennan', 'Okafor', 'Lindqvist', 'Navarro', 'Hollis', 'Pemberton', 'Albright', 'Sato',
  'Delacroix', 'McAllister', 'Fairbanks', 'Kowalski', 'Ashby', 'Vance', 'Romero', 'Thornton', 'Halloway', 'Ibsen',
  'Mercer', 'Kaplan', 'Duarte', 'Sinclair', 'Abernathy', 'Novak', 'Goldberg', 'Lockhart', 'Prescott', 'Varga',
];

export interface CreditCard {
  label?: string;
  name: string;
}

function names(n: number) {
  const out = new Set<string>();
  while (out.size < n) out.add(`${pick(FIRST)} ${pick(LAST)}`);
  return [...out];
}

/** The cast, one name at a time over the first scene, and the creators, over the main titles. */
export function openingCredits(): { cast: CreditCard[]; creators: CreditCard } {
  const [a, b, c, d, e, f, g] = names(7);
  return { cast: [a, b, c, d, e].map((name) => ({ name })), creators: { label: 'created by', name: `${f} &\n${g}` } };
}
