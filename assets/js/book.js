// Scroll-scrubbed book. Hard boards swing on the spine in 3D; paper leaves fold like paper and can be dragged.
import { projects } from "./projects.js";
import { motifs, fallbackPlate, fmt, arText, PLATE, NARROW, h, seg, lerp, clamp01, easeOut, easeInOut, setT, setO, setC } from "./motifs.js";
import { initLocalePersistence } from "./i18n.js";

const root = document.documentElement;
const LOCALE = root.lang === "ar" ? "ar" : "en";
const RTL = root.dir === "rtl";

const STR = {
  ar: { notes: "شروحات", source: "الشيفرة المصدرية", yt: "، فيديو على يوتيوب", menu: "الفهرس", next: "التالي:", end: "خاتمة" },
  en: { notes: "Tutorials", source: "Source code", yt: ", video on YouTube", menu: "Contents", next: "Next:", end: "Colophon" },
}[LOCALE];
const ORDINAL = {
  ar: ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"],
  en: ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"],
}[LOCALE];
const chapterLabel = (i) => (LOCALE === "ar"
  ? `الباب ${ORDINAL[i] || fmt(i + 1, "ar")}`
  : `Chapter ${ORDINAL[i] || i + 1}`);

// Link type → label. Adding a link type = adding one row here.
const LINKS = {
  website:        { ar: "الموقع", en: "Website" },
  android:        { ar: "أندرويد", en: "Android" },
  ios:            { ar: "آيفون", en: "iPhone" },
  huawei:         { ar: "هواوي", en: "Huawei" },
  windows:        { ar: "ويندوز", en: "Windows" },
  macos:          { ar: "ماك", en: "macOS" },
  chrome:         { ar: "كروم", en: "Chrome" },
  firefox:        { ar: "فايرفوكس", en: "Firefox" },
  github:         { ar: "الشيفرة المصدرية", en: "Source code" },
  github_python:  { ar: "بايثون", en: "Python" },
  github_ruby:    { ar: "روبي", en: "Ruby" },
  github_tauri:   { ar: "سطح المكتب", en: "Desktop app" },
  github_website: { ar: "الموقع", en: "Website" },
};
// The primary link: the website, else the main download.
const PRIMARY_ORDER = ["website", "windows", "android", "ios", "macos"];
const PRIMARY_LABEL = {
  website: { ar: "زيارة الموقع", en: "Visit the website" },
  windows: { ar: "تنزيل لويندوز", en: "Download for Windows" },
  android: { ar: "تنزيل لأندرويد", en: "Get it on Android" },
  ios:     { ar: "تنزيل لآيفون", en: "Get it on iPhone" },
  macos:   { ar: "تنزيل لماك", en: "Download for macOS" },
};

/* ------------------------------------------------------------------ helpers */
const $ = (sel, el = document) => el.querySelector(sel);
const external = (href, ...kids) => h("a", { href, target: "_blank", rel: "noopener noreferrer" }, ...kids);
function setV(el, on) { if (el._v !== on) { el.classList.toggle("is-on", on); el._v = on; } }
// The paperback scrolls its body, not the page (see site.css), so a phone's browser bar holds still
// around it; every other layout scrolls the page.
const scroller = () => S.lay === "pocket" ? document.body : document.scrollingElement;
const scrollPos = () => scroller().scrollTop;
const scrollToPos = (top) => scroller().scrollTo({ top, behavior: "auto" });

/* --------------------------------------------------------------------- build */
const book = $("#book");
const stage = $("#stage");
const sheet = $("#sheet");
const spreadsRoot = $("#spreads");
const colophonEl = $("#colophon");
const cover = $("#top");
const backcover = $("#contact");
const nav = $("#index");
const tshadow = $(".turnshadow");
const tshadowIn = h("span");
tshadow.append(tshadowIn);
const hero = $(".hero");
const coverRunway = h("div", { class: "cover-runway" });
cover.before(coverRunway); coverRunway.append(cover, hero);
// Beside the closed book, the projects it holds, each in its chapter's colour.
$("#hero-list").append(...projects.map((p) => h("li", { style: `--ch:${p.color}` },
  h("a", { href: `#${p.slug}`, "data-slug": p.slug },
    h("span", { class: "hero__dot", "aria-hidden": "true" }),
    h("span", { class: "hero__name" }, p[`name_${LOCALE}`]),
    h("time", { datetime: p.date }, p[`meta_${LOCALE}`].split(" — ")[0])))));
// A gold ribbon marks the place.
const ribbon = h("span", { class: "ribbon", "aria-hidden": "true" });
sheet.append(ribbon);
// Each board has two faces: the tooled outside, and an inside lined with the endpaper.
const boardShade = () => h("span", { class: "pg__shade board__shade", "aria-hidden": "true" });
for (const board of [cover, backcover]) {
  board.querySelector(":scope > .pg__shade")?.remove();
  board.querySelector(":scope > div").append(boardShade());
  board.append(h("div", { class: "cover__inside", "aria-hidden": "true" }, boardShade()));
}
const stackL = $("#stack-l");
const stackR = $("#stack-r");

function linksBlock(p) {
  const links = p.links.filter((l) => l.url && LINKS[l.type]);
  const primaryType = PRIMARY_ORDER.find((t) => links.some((l) => l.type === t));
  const primary = links.find((l) => l.type === primaryType);
  const rest = links.filter((l) => l !== primary && (l.type !== "github" || !p.repositories?.length));
  const out = h("div", { class: "links" });
  if (primary) {
    const a = external(primary.url, h("span", {}, PRIMARY_LABEL[primary.type][LOCALE]), h("span", { class: "links__arrow", "aria-hidden": "true" }));
    a.className = "links__primary";
    a.dataset.link = primary.type;
    out.append(a);
  }
  if (rest.length) {
    out.append(h("ul", { class: "links__more" }, rest.map((l) => {
      const a = external(l.url, LINKS[l.type][LOCALE]);
      a.dataset.link = l.type;
      return h("li", {}, a);
    })));
  }
  if (p.repositories?.length) {
    // several repositories fold into one quiet sub-list
    const items = [];
    p.repositories.forEach((r, i) => {
      if (i) items.push(LOCALE === "ar" ? "، " : ", ");
      items.push(h("li", {}, external(r.url, LINKS[r.type]?.[LOCALE] || r.type)));
    });
    out.append(h("div", { class: "links__src" }, `${STR.source}: `, h("ul", {}, items)));
  }
  return out;
}

function glossesBlock(p) {
  if (!p.tutorials?.length) return null;
  return h("aside", { class: "glosses", "aria-labelledby": `notes-${p.slug}` },
    h("p", { class: "glosses__head", id: `notes-${p.slug}` }, STR.notes),
    h("ol", { class: "glosses__list" }, p.tutorials.map((t) => h("li", {},
      external(`https://youtu.be/${t.id}`,
        h("span", { class: "glosses__play", "aria-hidden": "true" }),
        h("span", { class: "glosses__t" }, t[`title_${LOCALE}`]),
        h("span", { class: "sr" }, STR.yt))))));
}

const folio = (n) => h("p", { class: "folio", "aria-hidden": "true" }, fmt(n, LOCALE));
const shade = () => h("span", { class: "pg__shade", "aria-hidden": "true" });

function catchword(target, name) {
  const a = h("a", { class: "catch", href: `#${target}` }, h("span", { class: "sr" }, `${STR.next} `), name);
  a.dataset.next = target;
  return a;
}

function descriptionBlock(p) {
  const copy = p[`tagline_${LOCALE}`];
  const parts = p.motif === "library" && copy.match(LOCALE === "ar"
    ? /^(.*?تضم) (أكثر من .+? صفحة) (.*)$/
    : /^(A digital library with) (over .+? pages) (.*)$/);
  // Set the library's existing figures apart, without repeating or rewriting any of its tagline.
  return parts ? h("p", { class: "desc desc--library" },
    h("span", {}, parts[1]), " ", h("span", { class: "library__figures" }, arText(parts[2])), " ", h("span", {}, parts[3]))
    : h("p", { class: "desc" }, arText(copy));
}

// The cream ink's faint tones on a chapter's colour, each at least as strong as it must be to read at
// 4.5 : 1 there.
function inks(hex) {
  const lum = (rgb) => rgb.map(c => c / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
    .reduce((s, c, i) => s + c * [.2126, .7152, .0722][i], 0);
  const bg = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)), on = [247, 240, 229], lb = lum(bg);
  const reads = (a) => { const l = lum(on.map((c, i) => c * a + bg[i] * (1 - a))); return (Math.max(l, lb) + .05) / (Math.min(l, lb) + .05) >= 4.5; };
  const tone = (a) => { while (a < 1 && !reads(a)) a = Math.min(1, a + .01); return +a.toFixed(2); };
  return `--a2:${tone(.8)};--a3:${tone(.66)}`;
}

