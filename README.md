# ieasybooks

The static landing page for [iEasyBooks](https://ieasybooks.com), a non-profit initiative making Islamic knowledge easier to reach.

## Development

Plain HTML, CSS and vanilla ES modules, with no build step, npm dependencies or CDN scripts.
The Arabic and English documents are `/ar/` and `/en/`; both share the same styles and rendering code.
Assets use root-relative paths, so serve the repository root (for example `python3 -m http.server`)
and open `/ar/` or `/en/`.

## Reading the book

On desktop the page is one physical book, bound like a publisher's series: a plum board and warm
paper, with every chapter in the colour of its own project's logo. The closed book lies with its spine
on the centre line, beside the hero: what the initiative builds, and the six projects with their dates.
Scrolling swings the front board open on the spine in 3D, over the hero, into a centred spread; a
reader who lingers on the closed book without touching it sees the board lift once and settle.
Endpapers in the board's geometric pattern line both boards and face the first and last leaves. Each
chapter is one spread: a text page printed in its colour, with the project's description, links and
tutorials, and a live product plate on the paper page facing it. A gold ribbon lies in the gutter.
English mirrors Arabic.

Paper leaves fold rather than rotate: the crease is the perpendicular bisector of the corner's rest
point and its current position, the front is clipped to the near side of it, and the reverse is the
next page turned over it, with shading along the crease and a soft shadow under the flap. Scrolling
on peels the unread leaf over by its tail corner; scrolling back lifts the read leaf by its own, and a
turn keeps its corner until the book is at rest again. A leaf can also be dragged by any point or
flicked, a corner lifts under the pointer and turns on click, and the arrow keys and catchwords turn
one leaf. Each of these ends by moving the scroll position to the page left open. The top bar, the
hero and the contents provide chapter navigation. The ledger precedes the colophon; after the last
leaf the back board closes over the book.

The book is scaled to fit the window's height, which on most laptops draws it well below its set
size. Below three quarters of that size its type stops shrinking with it: titles and margins give
way instead, and a chapter page that would overflow sets its own type a little smaller.

Phones and tablets held upright read the same book as a paperback, one page at a time: the hero
sits above it, then the book pins under the top bar and its front board swings open on the spine.
Each page then peels from its tail fore-edge corner and turns over the spine, uncovering the next:
a chapter's coloured page, then its plate, which plays as the reader scrolls. What has turned stays
open beyond the spine, cropped by the screen's edge: the board, then each page piled on it. Scroll, a
sideways swipe (towards the spine turns on, away brings the last page back), a tap on the turned-up
corner or the arrow keys each turn one page, and the scroll position follows. The top bar names the
chapter, and tapping it raises the contents from the foot of the screen. A long chapter page sets
tighter, and hands its tutorials to the plate's page if it must. Here the body scrolls rather than the
page, so a phone's browser bar holds still and the book fits the screen left beneath it.

A phone held sideways reads one plain scroll, with the chapters' coloured pages and finished plates.
Scrolling is native, with no wheel interception or scroll snap. Reduced motion gives an ordinary
static document with finished plates. Without JavaScript, both covers, the linked project inventory,
ledger and colophon remain readable.

## Files and materials

- `ar/index.html`, `en/index.html`: the locale-specific top bar, hero, boards, ledger and colophon, with noscript content.
- `assets/js/projects.js`: the single source of truth for project descriptions, dates and links.
- `assets/js/book.js`: builds the spreads and navigation, lays out the desktop book, the paperback or the plain scroll, and drives each from the scroll position; updates Tahweel's latest-release download links, preserving fallback URLs on failure.
- `assets/js/motifs.js`: the plates and their product actions: cutting, transcript highlighting, search, OCR, named flat-stacked books and the Q&A reading wash. Baheth's results and Aljam3's books link to their pages on those sites.
- `assets/css/site.css`: tokens, layout, typography and physical lighting.
- `assets/logos/ieasybooks-mark.svg`: the one-colour mark, converted from the initiative's own vector logo. It masks the top bar, the cover and the title page in their colours.
- `assets/og/ar.png`, `en.png`: each locale's link preview (1200 × 630), the closed book beside the page's promise, set in the site's own fonts.
- `assets/img/pattern.svg`, `pattern-plum.svg`: one seamless 136-unit repeat of an eight-fold star pattern (Hankin's method on the octagon-and-square tiling), drawn in code. The black one is a mask for the boards' band; the plum one lines the endpapers.

Plum, gold and warm paper are the binding; each chapter's colour comes from its logo and is the only
colour on its spread. Alexandria sets the large headings, IBM Plex Sans Arabic everything else, and
Amiri the classical texts the plates quote. Timecode digits occupy fixed-width spans. There is no
generated raster imagery.

## Adding a project

Append an entry to `projects` in `assets/js/projects.js`:

1. Supply `slug`, `date`, `meta_ar` / `meta_en`, `name_ar` / `name_en`, `tagline_ar` / `tagline_en`, and `logo`. Arabic numbers use Arabic-Indic figures, with nonbreaking spaces between numbers and nouns.
2. `color` is the chapter colour, taken from the project's logo. It fills the text page under cream type, so keep it dark enough for 4.5 : 1. The page's fainter labels are strengthened as far as that colour needs to keep 4.5 : 1 too.
3. `links` contains `{ type, url }` entries. The website or main download is primary; the rest are secondary links. Optional `repositories` supplies a short source-code list. Link labels live in `LINKS` in `book.js`.
4. `tutorials` contains `{ id, title_ar, title_en }` entries, where `id` is a YouTube video ID. An empty array shows none.
5. `motif` selects a plate from the `motifs` registry. Without it, `shot` supplies a screenshot plate, or `logo` a small mark.

Chapter labels, folios, the hero and contents lists, catchwords and the scroll budget follow the array order.
A plate plays its beats as the reader scrolls (about a quarter of a screen per beat), then holds before the turn.
A phone held sideways and reduced motion show every plate finished.

## Deployment

Netlify deploys `main`. `_redirects` and `netlify.toml` define routing and headers.

## License

Source code: MIT. Project logos belong to their respective projects.
