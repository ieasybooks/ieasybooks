// The plates: one built diagram per project that "performs the product" in a few scroll beats.
//
// A motif is { beats, size, create(ctx) }. create() returns
//   { el, mount(geom), update(p) }
// where geom = { narrow, px, w, h } (px = device pixels per design pixel, for canvases) and p
// is the plate's progress, 0 → 1. Every visual state is a pure function of p, so scrolling back
// reverses it. Each diagram is drawn in its own design box: the portrait text block of the plate
// page on the sheet (PLATE) or of a phone page (NARROW); book.js scales it to fit.
// Positions are logical (inline-start), so the same code mirrors itself on /ar/ and /en/.
// Each plate draws in its chapter's colour (--ch) on the paper page.
//
// A project without a motif gets fallbackPlate(): its screenshot (`shot`) or its logo.

export const PLATE = { w: 560, h: 660 };
export const NARROW = { w: 310, h: 540 };

/* ---------------------------------------------------------------- helpers */
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeOut = (x) => 1 - (1 - x) ** 3;
export const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const timecode = (text, locale) => locale === "ar" ? text.replace(/[0-9]/g, (d) => AR_DIGITS[d]) : text;

export function fmt(n, locale) {
  const s = Math.round(n).toLocaleString("en-US");
  return locale === "ar" ? s.replace(/\d/g, (d) => AR_DIGITS[d]).replace(/,/g, "٬") : s;
}

// A lone «و» stays with the word after it, and a number with its noun.
const tidy = (str) => str.replace(/(^|\s)و /g, "$1و\u00a0").replace(/([٠-٩0-9]) (?=\p{L})/gu, "$1\u00a0");

// Body text with the Arabic thousands separator set in Amiri: the body face draws «٬» like a
// Latin comma, so the one character borrows the display face's true separator.
export function arText(str) {
  const frag = document.createDocumentFragment();
  String(str).split("٬").forEach((part, i) => {
    if (i) frag.append(h("span", { class: "sep" }, "٬"));
    frag.append(tidy(part));
  });
  return frag;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function h(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "style") node.style.cssText = v;
    else node.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) node.append(typeof c === "string" ? tidy(c) : c);
  return node;
}

const NS = "http://www.w3.org/2000/svg";
function s(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Absolutely place an element in the design box, in logical (inline-start) coordinates.
function place(el, u, y, w, hgt) {
  el.style.insetInlineStart = `${u}px`;
  el.style.top = `${y}px`;
  if (w != null) el.style.width = `${w}px`;
  if (hgt != null) el.style.height = `${hgt}px`;
  return el;
}

// Cached style writers: only touch the DOM when a value changes.
export function setT(el, v) { if (el._t !== v) { el.style.transform = v; el._t = v; } }
export function setO(el, v) {
  const o = v >= 0.999 ? "1" : v <= 0.001 ? "0" : v.toFixed(3);
  if (el._o !== o) { el.style.opacity = o; el._o = o; }
}
export function setC(el, v) { if (el._c !== v) { el.style.clipPath = v; el._c = v; } }
function setText(el, v) { if (el._x !== v) { el.textContent = v; el._x = v; } }
function setVar(el, k, v) { const c = el._vars || (el._vars = {}); if (c[k] !== v) { el.style.setProperty(k, v); c[k] = v; } }
// Hidden parts of a plate can't be clicked, even before they ink in.
function setVis(el, on) { if (el._vis !== on) { el.style.visibility = on ? "" : "hidden"; el._vis = on; } }

// A part fades in as it rises the last few pixels into place.
function ink(el, k, rise = 6) {
  setO(el, k);
  setT(el, k >= 1 ? "none" : `translateY(${((1 - k) * rise).toFixed(2)}px)`);
}

// Inline offset → physical translateX (inline-start is the right edge in RTL).
const tx = (rtl, du) => (rtl ? -du : du);

// Clip that keeps the inline-start part of a box (fraction f visible). For drawings only.
function clipFromStart(rtl, f) {
  const hide = ((1 - clamp01(f)) * 100).toFixed(3);
  return rtl ? `inset(-2px 0 -2px ${hide}%)` : `inset(-2px ${hide}% -2px 0)`;
}

// Machine text (timecodes, filenames) inside an RTL plate: isolate it, but never put dir on a
// positioned element (its logical insets would then resolve against its own direction).
const ltr = (text) => h("span", { dir: "ltr" }, ...[...text].map(c => /[0-9٠-٩]/.test(c) ? h("span", { class: "digit" }, c) : c));

function words(text) {
  return text.split(/\s+/).filter(Boolean);
}

// Group inline word spans into their rendered lines (needs the final font).
function linesOf(spans) {
  const lines = [];
  let top = null;
  for (const sp of spans) {
    if (top === null || Math.abs(sp.offsetTop - top) > 4) { lines.push([]); top = sp.offsetTop; }
    lines[lines.length - 1].push(sp);
  }
  return lines;
}
const fontsReady = () => !document.fonts || document.fonts.status === "loaded";

/* Speech-like amplitudes in 0..1: phrases, syllables and short breaths. */
function speech(seed, n, phrases = null) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    let env = 1;
    if (phrases) {
      env = 0.03;
      for (const [a, b] of phrases) {
        if (x >= a && x <= b) {
          const e = Math.min(x - a, b - x) / 0.025;
          env = Math.min(1, e < 1 ? 0.15 + 0.85 * e : 1);
        }
      }
    }
    const syl = 0.35 + 0.65 * Math.abs(Math.sin(i * 0.55 + Math.sin(i * 0.13) * 2.4));
    const phr = 0.55 + 0.45 * Math.abs(Math.sin(i * 0.045 + seed));
    let a = env * syl * phr * (0.55 + 0.45 * r());
    if (!phrases && i % 37 > 34) a *= 0.25;
    out.push(Math.max(0.035, Math.min(1, a)));
  }
  return out;
}

// An engraved waveform: one hairline per sample, mirrored about the centre line.
function engravedSvg(amps, w, hgt, rtl) {
  const svg = s("svg", { width: w, height: hgt, viewBox: `0 0 ${w} ${hgt}`, "aria-hidden": "true" });
  const mid = hgt / 2;
  const n = amps.length;
  const pitch = w / n;
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = Math.round(pitch * i) + 0.5;
    const X = rtl ? w - x : x;
    const a = amps[i] * mid * 0.96;
    d += `M${X.toFixed(1)} ${(mid - a).toFixed(2)}V${(mid + a).toFixed(2)}`;
  }
  svg.append(s("path", { d }));
  svg.append(s("path", { d: `M0 ${mid + 0.5}H${w}`, "stroke-opacity": "0.5" }));
  return svg;
}

/* ============================================================ 1. Q & A ==
   Islam 200 QA: the book's own first page, set as the book sets it. Question 1 is open, its
   answer washed line by line; the next questions follow. */
const QUESTIONS = [
  [2, "س: ما أول ما يجب على العباد؟"],
  [3, "س: ما هو ذلك الأمر الذي خلق الله الخلق لأجله؟"],
  [4, "س: ما معنى العبد؟"],
  [5, "س: ما هي العبادة؟"],
  [6, "س: متى يكون العمل عبادة؟"],
  [7, "س: ما علامة محبة العبد ربه عز وجل؟"],
  [8, "س: بماذا عرف العباد ما يحبه الله ويرضاه؟"],
  [9, "س: كم شروط العبادة؟"],
  [10, "س: ما هو صدق العزيمة؟"],
  [11, "س: ما معنى إخلاص النية؟"],
  [12, "س: ما هو الشرع الذي أمر اللهُ تعالى أن لا يُدان إلا به؟"],
  [13, "س: كم مراتب دين الإسلام؟"],
  [14, "س: ما معنى الإسلام؟"],
];
// Verbatim from the book, cut at a clause boundary and marked with «…».
const ANSWER = "أول ما يجب على العباد معرفة الأمر الذي خلقهم الله له، وأخذ عليهم الميثاق به، وأرسل به رسله إليهم وأنزل به كتبه عليهم،";