function buildProject(p, i) {
  const next = projects[i + 1];
  const name = p[`name_${LOCALE}`];
  const m = motifs[p.motif] || fallbackPlate(p, LOCALE);
  const inst = m.create({ locale: LOCALE, rtl: RTL, project: p });
  const block = h("div", { class: "block" },
    h("p", { class: "kicker" }, chapterLabel(i)),
    h("h2", { class: "title", id: `t-${p.slug}` }, name),
    h("p", { class: "meta" }, h("time", { datetime: p.date }, p[`meta_${LOCALE}`])),
    descriptionBlock(p),
    linksBlock(p));
  const gloss = glossesBlock(p);
  const text = h("div", { class: "pg pg--text" }, h("div", { class: "jadwal" }, block, gloss), folio(2 * i + 3), shade());

  const plateFig = h("figure", { class: `plate plate--${p.motif || "plain"}`, "aria-label": name },
    h("div", { class: "plate__box" }, inst.el));
  const plate = h("div", { class: "pg pg--plate" },
    h("div", { class: "jadwal" }, plateFig),
    folio(2 * i + 4),
    next ? catchword(next.slug, next[`name_${LOCALE}`]) : catchword("colophon", STR.end),
    shade());

  const el = h("section", { class: "spread spread--chapter", id: p.slug, "aria-labelledby": `t-${p.slug}`, style: `--ch:${p.color};${inks(p.color)}` }, text, plate);
  return { el, text, plate, project: p, motif: { def: m, inst }, beats: m.beats, slug: p.slug, name, gloss };
}

// Each side is a real page: the title page, and the contents with each chapter's colour.
function openingSpread() {
  const mission = LOCALE === "ar" ? "مبادرة غير ربحية تبني منذ عام ٢٠٢٢ برمجيات مجانية لطلاب العلم والعلماء والدعاة" : "A non-profit initiative building free software for students of knowledge, scholars and preachers since 2022";
  const text = h("div", { class: "pg pg--opening pg--text" },
    h("div", { class: "opening__body opening__identity" },
      h("p", { class: "opening__basmala", lang: "ar", dir: "rtl" }, "بسم الله الرحمن الرحيم"),
      h("span", { class: "mark", "aria-hidden": "true" }),
      h("p", { class: "opening__wordmark" }, LOCALE === "ar" ? "الكتب المُيسّرة" : "iEasyBooks"), h("h2", { class: "opening__mission" }, mission)), folio(1), shade());
  const rows = projects.map((p, i) => ({ slug: p.slug, title: p[`name_${LOCALE}`], n: i * 2 + 3, color: p.color }));
  rows.push({ slug: "colophon", title: STR.end, n: 16 });
  const plate = h("div", { class: "pg pg--contents pg--plate" },
    h("div", { class: "opening__body" }, h("h2", { class: "opening__contents" }, STR.menu),
      h("ol", { class: "opening__list" }, rows.map(r => h("li", { style: r.color ? `--ch:${r.color}` : null }, h("a", { href: `#${r.slug}`, "data-slug": r.slug },
        h("span", { class: "opening__dot", "aria-hidden": "true" }), h("span", { class: "opening__name" }, r.title), h("span", { class: "opening__folio" }, fmt(r.n, LOCALE))))))), folio(2), shade());
  const el = h("section", { class: "spread spread--opening", id: "opening", "aria-label": STR.menu }, text, plate);
  return { el, text, plate, isOpening: true, slug: "opening", name: STR.menu, beats: 0 };
}

// the colophon spread is written in the HTML
function colophonSpread() {
  const text = $(".pg--text", colophonEl);
  const plate = $(".pg--plate", colophonEl);
  return { el: colophonEl, text, plate, motif: null, beats: 0, isColophon: true, slug: "colophon", name: STR.end };
}

// Desktop only: the flyleaf faces the front pastedown, and the colophon's leaf backs onto the rear flyleaf.
function endpaperSpread(where) {
  const pg = h("div", { class: "pg pg--endpaper" }, shade());
  const el = h("section", { class: "spread spread--endpaper", "aria-hidden": "true" }, pg);
  return { el, text: pg, plate: pg, isEndpaper: where, slug: `endpaper-${where}`, name: "", beats: 0 };
}

const spreads = [endpaperSpread("front"), openingSpread(), ...projects.map(buildProject), colophonSpread(), endpaperSpread("back")];
for (const sp of spreads) {
  spreadsRoot.append(sp.el);
  if (sp.isEndpaper) {
    const onLeft = (sp.isEndpaper === "front") === RTL;
    sp.l = onLeft ? sp.text : null;
    sp.r = onLeft ? null : sp.text;
  } else {
    sp.l = RTL ? sp.plate : sp.text;
    sp.r = RTL ? sp.text : sp.plate;
  }
  sp.l?.classList.add("pg--l"); sp.r?.classList.add("pg--r");
  sp.box = $(".plate__box", sp.plate);
}
// Navigation lives on the ground, outside the physical book and above the top bar (a pinned book
// would hold it beneath).
document.body.append(nav);
const entries = spreads.filter(sp => !sp.isOpening && !sp.isEndpaper);
const navList = h("ol", { class: "index__list", id: "index-list" }, entries.map(sp =>
  h("li", { style: sp.project ? `--ch:${sp.project.color}` : null },
    h("a", { href: `#${sp.slug}`, "data-slug": sp.slug }, h("span", { class: "index__dot", "aria-hidden": "true" }), sp.name))));
const navNow = h("span", { class: "index__now", "aria-hidden": "true" }, entries.map(sp => h("span", {}, sp.name)));
const navToggle = h("button", { class: "index__toggle", type: "button", "aria-label": STR.menu, "aria-expanded": "false", "aria-controls": "index-list" }, navNow);
nav.append(navToggle, navList);
const navLinks = [...navList.querySelectorAll("a")];
const navNames = [...navNow.children];
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)");
const S = { mode: "", lay: "", k: 1, H: 932, measured: false, shift: 0 };
let units = [], current = -1;
// Desktops hold the open book; phones and tablets held upright hold it one page at a time (the
// paperback); a phone on its side, or reduced motion, reads one plain scroll.
const chooseMode = () => REDUCED.matches ? "static" : root.clientWidth >= 1024 ? "desk"
  : innerHeight >= 500 && innerHeight >= root.clientWidth ? "pocket" : "phone";

/* ------------------------------------------------------------------ the object */
// One 1320-unit sheet. Two 660-unit boards hinge on the spine; each page is 640 × PH,
// set 20 in from the board's fore-edge and 16 from its head and tail.
const SPINE = 660, PW = 640, TOP = 16, HALF = 330, DEG = Math.PI / 180;
const FWD = RTL ? -1 : 1;          // the side that holds the unread leaves
const LIFT = .055;                 // how far a released corner arcs on its way, × page height
const ZONE = 120;                  // a grabbable page corner
const BEAT = .26, HOLD = .16;      // scroll per plate beat, and the still moment before the turn, × viewport height
const BAR = 64, GAP = 24, TAIL = 56; // the top bar, the air beneath it, and the space the ribbon hangs into, in px
const TYPE_MAX = 1.4;                // the most the book's type grows against its scale
let PH = 900;
const LAST = spreads.length - 1;
const PAGES = spreads.flatMap(sp => [sp.l, sp.r]).filter(Boolean);
for (const sp of spreads) { sp.fwd = FWD < 0 ? sp.l : sp.r; sp.rev = FWD < 0 ? sp.r : sp.l; }
for (const pg of PAGES) pg._shade = pg.querySelector(":scope > .pg__shade");
for (const board of [cover, backcover]) board._shades = [...board.querySelectorAll(".board__shade")];

