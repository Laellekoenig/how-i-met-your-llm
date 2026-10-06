# MacLaren's layout references

The set remains a procedural, stylized interpretation. Dimensions below are scene
units, not surveyed measurements of the television set.

## Sources

- [Iñaki Aliste Lizarralde / nikneuk's floor plan](https://www.deviantart.com/nikneuk/art/Floorplan-of-MacLaren-s-Pub-from-HIMYM-906486215)
  ([viewable print](https://www.redbubble.com/i/photographic-print/Floorplan-of-MacLaren-s-Pub-from-HOW-I-MET-YOUR-MOTHER-by-nikneuk/107055669.6Q0TX)):
  freestanding booth island, circulation around it, corner seating and the long
  bar with a return. This is a fan reconstruction, not a production blueprint.
- [BGALAXY's floor plan](https://www.redbubble.com/i/art-print/How-I-Met-Your-Mother-Floor-Plans-TV-Show-Old-Blue-Grid-by-BGALAXY/48125945.1G4ZT):
  a second reconstruction used to cross-check the public room's arrangement.
- [On-screen booth reference](https://i.pinimg.com/originals/2d/88/a5/2d88a50ccb1f995a5f5d2e18696f1e60.jpg):
  the column is behind and left of the gang's table, separate from the shared
  booth back. There is an open aisle behind the end chair, with a round table
  between the booth and the shamrock window. Smooth red upholstery and narrow
  wooden trim frame the broad rectangular tabletop.
- [Behind-the-scenes set photograph](https://tvseriesfinale.com/wp-content/uploads/2013/10/howimetyourmother40.jpg):
  freestanding booths and a separate paneled support column.
- [SET DECOR, Spring 2007](https://www.setdecorators.org/sites/setdecorators/articles/SetDecor-Archives/spring_2007.pdf),
  printed page 42 (PDF page 44), photograph by production designer Steve Olson:
  the long paneled bar, rounded counter return, high-backed stools, bottle
  shelves and broad drum pendants. This production photograph takes precedence
  over fan plans for visible bar details.

## Layout decisions

- Move the main booth from `(-1.0, 0.6)` to `(-0.3, 1.35)` in the X/Z floor plane,
  downstage of the frosted window. Keep its neighboring booth to camera left,
  as in the on-screen reference.
- Separate the column from the booth and remove the invented low cross-wall.
  Move the window-side round table into the backdrop, leaving a usable aisle
  behind the end chair.
- Widen the main tabletop from `0.9` to `1.16`, retain all five scripted seats,
  and tie seat approaches, navigation nodes, lighting and booth cameras to the
  booth's origin.
- Lengthen the bar, round the counter's outside return, extend the bottle
  shelving and add the fourth physical stool and the two drum pendants.

The fan plans disagree on some booth details, and the show's camera wall varies
between shots. These corrections prioritize visible furniture relationships;
they do not invent unseen service rooms or claim an exact architectural replica.

## Shared pub and apartment exterior

The exterior is a procedural interpretation of the **on-screen facade**, with
dimensions chosen for the show's stylized renderer. The real McGee's pub is not
a reference for this facade.

- [MacLaren's exterior frame collected by Decorsed](https://www.decorsed.com/how-i-met-your-mother/)
  ([full frame](https://media.decorsed.com/file/decorsed/howimetyourmother/maclarens-pub-exterior.jpg)):
  pale, weathered brick over a charcoal base; a compact green-and-gold
  **MacLaren's Pub** sign with three downlights; lanterns; a frosted small-pane
  window and poster case at left; a green railing around the sunken entrance;
  the much higher residential stoop immediately to its right.
- [“Come On” (S01E22), episode gallery](https://www.imdb.com/title/tt0774239/mediaindex/)
  ([Ted and Barney outside](https://m.media-amazon.com/images/M/MV5BOGYyNjI2MGItNTM4NC00MmI2LWI5ZTYtODcyN2I2YTQ2NDJiXkEyXkFqcGc%40._V1_.jpg)):
  confirms the adjacency of the pub and apartment steps, solid sloping stone
  balustrades, large capped newel posts, paneled residential entrance, and the
  basement window and three metal bins to the right of the stoop.

`walkupExterior.ts` builds one facade shared by the `maclarens`, `apartment`, and
`rooftop` exterior transitions. The pub shot frames the basement entrance and
sign. The apartment shot frames the raised doorway and full stoop while retaining
the pub next door as a landmark; it gently tilts upward without losing the
entrance. The rooftop shot preserves continuity with the existing roof set.

The basement has a real lower landing and descending side steps. Its sidewalk is
built around that opening, and the street surface stops at the curb, so neither
can cover the stairwell. Other destination buildings retain a continuous sidewalk.
Streetlamps stand to either side of the hero building to keep both entrances clear.

For an apartment arrival, use `"location": "apartment"` with
`"transition": "exterior"`; for a pub arrival, use `"location": "maclarens"` with
the same transition. These remain actor-free establishing shots, followed by the
existing interior. Reference photographs are not bundled or fetched at runtime.
