import { projects } from "./projects.js";

// Map link type -> icon file + locale labels.
// Adding a new link type = adding one row here.
const LINK_TYPES = {
  website:        { icon: "globe",    label_ar: "الموقع",         label_en: "Website" },
  android:        { icon: "android",  label_ar: "Android",         label_en: "Android" },
  ios:            { icon: "apple",    label_ar: "iOS",             label_en: "iOS" },
  huawei:         { icon: "huawei",   label_ar: "Huawei",          label_en: "Huawei" },
  windows:        { icon: "windows",  label_ar: "Windows",         label_en: "Windows" },
  macos:          { icon: "apple",    label_ar: "macOS",           label_en: "macOS" },
  desktop:        { icon: "monitor",  label_ar: "تطبيق سطح المكتب", label_en: "Desktop App" },
  chrome:         { icon: "chrome",   label_ar: "Chrome",          label_en: "Chrome" },
  firefox:        { icon: "firefox",  label_ar: "Firefox",         label_en: "Firefox" },
  github:         { icon: "github",   label_ar: "GitHub",          label_en: "GitHub" },
  github_python:  { icon: "python",   label_ar: "Python",           label_en: "Python" },
  github_ruby:    { icon: "ruby",     label_ar: "Ruby",             label_en: "Ruby" },
  github_tauri:   { icon: "tauri",    label_ar: "Tauri",            label_en: "Tauri" },
  github_website: { icon: "github",   label_ar: "الموقع",            label_en: "Website" },
};

const LABELS = {
  ar: { links: "الروابط", repositories: "المستودعات" },
  en: { links: "Links",  repositories: "Repositories" },
};

// Cache fetched icon SVG strings so each type is fetched once.
const iconCache = new Map();
async function loadIcon(name) {
  if (iconCache.has(name)) return iconCache.get(name);
  const p = fetch(`/assets/icons/${name}.svg`)
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "");
  iconCache.set(name, p);
  return p;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function isValidUrl(url) {
  return typeof url === "string" && url !== "TODO" && url.length > 0;
}

async function renderPill(link, locale) {
  if (!isValidUrl(link.url)) return null;
  const meta = LINK_TYPES[link.type];
  if (!meta) return null;
  const iconSvg = await loadIcon(meta.icon);
  const label = meta[`label_${locale}`];
  return el("a", {
    class: "pill reveal",
    href: link.url,
    target: "_blank",
    rel: "noopener noreferrer",
  }, [
    el("span", { class: "pill__icon", html: iconSvg }),
    el("span", { class: "pill__label" }, label),
  ]);
}

async function renderCard(project, locale) {
  const logoEl = project.logo
    ? el("div", { class: "project-card__logo" }, [
        el("img", {
          src: project.logo,
          alt: project[`name_${locale}`],
          width: "56",
          height: "56",
          loading: "lazy",
          decoding: "async",
        }),
      ])
    : el("div", { class: "project-card__logo project-card__logo--glyph", "aria-hidden": "true" }, project.name_ar[0]);

  // Primary links
  const linkPills = (
    await Promise.all(project.links.map((l) => renderPill(l, locale)))
  ).filter(Boolean);

  const linksContainer = linkPills.length
    ? el("div", { class: "project-card__links" }, linkPills)
    : null;

  // Optional repositories (e.g., Tahweel)
  let repositoriesBlock = null;
  if (project.repositories && project.repositories.length) {
    const linksLabel = el("div", { class: "project-card__section-label" }, LABELS[locale].links);
    const repoLabel = el("div", { class: "project-card__section-label" }, LABELS[locale].repositories);
    const repoPills = (
      await Promise.all(project.repositories.map((l) => renderPill(l, locale)))
    ).filter(Boolean);
    const repoContainer = el("div", { class: "project-card__links project-card__links--repositories" }, repoPills);
    // Replace the plain links container with a labelled block
    const block = document.createDocumentFragment();
    if (linksContainer) { block.appendChild(linksLabel); block.appendChild(linksContainer); }
    block.appendChild(repoLabel);
    block.appendChild(repoContainer);
    repositoriesBlock = block;
  }

  const body = el("div", { class: "project-card__body" }, [
    el("div", { class: "project-card__meta" }, project[`meta_${locale}`]),
    el("h2", { class: "project-card__name-primary" }, project.name_ar),
    el("div", { class: "project-card__name-secondary latin" }, project.name_en),
    el("p", { class: "project-card__tagline" }, project[`tagline_${locale}`]),
    repositoriesBlock || linksContainer,
  ]);

  return el("article", {
    class: "project-card reveal",
    "data-gradient": project.gradient,
    "data-slug": project.slug,
  }, [logoEl, body]);
}

function groupByYear(list) {
  const map = new Map();
  for (const p of list) {
    if (!map.has(p.year)) map.set(p.year, []);
    map.get(p.year).push(p);
  }
  // Preserve insertion order (projects.js is already chronological)
  return Array.from(map.entries());
}

export async function renderTimeline(root, locale) {
  if (!root) return;
  const grouped = groupByYear(projects);
  const frag = document.createDocumentFragment();

  for (const [year, yearProjects] of grouped) {
    const section = el("section", { class: "year-group", "data-year": String(year) }, [
      el("div", { class: "year-glyph latin reveal", "aria-hidden": "true" }, String(year)),
    ]);
    for (const p of yearProjects) {
      section.appendChild(await renderCard(p, locale));
    }
    frag.appendChild(section);
  }

  root.innerHTML = ""; // clear any <noscript> fallback
  root.appendChild(frag);

  // Notify any listening modules (reveal.js) that new DOM is ready
  document.dispatchEvent(new CustomEvent("timeline:rendered"));

  // Fetch latest tahweel-tauri release and update download links
  fetchTahweelRelease(root);
}

const TAHWEEL_ASSET_PATTERNS = {
  windows: /\.exe$/i,
  macos:   /\.dmg$/i,
};

async function fetchTahweelRelease(root) {
  try {
    const res = await fetch("https://api.github.com/repos/ieasybooks/tahweel-tauri/releases/latest");
    if (!res.ok) return;
    const release = await res.json();
    const card = root.querySelector('[data-slug="tahweel"]');
    if (!card) return;
    for (const [type, pattern] of Object.entries(TAHWEEL_ASSET_PATTERNS)) {
      const asset = release.assets.find((a) => pattern.test(a.name));
      if (!asset) continue;
      const pill = card.querySelector(`.pill[href*="tahweel-tauri"]`);
      // Find the pill whose icon matches the type
      const pills = card.querySelectorAll(".pill");
      for (const p of pills) {
        const label = p.querySelector(".pill__label")?.textContent;
        if (label === "Windows" && type === "windows") p.href = asset.browser_download_url;
        if (label === "macOS" && type === "macos") p.href = asset.browser_download_url;
      }
    }
  } catch {
    // Fallback URLs already point to releases/latest — no action needed
  }
}