function layout() {
  const mode = chooseMode(), lay = root.clientWidth >= 1024 ? "sheet" : mode === "pocket" ? "pocket" : "fluid";
  const changed = mode !== S.mode || lay !== S.lay;
  if (changed) {
    stopHands();
    root.classList.remove(`mode-${S.mode}`, `lay-${S.lay}`);
    root.classList.add(`mode-${mode}`, `lay-${lay}`);
    S.mode = mode; S.lay = lay;
    for (const el of [sheet, cover, backcover, nav, tshadow, hero, ribbon, pkFlap, pkDrop, ...PAGES]) {
      el.style.transform = ""; el._t = undefined;
      el.style.opacity = ""; el._o = undefined;
      el.style.clipPath = ""; el._c = undefined;
      el.style.zIndex = ""; el._z = undefined;
      el.style.removeProperty("--shade");
      el.style.removeProperty("--edge");
      el.style.removeProperty("--cast"); el._cast = undefined;
      el.classList.remove("is-open", "is-flipped"); el._f = undefined;
    }
    for (const pg of PAGES) paint(pg._shade, "");
    for (const board of [cover, backcover]) board._shades.forEach(el => paint(el, ""));
    sheet.style.perspectiveOrigin = "";
    hero.inert = false;
    // The paperback reads its hero above the book; the open book keeps it beside the closed board.
    if (mode === "pocket") book.before(hero); else coverRunway.append(hero);
    setV(cover, true); setV(backcover, true);
    for (const sp of spreads) sp.lastP = undefined;
    current = -1;
  }
  // A board keeps a book's proportions: its page is between 640 × 900 and 640 × 980. The book sits
  // clear of the top bar, with room beneath it for the ribbon's tail.
  const kw = root.clientWidth * .94 / 1320, room = innerHeight - BAR - GAP - TAIL;
  S.H = Math.min(1012, Math.max(932, room / kw));
  S.k = Math.min(kw, room / S.H);
  PH = S.H - 2 * TOP;
  S.ox = (root.clientWidth - 1320 * S.k) / 2;
  S.oy = BAR + GAP + (room - S.H * S.k) / 2;
  // Below three quarters of its size, the book's type stops shrinking with it.
  S.lift = lay === "sheet" ? Math.min(TYPE_MAX, Math.max(1, .75 / S.k)) : 1;
  root.style.setProperty("--k", S.k);
  root.style.setProperty("--lift", S.lift);
  root.style.setProperty("--dpr", devicePixelRatio || 1);
  root.style.setProperty("--ox", `${S.ox}px`);
  root.style.setProperty("--oy", `${S.oy}px`);
  root.style.setProperty("--H", `${S.H}px`);
  for (const sp of spreads) {
    const title = $(".title", sp.text);
    if (title) fitTitle(title);
  }
  if (mode === "pocket") pkLayout();
  fitPages();
  mountMotifs(changed);
  timeline();
  S.measured = true;
  if (mode === "phone" || mode === "static") finalState();
  render();
}

// A chapter's name that will not fit on one line sets smaller.
function fitTitle(title) {
  title.classList.remove("title--long"); title.style.whiteSpace = "nowrap";
  const over = title.scrollWidth > title.clientWidth + 1;
  title.style.whiteSpace = "";
  if (over) title.classList.add("title--long");
}

// A chapter's page sets tighter when it runs long; a lifted page then gives back some of its lift,
// and a paperback page hands its tutorials to the plate if it must.
function fitPages() {
  for (const sp of spreads) {
    if (!sp.project) continue;
    const col = $(".jadwal", sp.text);
    sp.text.classList.remove("pg--tight");
    sp.text.style.removeProperty("--lift");
    if (sp.gloss && sp.gloss.parentElement !== col) col.append(sp.gloss);
    if (S.lay === "fluid") continue;
    const over = () => col.scrollHeight > col.clientHeight + 1;
    if (over()) sp.text.classList.add("pg--tight");
    for (let l = S.lift; over() && l > 1;) {
      l = Math.max(1, l - .02);
      sp.text.style.setProperty("--lift", l);
      fitTitle($(".title", sp.text));
    }
    if (over() && sp.gloss && S.lay === "pocket") $(".jadwal", sp.plate).append(sp.gloss);
  }
}

function mountMotifs(force) {
  for (const sp of spreads) {
    if (!sp.motif) continue;
    const narrow = S.lay !== "sheet";
    const plate = sp.box.parentElement;
    const css = getComputedStyle(plate);
    const availW = plate.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
    // A plate also fits its page's height, beside any tutorials moved onto a paperback's page.
    const gloss = sp.gloss?.parentElement === plate.parentElement ? sp.gloss.offsetHeight + 16 : 0;
    const availH = S.lay === "fluid" ? Infinity : plate.parentElement.clientHeight - gloss;
    const base = sp.motif.def.size?.[narrow ? "narrow" : "wide"] || (narrow ? NARROW : PLATE);
    const size = narrow ? { w: Math.min(520, availW), h: base.h } : { ...base };
    // a wider phone page sets the questions in fewer lines
    if (narrow && sp.project.motif === "qa" && size.w >= 350) size.h = 410;
    sp.box.style.setProperty("--mw", `${size.w}px`);
    sp.box.style.setProperty("--mh", `${size.h}px`);
    sp.box.classList.toggle("is-narrow", narrow);
    const key = `${S.lay}:${size.w}:${size.h}:${S.k}`;
    if (force || sp.motifKey !== key) {
      sp.motif.inst.mount({ narrow, w: size.w, h: size.h, px: (devicePixelRatio || 1) * (narrow ? 1 : S.k) });
      sp.motif.inst.update(S.mode === "desk" ? 0 : 1);
      sp.motifKey = key; sp.lastP = undefined;
    }
    // Let reading plates use their printed content height, including after fonts settle.
    if (sp.project.motif === "qa") {
      const flow = $(".m-qa__flow", sp.box);
      sp.box.style.setProperty("--mh", `${Math.ceil(flow.offsetHeight + 60)}px`);
    }
    if (sp.project.motif === "search") {
      const columns = $(".m-se__cols", sp.box);
      sp.box.style.setProperty("--mh", `${Math.ceil(columns.offsetTop + columns.offsetHeight + 28)}px`);
    }
    const mh = parseFloat(sp.box.style.getPropertyValue("--mh"));
    // A tablet's paperback page lets its plate grow to fill it.
    sp.box.style.setProperty("--ms", Math.min(S.lay === "pocket" ? 1.4 : 1, availW / size.w, availH / mh));
  }
}

function timeline() {
  if (S.mode === "pocket") { units = []; pkTimeline(); return; }
  if (S.mode !== "desk") { book.style.height = ""; units = []; return; }
  const vh = innerHeight;
  S.cover = [0, .85 * vh];
  let y = S.cover[1];
  units = spreads.map((sp, i) => {
    const turn = i ? [y, y + .5 * vh] : null;
    const land = turn ? turn[1] : y;
    // A plate plays its beats over the dwell, then holds before the leaf turns.
    const play = sp.beats ? BEAT * sp.beats * vh : 0;
    const dwell = sp.isEndpaper ? .3 * vh : sp.isOpening ? .35 * vh : sp.isColophon ? .45 * vh : play + HOLD * vh;
    const u = { sp, turn, land, dwell, play };
    y = land + dwell; sp.unit = u;
    return u;
  });
  S.close = [y, y + .85 * vh];
  S.end = S.close[1];
  book.style.height = `${Math.ceil(S.end + 1.2 * vh)}px`;
}

function locate(y) {
  let cur = 0, ti = -1, tp = 0;
  for (let i = 1; i < units.length; i++) {
    const [a, b] = units[i].turn;
    if (y < a) break;
    if (y < b) { ti = i; tp = (y - a) / (b - a); cur = tp < .5 ? i - 1 : i; break; }
    cur = i;
  }
  return { cur, ti, tp };
}

/* ------------------------------------------------------------- the paper fold */
// A turning leaf is drawn in its own frame: x runs from the spine (0) to the fore-edge (PW),
// y from head (0) to tail (PH). s is the side of the spine the leaf lies on (−1 left, 1 right).
const L2S = (s, q) => ({ x: SPINE + s * q.x, y: TOP + q.y });
const S2L = (s, p) => ({ x: s * (p.x - SPINE), y: p.y - TOP });
const E2S = (side, e) => ({ x: e.x + (side > 0 ? SPINE : SPINE - PW), y: e.y + TOP });
const S2E = (side, p) => ({ x: p.x - (side > 0 ? SPINE : SPINE - PW), y: p.y - TOP });
// A scrolled turn peels the tail corner up first, then carries it over low, so the leaf barely overshoots the head.
const turnPath = (e) => ({ x: PW * Math.cos(Math.PI * e), y: PH - .57 * PH * e * (1 - e) ** 2.5 });
// A scrolled turn keeps the corner it started from until the book is at rest again: scrolling on
// lifts the unread leaf by its tail corner, scrolling back lifts the read leaf by its own.
const scrolled = { ti: -1, dir: 1, y: 0 };
const scrollTurn = (a, dir, s) => ({ kind: "turn", a, dir, top: false, s, P: turnPath(dir > 0 ? s : 1 - s) });

// Paper can't stretch: the corner stays within reach of both ends of the spine.
function constrain(P, top) {
  const y0 = top ? 0 : PH, y1 = top ? PH : 0, diag = Math.hypot(PW, PH);
  let x = Math.min(PW, P.x), y = top ? Math.max(0, P.y) : Math.min(PH, P.y);
  for (let i = 0; i < 3; i++) {
    let d = Math.hypot(x, y - y0);
    if (d > PW) { x *= PW / d; y = y0 + (y - y0) * PW / d; }
    d = Math.hypot(x, y - y1);
    if (d > diag) { x *= diag / d; y = y1 + (y - y1) * diag / d; }
  }
  return { x, y };
}