const qa = {
  beats: 2,
  size: { wide: PLATE, narrow: { w: 310, h: 450 } },
  create(ctx) {
    const el = h("div", { class: "m m-qa", "aria-hidden": "true" });
    const st = {};
    return {
      el,
      mount() {
        el.textContent = "";
        // the source numbers its sections from 2; question n is section n + 1
        const num = (section) => h("span", { class: "m-qa__num" }, fmt(section - 1, ctx.locale));
        const [n1, q1] = QUESTIONS[0];
        const open = h("div", { class: "m-qa__open", dir: "rtl", lang: "ar" },
          num(n1),
          h("p", { class: "m-qa__q" }, h("span", { class: "m-rub" }, "س:"), q1.slice(2)));
        const a = h("p", { class: "m-qa__a", dir: "rtl", lang: "ar" });
        const ws = [h("span", { class: "m-qa__w m-rub" }, "جـ:")];
        for (const w of words(ANSWER)) ws.push(h("span", { class: "m-qa__w" }, w));
        ws.push(h("span", { class: "m-qa__w" }, "…"));
        ws.forEach((w, i) => { if (i) a.append(" "); a.append(w); });
        open.append(a);
        const rule = h("div", { class: "m-qa__rule" });
        const rest = QUESTIONS.slice(1, 5);
        const list = h("ol", { class: "m-qa__list", dir: "rtl", lang: "ar" },
          rest.map(([n, q]) => h("li", {}, num(n), h("span", {}, q))));
        const flow = h("div", { class: "m-qa__flow" }, open, rule, list);
        el.append(flow);
        Object.assign(st, { ws, a, lines: null, washes: null });
      },
      update(p) {
        if (!st.lines && fontsReady()) {
          st.lines = linesOf(st.ws);
          st.washes = st.lines.map(g => h("span", { class: "m-qa__line" },
            ...g.flatMap((w, i) => i ? [" ", w] : [w])));
          st.a.replaceChildren(...st.washes);
        }
        const groups = st.lines || st.ws.map(w => [w]);
        groups.forEach((g, i) => {
          const wash = seg(p, i / groups.length, (i + 1) / groups.length);
          st.washes?.[i].style.setProperty("--wash", wash.toFixed(3));
        });
      },
    };
  },
};

/* ======================================================= 2. TIMELINE ==
   Taqtie: a 90-minute recording fills the plate; it settles under its ruler and is cut in four;
   the parts drop into their rows, open to the full width, and each gains an intro and an outro.
   Ruler ticks sit exactly on the cut points. */
const TC = ["00:00:00", "00:22:30", "00:45:00", "01:07:30", "01:30:00"];

const timeline = {
  beats: 3,
  size: { wide: PLATE, narrow: { w: 310, h: 490 } },
  create(ctx) {
    const el = h("div", { class: "m m-tl", "aria-hidden": "true" });
    const st = {};
    const L = ctx.locale === "ar" ? { i: "بادئة", o: "خاتمة" } : { i: "Intro", o: "Outro" };
    return {
      el,
      mount(geom) {
        el.textContent = "";
        const N = geom.narrow;
        const G = N
          ? { pad: 0, IW: geom.w, line: 30, srcY: 42, srcH: 54, big: 200, row0: 150, pitch: 82, labH: 24, barH: 42, cap: 46, gap: 3, H: geom.h }
          : { pad: 0, IW: geom.w, line: 36, srcY: 50, srcH: 78, big: 330, row0: 204, pitch: 94, labH: 28, barH: 54, cap: 58, gap: 4, H: geom.h };
        const QW = G.IW / 4;
        const RW = G.IW - 2 * (G.cap + G.gap);
        const PX = G.pad + G.cap + G.gap;

        // the source: ruler and recording
        const grp = h("div", { class: "m-tl__src" });
        el.append(grp);
        const ruler = h("span", { class: "m-tl__ruler" });
        place(ruler, G.pad, G.line, G.IW, 1);
        grp.append(ruler);
        for (let k = 0; k <= 12; k++) {
          const major = k % 3 === 0;
          const t = h("span", { class: major ? "m-tl__tick m-tl__tick--major" : "m-tl__tick" });
          const u = G.pad + Math.min(k * (G.IW / 12), G.IW - 1);
          place(t, u, G.line - (major ? 7 : 4), 1, major ? 7 : 4);
          grp.append(t);
        }
        TC.forEach((txt, i) => {
          if (i === 1 || i === 3) return; // the quarter times are left to their ticks: a phone has no room for them
          const lab = h("span", { class: "m-tl__time" }, ltr(timecode(txt, ctx.locale)));
          lab.style.top = `${G.line - (N ? 26 : 30)}px`;
          if (i === 0) lab.style.insetInlineStart = `${G.pad}px`;
          else if (i === 4) lab.style.insetInlineEnd = `${G.pad}px`;
          else { lab.style.insetInlineStart = `${G.pad + i * QW}px`; lab.classList.add("m-tl__time--mid"); }
          grp.append(lab);
        });
        // Every segment is the exact corresponding quarter of one recording.
        const master = speech(101, N ? 160 : 280);
        const amps = [0, 1, 2, 3].map(i => master.slice(i * master.length / 4, (i + 1) * master.length / 4));
        const quarters = amps.map((a, i) => {
          const q = h("div", { class: "m-tl__wave" }, engravedSvg(a, RW, G.barH, ctx.rtl));
          place(q, G.pad + i * QW, G.srcY, RW, G.barH);
          el.append(q);
          return q;
        });
        const cuts = [1, 2, 3].map((i) => {
          const c = h("span", { class: "m-tl__cut" });
          place(c, G.pad + i * QW - 1, G.line - 10, 2, G.srcY + G.srcH + 8 - (G.line - 10));
          grp.append(c);
          return c;
        });
        // at rest the recording fills the plate; the first beat settles it under the ruler
        const lift = (G.H - (G.big + G.srcY - G.line + 26)) / 2 - (G.line - 26);

        const rows = amps.map((a, i) => {
          const top = G.row0 + i * G.pitch;
          // each time reads left to right, but the range runs with the page: from the ruler's start side
          const lab = h("span", { class: "m-tl__lab" }, ltr(timecode(TC[i], ctx.locale)), " – ", ltr(timecode(TC[i + 1], ctx.locale)));
          lab.style.top = `${top}px`;
          lab.style.insetInlineStart = `${PX}px`;
          const part = h("div", { class: "m-tl__wave m-tl__part" }, engravedSvg(a, RW, G.barH, ctx.rtl));
          place(part, PX, top + G.labH, RW, G.barH);
          const cin = h("span", { class: "m-tl__cap m-tl__cap--in" }, L.i);
          place(cin, G.pad, top + G.labH, G.cap, G.barH);
          const cout = h("span", { class: "m-tl__cap m-tl__cap--out" }, L.o);
          place(cout, PX + RW + G.gap, top + G.labH, G.cap, G.barH);
          const from = { du: G.pad + i * QW - PX, dy: G.srcY - (top + G.labH), sx: QW / RW, sy: G.srcH / G.barH };
          el.append(lab, part, cin, cout);
          return { lab, part, cin, cout, from };
        });
        Object.assign(st, { G, grp, quarters, lift, cuts, rows, QW, RW });
      },
      update(p) {
        const { G } = st;
        // beat 1: the recording settles under its ruler and is cut at the majors
        const up = easeInOut(seg(p, 0.02, 0.22));
        const ly = st.lift * (1 - up);
        setT(st.grp, ly < 0.01 ? "none" : `translateY(${ly.toFixed(2)}px)`);
        const sy = lerp(G.big, G.srcH, up) / G.barH;
        const sx = st.QW / st.RW;
        st.quarters.forEach((q) => setT(q, `translateY(${ly.toFixed(2)}px) scale(${sx.toFixed(5)}, ${sy.toFixed(5)})`));
        st.cuts.forEach((c, i) => {
          const k = easeOut(seg(p, 0.16 + i * 0.04, 0.26 + i * 0.04));
          setT(c, k >= 1 ? "none" : `scaleY(${k.toFixed(4)})`);
          setO(c, k > 0 ? 1 : 0);
        });
        // beat 2: the parts drop to their rows (at their own width, so none crosses another),
        // then open to the full width
        const drop = easeInOut(seg(p, 0.26, 0.44));
        const open = easeInOut(seg(p, 0.44, 0.6));
        st.rows.forEach((r, i) => {
          const f = r.from;
          setO(r.part, p >= 0.26 ? 1 : 0);
          if (open >= 1) setT(r.part, "none");
          else {
            const du = lerp(f.du, 0, open);
            const dy = lerp(f.dy, 0, drop);
            setT(r.part, `translate(${tx(ctx.rtl, du).toFixed(2)}px, ${dy.toFixed(2)}px) scale(${lerp(f.sx, 1, open).toFixed(5)}, ${lerp(f.sy, 1, drop).toFixed(5)})`);
          }
          ink(r.lab, easeOut(seg(p, 0.56 + i * 0.02, 0.64 + i * 0.02)), 4);
          // beat 3: an intro and an outro join each part (all four whole by 95%, then held)
          const c = easeOut(seg(p, 0.68 + i * 0.05, 0.78 + i * 0.05));
          setO(r.cin, c);
          setO(r.cout, c);
          setT(r.cin, c >= 1 ? "none" : `translateX(${tx(ctx.rtl, -(1 - c) * 12).toFixed(2)}px)`);
          setT(r.cout, c >= 1 ? "none" : `translateX(${tx(ctx.rtl, (1 - c) * 12).toFixed(2)}px)`);
        });
      },
    };
  },
};

