# Family, returning characters, and Robin Sparkles

## Ted Mosby

Ted's updated procedural model follows Josh Radnor's dark, full, tousled hair with a lifted
forelock and short sideburns, strong eyebrows, fuller nose, rounded chin and broad mouth.
The hair stays on the animated head in both outfits; the face keeps the existing expressions
and lip sync. These are stylized proportions, not a scanned likeness.

| Outfit | Inspected show reference | Modeled details |
| --- | --- | --- |
| Casual | [S06E01 MacLaren's still](https://www.spotern.com/en/spot/tv/how-i-met-your-mother/71170/the-plaid-shirt-of-ted-mosby-josh-radnor-in-how-i-met-your-mother-s06e01) ([image](https://medias.spotern.com/spots/w640/71/71170-1532336916.jpg)) | Navy crew-neck sweater over a pale checked shirt, with the collar and cuffs showing. Dark indigo jeans and brown shoes complete the everyday outfit. |
| Suit | [Prime Video's Season 5 imagery](https://www.primevideo.com/detail/How-I-Met-Your-Mother/0P557GI6F8MMATTJJ6RFJMCRWP) ([“Definitions” classroom still](https://m.media-amazon.com/images/S/pv-target-images/0fdcccda71080991962d8a8c686b849d1f67c29724b1bce49c6dd011d42e459a.jpg)) | Charcoal-navy two-piece suit, pale blue shirt, red tie with diagonal cream stripes and dark dress shoes. |

Ted automatically wears the suit at `office` and `lecture_hall`. Set `"outfit": "work"`
on his cast entry to choose it anywhere, or `"outfit": "casual"` to choose the sweater
at work. Episode/scene costumes still layer over either outfit, including his red cowboy
boots. Shirt or blazer variants can use the existing `wardrobe` vocabulary. Changing the
undershirt or top style removes the casual shirt's checks.

All meshes and clothing textures are generated locally. No reference photos are bundled
or fetched by the app.

## Returning cast

Nine new recurring cast IDs: `loretta`, `mickey`, `hammond`, `stella`, `zoey`, `nora`,
`virginia`, `punchy`, and `robin_sparkles`. Each has a procedural actor, caption color,
voice profile and audition, name aliases, and a writers' guide entry with relationships,
comic hooks, and suggested locations. Robin Sparkles is Robin's performance persona:
use her in labeled flashbacks, imagined performances, or an explicitly established reprise.
Nora is Barney's ex and Robin's coworker, not Robin's ex or Stella's sister Nora Zinman.

## Inspected visual references

The models interpret these episode stills in the existing low-poly style. Clothing prints,
accessories, faces, and proportions are original procedural approximations; reference
photos are not bundled or requested at runtime. Voices remain browser TTS.

| Character | Reference | Modeled clothing and silhouette |
| --- | --- | --- |
| Loretta Stinson / Frances Conroy | [Wedding-weekend still](https://www.bustle.com/articles/6895-another-how-i-met-your-mother-episode-another-guest-star-with-nothing-to-do) | Auburn updo, long-sleeved black blouse with a gold-flecked print, dark trousers, earrings. |
| Mickey Aldrin / Chris Elliott | [Apartment/intercom still](https://www.cracked.com/article_36646_chris-elliott-appearances-as-lilys-deadbeat-dad-in-how-i-met-your-mother-ranked.html) | Bald crown, graying beard, red plaid shirt with rolled sleeves over charcoal, jeans. |
| Hammond Druthers / Bryan Cranston | [Office still in this guest-star gallery](https://genial.guru/articles/20-famosos-que-aparecieron-en-como-conoci-a-tu-madre-y-probablemente-no-lo-recuerdes-1188710/) | Receding brown hair, brown sweater vest over pale blue/tan checks, blue tie and neutral trousers. |
| Stella Zinman / Sarah Chalke | [Stella and Ted at the arcade](https://www.tz.de/leben/serien/how-i-met-your-mother-spinoff-start-deutschland-how-i-met-your-father-zr-91242909.html) | Long blonde waves, turquoise-and-beige striped cardigan, coral blouse and dark jeans. |
| Zoey Pierson / Jennifer Morrison | [“Architect of Destruction” protest still](https://x.com/AllAboutJMo/status/1031614696892194816) | Burgundy knit cap, blonde waves, dark jacket, floral scarf, dark jeans and boots. The original longer coat is shortened to fit the seated puppet rig. |
| Nora / Nazanin Boniadi | [Sidewalk conversation with Barney](https://www.imdb.com/title/tt0460649/mediaviewer/rm1483061504/) | Long dark hair, ivory sleeveless floral dress, bare legs and neutral shoes. |
| Virginia Mosby / Cristine Rose | [MacLaren's still on Rose's IMDb page](https://www.imdb.com/name/nm0004284/) | Chestnut bob, red open-neck blouse with rolled sleeves, dark trousers and earrings. |
| Punchy / Chris Romano | [“The Best Man” wedding gallery](https://www.hollywood.com/tv/barney-and-robin-get-close-in-how-i-met-your-mother-wedding-pics-57219027) ([still](https://media.hollywood.com/images/l/himymwedding3.jpg)) | Short dark hair, compact build, black wedding suit, white shirt, pale tie and boutonniere. The rerun establishes anniversary photos as the reason for his formal clothes. |
| Robin Sparkles / Cobie Smulders | [“Slap Bet” mall-video still](https://www.slashfilm.com/1851865/how-i-met-your-mother-best-episodes-ranked/) and [costume retrospective](https://www.eonline.com/news/526783/how-i-met-your-mother-let-s-go-to-the-mall-and-relive-the-12-most-iconic-fashion-moments-of-the-series) | Blonde curls, oversized red bow, faded denim jacket and skirt, white top, red belt, black bead necklace, bright stacked bangles, dark tights and pale socks. |

## Offline appearances

- **The Family Fine Print**: Mickey pitches his game at the apartment; a flashback visits Loretta at Barney's; Virginia embarrasses Ted over dinner.
- **The Committee**: Stella, Zoey and Nora plan their own community benefit at the restaurant and celebrate at MacLaren's. They have their own goals and punchlines.
- **The Reunion Tape**: Hammond lectures Ted's class, Punchy arrives in his wedding suit, and an old tape prompts a Robin Sparkles retail-promotion flashback before returning to present-day Robin.

These follow the original four reruns. All dialogue and the short Sparkles jingle are original.