function clipPoly(poly, f) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) {
      const t = fa / (fa - fb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

// The crease is the perpendicular bisector of the corner's rest point and where it is now.
function fold(P, top) {
  const C = { x: PW, y: top ? 0 : PH };
  const dx = C.x - P.x, dy = C.y - P.y, len = Math.hypot(dx, dy);
  if (len < .75) return null;
  const n = { x: dx / len, y: dy / len }, M = { x: (C.x + P.x) / 2, y: (C.y + P.y) / 2 };
  const sd = (q) => (q.x - M.x) * n.x + (q.y - M.y) * n.y;          // > 0 on the lifted side
  const rect = [{ x: 0, y: 0 }, { x: PW, y: 0 }, { x: PW, y: PH }, { x: 0, y: PH }];
  return {
    sd, keep: clipPoly(rect, (q) => -sd(q)), flap: clipPoly(rect, sd),
    refl: (q) => { const d = 2 * sd(q); return { x: q.x - d * n.x, y: q.y - d * n.y }; },
  };
}

const f2 = (v) => v.toFixed(2), f5 = (v) => v.toFixed(5);
const poly = (pts) => `polygon(${pts.map(p => `${f2(p.x)}px ${f2(p.y)}px`).join(", ")})`;
const ink = (a) => `rgba(30,17,7,${Math.max(0, a).toFixed(3)})`;
const light = (a) => `rgba(255,249,231,${Math.max(0, a).toFixed(3)})`;
// A linear gradient over a page box, with stops placed at distances d = f(point) from the crease.
function grad(f, stops, w = PW, hh = PH) {
  const d0 = f({ x: 0, y: 0 }), gx = f({ x: 1, y: 0 }) - d0, gy = f({ x: 0, y: 1 }) - d0;
  const L = Math.abs(w * gx) + Math.abs(hh * gy);
  const off = d0 + w / 2 * gx + hh / 2 * gy - L / 2;
  return `linear-gradient(${f2(Math.atan2(gx, -gy) / DEG)}deg, ${stops.map(([d, c]) => `${c} ${f2(d - off)}px`).join(", ")})`;
}

/* ------------------------------------------------------------------- drawing */
function setZ(el, z) { if (el._z !== z) { el.style.zIndex = z; el._z = z; } }
function paint(el, bg) {
  if (!el || el._bg === bg) return;
  el._bg = bg;
  el.style.background = bg;
  el.style.opacity = bg ? "1" : "";
}

// What the scroll position shows. Board angles run 0–1; a turn carries its corner.
function sceneAt(y) {
  if (y < S.cover[1]) return { kind: "cover", p: easeInOut(seg(y, ...S.cover)) };
  if (y > S.close[0]) return { kind: "close", p: easeInOut(seg(y, ...S.close)) };
  const { cur, ti, tp } = locate(y);
  if (ti < 0) return { kind: "rest", i: cur };
  return scrollTurn(ti - 1, scrolled.ti === ti ? scrolled.dir : 1, tp);
}

// A board over the leaves lies above them; over the empty side, beneath them. It changes layer only
// when it stands upright and edge-on, and its cast shadow fades out as it rises, so neither shows.
function drawBoard(el, angle, overLeaves) {
  setT(el, angle < .01 ? "none" : `rotateY(${f2(-FWD * angle)}deg)`);
  setZ(el, overLeaves ? 30 : 1);
  // Past upright, the other face is the one that shows.
  const flipped = angle > 90;
  if (el._f !== flipped) { el.classList.toggle("is-flipped", flipped); el._f = flipped; }
  const cast = f2(Math.abs(Math.cos(angle * DEG)));
  if (el._cast !== cast) { el.style.setProperty("--cast", cast); el._cast = cast; }
  const fall = (Math.sin(angle * DEG) * .42).toFixed(3);
  for (const s of el._shades) paint(s, fall > 0 ? `rgba(16,7,9,${fall})` : "");
}

function draw(st) {
  const cp = st.kind === "cover" ? st.p : 1, bp = st.kind === "close" ? st.p : 0;
  const a = 180 * cp, b = 180 * bp;
  // The closed book lies with its spine on the centre line, beside the hero, and opens into a centred
  // spread; closing at the back, it slides to the centre.
  S.shift = bp > 0 ? FWD * HALF * (1 - Math.cos(b * DEG)) / 2 : 0;
  // The hero gives way as the front board swings over it, not while it only lifts.
  const hk = bp > 0 ? 0 : clamp01(1 - (cp - .1) / .25);
  setO(hero, hk); setV(hero, hk > 0); hero.inert = hk < .5;
  // The ribbon stays with the leaves; closing at the back, the board takes it in.
  setO(ribbon, 1 - seg(bp, .3, .5));
  setT(sheet, `translate(${f2(S.ox + S.shift * S.k)}px, ${f2(S.oy)}px) scale(${S.k})`);
  const origin = `${f2(SPINE - S.shift)}px 50%`;
  if (sheet._po !== origin) { sheet.style.perspectiveOrigin = origin; sheet._po = origin; }
  setV(cover, true); setV(backcover, true);
  drawBoard(cover, a, a < 90);
  drawBoard(backcover, b, b > 90);
  cover.style.setProperty("--edge", f2(clamp01(1 - cp * 14)));
  backcover.style.setProperty("--edge", f2(clamp01((bp - .93) * 14)));
  cover.inert = cp > 0;
  backcover.inert = bp < 1;

  const spec = new Map();
  let flap = null, lam = 0, read = 0;
  if (st.kind === "cover") {
    // The board's shadow lifts off the flyleaf as it opens.
    spec.set(spreads[0].fwd, { z: 3, shade: ink(.55 * Math.max(0, Math.cos(a * DEG))) });
  } else if (st.kind === "close") {
    spec.set(spreads[LAST].rev, { z: 3, shade: ink(.55 * Math.max(0, -Math.cos(b * DEG))) });
    read = LAST;
  } else if (st.kind === "rest") {
    for (const pg of [spreads[st.i].l, spreads[st.i].r]) if (pg) spec.set(pg, { z: 3, live: true });
    read = st.i;
  } else {
    ({ flap, lam } = turnSpec(st, spec));
    read = st.a + ((st.P.x < 0) === (st.dir > 0) ? 1 : 0);
  }
  for (const pg of PAGES) {
    const sp = spec.get(pg);
    setV(pg, !!sp);
    pg.inert = !sp?.live;
    setZ(pg, sp ? sp.z : 1);
    setT(pg, sp?.transform || "none");
    setC(pg, sp?.clip || "none");
    paint(pg._shade, sp?.shade || "");
  }
  // The lifted flap throws a soft shadow onto whatever lies beneath it.
  if (flap && lam > .01) {
    setO(tshadow, Math.min(1, lam * 1.6) * .5);
    setC(tshadowIn, poly(flap));
    setT(tshadowIn, `translateY(${f2(4 + 8 * lam)}px)`);
  } else setO(tshadow, 0);
  const unread = Math.round((LAST - read) / LAST * 7);
  stackL.style.setProperty("--n", RTL ? unread : 7 - unread);
  stackR.style.setProperty("--n", RTL ? 7 - unread : unread);
}

// A leaf between spreads a and a+1. dir 1 models it lying on the unread side, dir −1 on the read side.
function turnSpec(st, spec) {
  const A = spreads[st.a], B = spreads[st.a + 1], fwd = st.dir > 0;
  const s = fwd ? FWD : -FWD;
  const front = fwd ? A.fwd : B.rev, back = fwd ? B.rev : A.fwd;
  const under = fwd ? B.fwd : A.rev, stay = fwd ? A.rev : B.fwd;
  const P = constrain(st.P, st.top), F = fold(P, st.top);
  if (!F) {
    const sp = fwd ? A : B;
    for (const pg of [sp.l, sp.r]) if (pg) spec.set(pg, { z: 3 });
    return {};
  }
  const lam = Math.sin(Math.PI * clamp01((PW - P.x) / (2 * PW)));
  const onFront = (e) => S2L(s, E2S(s, e));
  const onBack = (e) => { const q = S2L(s, E2S(-s, e)); return { x: -q.x, y: q.y }; };
  if (stay) spec.set(stay, { z: 3 });
  // Fully over, the leaf has no front left on its first side (and no flap at the very start).
  if (F.keep.length < 3) { if (under) spec.set(under, { z: 3 }); if (back) spec.set(back, { z: 3 }); return {}; }
  if (F.flap.length < 3) { if (front) spec.set(front, { z: 3 }); return {}; }
  if (under) spec.set(under, { z: 3, shade: grad((e) => F.sd(onFront(e)), [[0, ink(.3 * lam + .08)], [24 + 150 * lam, ink(0)]]) });
  if (front) spec.set(front, {
    z: 4, clip: poly(F.keep.map((q) => S2E(s, L2S(s, q)))),
    shade: grad((e) => -F.sd(onFront(e)), [[0, ink(.2 * lam + .05)], [18 + 80 * lam, ink(0)]]),
  });
  if (back) {
    // The back of the leaf: its own page, turned over the crease. Two reflections make a rotation.
    const at = (e) => L2S(s, F.refl(onBack(e)));
    const o = E2S(-s, { x: 0, y: 0 }), m0 = at({ x: 0, y: 0 }), mx = at({ x: 1, y: 0 }), my = at({ x: 0, y: 1 });
    spec.set(back, {
      z: 7,
      transform: `matrix(${f5(mx.x - m0.x)}, ${f5(mx.y - m0.y)}, ${f5(my.x - m0.x)}, ${f5(my.y - m0.y)}, ${f2(m0.x - o.x)}, ${f2(m0.y - o.y)})`,
      clip: poly(F.flap.map((q) => S2E(-s, L2S(s, { x: -q.x, y: q.y })))),
      shade: grad((e) => F.sd(onBack(e)), [
        [0, ink(.3 * lam + .04)], [5 + 6 * lam, light(0)], [16 + 34 * lam, light(.34 * lam)],
        [60 + 120 * lam, light(0)], [PW * 1.2, ink(.14 * lam)]]),
    });
  }
  return { flap: F.flap.map((q) => L2S(s, F.refl(q))), lam };
}

function render() {
  if (!S.measured) return;
  if (S.mode === "pocket") { pkRender(); return; }
  const y = scrollPos();
  root.classList.toggle("paper-started", S.mode === "desk"
    ? y >= S.cover[1] && y < S.close[0]
    : y >= innerHeight * .9 && backcover.getBoundingClientRect().top > 40);
  if (S.mode !== "desk") {
    const threshold = innerHeight * .4;
    let active = null;
    for (const sp of entries) if (sp.text.getBoundingClientRect().top <= threshold) active = sp;
    const visible = !!active && backcover.getBoundingClientRect().top > threshold;
    setV(nav, visible); setO(nav, visible ? 1 : 0); nav.inert = !visible;
    if (active) renderIndex(active);
    return;
  }
  const { ti } = locate(y);
  if (ti !== scrolled.ti) { scrolled.ti = ti; scrolled.dir = y < scrolled.y ? -1 : 1; }
  scrolled.y = y;
  if (!hands.mode) draw(sceneAt(y));
  for (const sp of spreads) {
    if (!sp.motif) continue;
    const p = seg(y, sp.unit.land, sp.unit.land + Math.max(1, sp.unit.play));
    if (sp.lastP !== p) { sp.lastP = p; sp.motif.inst.update(p); }
  }
  setO(nav, 0); setV(nav, false); nav.inert = true;  // Desktop navigation is the top bar, contents and catchwords.
  const here = units[locate(y).cur].sp;
  renderIndex(here);
}

function renderIndex(sp) {
  const n = entries.indexOf(sp);
  if (n === current) return;
  current = n;
  navLinks.forEach((l, i) => i === n ? l.setAttribute("aria-current", "location") : l.removeAttribute("aria-current"));
  navNames.forEach((el, i) => el.classList.toggle("is-current", i === Math.max(0, n)));
}
function finalState() {
  cover.inert = false; backcover.inert = false;
  setO(tshadow, 0);
  for (const sp of spreads) sp.motif?.inst.update(1);
  for (const pg of PAGES) {
    setV(pg, true); pg.inert = false;
    setT(pg, "none"); setC(pg, "none"); paint(pg._shade, "");
  }
}

/* --------------------------------------------------------- hands on the book */
// Corners lift under the pointer; a leaf or board can be dragged, flicked, clicked or keyed over.
// Whatever the hand does, it ends by moving the scroll position to match the page it left open.
const hands = { mode: "", raf: 0, peek: 0, peekTo: 0, peekG: null };
let press = null;

function stopHands() {
  cancelAnimationFrame(hands.raf);
  hands.mode = ""; hands.peek = 0; hands.peekTo = 0; hands.peekG = null; press = null;
  root.classList.remove("is-dragging");
  stage.style.cursor = "";
}
const sheetPoint = (e) => ({ x: (e.clientX - S.ox) / S.k - S.shift, y: (e.clientY - S.oy) / S.k });
const sameGrab = (a, b) => a && b && a.kind === b.kind && a.a === b.a && a.dir === b.dir && a.top === b.top && a.from === b.from;

// What a press at this point of the sheet would take hold of.
function grab(pt) {
  if (S.mode !== "desk" || !units.length) return null;
  const st = sceneAt(scrollPos());
  const side = pt.x < SPINE ? -1 : 1, x = side * (pt.x - SPINE), y = pt.y - TOP;
  if (x < 0 || x > 2 * HALF || pt.y < 0 || pt.y > S.H) return null;
  const top = y < PH / 2;
  const corner = x > PW - ZONE && (y > PH - ZONE || y < ZONE);
  if (st.kind === "cover") return st.p === 0 && side === FWD ? { kind: "cover", from: 0, corner: true, top } : null;
  if (st.kind === "close") return st.p === 1 && side === -FWD ? { kind: "close", from: 1, corner, top } : null;
  if (st.kind !== "rest") return null;
  if (side === FWD) return st.i < LAST ? { kind: "turn", a: st.i, dir: 1, side, corner, top } : { kind: "close", from: 0, corner, top };
  return st.i > 0 ? { kind: "turn", a: st.i - 1, dir: -1, side, corner, top } : { kind: "cover", from: 1, corner, top };
}

// The scene a hold produces after moving the pointer by (dx, dy) sheet units, or lifting a corner by k.
function held(g, dx, dy) {
  if (g.kind === "turn") {
    const C = { x: PW, y: g.top ? 0 : PH };
    return { kind: "turn", a: g.a, dir: g.dir, top: g.top, P: constrain({ x: C.x + g.side * dx, y: C.y + dy }, g.top) };
  }
  return { kind: g.kind, p: clamp01(g.from - FWD * dx / 1150) };
}
function peekScene(g, k) {
  if (g.kind === "turn") return held(g, -g.side * 84 * k, (g.top ? 64 : -64) * k);
  return { kind: g.kind, p: g.from + (g.from ? -1 : 1) * .05 * k };
}

function play(ms, frame, done, drawFn = draw) {
  cancelAnimationFrame(hands.raf);
  hands.mode = "anim";
  const t0 = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / ms), st = frame(k);
    drawFn(st);
    if (k < 1) hands.raf = requestAnimationFrame(tick); else done(st);
  };
  hands.raf = requestAnimationFrame(tick);
}