/* ===================================================== 3. TRANSCRIBE ==
   Tafrigh: a playhead crosses a recording engraved in hairlines; each spoken phrase resolves into
   a timed transcript line, above the output formats. Neutral lecture-opening formulas only. */
const LINES = [
  { tc: "00:00:01", text: "الحمد لله، والصلاة والسلام على رسول الله، أما بعد:" },
  { tc: "00:00:08", text: "فهذا هو الدرس الأول من دروس هذه السلسلة،" },
  { tc: "00:00:15", text: "ونسأل الله التوفيق والسداد." },
];
const PHRASES = [[0.02, 0.37], [0.43, 0.75], [0.81, 0.98]];
const FORMATS = ["txt", "srt", "vtt", "csv", "tsv", "json"];

const transcribe = {
  beats: 3,
  size: { wide: PLATE, narrow: { w: 310, h: 500 } },
  create(ctx) {
    const el = h("div", { class: "m m-tr", "aria-hidden": "true" });
    const st = {};
    return {
      el,
      mount(geom) {
        el.textContent = "";
        const N = geom.narrow;
        const G = N
          ? { IW: geom.w, waveY: 10, waveH: 160, br: 180, rows: 210, fmtH: 46 }
          : { IW: geom.w, waveY: 12, waveH: 250, br: 270, rows: 312, fmtH: 50 };
        const amps = speech(7, N ? 155 : 244, PHRASES);
        const base = h("div", { class: "m-tr__wave" }, engravedSvg(amps, G.IW, G.waveH, ctx.rtl));
        const played = h("div", { class: "m-tr__wave m-tr__wave--on" }, engravedSvg(amps, G.IW, G.waveH, ctx.rtl));
        place(base, 0, G.waveY, G.IW, G.waveH);
        place(played, 0, G.waveY, G.IW, G.waveH);
        const head = h("span", { class: "m-tr__head" });
        place(head, 0, G.waveY - 6, 1, G.waveH + 12);
        el.append(base, played, head);
        PHRASES.forEach(([a, b]) => {
          const br = h("span", { class: "m-tr__br" });
          place(br, a * G.IW, G.br, (b - a) * G.IW, 6);
          el.append(br);
        });
        const list = h("div", { class: "m-tr__lines" });
        place(list, 0, G.rows, G.IW);
        const rows = LINES.map((ln) => {
          const tc = h("span", { class: "m-tr__ltc" }, ltr(timecode(ln.tc, ctx.locale)));
          // Each word carries its share of the phrase's time, by length, so the highlight
          // sweeps through the words at the playhead's pace.
          const ws = words(ln.text), total = ws.reduce((n, w) => n + w.length + 1, 0);
          let at = 0;
          const spans = ws.map((w, i) => {
            const sp = h("span", { class: "m-tr__w" }, i < ws.length - 1 ? `${w} ` : w);
            sp._a = at / total; at += w.length + 1; sp._b = at / total;
            return sp;
          });
          const t = h("span", { class: "m-tr__text", dir: "rtl", lang: "ar" }, spans);
          list.append(h("p", { class: "m-tr__line" }, tc, t));
          return { tc, t, spans };
        });
        el.append(list);
        const fl = h("span", { class: "m-tr__fl" }, ctx.locale === "ar" ? "صيغ المخرجات" : "Output formats");
        const items = FORMATS.map((f) => h("span", { class: "m-tr__f" }, f));
        const fmts = h("div", { class: "m-tr__fmts" }, fl, h("span", { class: "m-tr__fbox", dir: "ltr" }, items));
        place(fmts, 0, geom.h - G.fmtH, G.IW);
        el.append(fmts);
        Object.assign(st, { G, played, head, rows });
      },
      update(p) {
        const { G } = st;
        // over all three beats the playhead crosses the recording; each phrase is highlighted in its line
        const f = p;
        setC(st.played, clipFromStart(ctx.rtl, f));
        setT(st.head, `translateX(${tx(ctx.rtl, f * (G.IW - 1)).toFixed(2)}px)`);
        setO(st.head, 1);
        PHRASES.forEach(([a, b], k) => {
          const r = st.rows[k];
          // One line is lit at a time: it fades out over the pause before the next phrase,
          // and the last stays lit once the recording ends.
          const next = PHRASES[k + 1];
          const wash = next ? 1 - seg(f, b, next[0]) : 1;
          setVar(r.t, "--wash", wash.toFixed(3));
          r.spans.forEach((sp) => setVar(sp, "--fill", seg(f, lerp(a, b, sp._a), lerp(a, b, sp._b)).toFixed(3)));
        });
      },
    };
  },
};

/* ========================================================= 4. SEARCH ==
   Baheth: one query, typed into the field; a real result arrives from each of the three sources,
   quoted verbatim (truncated with «…»), and the query lights up in each. Retrieved from
   baheth.ieasybooks.com for «فضل العلم». Hadith results show their book and chapter only. Each result
   links to its page on Baheth: the transcript at its moment, the hadith, the Shamela page. */
const QUERY = "فضل العلم";
const RESULTS = {
  tr: { title: "قراءة في فقه الأسماء الحسنى", by: "عبدالرزاق البدر", tc: "00:10:07",
    url: "media/02-قراءة-في-فقه-الأسماء-الحسنى-الشيخ-عبد-الرزاق-بن-عبد-المحسن-العباد?cue=1678234",
    text: "[فضل العلم] باسماء الله تعالى وصفاته ان [العلم] باسماء الله وصفاته علم مبارك …" },
  hd: { title: "صحيح البخاري", text: "كتاب العلم / [فَضْلِ الْعِلْمِ]", url: "hadiths/be69d2eb-62d8-42da-a07e-6e49f028b545" },
  sh: { title: "دروس للشيخ محمد المختار الشنقيطي", head: "[فضل العلم] ومعلمه",
    url: "shamela/pages/1e2eaa7d-fe99-40e6-831f-662ee87762f2",
    text: "فضّل الله سبحانه وتعالى [العلم] وجعله ميراث الأنبياء، ورفع أهله وفضلهم وشرفهم …" },
};
const SOURCES = {
  ar: { tr: "التفريغات", hd: "الأحاديث", sh: "الشاملة" },
  en: { tr: "Transcripts", hd: "Hadith", sh: "Shamela" },
};

// "[...]" marks the words that match the query.
function marked(str, hits) {
  const out = [];
  str.split(/(\[[^\]]+\])/).forEach((part) => {
    if (!part) return;
    if (part.startsWith("[")) {
      const m = h("mark", { class: "m-se__hit" }, part.slice(1, -1));
      hits.push(m);
      out.push(m);
    } else out.push(part);
  });
  return out;
}

