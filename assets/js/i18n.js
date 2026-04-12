// Remembers the user's preferred locale for 365 days and, on the root
// redirect stub, sends them to that locale instead of the Arabic default.

const KEY = "ieasybooks_locale";
const TTL_DAYS = 365;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ageDays = (Date.now() - parsed.ts) / (1000 * 60 * 60 * 24);
    if (ageDays > TTL_DAYS) return null;
    return parsed.locale;
  } catch {
    return null;
  }
}

function write(locale) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ locale, ts: Date.now() }));
  } catch {
    /* localStorage may be unavailable (private mode); ignore */
  }
}

export function initLocalePersistence(currentLocale) {
  // On every page load in a locale page, refresh the timestamp so the preference
  // stays fresh as long as the user keeps visiting.
  write(currentLocale);

  // When the user clicks the language toggle, record the target locale before navigation.
  document.querySelectorAll("[data-locale]").forEach((link) => {
    link.addEventListener("click", () => {
      const target = link.getAttribute("data-locale");
      if (target) write(target);
    });
  });
}

// Called by the root /index.html redirect stub.
export function redirectRootToPreferredLocale() {
  const locale = read() || "ar";
  location.replace(`/${locale}/`);
}