// Hand the book back to the scroll position that shows what the hand left open.
function handBack(top) {
  if (Math.abs(scrollPos() - top) < 1) { hands.mode = ""; render(); return; }
  hands.mode = "sync";
  scrollToPos(top);
  requestAnimationFrame(() => requestAnimationFrame(() => { if (hands.mode === "sync") { hands.mode = ""; render(); } }));
}
function settle(y, st) { draw(st); handBack(Math.round(y)); }
const restY = (i, forward) => forward ? units[i].land + 1 : units[i].land + units[i].dwell - 2;

// Finish a turn from wherever the corner is: over to the other side, or back down.
function finishTurn(st, done) {
  const from = { ...st.P }, to = { x: done ? -PW : PW, y: st.top ? 0 : PH };
  const dist = Math.hypot(to.x - from.x, to.y - from.y), arc = (st.top ? -1 : 1) * LIFT * PH * .7 * dist / (2 * PW);
  play(Math.min(760, 240 + dist * .4), (k) => {
    const e = easeOut(k);
    return { ...st, P: { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) - arc * Math.sin(Math.PI * e) } };
  }, () => {
    const i = (st.dir > 0) === done ? st.a + 1 : st.a, now = sceneAt(scrollPos());
    const was = now.kind === "rest" ? now.i : -1;
    if (i === was) settle(scrollPos(), { kind: "rest", i });
    else settle(restY(i, i > was), { kind: "rest", i });
  });
}
function boardTo(kind, p0, p1) {
  play(250 + 1150 * Math.abs(p1 - p0), (k) => ({ kind, p: lerp(p0, p1, easeInOut(k)) }), (st) => {
    if (kind === "cover") settle(p1 ? restY(0, true) : 0, p1 ? { kind: "rest", i: 0 } : st);
    else settle(p1 ? S.end : restY(LAST, false), p1 ? st : { kind: "rest", i: LAST });
  });
}
// One step forward or back, as the arrow keys, a click on a corner, or a catchword ask.
function step(dir) {
  if (S.mode !== "desk" || hands.mode === "anim" || hands.mode === "drag") return false;
  const peeking = hands.mode === "peek" ? hands.peekG : null, k = hands.peek;
  cancelAnimationFrame(hands.raf);
  hands.mode = ""; hands.peek = hands.peekTo = 0; hands.peekG = null;
  if (peeking && peeking.kind !== "turn" && (peeking.from ? -1 : 1) === dir) {
    boardTo(peeking.kind, peekScene(peeking, k).p, dir > 0 ? 1 : 0); return true;
  }
  const st = sceneAt(scrollPos());
  if (st.kind === "cover" || st.kind === "close") { boardTo(st.kind, st.p, dir > 0 ? 1 : 0); return true; }
  if (st.kind === "turn") {
    const s0 = st.s, s1 = dir > 0 ? 1 : 0;
    play(260 + 700 * Math.abs(s1 - s0), (t) => scrollTurn(st.a, st.dir, lerp(s0, s1, easeInOut(t))),
      () => settle(restY(st.a + s1, dir > 0), { kind: "rest", i: st.a + s1 }));
    return true;
  }
  if (dir > 0 && st.i === LAST) { boardTo("close", 0, 1); return true; }
  if (dir < 0 && st.i === 0) { boardTo("cover", 1, 0); return true; }
  if (peeking?.kind === "turn" && peeking.dir === dir) { finishTurn(peekScene(peeking, k), true); return true; }
  const a = dir > 0 ? st.i : st.i - 1, s0 = dir > 0 ? 0 : 1, s1 = 1 - s0;
  play(950, (t) => scrollTurn(a, dir, lerp(s0, s1, easeInOut(t))),
    () => settle(restY(a + s1, dir > 0), { kind: "rest", i: a + s1 }));
  return true;
}