const search = {
  beats: 3,
  size: { wide: PLATE, narrow: { w: 310, h: 570 } },
  create(ctx) {
    const el = h("div", { class: "m m-se" });
    const st = {};
    return {
      el,
      mount(geom) {
        el.textContent = "";
        const N = geom.narrow;
        const fieldH = N ? 46 : 52;
        const field = h("div", { class: "m-se__field", "aria-hidden": "true" });
        place(field, 0, 0, geom.w, fieldH);
        const q = h("span", { class: "m-se__q", dir: "rtl", lang: "ar" });
        const caret = h("span", { class: "m-se__caret" });
        field.append(h("span", { class: "m-se__qwrap" }, q, caret));
        el.append(field);

        const hits = [];
        const cols = h("div", { class: "m-se__cols" });
        place(cols, 0, fieldH + (N ? 16 : 26), geom.w);
        const groups = ["tr", "hd", "sh"].map((key) => {
          const r = RESULTS[key];
          const body = key === "hd"
            ? [h("p", { class: "m-se__t", dir: "rtl", lang: "ar" }, r.title, h("span", { class: "m-se__by" }, " — "), h("span", { class: "m-se__h" }, marked(r.text, hits)))]
            : [h("p", { class: "m-se__t", dir: "rtl", lang: "ar" }, r.title, r.by ? h("span", { class: "m-se__by" }, ` — ${r.by}`) : null),
               r.head ? h("p", { class: "m-se__h", dir: "rtl", lang: "ar" }, marked(r.head, hits)) : null,
               r.text ? h("p", { class: "m-se__x", dir: "rtl", lang: "ar" }, marked(r.text, hits),
                 r.tc ? h("span", { class: "m-se__tc" }, " ", ltr(timecode(r.tc, ctx.locale))) : null) : null];
          const col = h("section", { class: "m-se__col" },
            h("ol", { class: "m-se__list" }, h("li", { class: "m-se__r" },
              h("p", { class: "m-se__src" }, SOURCES[ctx.locale][key]),
              h("a", { class: "m-se__a", href: `https://baheth.ieasybooks.com/${ctx.locale}/${r.url}`, target: "_blank", rel: "noopener noreferrer" }, body))));
          cols.append(col);
          return col;
        });
        el.append(cols);
        Object.assign(st, { q, caret, field, fieldH, cols, groups, hits, lift: null });
      },
      update(p) {
        // at rest the field waits alone, in the middle of the printed plate
        if (st.lift === null || (!st.liftFinal && fontsReady())) {
          st.liftFinal = fontsReady();
          st.lift = (st.cols.offsetTop + st.cols.offsetHeight + 28 - st.fieldH) / 2;
        }
        // beat 1: the query types into the waiting field
        const chars = [...QUERY];
        setText(st.q, chars.slice(0, Math.round(chars.length * seg(p, 0.02, 0.26))).join(""));
        setVis(st.caret, p < 0.3);
        // beat 2: the field rises; the three sources answer, one after another
        const up = easeInOut(seg(p, 0.28, 0.44));
        setT(st.field, up >= 1 ? "none" : `translateY(${(st.lift * (1 - up)).toFixed(2)}px)`);
        st.groups.forEach((g, i) => {
          const k = easeOut(seg(p, 0.4 + i * 0.07, 0.54 + i * 0.07));
          ink(g, k, 12);
          setVis(g, k > 0);
        });
        // beat 3: the query lights up wherever it was found (all lit by 92%, then held)
        const n = st.hits.length;
        st.hits.forEach((m, i) => setVar(m, "--wash", easeOut(seg(p, 0.66 + (i / n) * 0.26, 0.71 + (i / n) * 0.26)).toFixed(3)));
      },
    };
  },
};

/* ============================================================ 5. OCR ==
   Tahweel: a scanned page of real Arabic text passes under the scan line and resolves into crisp
   text; then DOCX and TXT come out with the same number of pages. The text is a neutral note
   on how the conversion works. */
const OCR_HEAD = "في التعرّف الضوئي على الحروف";
const OCR_EXCERPT = "تمرّ الصفحة الممسوحة ضوئيًا بثلاث مراحل: تُحلَّل الصورة أولًا لتمييز السطور والكلمات، …";
function sheet(kind) {
  return h("div", { class: `m-ocr__sheet m-ocr__sheet--${kind}`, dir: "rtl", lang: "ar" },
    h("div", { class: "m-ocr__ink" }, h("h4", {}, OCR_HEAD), h("p", {}, OCR_EXCERPT)));
}
const ocr = {
  beats: 3,
  size: { wide: PLATE, narrow: { w: 310, h: 610 } },
  create(ctx) {
    const el = h("div", { class: "m m-ocr", "aria-hidden": "true" });
    const st = {};
    return {
      el,
      mount(geom) {
        el.textContent = "";
        const N = geom.narrow, W = geom.w;
        const G = N ? { srcW: W - 24, srcH: 180, srcY: 28, outW: (W - 24) / 2 - 8, outH: 238, gap: 16, d: 1.1, lab: 26 }
          : { srcW: 350, srcH: 216, srcY: 26, outW: (W - 52) / 2, outH: 264, gap: 32, d: 1.4, lab: 28 };
        const depth = 11 * G.d + 2;
        const label = (txt, u, y) => { const l = h("span", { class: "m-ocr__file" }, ltr(txt)); place(l, u, y); el.append(l); };

        // the source: twelve scanned pages; the top one passes under the scan line
        const srcU = (W - G.srcW) / 2;
        label("book.pdf", srcU, 3);
        el.append(stack(srcU, G.srcY, G.srcW, G.srcH, 11, G.d, ctx.rtl));
        const page = h("div", { class: "m-ocr__page" }); place(page, srcU, G.srcY, G.srcW, G.srcH);
        const crisp = sheet("crisp"), line = h("span", { class: "m-ocr__scan" });
        page.append(sheet("scan"), crisp, line); el.append(page);
        const arrowY = G.srcY + G.srcH + depth + 4;
        const arrow = h("span", { class: "m-ocr__down" }); place(arrow, W / 2 - 10, arrowY, 20, 30); el.append(arrow);

        // the outputs: blank pages until the text sets on them, then their stacks grow
        const outY = arrowY + 34 + G.lab;
        const outs = ["docx", "txt"].map((ext, i) => {
          const u = (N ? 4 : 0) + i * (G.outW + G.gap);
          label(`book.${ext}`, u, outY - G.lab);
          const stk = stack(u, outY, G.outW, G.outH, 11, G.d, ctx.rtl);
          const sh = sheet(`out m-ocr__sheet--${ext}`), pg = h("div", { class: "m-ocr__page m-ocr__page--out" }, sh);
          place(pg, u, outY, G.outW, G.outH); el.append(stk, pg);
          return { sheet: sh, edges: [...stk.querySelectorAll("path")].reverse() };
        });

        // «١٢ صفحة ← ١٢ صفحة»
        const unit = ctx.locale === "ar" ? "صفحة" : "pages";
        const count = `${fmt(12, ctx.locale)}\u00a0${unit}`;
        const dirn = h("span", { class: "m-ocr__direction" }), cOut = h("span", {}, count);
        const counts = h("div", { class: "m-ocr__counts" }, h("span", {}, count), dirn, cOut);
        place(counts, 0, outY + G.outH + depth + 8, W); el.append(counts);
        Object.assign(st, { G, crisp, line, outs, dirn, cOut });
      },
      update(p) {
        const { G } = st;
        // beat 1: the scan line resolves the page
        const k = seg(p, 0.03, 0.36), y = k * G.srcH;
        setC(st.crisp, k >= 1 ? "none" : `inset(0 0 ${(G.srcH - y).toFixed(2)}px 0)`);
        setT(st.line, `translateY(${y.toFixed(2)}px)`);
        setO(st.line, k > 0 && k < 1 ? 1 : 0);
        // beat 2: the text sets on both outputs, from the top down
        st.outs.forEach((o, i) => {
          const f = easeOut(seg(p, 0.4 + i * 0.07, 0.62 + i * 0.07));
          setC(o.sheet, f >= 1 ? "none" : `inset(0 0 ${((1 - f) * 100).toFixed(2)}% 0)`);
          // beat 3: the stacks grow to the same twelve pages
          o.edges.forEach((ed, j) => setO(ed, seg(p, 0.68 + j * 0.02, 0.7 + j * 0.02)));
        });
        // the count lands once the stacks are whole
        ink(st.dirn, easeOut(seg(p, 0.86, 0.91)), 0);
        ink(st.cOut, easeOut(seg(p, 0.88, 0.94)), 4);
      },
    };
  },
};

// Sheets under a page: hairline edges peeking out at the tail and the inline-end side.
function stack(u, y, w, hgt, n, d, rtl) {
  const W = w + n * d + 2;
  const H = hgt + n * d + 2;
  const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
  for (let i = n; i >= 1; i--) {
    const o = i * d;
    const x0 = rtl ? W - (w + o) : o;
    const x1 = rtl ? W - o : w + o;
    const xe = rtl ? x0 : x1;
    svg.append(s("path", { d: `M${(rtl ? x1 - 6 : x0 + 6).toFixed(2)} ${(hgt + o).toFixed(2)}H${xe.toFixed(2)}V${(o + 6).toFixed(2)}` }));
  }
  const wrap = h("div", { class: "m-ocr__stack" }, svg);
  place(wrap, u, y, W, H);
  return wrap;
}

/* ======================================================== 6. LIBRARY ==
   Aljam3: classical Islamic books are stored flat; their named tail edges face the reader. Each opens
   its book on Aljam3, in the standard edition (book ids checked on aljam3.com, 2026-11-01). */
