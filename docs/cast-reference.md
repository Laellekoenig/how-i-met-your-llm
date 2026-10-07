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

## Marshall Eriksen

Marshall's model follows Jason Segel's swept-back brown hair, exposed forehead, short
sideburns, broad lower face, fuller nose and wide smile. His tall, broad silhouette
stays on the existing animated rig, including speech, expressions and seated poses.

The casual layers match the [promotional portrait reproduced by Purepeople](https://www.purepeople.com/media/jason-segel-alias-marshall-dans-la_m530915)
([inspected image](https://static1.purepeople.com/articles/7/70/41/7/@/530915-jason-segel-alias-marshall-dans-la-1200x0-2.jpg)):
an open navy knit cardigan with ribbed bands and thin blue edging, a pale blue shirt
with pointed collars and dark buttons, and a heather-gray crew-neck T-shirt. Shirt
cuffs peek out below the ribbed sleeves. Charcoal trousers and brown shoes complete
the model; those are complementary choices because the reference is a head-and-torso
portrait. This replaces the previous generic red flannel and khakis.

His charcoal lawyer's suit, white shirt and striped blue tie still appear at the
office, GNB and courtroom, or with `"outfit": "work"`. It now has pointed shirt
collars and a longer tie, while retaining the regular jacket fit. The updated face
and hair carry across both outfits. Switching top style clears the cardigan details;
overriding the shirt color removes the gray third layer. Geometry, knit stitches,
and ribbing are generated locally; the app never downloads the reference photo.
The booth's central camera is slightly higher so Lily remains visible when the
taller Marshall sits in front of her, including through his small idle shifts.

Running-app captures: [casual portrait](screenshots/marshall-casual.png),
[seated dialogue with the TV filter](screenshots/marshall-booth.png),
[adjusted booth wide](screenshots/marshall-booth-wide.png), and
[lawyer's suit](screenshots/marshall-work.png).

## Barney Stinson

Barney's procedural model follows Neil Patrick Harris's short, brushed-up dark-blond
hair, blue eyes, longer face, defined chin, and lean silhouette. His lifted forelock
has swept ridges and close-cut sides; his existing smirk, gestures and lip sync remain animated.

The clothing matches the [promotional portrait reproduced by GQ](https://www.gq.com/story/barney-stinson-how-i-met-your-mother-finale)
([inspected image](https://media.gq.com/photos/55828b3f1177d66d68d5287c/4%3A3/w_1024%2Cc_limit/blogs-the-feed-how-i-met-your-mother-barney-stinson.jpg)):
a fitted navy two-piece suit, pale blue shirt with fine vertical stripes, dark tie with
small pale motifs, and a flat white pocket square. The jacket has narrow lapels,
two buttons and pocket welts, with pointed shirt collars and striped cuffs.
Matching trousers and black dress shoes complete the stylized outfit.

[Heritage Auctions' screen-worn costume listing](https://entertainment.ha.com/itm/movie-tv-memorabilia/costumes/neil-patrick-harris-barney-stinson-2-pc-black-suit-white-shirt-and-plaid-tie-from-how-i-met-your-mother/a/7318-89775.s)
also documents his narrow-lapelled, single-breasted two-piece tailoring; its black suit
and plaid tie are a different episode outfit from the navy portrait used here.

The suit is Barney's everyday look in every location. Costume overrides still work:
changing top style clears the slim tailoring and shirt stripes, and an explicit
undershirt or tie color removes that garment's pattern. All geometry and textures
are generated locally; the app does not fetch reference photos.

## Lily Aldrin

Lily's procedural model follows Alyson Hannigan's petite silhouette, green-hazel eyes,
soft oval face, broad smile and long auburn layers. An off-centre part and tapered
front locks replace the old red bob. The crown and face-framing locks follow the animated
head; the back rests on her shoulders, preserving the existing expressions, gestures and lip sync.

The outfit follows the CBS still from **“The Ashtray” (S08E17)** reproduced by
[WornOnTV](https://wornontv.net/12207/)
([inspected image](https://wornontv.net/uploads/2013/02/lilys-red-leather-jacket-green-bag.jpg)):
a rust-red Joie Ailey leather jacket with a small collar, shoulder tabs and zipper
details, over a charcoal dress with ivory/blush flowers and sage leaves. The long
chain and pale oval pendant are modeled too. Dark tights and dark flats complete
the outfit; the reference does not show the shoes clearly, so those are a neutral
styling choice. The handheld green bag is omitted to keep her hands available for
the show's animated props.

The jacket stays solid while the bodice and skirt share a locally generated botanical
print. An explicit undershirt color clears the matching dress print; trouser or suit
costumes remove the skirt, and a different top style clears the jacket details and
pendant. Reference photos are neither bundled nor fetched by the app.

## Robin Scherbatsky

Robin's model follows Cobie Smulders's shoulder-length chestnut waves in Season 9:
an off-centre part, swept hairline, loose face-framing curls, blue-green eyes,
defined jaw, stronger brows and a wider mouth. The shorter hair moves with her head,
including during dialogue, head turns and seated gestures.

Her everyday outfit matches the CBS still from **“The Locket” (S09E01)** catalogued by
[WornOnTV](https://wornontv.net/19310/)
([inspected full outfit](https://wornontv.net/uploads/2013/09/robins-black-blazer-white-shirt-capped-heels.jpg)):
a fitted black Helmut Lang Gala blazer over an untucked ivory-white blouse with
contrasting dark buttons, ink-dark skinny jeans with rolled cuffs, and cream pumps
with black toe caps, based on the listed Saint Laurent shoes. The procedural jacket
has narrow lapels, angled pocket welts and one button; the blouse has a folded open
collar, visible placket and white cuffs. Bare ankles separate the jeans from the heels.

This is her default look in every location. Costume overrides clear garment-specific
details when the blouse, jacket, trousers or shoes are replaced. Robin Sparkles keeps
her separate flashback wardrobe. Geometry is generated locally; the reference photo
is not bundled or fetched by the app.

## Brad Morris

Brad follows Joe Manganiello's **“Twelve Horny Women” (S08E08)** courtroom look:
the [Richard Cartwright/Fox episode still on IMDb](https://www.imdb.com/media/rm1477947136/tt0460649)
([inspected image](https://m.media-amazon.com/images/M/MV5BNjQ1MTkwMDM3N15BMl5BanBnXkFtZTcwMzI5NzQ3OA%40%40._V1_FMjpg_UX1000_.jpg)).
The [Season 8 conference-room still](https://www.allocine.fr/series/ficheserie-446/photos/detail/?cmediafile=20336462)
([inspected image](https://fr.web.img2.acsta.net/medias/nmedia/18/74/38/63/20336462.jpg))
provides a second view of his longer dark hair and close beard.
[Entertainment Tonight's on-set interview](https://www.etonline.com/tv/127305_Joe_Manganiello_on_How_I_Met_Your_Mother)
also establishes the beard and longer hair as part of Brad's Season 8 return.

His procedural model has an exposed forehead, off-centre swept forelock, waves
over the ears and a curled nape. The hair follows his animated head. A close-fitting
beard follows the jaw and rises into the sideburns, with tapered moustache halves
and a small patch below the lip that leaves the animated mouth clear. Stronger
brows, a broader jaw and chin, fuller nose and wider mouth distinguish his face.
His tall, athletic silhouette has a broader chest and shoulders over a tapered waist.

The everyday outfit is the courtroom's fitted charcoal two-piece, gray shirt,
dark tie with diagonal muted-gold stripes and black dress shoes. Pointed shirt
collars, longer tie, jacket buttons, pocket welts and cuffs use the existing suit
rig. Other top styles clear the suit tailoring; the face, hair, beard and build
carry across costume overrides. All meshes and textures are generated locally.

Running-app captures: [seated portrait](screenshots/brad/portrait.png),
[standing courtroom look](screenshots/brad/standing.png), and
[seated conversation](screenshots/brad/conversation.png). The
[TV-filter view](screenshots/brad/stylized.png) shows the normal 270p presentation;
[previous model](screenshots/brad/before.png) is retained for comparison.

Verified in the muted running app: courtroom wides, close-ups, push-in, two-shots
and both shoulder directions, seated and standing poses, dialogue and gestures.
The build and model tests pass. The full suite's four camera-test timeouts pass
when rerun with longer time limits; repository test limits remain unchanged.

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