function peekTick() {
  hands.peek += (hands.peekTo - hands.peek) * .2;
  if (Math.abs(hands.peekTo - hands.peek) < .004) hands.peek = hands.peekTo;
  if (!hands.peek && !hands.peekTo) { hands.mode = ""; hands.peekG = null; render(); return; }
  draw(peekScene(hands.peekG, hands.peek));
  hands.raf = requestAnimationFrame(peekTick);
}
function hover(e) {
  if (hands.mode && hands.mode !== "peek") return;
  const over = e.target.closest?.("a, button") ? null : grab(sheetPoint(e));
  const want = over?.corner ? over : null;
  stage.style.cursor = want ? "grab" : "";
  if (want && (!hands.peekG || sameGrab(want, hands.peekG) || hands.peek < .03)) {
    hands.peekG = want; hands.peekTo = 1;
  } else if (hands.peekG) hands.peekTo = 0;
  else return;
  if (hands.mode !== "peek") { hands.mode = "peek"; hands.raf = requestAnimationFrame(peekTick); }
}

// Once, if the reader lingers over the closed book without touching it, its board lifts a little and
// settles: it opens. The wait counts only while the page is in view.
const NUDGE = 1.25, lift = { kind: "cover", from: 0, corner: true, top: false };
let nudge = 0;    // its timer, or −1 once it has run or been called off
function noNudge() {
  clearTimeout(nudge); nudge = -1;
  // a lift under way hands the book straight back to the reader
  if (hands.peekG === lift) { cancelAnimationFrame(hands.raf); hands.mode = ""; hands.peek = hands.peekTo = 0; hands.peekG = null; render(); }
}
for (const type of ["scroll", "wheel", "keydown", "pointerdown", "touchstart"]) addEventListener(type, noNudge, { once: true, passive: true });
function armNudge() {
  if (nudge < 0) return;
  clearTimeout(nudge);
  if (document.hidden) return;
  nudge = setTimeout(() => {
    nudge = -1;
    if (S.mode !== "desk" || hands.mode || scrollPos() > 0) return;
    hands.peekG = lift; hands.peekTo = NUDGE;
    hands.mode = "peek"; hands.raf = requestAnimationFrame(peekTick);
    setTimeout(() => { if (hands.peekG === lift) hands.peekTo = 0; }, 900);
  }, 3000);
}
document.addEventListener("visibilitychange", armNudge);
armNudge();

function suppressClick() {
  const kill = (e) => { e.stopPropagation(); e.preventDefault(); };
  addEventListener("click", kill, { capture: true, once: true });
  setTimeout(() => removeEventListener("click", kill, { capture: true }), 0);
}

stage.addEventListener("pointerdown", (e) => {
  if (S.mode !== "desk" || e.button !== 0 || hands.mode === "anim" || hands.mode === "drag" || hands.mode === "sync") return;
  if (e.target.closest("a, button, input, select, textarea, label, summary, [contenteditable]")) return;
  const g = grab(sheetPoint(e));
  if (!g) return;
  press = { g, id: e.pointerId, x0: e.clientX, y0: e.clientY, track: [{ x: e.clientX, t: e.timeStamp }], st: null, dragging: false, touch: e.pointerType !== "mouse" };
});
// Pages are held, not selected.
stage.addEventListener("mousedown", (e) => { if (press) e.preventDefault(); });
addEventListener("pointermove", (e) => {
  if (S.mode !== "desk") return;
  if (!press) { if (!e.buttons && e.pointerType === "mouse") hover(e); return; }
  if (e.pointerId !== press.id) return;
  const dx = e.clientX - press.x0, dy = e.clientY - press.y0;
  if (!press.dragging) {
    if (Math.hypot(dx, dy) < 7) return;
    if (press.touch && Math.abs(dx) < Math.abs(dy)) { press = null; return; }
    press.dragging = true;
    const k = hands.peekG && sameGrab(hands.peekG, press.g) ? hands.peek : 0;
    cancelAnimationFrame(hands.raf);
    hands.mode = "drag"; hands.peek = hands.peekTo = 0; hands.peekG = null;
    // A lifted corner stays where it was lifted to.
    if (k && press.g.kind === "turn") { press.ox = -press.g.side * 84 * k; press.oy = (press.g.top ? 64 : -64) * k; }
    try { stage.setPointerCapture(e.pointerId); } catch {}
    root.classList.add("is-dragging");
    getSelection()?.removeAllRanges();
  }
  press.track.push({ x: e.clientX, t: e.timeStamp });
  if (press.track.length > 6) press.track.shift();
  press.st = held(press.g, dx / S.k + (press.ox || 0), dy / S.k + (press.oy || 0));
  draw(press.st);
});
function release(e) {
  if (!press || e.pointerId !== press.id) return;
  const { g, dragging, st, track } = press;
  press = null;
  root.classList.remove("is-dragging");
  if (!dragging) {
    if (e.type === "pointerup" && g.corner) step(g.kind === "turn" ? g.dir : g.from ? -1 : 1);
    return;
  }
  suppressClick();
  const first = track[0], last = track[track.length - 1];
  const v = (last.x - first.x) / Math.max(8, last.t - first.t) / S.k;      // sheet units per ms
  if (g.kind === "turn") {
    const flick = -g.side * v;                                          // towards the other side
    finishTurn(st, st.P.x < 0 ? flick > -.25 : flick > .45);
  } else {
    const p = st.p - FWD * v * 220 / 1150;
    boardTo(g.kind, st.p, p > .5 ? 1 : 0);
  }
}
addEventListener("pointerup", release);
addEventListener("pointercancel", release);
stage.addEventListener("pointerleave", () => {
  if (hands.mode === "peek") hands.peekTo = 0;
  if (!press) stage.style.cursor = "";
});

/* ------------------------------------------------ the paperback: phones and tablets */
// One page at a time. The front board swings open on its spine; then each page peels from its tail
// fore-edge corner and turns over the spine, uncovering the next. Whatever has turned stays open
// beyond the spine, cropped by the screen's edge: the board first, then the pages piled on it. The
// pages read text first, then plate, spread by spread; under the last lies the back board. Scroll, a
// swipe, a tap on the turned-up corner or the arrow keys turn a page, and the scroll position follows.
const PK = { W: 0, H: 0, vh: 0, top: 0, units: [], cover: [0, 0], back: [0, 0], end: 0 };
const POCKET = spreads.filter(sp => !sp.isEndpaper)
  .flatMap(sp => [sp.text, sp.plate].map(el => ({ el, sp, plate: el === sp.plate && !!sp.motif })));
const NP = POCKET.length;
// The book is never taller than 100svh, in case the body runs beneath a bar that floats over the page.
const svh = h("div", { "aria-hidden": "true", style: "position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none" });
document.body.append(svh);
const pkFlap = h("div", { class: "pk-flap", "aria-hidden": "true" });
const pkDrop = h("div", { class: "pk-drop", "aria-hidden": "true" });
const pkEar = h("button", { class: "pk-ear", type: "button", "aria-label": STR.next.replace(":", "") });
const pkPile = h("div", { class: "pk-pile", "aria-hidden": "true" });
sheet.append(pkPile, pkDrop, pkFlap, pkEar);
pkEar.addEventListener("click", () => pkStep(1));

function pkLayout() {
  PK.vh = Math.min(document.body.clientHeight, svh.offsetHeight || Infinity) || innerHeight;
  root.style.setProperty("--pkvh", `${PK.vh}px`);
  const vw = document.body.clientWidth, bar = vw < 600 ? 56 : 64;
  PK.H = Math.round(PK.vh - bar - 16 - 44);
  PK.W = Math.round(Math.min(vw - 46, PK.H * .78));
  // the page sits towards its fore-edge, leaving a strip beyond the spine for what lies open there
  const fore = Math.max(16, Math.round((vw - PK.W) * .35));
  root.style.setProperty("--pkx", `${RTL ? fore : vw - fore - PK.W}px`);
  root.style.setProperty("--pky", `${bar + 16}px`);
  root.style.setProperty("--pkw", `${PK.W}px`);
  root.style.setProperty("--pkh", `${PK.H}px`);
  for (const pg of POCKET) pg.el._back = undefined;
  pkPile._i = undefined;
}

