# Vehicle framing references

Reviewed 2026-10-06. These are observations from the linked episode stills, translated into the
app's low-poly stagecraft; they are not claims about the production's lens specifications.

| Reference | Visible framing | Application |
| --- | --- | --- |
| [Arrivederci, Fiero — Apple TV](https://tv.apple.com/bz/episode/arrivederci-fiero/umc.cmc.6xvokqhcuf8ame9s9h3yp66rr) ([episode still](https://is1-ssl.mzstatic.com/image/thumb/2sYWF6-WgO_05XeS4o1lLA/1200x675.jpg)) | Ted framed through the windshield, headrest behind him, dashboard/wiper at the bottom and roof edge above. | Fixed frontal singles with enough car interior to establish the setting. |
| [Ted teaching Barney to drive — reproduced episode still](https://www.businessinsider.com/all-the-plot-holes-on-how-i-met-your-mother) ([image](https://i.insider.com/605b60bd0d155e0019ef675f?format=jpeg&width=700)) | Front passenger screen left, driver screen right; both upper bodies visible, steering wheel at the lower right, rear-view mirror overhead. | The ordinary sedan's principal windshield two-shot. Maintain this seating axis on cuts. |
| [No Tomorrow — IMDb episode gallery](https://www.imdb.com/title/tt1203040/) ([episode still](https://m.media-amazon.com/images/M/MV5BM2VhNDFmNWItZmY4NC00YjU2LTlkNWQtMGQzYTEyNWRjZDA3XkEyXkFqcGc%40._V1_.jpg)) | Hood/windshield view of a yellow cab: driver to the right, a compact back-seat group behind the front seats. | Cab windshield ensemble, then dedicated rear-bench shots for passenger dialogue. |
| [Something New — CBS promotional image reproduced by ScreenCrush](https://screencrush.com/how-i-met-your-mother-season-finale-something-new-photo-barney-robin/) ([working reproduction](https://i.insider.com/62f12b9da69cad00196247ad?format=jpeg&width=800)) | Barney and Robin side by side against the limo's rear window; dark upholstery, faces lit naturally, a level frontal two-shot. | Straight-on rear-bench two-shot, tighter matching singles, charcoal leather and restrained warm cabin light. |

The sedan is deliberately generic, not a replica of the two-seat Fiero: its rear bench supports the
show's ordinary drives with friends. The Fiero stills inform camera placement and composition.
No roof sign, fare meter, partition, chauffeur, bar or stretch body belongs in this set.

## Coverage rules

- Use fixed windshield/cabin mounts; do not orbit around seated actors as if they were in a room.
- Keep front and rear rows independently coverable. Front-seat headrests naturally hide some rear
  passengers in a windshield shot; give those passengers their own rear-cabin angle.
- Match singles across the seating axis. A requested shoulder shot uses the matching single rather
  than putting a camera through a door or headrest. Driver/passenger-compartment exchanges cut
  between their respective mounts.
- Two-shots must show both requested actors without obstruction. Otherwise cut to the speaker.
- Keep cameras locked to the moving vehicle. Street plates and passing lights convey travel.
- The limo retains cabin ensemble angles for a full group, plus dedicated rear-bench, side-bench
  and driver coverage. The driver is not forced into the passenger master.

## Existing episode audit

Every top-level scene, cutaway and montage shot using `taxi` or `limo` was reviewed. Their stories
call for those vehicles (including Barney pretending to be a cab driver in S12E18), so none is
silently converted to a personal car. The new `car` location is available to the episode language
and show bible, and directly viewable with `/?set=car&time=day&mute`.


Reviewed 24 vehicle sequences across 18 episodes:

| Episode | Sequence | Location |
| --- | --- | --- |
| S10E03 | Scene 2 | limo |
| S10E04 | Scene 3 | limo |
| S11E01 | Scene 1 | limo |
| S11E01 | Scene 3 | taxi |
| S11E12 | Scene 1 | taxi |
| S11E15 | Scene 4 | limo |
| S11E21 | Scene 1 | limo |
| S11E23 | Scene 1 | limo |
| S11E23 | Scene 4 | limo |
| S11E23 | Scene 4 / cutaway | limo |
| S12E01 | Scene 2 | limo |
| S12E03 | Scene 1 | taxi |
| S12E07 | Scene 2 / montage 4 | taxi |
| S12E07 | Scene 3 | taxi |
| S12E09 | Scene 2 | limo |
| S12E10 | Scene 3 | taxi |
| S12E10 | Scene 3 / montage 3 | taxi |
| S12E11 | Scene 4 | limo |
| S12E12 | Scene 2 | limo |
| S12E17 | Scene 3 | taxi |
| S12E18 | Scene 4 | taxi |
| S12E23 | Scene 3 | taxi |
| S12E23 | Scene 4 / montage 4 | limo |
| S12E24 | Scene 4 | limo |

## Verification

The vehicle preview exposes every authored wide, each occupied seat's single, two-shot/reverse
and matching-single/reverse coverage, with day/night controls. Browser contact sheets cover these
states. Geometry tests additionally replay the existing episode casts and every pair of marks,
checking subject visibility, framing, occlusion and camera backgrounds.


All 570 tests passed; the production build passed; all 56 episodes validate with zero errors
(21 existing writing warnings). The running app also rendered 728 camera checks across the 24
existing vehicle sequences with no dialogue visibility failures. Reviewed day/night contact sheets:

| Set | Day | Night |
| --- | --- | --- |
| Car | [All angles](screenshots/car-day-angles.jpg) | [All angles](screenshots/car-night-angles.jpg) |
| Taxi | [All angles](screenshots/taxi-day-angles.jpg) | [All angles](screenshots/taxi-night-angles.jpg) |
| Limo | [All angles](screenshots/limo-day-angles.jpg) | [All angles](screenshots/limo-night-angles.jpg) |
