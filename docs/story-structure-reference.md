# Story structure and the 2030 frame

Research checked 6 October 2026. These examples describe storytelling choices, not a required formula or a
frequency survey. Episode transcripts are unofficial transcriptions; use them for sequence and dialogue, not
precise shot timing. Write original stories rather than reproducing these plots or jokes.

## What the show does

| Example | Observation | Writing consequence |
| --- | --- | --- |
| [Pilot, S1E1](https://transcripts.foreverdreaming.org/viewtopic.php?t=11508), also [the reaction exchange](https://www.imdb.com/title/tt0606110/quotes/) | Opens with the kids, returns to their shocked reaction when Ted prematurely declares his love to Robin, then returns again for the Aunt Robin reveal at the end. | The couch can interrupt an unfolding story at a specific reveal; it is not just an opening/closing wrapper. |
| [Swarley, S2E7](https://www.springfieldspringfield.co.uk/view_episode_scripts.php?tv-show=how-i-met-your-mother&episode=s02e07) | Opens on the friends in a coffee shop. Future Ted later introduces Lily's side of events, replaying what initially looked like evidence against Chloe. | Start with character action when it supplies the hook. Narration can enter later to change our interpretation. |
| [The Best Burger in New York, S4E2](https://transcripts.foreverdreaming.org/viewtopic.php?t=11657) | Opens with Future Ted describing changing New York, moves through Marshall's job search into the gang's dinner argument before the titles. | Voice-over over the story is a distinct choice from a couch scene. A cold open can contain story action as well as narration. |
| [Mary the Paralegal, S1E19](https://transcripts.foreverdreaming.org/viewtopic.php?t=11661) | Opens with the gang at the bar three months earlier, jumps forward to the consequences, and ends on a dialogue callback after Ted's hotel-room revenge. | Neither a spoken narrator introduction nor a final narrator moral is compulsory. An in-scene joke can close the episode. |
| [Brunch, S2E3](https://www.springfieldspringfield.co.uk/view_episode_scripts.php?tv-show=how-i-met-your-mother&episode=s02e03) | Presents the unhappy brunch, then reconstructs three strands that explain it. | A glimpse of the result can create a question; subsequent time shifts should answer it. |

Pamela Fryman's [DGA profile](https://www.dga.org/craft/dgaq/issues/1001-spring-2010/profile-pamela-fryman)
describes the show's unusually large number of scenes and its blend of multi-camera production with a
single-camera sensibility. Our short 3–4-scene episodes are a stage/pacing convention, not the original show's
literal structure. Borrow purposeful reversals, retellings and cutaways within the engine's limits.

## Apply this in our writers' room

Choose three things independently in the beat sheet:

- **Entry:** an exchange on the couch, a scene already in motion, Future Ted over the story, or an intriguing
  outcome followed by an explained rewind. Pick the hook the premise needs.
- **Couch visits:** none, an opening, a middle interruption, a closing reaction, or a motivated combination.
  Each visit should challenge Ted's account, expose sanitizing, ask a question that triggers a correction, or
  land a specific reaction to what we just saw. Avoid interchangeable complaints that the story is too long.
- **Exit:** a character button, a visual/runner payoff, a kids' reaction, or Future Ted adding a new perspective.
  Don't append a moral that merely restates the scene.

Future Ted is still the retrospective storyteller even when the kids never appear. He can compress time,
withhold information, misremember, correct himself, or set up a reveal. He need not say “Kids” every time.
The kids hear the account; they do not see our camera shots or participate in past events.

Across a batch, compare opening images, first speakers, couch placement and endings as well as premises.
Vary repeated defaults deliberately, without imposing a percentage, rotation or obligatory kids appearance.

## Encoding it in this repo

- **Couch first:** optional `coldOpen` is a Future Ted string spoken over the kids; optional `couch` holds their
  `say` beats and his `narrate` answers. A nonempty `couch` can start with a kid even without `coldOpen`.
  Main titles follow this exchange, then `scenes[0]`.
- **Story first:** omit both `coldOpen` and `couch`. `scenes[0]` plays once before the main titles; subsequent
  scenes follow normally. Start with dialogue/action, or a `narrate` beat over the set. Use `transition: "cut"`
  for an immediate interior opening, or `skyline`/`exterior` for narration over an establishing shot.
  This is our supported title boundary, not a claim that the original always puts titles after one scene.
- **Middle or end:** put Penny/Luke `say` or `act` beats at the relevant point in a scene's `beats` array.
  Consecutive kid beats, `narrate` answers, `laugh` and `pause` beats stay on the couch; the next story beat
  resumes the saved scene. Never put the kids in `cast`, move them into a story set, or put later reactions
  in the top-level `couch` array. A lone `narrate` beat stays over the story unless it follows a couch cut.

For example, these original beats belong between story beats, with Ted already in the scene's cast:

```json
[
  { "type": "narrate", "line": "I handled the criticism with complete dignity." },
  { "type": "say", "character": "penny", "line": "Is this before or after you wrote the complaint poem?" },
  { "type": "narrate", "line": "The sonnet was an appeal." },
  { "type": "say", "character": "ted", "line": "Does anybody know a rhyme for refund?", "laugh": "laugh" }
]
```

The first narration plays over the story; Penny and the answer play on the couch; younger Ted resumes the
story. See `bun run bible` for the full schema and `bun run episodes read <file>` to review the title boundary.