function pkTimeline() {
  const vh = PK.vh;
  PK.cover = [0, .7 * vh];
  let y = PK.cover[1];
  PK.units = POCKET.map((pg, i) => {
    const turn = i ? [y, y + .45 * vh] : null, land = turn ? turn[1] : y;
    const play = pg.plate ? .22 * pg.sp.beats * vh : 0;
    const dwell = pg.plate ? play + .12 * vh : .26 * vh;
    y = land + dwell;
    return { turn, land, play, dwell };
  });
  PK.back = [y, y + .45 * vh];
  PK.end = PK.back[1];
  book.style.height = `${Math.ceil(PK.end + vh)}px`;
  PK.top = Math.round(book.getBoundingClientRect().top + scrollPos());
}

function pkScene(yl) {
  if (yl < PK.cover[1]) return { kind: "cover", p: easeInOut(seg(yl, ...PK.cover)) };
  if (yl >= PK.back[1]) return { kind: "rest", i: NP };
  if (yl >= PK.back[0]) return { kind: "turn", a: NP - 1, s: seg(yl, ...PK.back) };
  for (let i = 1; i < NP; i++) {
    const [t0, t1] = PK.units[i].turn;
    if (yl < t0) return { kind: "rest", i: i - 1 };
    if (yl < t1) return { kind: "turn", a: i - 1, s: seg(yl, t0, t1) };
  }
  return { kind: "rest", i: NP - 1 };
}

// The leaf frame runs from the spine (x 0) to the fore-edge (x W); a page box is the same, mirrored in RTL.
const leaf = (e) => ({ x: RTL ? PK.W - e.x : e.x, y: e.y });
const pkPath = (s) => ({ x: PK.W * Math.cos(Math.PI * s), y: PK.H - .5 * PK.H * s * (1 - s) ** 2.5 });
const EAR = () => ({ x: PK.W - 24, y: PK.H - 18 });
function pkFold(P) {
  const W = PK.W, H = PK.H, diag = Math.hypot(W, H);
  let x = Math.min(W, P.x), y = Math.min(H, P.y);
  for (let i = 0; i < 3; i++) {
    let d = Math.hypot(x, y - H); if (d > W) { x *= W / d; y = H + (y - H) * W / d; }
    d = Math.hypot(x, y); if (d > diag) { x *= diag / d; y *= diag / d; }
  }
  const dx = W - x, dy = H - y, len = Math.hypot(dx, dy);
  if (len < .75) return null;
  const n = { x: dx / len, y: dy / len }, M = { x: (W + x) / 2, y: (H + y) / 2 };
  const sd = (q) => (q.x - M.x) * n.x + (q.y - M.y) * n.y;
  const rect = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
  const refl = (q) => { const d = 2 * sd(q); return { x: q.x - d * n.x, y: q.y - d * n.y }; };
  return { sd, x, keep: clipPoly(rect, (q) => -sd(q)), flap: clipPoly(rect, sd).map(refl) };
}
// The back of a leaf is its own paper, a shade darker.
function pkBack(pg) {
  if (!pg.el._back) pg.el._back = `color-mix(in srgb, ${getComputedStyle(pg.el).backgroundColor} 84%, #2a1a10)`;
  return pg.el._back;
}

function pkDraw(st, ear = false) {
  // The front board stays where it was opened to: over the page until upright, then beyond the spine.
  const cp = st.kind === "cover" ? st.p : 1, a = 180 * cp;
  drawBoard(cover, a, a < 90);
  cover.inert = cp > 0;
  const show = new Map();
  let top = null, F = null, lam = 0, here = 0;
  if (st.kind === "cover") show.set(0, { z: 3, shade: ink(.3 * Math.max(0, Math.cos(a * DEG))) });
  else if (st.kind === "rest") {
    here = st.i;
    if (st.i < NP) show.set(st.i, { z: 4 });
    if (ear && st.i < NP) { top = st.i; F = pkFold(EAR()); lam = .25; }
  } else {
    here = st.s < .5 ? st.a : st.a + 1;
    top = st.a;
    const P = pkPath(st.s);
    if (st.lift) P.y += st.lift * .5;
    F = pkFold(P);
    lam = F ? Math.sin(Math.PI * clamp01((PK.W - F.x) / (2 * PK.W))) : 0;
    if (!F || F.flap.length < 3) { show.set(st.a, { z: 4 }); F = null; }
    else if (F.keep.length < 3) { F = null; top = null; }
  }
  if (top !== null) {
    if (F) {
      show.set(top, { z: 4, clip: poly(F.keep.map(leaf)), shade: grad((e) => -F.sd(leaf(e)), [[0, ink(.18 * lam + .04)], [16 + 70 * lam, ink(0)]], PK.W, PK.H) });
      if (top + 1 < NP) show.set(top + 1, { z: 3, shade: grad((e) => F.sd(leaf(e)), [[0, ink(.28 * lam + .06)], [20 + 130 * lam, ink(0)]], PK.W, PK.H) });
    } else if (top + 1 < NP) show.set(top + 1, { z: 3 });
  }
  const back = (st.kind === "rest" && st.i === NP) || (top === NP - 1 && F) || (st.kind === "turn" && st.a === NP - 1 && !F && st.s > .5);
  setV(backcover, back);
  if (back) { backcover.inert = !(st.kind === "rest" && st.i === NP); paint(backcover._shades[0], top === NP - 1 && F ? grad((e) => F.sd(leaf(e)), [[0, ink(.28 * lam + .06)], [20 + 130 * lam, ink(0)]], PK.W, PK.H) : ""); }
  POCKET.forEach((pg, i) => {
    const sp = show.get(i), el = pg.el;
    setV(el, !!sp);
    el.inert = !(sp && st.kind === "rest");
    setZ(el, sp ? sp.z : 1);
    setC(el, sp?.clip || "none");
    paint(el._shade, sp?.shade || "");
  });
  // the turned-up part of the leaf: its back, lit along the fold, and its shadow on the page beneath
  if (F) {
    const W = PK.W, pts = F.flap.map(leaf).map((q) => ({ x: q.x + W, y: q.y }));
    setC(pkFlap, poly(pts));
    pkFlap.style.background = `${grad((e) => -F.sd(leaf({ x: e.x - W, y: e.y })), [
      [0, ink(.22 * lam + .05)], [4 + 6 * lam, light(0)], [14 + 30 * lam, light(.3 * lam)], [50 + 110 * lam, light(0)], [W * 1.2, ink(.12 * lam)]], 3 * W, PK.H)}, ${pkBack(POCKET[top])}`;
    setO(pkFlap, 1);
    setC(pkDrop, poly(pts.map((q) => ({ x: q.x + 3, y: q.y + 8 }))));
    setO(pkDrop, Math.min(.4, lam * .8 + .1));
  } else { setO(pkFlap, 0); setO(pkDrop, 0); }
  setV(pkEar, st.kind === "rest" && st.i < NP);
  // beyond the spine, the last page turned lies on the pile (before any, the open board shows)
  const pile = st.kind === "cover" ? -1 : st.kind === "rest" ? st.i - 1 : st.a - 1;
  setV(pkPile, pile >= 0);
  if (pile >= 0 && pkPile._i !== pile) {
    pkPile._i = pile;
    pkPile.style.background = `linear-gradient(${RTL ? "to right" : "to left"}, rgb(43 25 14 / .2), transparent 14%), ${pkBack(POCKET[pile])}`;
  }
  const unread = Math.round((NP - Math.min(here, NP)) / NP * 6);
  (RTL ? stackL : stackR).style.setProperty("--n", unread);
  (RTL ? stackR : stackL).style.setProperty("--n", 0);
  setO(ribbon, st.kind === "rest" && st.i === NP ? 0 : 1);
}

function pkRender() {
  const yl = scrollPos() - PK.top, st = pkScene(yl);
  if (!hands.mode) pkDraw(st, true);
  POCKET.forEach((pg, i) => {
    if (!pg.plate) return;
    const u = PK.units[i], p = seg(yl, u.land, u.land + Math.max(1, u.play));
    if (pg.sp.lastP !== p) { pg.sp.lastP = p; pg.sp.motif.inst.update(p); }
  });
  const here = st.kind === "cover" ? 0 : st.kind === "rest" ? st.i : st.s < .5 ? st.a : st.a + 1;
  const sp = POCKET[Math.min(here, NP - 1)].sp;
  const head = here < NP && entries.includes(sp) && st.kind !== "cover";
  setV(nav, head); setO(nav, head ? 1 : 0); nav.inert = !head;
  if (head) renderIndex(sp);
  root.classList.toggle("paper-started", scrollPos() > 8);
}