const BOOKS = [
  ["صحيح البخاري", 6197], ["صحيح مسلم", 6237], ["سنن أبي داود", 6178], ["جامع الترمذي", 4458],
  ["سنن النسائي", 6230], ["سنن ابن ماجه", 6184], ["موطأ مالك", 6341], ["مسند أحمد", 4510],
  ["تفسير الطبري", 5411], ["تفسير ابن كثير", 5375], ["تفسير القرطبي", 5407], ["فتح الباري", 6295],
  ["رياض الصالحين", 6434], ["الأذكار", 11070], ["المغني", 10382], ["المجموع", 10187],
  ["الرسالة", 8820], ["إحياء علوم الدين", 1775], ["لسان العرب", 11380], ["البداية والنهاية", 13345],
];
const BINDINGS = ["#542331", "#67402b", "#263e34", "#242124", "#243654"];
const library = {
  beats: 2,
  size: { wide: { w: 560, h: 650 }, narrow: { w: 310, h: 500 } },
  create(ctx) {
    const el = h("div", { class: "m m-lib" });
    let books = [];
    return {
      el,
      mount(geom) {
        el.textContent = "";
        const shelf = h("div", { class: "m-lib__shelves" });
        books = [];
        const piles = 4, count = 5;
        for (let i = 0; i < piles; i++) {
          const pile = h("div", { class: "m-lib__pile" });
          for (let j = 0; j < count; j++) {
            const n = i * count + j;
            const thickness = (geom.narrow ? [38, 40, 36, 44, 38] : [42, 48, 40, 54, 44])[(j + i) % count];
            const [title, id] = BOOKS[n];
            const book = h("a", { class: "m-lib__book", href: `https://aljam3.com/${ctx.locale}/${id}`, target: "_blank", rel: "noopener noreferrer",
              style: `--binding:${BINDINGS[n % BINDINGS.length]};--bw:${98 - (n % 4) * 4}%;--bh:${thickness}px;--shift:${[0, -3, 4, -2][n % 4]}px` },
              h("span", { class: "m-lib__tail", lang: "ar", dir: "rtl" }, h("span", { class: "m-lib__title" }, title)));
            books.push(book);
            pile.append(book);
          }
          shelf.append(pile);
        }
        el.append(shelf);
      },
      update(p) {
        const travel = p * (books.length - 1);
        books.forEach((book, i) => {
          const wash = Math.max(0, 1 - Math.abs(travel - i));
          book.style.setProperty("--wash", wash.toFixed(3));
        });
      },
    };
  },
};

/* ===================================================== 7. DIACRITIZE ==
   Tashkeel: one line, set large, takes its diacritics word by word as the chosen model reads it;
   then the formats it writes. The hadith and its marks are the tool's own: the text and the
   شكِّلها result shown in its diacritization film (ieasybooks/launches, arabi-tools-tashkeel). */
const DZ_TEXT = "من سلك طريقا يلتمس فيه علما سهل الله له به طريقا إلى الجنة";
const DZ_MARKED = "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إلَى الْجَنَّةِ";
const DZ_MODELS = ["شكِّلها", "CATT"];
const DZ = {
  ar: { cite: "رواه مسلم", fl: "صيغ المخرجات", out: ["نص مشكول", "TXT", "DOCX"] },
  en: { cite: "Narrated by Muslim", fl: "Output formats", out: ["Diacritized text", "TXT", "DOCX"] },
};

const diacritize = {
  beats: 3,
  size: { wide: PLATE, narrow: NARROW },
  create(ctx) {
    const el = h("div", { class: "m m-dz", "aria-hidden": "true" });
    const st = {};
    return {
      el,
      mount() {
        el.textContent = "";
        const L = DZ[ctx.locale];
        const bare = words(DZ_TEXT);
        // Each word holds both forms: the marked one sets the line, and the bare one lies over it
        // until the model reaches it.
        const ws = words(DZ_MARKED).map((m, i) => {
          const d = h("span", { class: "m-dz__d" }, m), b = h("span", { class: "m-dz__b" }, bare[i]);
          return { w: h("span", { class: "m-dz__w" }, d, b), d, b };
        });
        const models = DZ_MODELS.map((m) => h("span", { class: "m-dz__model" }, m));
        const fmts = h("div", { class: "m-dz__fmts" }, h("span", { class: "m-dz__fl" }, L.fl),
          h("span", { class: "m-dz__fbox" }, L.out.map((f) => h("span", { class: "m-dz__f" }, f))));
        el.append(h("div", { class: "m-dz__flow m-fit" },
          h("div", { class: "m-dz__models" }, models),
          h("p", { class: "m-dz__out", dir: "rtl", lang: "ar" }, ws.flatMap((x, i) => (i ? [" ", x.w] : [x.w]))),
          h("p", { class: "m-dz__cite" }, L.cite),
          fmts));
        Object.assign(st, { ws, model: models[0], fmts });
      },
      update(p) {
        // beat 1: the first model is chosen
        setVar(st.model, "--on", easeOut(seg(p, 0.04, 0.18)).toFixed(3));
        // beats 2–3: the marks arrive word by word, each word lit while it takes them
        const n = st.ws.length, span = 0.62;
        st.ws.forEach((x, i) => {
          const a = 0.2 + (span * i) / n, k = seg(p, a, a + (span / n) * 1.5);
          setO(x.d, k);
          setO(x.b, 1 - k);
          setVar(x.w, "--wash", Math.sin(Math.PI * k).toFixed(3));
        });
        // then the formats it writes
        const k = easeOut(seg(p, 0.86, 0.97));
        ink(st.fmts, k);
        setVis(st.fmts, k > 0);
      },
    };
  },
};

/* ========================================================== 8. TOOLS ==
   arabi.tools: the site's three tools as the site lists them, in its own words. Each converts in
   turn, its inputs passing over to the formats it gives back; each opens its page on the site. */
const AT_TOOLS = [
  { path: "transcribe", in: ["MP3", "M4A"], out: ["TXT", "SRT"],
    ar: { name: "تفريغ الصوت", text: "حوّل تسجيلات MP3 وM4A إلى نص مكتوب وملف ترجمة SRT." },
    en: { name: "Audio transcription", text: "Turn MP3 and M4A recordings into text and SRT subtitles." } },
  { path: "ocr", in: ["PDF", "JPG", "PNG"], out: ["TXT", "DOCX", "JSON"],
    ar: { name: "استخراج النص من الصور", text: "حوّل ملفات PDF وصور JPG وPNG إلى نص قابل للتحرير، بأي لغة، ونزّله بصيغ TXT وDOCX وJSON." },
    en: { name: "Text recognition (OCR)", text: "Turn PDFs and JPG or PNG images in any language into editable text, with TXT, DOCX and JSON downloads." } },
  { path: "diacritize", in: { ar: ["نص", "TXT", "DOCX"], en: ["Text", "TXT", "DOCX"] }, out: { ar: ["نص مشكول", "TXT", "DOCX"], en: ["Diacritized text", "TXT", "DOCX"] },
    ar: { name: "تشكيل النص العربي", text: "أضف التشكيل إلى نص عربي أو مستند TXT أو DOCX، باستخدام شكِّلها أو CATT." },
    en: { name: "Arabic diacritization", text: "Add diacritics to Arabic text or a TXT or DOCX document using شكِّلها or CATT." } },
];
const AT = {
  ar: { head: "أدوات مجانية للغة العربية", promises: ["مجانية بلا حساب", "تُحذف ملفاتك تلقائيًا", "للعربية أولًا"] },
  en: { head: "Free tools for the Arabic language", promises: ["Free, no account", "Files deleted automatically", "Arabic first"] },
};

const tools = {
  beats: 3,
  size: { wide: PLATE, narrow: NARROW },
  create(ctx) {
    const el = h("div", { class: "m m-at" });
    const st = {};
    return {
      el,
      mount() {
        el.textContent = "";
        const L = AT[ctx.locale], pick = (v) => (Array.isArray(v) ? v : v[ctx.locale]);
        const chips = (list, cls) => list.map((f) => h("span", { class: `m-at__f ${cls}` }, f));
        const rows = AT_TOOLS.map((t) => {
          const ins = chips(pick(t.in), "m-at__f--in"), outs = chips(pick(t.out), "m-at__f--out");
          const arrow = h("span", { class: "m-at__arrow", "aria-hidden": "true" });
          const a = h("a", { class: "m-at__tool", href: `https://arabi.tools/${t.path}`, target: "_blank", rel: "noopener noreferrer" },
            h("span", { class: "m-at__name" }, t[ctx.locale].name),
            h("span", { class: "m-at__text" }, t[ctx.locale].text),
            h("span", { class: "m-at__formats", dir: ctx.rtl ? "rtl" : "ltr" }, ins, arrow, outs));
          return { a, ins, outs, arrow };
        });
        el.append(h("div", { class: "m-at__flow m-fit" },
          h("div", { class: "m-at__head" },
            h("img", { class: "m-at__logo", src: "/assets/logos/arabitools.svg", alt: "", width: "48", height: "48" }),
            h("p", { class: "m-at__title" }, L.head)),
          h("p", { class: "m-at__promises" }, L.promises.join(" · ")),
          h("ol", { class: "m-at__tools" }, rows.map((r) => h("li", {}, r.a)))));
        Object.assign(st, { rows });
      },
      update(p) {
        // a beat for each tool: its inputs settle, the arrow draws, and the formats it gives back light
        st.rows.forEach((r, i) => {
          const a = 0.04 + i * 0.31;
          r.ins.forEach((c) => setVar(c, "--on", easeOut(seg(p, a, a + 0.08)).toFixed(3)));
          setVar(r.arrow, "--draw", easeOut(seg(p, a + 0.06, a + 0.16)).toFixed(3));
          r.outs.forEach((c, j) => setVar(c, "--on", easeOut(seg(p, a + 0.14 + j * 0.03, a + 0.22 + j * 0.03)).toFixed(3)));
        });
      },
    };
  },
};

