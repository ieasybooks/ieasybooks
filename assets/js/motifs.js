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

// Body text with the Arabic thousands separator set in Amiri: the body face draws «٬» like a
// Latin comma, so the one character borrows the display face's true separator.
export function arText(str) {
  const frag = document.createDocumentFragment();
  String(str).split("٬").forEach((part, i) => {
    if (i) frag.append(h("span", { class: "sep" }, "٬"));
    frag.append(part);
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
  for (const c of kids.flat()) if (c != null) node.append(typeof c === "string"
    ? c.replace(/حافظ بن أحمد/g, "حافظ\u00a0بن\u00a0أحمد").replace(/أولًا وآخرًا/g, "أولًا\u00a0وآخرًا").replace(/(^|\s)و /g, "$1و\u00a0").replace(/([٠-٩0-9٬,]) (?=[\p{L}])/gu, "$1\u00a0") : c);
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
      mount(geom) {
        el.textContent = "";
        const N = geom.narrow;
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
          if (i === 1 || i === 3) return; // too tight on a phone: the ticks still show them
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
   a timed transcript line; then the output formats. Neutral lecture-opening formulas only. */
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
        Object.assign(st, { G, played, head, rows, items, fl });
      },
      update(p) {
        const { G } = st;
        // beats 1–2: the playhead crosses the recording; each phrase is highlighted in its line
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
   Baheth: one query, typed into the field; real results arrive from the three sources, quoted
   verbatim (truncated with «…»), and the query lights up in each. Retrieved from
   baheth.ieasybooks.com for «فضل العلم». Hadith results show their book and chapter only. Each result
   links to its page on Baheth: the transcript at its moment, the hadith, the Shamela page. */
const QUERY = "فضل العلم";
const RESULTS = {
  tr: [
    { title: "قراءة في فقه الأسماء الحسنى", by: "عبدالرزاق البدر", tc: "00:10:07",
      url: "media/02-قراءة-في-فقه-الأسماء-الحسنى-الشيخ-عبد-الرزاق-بن-عبد-المحسن-العباد?cue=1678234",
      text: "[فضل العلم] باسماء الله تعالى وصفاته ان [العلم] باسماء الله وصفاته علم مبارك …" },
    { title: "ميراث النبوة للجيل الصاعد", by: "أحمد السيد", tc: "00:01:46",
      text: "[فضل العلم] النافع بعده مراتب الامر والنهي سنتجاوز باب مراتب الامر والنهي …" },
  ],
  hd: [
    { title: "صحيح البخاري", text: "كتاب العلم / [فَضْلِ الْعِلْمِ]", url: "hadiths/be69d2eb-62d8-42da-a07e-6e49f028b545" },
    { title: "سنن أبي داود", text: "كتاب العلم / باب [فَضْلِ] نَشْرِ [الْعِلْمِ]" },
    { title: "جامع الترمذي", text: "باب مَا جَاءَ فِي [فَضْلِ] طَلَبِ [الْعِلْمِ]" },
  ],
  sh: [
    { title: "دروس للشيخ محمد المختار الشنقيطي", head: "[فضل العلم] ومعلمه",
      url: "shamela/pages/1e2eaa7d-fe99-40e6-831f-662ee87762f2",
      text: "فضّل الله سبحانه وتعالى [العلم] وجعله ميراث الأنبياء، ورفع أهله وفضلهم وشرفهم …" },
    { title: "مجموع فتاوى ومقالات متنوعة - ابن باز", head: "[فضل العلم] وشرف أهله" },
  ],
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
          const r = RESULTS[key][0];
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
const OCR_TEXT = "تمرّ الصفحة الممسوحة ضوئيًا بثلاث مراحل: تُحلَّل الصورة أولًا لتمييز السطور والكلمات، ثم يُقرأ كل حرف ويُقابَل بما يشبهه في النماذج المدرَّبة، وأخيرًا يُجمَع النص ويُرتَّب على هيئة الصفحة الأصلية. وتُحفظ المخرجات صفحةً بصفحة، فيبقى عدد صفحات الملف الناتج مساويًا لعدد صفحات الملف الأصلي، ويسهل الرجوع إلى موضع أي فقرة في المصدر. ويمكن تحويل ملف واحد أو مجلد كامل دفعة واحدة؛ وكلما كانت الصفحة أنظف والسطور أقوم كان التعرّف أدق.";

const OCR_EXCERPT = OCR_TEXT.split("،")[0] + "، …";
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


/* Classical Islamic books are stored flat; their named tail edges face the reader. Each opens its
   book on Aljam3, in the standard edition (book ids checked on aljam3.com, 2026-11-01). */
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
    const el=h("div",{class:"m m-lib"}); let books = [];
    return {
      el,
      mount(geom) {
        el.textContent="";
        const shelf=h("div",{class:"m-lib__shelves"});
        books = [];
        const piles=4, count=5;
        for(let i=0;i<piles;i++) {
          const pile=h("div",{class:"m-lib__pile"});
          for(let j=0;j<count;j++) {
            const n=i*count+j;
            const thickness=(geom.narrow ? [38,40,36,44,38] : [42,48,40,54,44])[(j+i)%count];
            const [title, id] = BOOKS[n];
            const book=h("a",{class:"m-lib__book",href:`https://aljam3.com/${ctx.locale}/${id}`,target:"_blank",rel:"noopener noreferrer",style:`--binding:${BINDINGS[n%BINDINGS.length]};--bw:${98-(n%4)*4}%;--bh:${thickness}px;--shift:${[0,-3,4,-2][n%4]}px`},
              h("span",{class:"m-lib__tail",lang:"ar",dir:"rtl"},h("span",{class:"m-lib__title"},title)));
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

/* ===================================================== the registry */
export const motifs = { qa, timeline, transcribe, search, ocr, library };

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