// Hand the book back to the scroll position of the page left showing (−1: the closed board).
function pkSettle(i, forward) {
  const yl = i < 0 ? 0 : i >= NP ? PK.end : forward ? PK.units[i].land + 1 : PK.units[i].land + PK.units[i].dwell - 2;
  pkDraw(i < 0 ? { kind: "cover", p: 0 } : { kind: "rest", i }, true);
  handBack(Math.round(PK.top + yl));
}
function pkTurn(a, s0, s1) {
  play(240 + 620 * Math.abs(s1 - s0), (t) => ({ kind: "turn", a, s: lerp(s0, s1, easeInOut(t)) }),
    () => pkSettle(s1 > .5 ? a + 1 : a, s1 > .5), pkDraw);
}
function pkCover(p0, p1) {
  play(300 + 900 * Math.abs(p1 - p0), (t) => ({ kind: "cover", p: lerp(p0, p1, easeInOut(t)) }),
    () => pkSettle(p1 ? 0 : -1, true), pkDraw);
}
function pkStep(dir) {
  if (S.mode !== "pocket" || hands.mode === "anim" || hands.mode === "drag") return false;
  const st = pkScene(scrollPos() - PK.top);
  if (st.kind === "cover") { pkCover(st.p, dir > 0 ? 1 : 0); return true; }
  if (st.kind === "turn") { pkTurn(st.a, st.s, dir > 0 ? 1 : 0); return true; }
  if (dir > 0 && st.i < NP) { pkTurn(st.i, 0, 1); return true; }
  if (dir < 0 && st.i > 0) { pkTurn(st.i - 1, 1, 0); return true; }
  if (dir < 0 && st.i === 0) { pkCover(1, 0); return true; }
  return false;
}
function pkJump(el) {
  stopHands();
  if (cover.contains(el)) { scrollToPos(0); return true; }
  let yl = PK.end;
  if (!backcover.contains(el)) {
    let i = POCKET.findIndex((pg) => pg.el.contains(el));
    // a spread opens on its first page, except the opening, whose link names its contents page
    if (i < 0) { const sp = spreads.find((sp) => sp.el.contains(el)); i = POCKET.findIndex((pg) => pg.sp === sp && (!sp.isOpening || pg.el === sp.plate)); }
    if (i < 0) return false;
    yl = PK.units[i].land + 1;
  }
  scrollToPos(Math.ceil(PK.top + yl));
  return true;
}

// A sideways stroke takes hold of the page: towards the spine turns it on, away brings the last one back.
let pkPress = null;
stage.addEventListener("pointerdown", (e) => {
  if (S.mode !== "pocket" || e.button !== 0 || hands.mode === "anim" || hands.mode === "sync") return;
  // A stroke may start on a link: once it moves, the link's click is cancelled.
  if (e.target.closest("input, select, textarea, [contenteditable]")) return;
  pkPress = { id: e.pointerId, x0: e.clientX, y0: e.clientY, track: [{ x: e.clientX, t: e.timeStamp }], g: null, s: null };
});
addEventListener("pointermove", (e) => {
  if (S.mode !== "pocket" || !pkPress || e.pointerId !== pkPress.id) return;
  const dx = e.clientX - pkPress.x0, dy = e.clientY - pkPress.y0;
  if (!pkPress.g) {
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { pkPress = null; return; }
    if (Math.abs(dx) < 10) return;
    const fwd = RTL ? dx > 0 : dx < 0, st = pkScene(scrollPos() - PK.top);
    if (st.kind === "cover") { pkPress = null; if (st.p < .01 && fwd) pkCover(st.p, 1); return; }
    if (st.kind !== "rest") { pkPress = null; return; }
    const a = fwd ? st.i : st.i - 1;
    if (a < 0 || a >= NP) { pkPress = null; if (!fwd && st.i === 0) pkCover(1, 0); return; }
    pkPress.g = { a, fwd };
    cancelAnimationFrame(hands.raf);
    hands.mode = "drag";
    try { stage.setPointerCapture(e.pointerId); } catch {}
    root.classList.add("is-dragging");
  }
  pkPress.track.push({ x: e.clientX, t: e.timeStamp });
  if (pkPress.track.length > 6) pkPress.track.shift();
  const toward = (RTL ? dx : -dx) / (PK.W * .85);
  pkPress.s = clamp01(pkPress.g.fwd ? toward : 1 + toward);
  pkDraw({ kind: "turn", a: pkPress.g.a, s: pkPress.s, lift: dy });
});
function pkRelease(e) {
  if (!pkPress || e.pointerId !== pkPress.id) return;
  const { g, s, track } = pkPress;
  pkPress = null;
  root.classList.remove("is-dragging");
  if (!g) return;
  suppressClick();
  const first = track[0], last = track[track.length - 1];
  const v = (RTL ? 1 : -1) * (last.x - first.x) / Math.max(8, last.t - first.t);   // px per ms towards the spine
  const on = v > .3 ? true : v < -.3 ? false : s > .5;
  pkTurn(g.a, s ?? (g.fwd ? 0 : 1), on ? 1 : 0);
}
addEventListener("pointerup", pkRelease);
addEventListener("pointercancel", pkRelease);

function jumpTo(el) {
  if (el && S.mode === "pocket") return pkJump(el);
  if (!el || S.mode !== "desk") return false;
  const sp = spreads.find(sp => sp.el.contains(el));
  const top = cover.contains(el) ? 0 : backcover.contains(el) ? S.end : sp?.unit.land;
  if (top == null) return false;
  stopHands();
  scrollToPos(Math.ceil(top + 1));
  return true;
}
document.addEventListener("click", e => {
  const a = e.target.closest(".index a[data-slug], .opening__list a[data-slug], .hero__list a[data-slug], .topbar a[data-slug], a.catch");
  if (!a) return;
  const slug = a.dataset.slug || a.dataset.next;
  nav.classList.remove("is-open"); navToggle.setAttribute("aria-expanded", "false");
  // A catchword turns the leaf it stands on.
  const st = S.mode === "desk" && units.length ? sceneAt(scrollPos()) : null;
  if (a.classList.contains("catch") && st?.kind === "rest" && spreads[st.i + 1]?.slug === slug && step(1)) {
    e.preventDefault(); history.replaceState(null, "", `#${slug}`); return;
  }
  if (jumpTo(document.getElementById(slug))) { e.preventDefault(); history.replaceState(null, "", `#${slug}`); }
});
navToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open"); navToggle.setAttribute("aria-expanded", String(open));
});
// The paperback's contents rise as a sheet; a tap on the dimmed book closes them.
nav.addEventListener("click", (e) => {
  if (e.target === nav) { nav.classList.remove("is-open"); navToggle.setAttribute("aria-expanded", "false"); }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { nav.classList.remove("is-open"); navToggle.setAttribute("aria-expanded", "false"); return; }
  if ((S.mode !== "desk" && S.mode !== "pocket") || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
  const next = RTL ? "ArrowLeft" : "ArrowRight", prev = RTL ? "ArrowRight" : "ArrowLeft";
  if ((e.key === next || e.key === prev) && (S.mode === "pocket" ? pkStep : step)(e.key === next ? 1 : -1)) e.preventDefault();
});
document.addEventListener("focusin", e => {
  if (S.mode !== "desk" || nav.contains(e.target)) return;
  const sp = spreads.find(sp => sp.el.contains(e.target));
  if (sp && Math.abs(scrollPos() - sp.unit.land) > sp.unit.dwell) jumpTo(e.target);
});
let ticking = false;
function onScroll() {
  if (hands.mode === "peek") { cancelAnimationFrame(hands.raf); hands.mode = ""; hands.peek = hands.peekTo = 0; hands.peekG = null; }
  if (hands.mode === "drag" || hands.mode === "anim") return;
  if (hands.mode === "sync") hands.mode = "";
  if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; render(); }); }
}
addEventListener("scroll", onScroll, { passive: true });
document.body.addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", () => requestAnimationFrame(layout));
REDUCED.addEventListener?.("change", layout);
document.querySelectorAll("ol, ul").forEach(list => list.setAttribute("role", "list"));
root.classList.add("js");
initLocalePersistence(LOCALE);
layout();
document.fonts?.ready.then(() => {
  layout();
  const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (target) jumpTo(target);
});

/* ---------------------------------------------- Tahweel: latest release links */
// The Windows and macOS links point at releases/latest; swap in the direct downloads.
async function tahweelRelease() {
  const page = document.getElementById("tahweel");
  if (!page) return;
  try {
    const res = await fetch("https://api.github.com/repos/ieasybooks/tahweel-tauri/releases/latest");
    if (!res.ok) return;
    const release = await res.json();
    for (const [type, pattern] of [["windows", /\.exe$/i], ["macos", /\.dmg$/i]]) {
      const asset = release.assets?.find((x) => pattern.test(x.name));
      if (!asset) continue;
      page.querySelectorAll(`a[data-link="${type}"]`).forEach((a) => { a.href = asset.browser_download_url; });
    }
  } catch {
    // the fallback links already point to releases/latest
  }
}
(window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(tahweelRelease);