/* ====================================================== 9. MUSICLESS ==
   Musicless removes most of the music from YouTube videos and keeps the voices. The plate uses the
   launch film's demo: ten seconds of Kurzgesagt's "The Largest Star in the Universe", each page in its
   own language's upload, heard as it is and with the music removed by Musicless's own model (its
   tests/reference.py, which runs what the extension runs). Its words are the extension's own (its
   _locales). */
// Voice and music level per bar (0–1, on a 36 dB scale); `cut` is the narrator's pause where the
// film turns Musicless on.
const ML_DEMO = {
  ar: { length: 10.1, cut: 7.7,
    voice: [0, 0.8, 0.87, 0.91, 0.76, 0.85, 0.9, 0.79, 0.75, 0.77, 0.86, 0.84, 0.75, 0.88, 0.71, 0.71, 0.91, 0.87, 0.92, 0.82, 0.88, 0.74, 0.87, 0.78, 0.82, 0.67, 0.89, 0.78, 0.89, 0.9, 0.77, 0.74, 0.68, 0.71, 0.67, 0.5, 0.39, 0.0, 0.62, 0.59, 0.84, 0.77, 0.86, 0.81, 0.9, 0.49, 0.7, 0.82, 0.93, 0.79, 0.86, 0.84, 0.88, 0.76, 0.76, 0.74, 0.68, 0.68, 0.39, 0.0],
    music: [0.57, 0.54, 0.55, 0.53, 0.61, 0.58, 0.57, 0.52, 0.57, 0.56, 0.56, 0.58, 0.73, 0.8, 0.83, 0.8, 0.73, 0.72, 0.72, 0.72, 0.73, 0.72, 0.7, 0.74, 0.77, 0.73, 0.81, 0.78, 0.72, 0.71, 0.75, 0.78, 0.78, 0.76, 0.77, 0.8, 0.77, 0.8, 0.86, 0.82, 0.73, 0.77, 0.73, 0.71, 0.73, 0.75, 0.69, 0.67, 0.6, 0.47, 0.39, 0.36, 0.19, 0.42, 0.93, 0.86, 0.86, 0.85, 0.78, 0.73] },
  en: { length: 9.95, cut: 6.35,
    voice: [0.53, 0.94, 0.9, 0.96, 0.82, 0.92, 0.76, 0.77, 0.77, 0.9, 0.79, 0.81, 0.79, 0.63, 0.74, 0.72, 0.82, 0.28, 0.66, 0.84, 0.83, 0.74, 0.67, 0.67, 0.71, 0.52, 0.73, 0.83, 0.84, 0.79, 0.61, 0.74, 0.59, 0.68, 0.65, 0.68, 0.28, 0, 0.11, 0.83, 0.49, 0.73, 0.8, 0.77, 0.19, 0.34, 0.98, 0.88, 0.7, 0.84, 0.81, 0.77, 0.79, 0.67, 0.49, 0.85, 0.89, 0.76, 0.53, 0.0],
    music: [0.58, 0.57, 0.52, 0.54, 0.58, 0.53, 0.59, 0.56, 0.53, 0.56, 0.56, 0.63, 0.78, 0.79, 0.76, 0.73, 0.71, 0.75, 0.73, 0.75, 0.75, 0.75, 0.74, 0.78, 0.8, 0.79, 0.78, 0.79, 0.69, 0.75, 0.75, 0.73, 0.76, 0.78, 0.8, 0.77, 0.8, 0.81, 0.83, 0.75, 0.76, 0.78, 0.69, 0.77, 0.75, 0.74, 0.66, 0.63, 0.6, 0.53, 0.39, 0.38, 0.22, 0.67, 0.93, 0.86, 0.83, 0.86, 0.78, 0.75] },
};
const ML = {
  ar: { source: "النجم الأكبر في الكون", channel: "بكل بساطة – Kurzgesagt", voices: "الأصوات", music: "الموسيقى",
    original: "الصوت الأصلي", musicless: "بلا موسيقى", sound: "الصوت", working: "جارٍ إزالة الموسيقى", done: "إزالة الموسيقى مفعّلة",
    listen: "استمع إلى المقطع", stop: "أوقف الاستماع" },
  en: { source: "The Largest Star in the Universe", channel: "Kurzgesagt – In a Nutshell", voices: "Voices", music: "Music",
    original: "Original", musicless: "Musicless", sound: "Sound", working: "Removing music", done: "Music removal is on",
    listen: "Listen to the clip", stop: "Stop listening" },
};
const mlClock = (sec, locale) => timecode(`0:${String(Math.floor(sec + 0.06)).padStart(2, "0")}`, locale);

// The extension's player glyph (its player-glyph.js, on YouTube's 24-unit grid): a note, struck
// through while Musicless removes the music. --strike (0–1) draws the strike and the gap beside it.
let mlIds = 0;
function mlGlyph(cls = "") {
  const id = `ml-cut-${++mlIds}`;
  const svg = s("svg", { class: `ml-glyph ${cls}`, viewBox: "0 0 24 24", "aria-hidden": "true" });
  const defs = s("defs"), mask = s("mask", { id, maskUnits: "userSpaceOnUse", x: -2, y: -2, width: 28, height: 28 });
  mask.append(s("rect", { x: -2, y: -2, width: 28, height: 28, fill: "#fff" }), s("path", { class: "ml-glyph__cut", d: "M3.58 2.12 21.58 20.12", pathLength: 1 }));
  defs.append(mask);
  const note = s("g", { mask: `url(#${id})` });
  note.append(s("circle", { cx: 9.2, cy: 17.9, r: 4.2 }), s("rect", { x: 11.4, y: 1.9, width: 2, height: 16 }), s("rect", { x: 11.4, y: 1.9, width: 6.4, height: 4.4 }));
  svg.append(defs, note, s("path", { class: "ml-glyph__strike", d: "M3.4 2.3 21.4 20.3", pathLength: 1 }));
  return svg;
}
// Keep the part [a, b] of a box along its inline axis (inline-start is the right edge in RTL).
const mlKeep = (rtl, a, b) => {
  const head = (clamp01(a) * 100).toFixed(2), tail = ((1 - clamp01(b)) * 100).toFixed(2);
  return rtl ? `inset(-4px ${head}% -4px ${tail}%)` : `inset(-4px ${tail}% -4px ${head}%)`;
};

// The demo's two recordings, decoded once and started together, so a switch between them is
// instant and lands on the same syllable: the original, and the voices Musicless keeps.
const mlBuffers = {};
let mlAC = null, mlNow = null;
function mlSound(locale, onStop) {
  const me = { playing: false, musicless: false, at: Infinity, nodes: null };
  me.start = (musicless) => {
    mlAC = mlAC || new (window.AudioContext || window.webkitAudioContext)();
    mlAC.resume();
    if (mlNow && mlNow !== me) mlNow.stop();
    mlNow = me;
    Object.assign(me, { playing: true, musicless, at: Infinity });
    mlBuffers[locale] = mlBuffers[locale] || Promise.all(["original", "voices"].map((k) =>
      fetch(`/assets/audio/musicless-demo-${locale}-${k}.m4a`).then((r) => r.arrayBuffer()).then((b) => mlAC.decodeAudioData(b))));
    mlBuffers[locale].then((bufs) => {
      if (!me.playing) return;
      const at = mlAC.currentTime + 0.06;
      me.nodes = bufs.map((buf, i) => {
        const src = mlAC.createBufferSource(), g = mlAC.createGain();
        src.buffer = buf;
        g.gain.value = (i === 1) === me.musicless ? 1 : 0;
        src.connect(g).connect(mlAC.destination);
        src.start(at);
        return { src, g };
      });
      me.nodes[0].src.onended = () => me.stop(true);
      me.at = at;
    }).catch(() => { delete mlBuffers[locale]; me.stop(); });
  };
  me.set = (musicless) => {
    me.musicless = musicless;
    me.nodes?.forEach(({ g }, i) => g.gain.setTargetAtTime((i === 1) === musicless ? 1 : 0, mlAC.currentTime, 0.012));
  };
  me.time = () => (me.playing && mlAC ? Math.max(0, mlAC.currentTime - me.at) : 0);
  me.stop = (ended = false) => {
    if (!me.playing) return;
    me.playing = false;
    me.nodes?.forEach(({ src }) => { src.onended = null; try { src.stop(); } catch {} });
    me.nodes = null;
    if (mlNow === me) mlNow = null;
    onStop(ended);
  };
  return me;
}
addEventListener("pagehide", () => mlNow?.stop());

// What a Musicless plate shows at a moment: the clip's second t, whether the music is removed (d,
// 0–1, eased in), and the notice. Scrolling plays the film's demo: the clip with its music up to the
// narrator's pause, a wait while the music is removed, then the rest with the voices alone. A play
// button plays it for real, and removes the music at the same pause unless the reader chose.
function mlState(D) {
  const st = { p: 0, chosen: null, heard: false, d: 0, last: 0, raf: 0, snd: null, render: null };
  st.target = () => (st.chosen ?? (st.snd?.playing ? st.snd.musicless : st.heard ? true : null));
  st.at = (p, a = 0.36, b = 0.5) => (p < a ? lerp(0, D.cut, seg(p, 0.02, a)) : lerp(D.cut, D.length, seg(p, b, 0.86)));
  st.step = () => {
    const now = performance.now(), dt = Math.min(0.05, (now - (st.last || now)) / 1000);
    st.last = now;
    const snd = st.snd;
    if (snd.playing && st.chosen == null && !snd.musicless && snd.time() >= D.cut) snd.set(true);
    const want = st.target();
    if (want != null) st.d += Math.max(-dt / 0.45, Math.min(dt / 0.45, (want ? 1 : 0) - st.d));
    return want;
  };
  st.loop = () => {
    cancelAnimationFrame(st.raf);
    const go = () => {
      st.render();
      const want = st.target();
      if (st.snd.playing || (want != null && Math.abs(st.d - (want ? 1 : 0)) > 0.001)) st.raf = requestAnimationFrame(go);
    };
    go();
  };
  return st;
}

/* Hear the difference. The clip's voices and its music as two waves: scrolling plays it, then the
   music drains away and the voices go on alone. The play button and the switch play it for real. */
const unmix = {
  beats: 3,
  size: { wide: PLATE, narrow: NARROW },
  create(ctx) {
    const L = ML[ctx.locale], D = ML_DEMO[ctx.locale];
    const el = h("div", { class: "m m-ml m-ml--unmix" });
    const st = mlState(D);
    st.snd = mlSound(ctx.locale, (ended) => { if (ended) st.heard = true; st.loop(); });
    const wave = (vals, cls) => h("span", { class: `m-ml__wave ${cls}` }, vals.map((v) => h("i", { style: `--v:${v}` })));
    st.render = () => {
      if (!st.ui) return;
      const p = st.p, snd = st.snd;
      const want = st.step();
      const t = snd.playing ? snd.time() : st.heard ? D.length : st.at(p);
      let d = st.d, notice = want ? 2 : 0;
      if (want == null) { d = easeInOut(seg(p, 0.48, 0.66)); st.d = d; notice = p >= 0.38 && p < 0.5 ? 1 : p >= 0.5 ? 2 : 0; }
      const f = clamp01(t / D.length), u = st.ui;
      setC(u.vLit, mlKeep(ctx.rtl, 0, f));
      setC(u.mLit, mlKeep(ctx.rtl, 0, f));
      setC(u.mKeep, mlKeep(ctx.rtl, d, 1));
      setC(u.mFlat, mlKeep(ctx.rtl, 0, d));
      u.heads.forEach((x) => setVar(x, "--f", f.toFixed(4)));
      setVar(u.mGlyph, "--strike", d.toFixed(3));
      setVar(u.noteGlyph, "--strike", (notice === 2 ? 1 : 0).toFixed(0));
      u.notice.classList.toggle("is-working", notice === 1);
      setText(u.noticeText, notice === 1 ? L.working : L.done);
      ink(u.notice, notice ? 1 : 0, 4);
      const on = want ?? p >= 0.44;
      setVar(u.seg, "--x", on ? "1" : "0");
      u.opts.forEach((b, i) => b.setAttribute("aria-pressed", String((i === 1) === on)));
      setText(u.now, mlClock(t, ctx.locale));
      u.play.classList.toggle("is-playing", snd.playing);
      u.play.setAttribute("aria-label", snd.playing ? L.stop : L.listen);
    };
    const toggle = () => {
      if (st.snd.playing) { st.snd.stop(); return; }
      st.heard = false;
      st.snd.start(st.chosen ?? false);
      st.loop();
    };
    const choose = (musicless) => {
      st.chosen = musicless;
      st.snd.set(musicless);
      st.loop();
    };
    return {
      el,
      mount() {
        el.textContent = "";
        const vLit = wave(D.voice, "m-ml__wave--lit"), mLit = wave(D.music, "m-ml__wave--lit");
        const mKeep = h("span", { class: "m-ml__keep" }, wave(D.music, ""), mLit);
        const mFlat = wave(D.music.map((v) => +(v * 0.08).toFixed(3)), "m-ml__wave--flat");
        const heads = [h("span", { class: "m-ml__head" }), h("span", { class: "m-ml__head" })];
        const mGlyph = mlGlyph("m-ml__lg");
        const noteGlyph = mlGlyph("m-ml__ng");
        const noticeText = h("span", {});
        const notice = h("p", { class: "m-ml__notice", "aria-hidden": "true" }, h("span", { class: "m-ml__spin" }), noteGlyph, noticeText);
        const play = h("button", { class: "m-ml__play", type: "button", "aria-label": L.listen });
        play.addEventListener("click", toggle);
        const opts = [L.original, L.musicless].map((txt, i) => {
          const b = h("button", { class: "m-ml__opt", type: "button", "aria-pressed": "false" }, txt);
          b.addEventListener("click", () => choose(i === 1));
          return b;
        });
        const segEl = h("div", { class: "m-ml__seg", role: "group", "aria-label": L.sound }, h("span", { class: "m-ml__thumb", "aria-hidden": "true" }), opts);
        const now = h("span", {});
        el.append(h("div", { class: "m-ml__flow m-fit" },
          h("p", { class: "m-ml__src", "aria-hidden": "true" }, h("span", { class: "m-ml__title" }, L.source), " · ", L.channel),
          h("div", { class: "m-ml__lanes", "aria-hidden": "true" },
            h("div", { class: "m-ml__lane m-ml__lane--voice" },
              h("p", { class: "m-ml__lab" }, h("span", { class: "m-ml__dot" }), L.voices),
              h("div", { class: "m-ml__track" }, wave(D.voice, ""), vLit, heads[0])),
            h("div", { class: "m-ml__lane m-ml__lane--music" },
              h("p", { class: "m-ml__lab" }, mGlyph, L.music),
              h("div", { class: "m-ml__track" }, mKeep, mFlat, heads[1]))),
          notice,
          h("div", { class: "m-ml__player" }, play, segEl,
            h("span", { class: "m-ml__time", "aria-hidden": "true" }, now, " / ", mlClock(D.length, ctx.locale)))));
        st.ui = { vLit, mLit, mKeep, mFlat, heads, mGlyph, noteGlyph, notice, noticeText, seg: segEl, opts, now, play };
        st.render();
      },
      update(p) { st.p = p; st.render(); },
    };
  },
};

/* ====================================================== 10. SHAWARED ==
   Shawared: Arabic poetry as it is recited. The bayt is the one in its launch film, the first of «عيون المها»
   by Ali ibn al-Jahm in Osama Al-Waaedh's voice; its text, kashida and word meaning are the app's own
   (ieasybooks/shawared, content/poems/uyun-al-maha), its word timings the film's alignment of the same
   recording. As in the app, a half has a saffron wash while it is recited, both halves are set to one
   measure, and saffron marks only what is active. */
const SH_BAYT = ["عُيونُ المَها بَينَ الرُّصافَةِ وَالجِسرِ", "جَلَبنَ الهَوى مِن حَيثُ أَدري وَلا أَدري"];
// Each word's [start, end] in the recording, in seconds, half by half.
const SH_WORDS = [
  [[0.62, 1.36], [1.52, 2.28], [2.56, 2.96], [2.98, 4.62], [4.82, 5.58]],
  [[5.82, 6.58], [6.72, 7.5], [7.82, 7.96], [8.06, 8.52], [8.62, 9.18], [9.68, 10.02], [10.04, 10.68]],
];
// The bayt as heard: seconds 0.40–10.90 of the recording.
const SH_CLIP = { src: "/assets/audio/shawared-uyun-al-maha-1.m4a", from: 0.4, length: 10.5 };
// The app's own kashida for the two halves ([offset, tatweels]), set for the poem's measure in em.
const SH_MEASURE = 12.628;
const SH_KASHIDA = [[[16, 5], [29, 6]], []];
function withKashida(text, plan) {
  let out = "", last = 0;
  for (const [at, n] of plan) { out += text.slice(last, at) + "ـ".repeat(n); last = at; }
  return out + text.slice(last);
}
const SH = {
  ar: { poet: "عَليّ بن الجَهم", by: "بصوت أسامة الواعظ", listen: "استمع إلى البيت", pause: "أوقف الاستماع",
    word: "معنى الكلمة", meaning: "جمع مهاة، وهي البقرة الوحشية، تُشبَّه بعيونها عيون الحسان لسعتها وسوادها." },
  en: { poet: "Ali ibn al-Jahm", by: "recited by Osama Al-Waaedh", listen: "Listen to the bayt", pause: "Stop listening",
    word: "Word meaning", meaning: "Maha: oryx, the wild cow of the desert; its large dark eyes are the poets’ image for a woman’s." },
};
const shClock = (sec, locale) => timecode(`${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`, locale);

// A half: its words, one span each, drawn out with the app's kashida and spread to the poem's measure.
function shHalf(text, plan, gloss = -1) {
  const ws = words(withKashida(text, plan)).map((w, i) => h("span", { class: i === gloss ? "m-sh__w m-sh__w--gloss" : "m-sh__w" }, w));
  const el = h("span", { class: "m-sh__half", dir: "rtl", lang: "ar" }, ws.flatMap((w, i) => (i ? [" ", w] : [w])));
  return { el, ws };
}
// The bayt at second t, word by word: a word turns from lead grey to ink as it is recited and stays
// read; the word being recited is marked in saffron until the next one starts; its half has the wash.
function shLight(halves, t) {
  const all = SH_WORDS.flat();
  let k = 0;
  halves.forEach((x, i) => {
    const a = SH_WORDS[i][0][0], b = SH_WORDS[i].at(-1)[1];
    setVar(x.el, "--wash", (clamp01((t - a + 0.25) / 0.3) * (1 - clamp01((t - b) / 0.3))).toFixed(3));
    x.ws.forEach((w) => {
      const s = all[k][0], next = all[k + 1]?.[0] ?? all[k][1] + 0.3;
      k++;
      setVar(w, "--read", clamp01((t - s + 0.12) / 0.2).toFixed(3));
      setVar(w, "--now", (clamp01((t - s + 0.08) / 0.12) * (1 - clamp01((t - next + 0.08) / 0.12))).toFixed(3));
    });
  });
}

/* The bayt lights up. Beat 1 hears it word by word along its progress line; beat 2 marks its hard
   word with the app's diamond; beat 3 opens the word's meaning. The play button plays the bayt
   itself, lighting it at the recording's own pace. */
const listen = {
  beats: 3,
  size: { wide: PLATE, narrow: NARROW },
  create(ctx) {
    const L = SH[ctx.locale];
    const el = h("div", { class: "m m-sh m-sh--listen", style: `--measure:${SH_MEASURE}em` });
    const st = { p: 0, audio: null, playing: false, heard: false, raf: 0, ct: -1, at: 0 };
    // The recording's clock, carried between the element's own time updates so the words keep pace.
    const playhead = () => {
      const ct = st.audio.currentTime, now = performance.now();
      if (ct !== st.ct) { st.ct = ct; st.at = now; }
      return SH_CLIP.from + ct + Math.min(0.25, (now - st.at) / 1000);
    };
    const render = () => {
      const p = st.p;
      // once heard through, the bayt stays read
      const done = SH_CLIP.from + SH_CLIP.length + 0.3;
      const t = st.playing ? playhead() : st.heard ? done : lerp(0, done, seg(p, 0.02, 0.44));
      shLight(st.halves, t);
      const f = clamp01((t - SH_CLIP.from) / SH_CLIP.length);
      setVar(st.bar, "--f", f.toFixed(4));
      setText(st.now, shClock(Math.max(0, t - SH_CLIP.from), ctx.locale));
      // beat 2: the diamond comes under the hard word; beat 3: the word is picked and its meaning opens
      setVar(st.gloss, "--dia", easeOut(seg(p, 0.5, 0.6)).toFixed(3));
      const k = easeOut(seg(p, 0.66, 0.84));
      setVar(st.gloss, "--pick", k.toFixed(3));
      ink(st.card, k, 10);
      setVis(st.card, k > 0);
    };
    const tick = () => { render(); if (st.playing) st.raf = requestAnimationFrame(tick); };
    const stop = (e) => {
      if (e?.type === "ended") st.heard = true;
      st.playing = false; cancelAnimationFrame(st.raf);
      st.btn.classList.remove("is-playing"); st.btn.setAttribute("aria-label", L.listen);
      render();
    };
    const toggle = () => {
      if (!st.audio) {
        st.audio = new Audio(SH_CLIP.src);
        st.audio.addEventListener("ended", stop);
        st.audio.addEventListener("pause", (e) => { if (st.playing) stop(e); });
        addEventListener("pagehide", () => st.audio.pause());
      }
      if (st.playing) { st.audio.pause(); return; }
      st.audio.currentTime = 0;
      st.ct = -1;
      st.audio.play().then(() => {
        st.playing = true;
        st.btn.classList.add("is-playing"); st.btn.setAttribute("aria-label", L.pause);
        tick();
      }).catch(() => {});
    };
    return {
      el,
      mount() {
        el.textContent = "";
        const sadr = shHalf(SH_BAYT[0], SH_KASHIDA[0], 1), ajuz = shHalf(SH_BAYT[1], SH_KASHIDA[1]);
        const btn = h("button", { class: "m-sh__play", type: "button", "aria-label": st.playing ? L.pause : L.listen });
        btn.addEventListener("click", toggle);
        const bar = h("span", { class: "m-sh__bar", "aria-hidden": "true" }, h("span", { class: "m-sh__fill" }), h("span", { class: "m-sh__head" }));
        const now = h("span", { class: "m-sh__now" });
        const card = h("div", { class: "m-sh__card", "aria-hidden": "true" },
          h("p", { class: "m-sh__cardhead" }, h("span", { class: "m-sh__term", dir: "rtl", lang: "ar" }, "المَها"), h("span", { class: "m-sh__label" }, L.word)),
          h("p", { class: "m-sh__meaning", dir: ctx.rtl ? "rtl" : "ltr" }, L.meaning));
        el.append(h("div", { class: "m-sh__flow m-fit" },
          h("p", { class: "m-sh__who", "aria-hidden": "true" }, h("span", { class: "m-sh__poet" }, L.poet), " · ", L.by),
          h("p", { class: "m-sh__bayt", dir: "rtl", "aria-hidden": "true" }, sadr.el, ajuz.el),
          h("div", { class: "m-sh__player" }, btn, bar,
            h("span", { class: "m-sh__time", "aria-hidden": "true" }, now, " / ", shClock(SH_CLIP.length, ctx.locale))),
          card));
        Object.assign(st, { halves: [sadr, ajuz], gloss: sadr.ws[1], btn, bar, now, card });
        if (st.playing) btn.classList.add("is-playing");
      },
      update(p) { st.p = p; render(); },
    };
  },
};

/* ===================================================== the registry */
export const motifs = { qa, timeline, transcribe, search, ocr, library, diacritize, tools, unmix, listen };

/* A project without a motif: its screenshot as a plate, otherwise its logo on a small tile. */
export function fallbackPlate(project, locale) {
  const name = project[`name_${locale}`];
  return {
    beats: 1,
    size: project.shot
      ? { wide: { w: PLATE.w, h: Math.round(PLATE.w * 0.625) }, narrow: { w: NARROW.w, h: Math.round(NARROW.w * 0.625) } }
      : { wide: { w: PLATE.w, h: 200 }, narrow: { w: NARROW.w, h: 160 } },
    create() {
      const el = h("div", { class: "m m-fb" });
      let img = null;
      return {
        el,
        mount() {
          el.textContent = "";
          if (project.shot) {
            img = h("img", { class: "m-fb__shot", src: project.shot, alt: "", loading: "lazy", decoding: "async" });
            el.classList.add("m-fb--shot");
          } else {
            img = h("img", { class: "m-fb__logo", src: project.logo, alt: "", width: "96", height: "96", loading: "lazy", decoding: "async" });
            el.classList.remove("m-fb--shot");
          }
          el.append(img);
        },
        update(p) {
          if (project.shot) setT(img, `translateY(${(-p * 6).toFixed(2)}%)`);
          else setO(img, 1);
        },
      };
    },
  };
}
