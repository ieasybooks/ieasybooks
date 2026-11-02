// Single source of truth for the projects on the iEasyBooks landing page.
// Each entry becomes one spread of "the book" (a text page and a plate), in this order, on both
// /ar/ and /en/. The newest project comes first.
//
// Field reference:
//   slug        - unique short name: the page's anchor (#slug) and DOM ids
//   date        - "YYYY-MM" of the first commit (machine-readable <time>)
//   meta_ar     - Arabic meta line, Arabic-Indic numerals (e.g. "يوليو ٢٠٢٥")
//   meta_en     - English meta line
//   name_ar     - Arabic project name (the page title on /ar/)
//   name_en     - English project name (the page title on /en/)
//   tagline_ar  - Arabic description (Arabic-Indic numerals)
//   tagline_en  - English description
//   color       - the chapter colour, taken from the project's own logo: it fills the chapter's
//                 text page and its ribbon, dots its contents entry and lights the plate. It carries
//                 cream text, so keep it dark enough for 4.5 : 1.
//   motif       - OPTIONAL key into the diagram registry in motifs.js
//                 ("qa" | "timeline" | "transcribe" | "search" | "ocr" | "library" | "diacritize" | "tools").
//                 Without a motif the page gets a simple plate: `shot` if set, otherwise `logo`.
//   shot        - OPTIONAL path to a product screenshot (webp, 16:10) for that simple plate
//   logo        - path to the project's logo (a small raster; never shown above 96px)
//   links       - array of { type, url }; the type picks the label (see LINKS in book.js)
//   repositories - OPTIONAL array of { type, url } listed as a short "source code" sub-list
//   tutorials   - array of { id, title_ar, title_en }; id is the YouTube video id.
//                 Listed as video links at the foot of the chapter's page; an empty array shows none.

export const projects = [
  {
    slug: "arabitools",
    color: "#1f5c49",
    date: "2026-10",
    meta_ar: "أكتوبر ٢٠٢٦",
    meta_en: "October 2026",
    name_ar: "أدوات العربية",
    name_en: "arabi.tools",
    tagline_ar: "أدوات مجانية لتفريغ الصوت واستخراج النص من ملفات PDF والصور وتشكيل النص العربي، دون حساب أو تثبيت.",
    tagline_en: "Free tools for audio transcription, extracting text from PDFs and images, and Arabic diacritization, with no account and nothing to install.",
    motif: "tools",
    logo: "/assets/logos/arabitools.png",
    links: [
      { type: "website", url: "https://arabi.tools" },
      { type: "github",  url: "https://github.com/ieasybooks/arabi.tools" },
    ],
    tutorials: [
      { id: "kQUc04Xtu7k", title_ar: "الموقع", title_en: "The website" },
    ],
  },
  {
    slug: "tashkeel",
    color: "#57534e",
    date: "2026-10",
    meta_ar: "أكتوبر ٢٠٢٦",
    meta_en: "October 2026",
    name_ar: "تشكيل",
    name_en: "Tashkeel",
    tagline_ar: "أداة لإضافة التشكيل إلى نص عربي أو مستند TXT أو DOCX، باستخدام شكِّلها أو CATT.",
    tagline_en: "A tool to add diacritics to Arabic text or a TXT or DOCX document, using شكِّلها or CATT.",
    motif: "diacritize",
    logo: "/assets/logos/arabitools.png",
    links: [
      { type: "browser", url: "https://arabi.tools/diacritize" },
      { type: "cli",     url: "https://github.com/ieasybooks/tashkeel-rs" },
    ],
    tutorials: [
      { id: "aZXJrgYlHII", title_ar: "الاستخدام من المتصفح", title_en: "Using it in the browser" },
    ],
  },
  {
    slug: "aljam3",
    color: "#a8341c",
    date: "2025-07",
    meta_ar: "يوليو ٢٠٢٥",
    meta_en: "July 2025",
    name_ar: "الجامع",
    name_en: "Aljam3",
    tagline_ar: "مكتبة رقمية تضم أكثر من ٦٣٬٥٠٠ كتاب و٣٧ مليون صفحة من أمهات الكتب الإسلامية، مع إمكانية البحث داخل محتوى الصفحات والتحميل بصيغ متعددة.",
    tagline_en: "A digital library with over 63,500 books and 37 million pages of classical Islamic texts, with full-text search inside pages and downloads in multiple formats.",
    motif: "library",
    logo: "/assets/logos/aljam3.png",
    links: [
      { type: "website", url: "https://aljam3.com" },
      { type: "android", url: "https://play.google.com/store/apps/details?id=com.ieasybooks.aljam3" },
      { type: "ios",     url: "https://apps.apple.com/uz/app/aljam3-library/id6749810366" },
      { type: "huawei",  url: "https://appgallery.huawei.com/app/C115078047" },
      { type: "windows", url: "https://aljam3.com/desktop/windows" },
      { type: "macos",   url: "https://aljam3.com/desktop/macos" },
      { type: "mcp",     url: "https://aljam3.com/mcp" },
      { type: "github",  url: "https://github.com/ieasybooks/aljam3-web-app" },
    ],
    tutorials: [
      { id: "JvFmqlbbg84", title_ar: "المنصة", title_en: "The platform" },
      { id: "XGJ-BanIw9w", title_ar: "واجهة البرمجة", title_en: "The API" },
      { id: "Ud9NsHxZ59A", title_ar: "تطبيق سطح المكتب", title_en: "The desktop app" },
      { id: "_mZ6fmzpGnQ", title_ar: "المساعدات الذكية", title_en: "AI assistants" },
    ],
  },
  {
    slug: "tahweel",
    color: "#3f6684",
    date: "2024-10",
    meta_ar: "أكتوبر ٢٠٢٤",
    meta_en: "October 2024",
    name_ar: "تحويل",
    name_en: "Tahweel",
    tagline_ar: "أداة لتحويل ملفات PDF والصور إلى DOCX و TXT و JSON باستخدام تقنيات التعرّف الضوئي على الحروف من Google، مع إمكانية تحويل ملف واحد أو مجلد كامل والحصول على مخرجات بنفس عدد صفحات الملف الأصلي.",
    tagline_en: "A tool to convert PDF files and images to DOCX, TXT and JSON using Google’s OCR, with support for single files or entire folders and output that preserves the original page count.",
    motif: "ocr",
    logo: "/assets/logos/tahweel.png",
    links: [
      { type: "browser", url: "https://arabi.tools/ocr" },
      { type: "cli",     url: "https://github.com/ieasybooks/tahweel-rs" },
    ],
    tutorials: [
      { id: "fxC84uwTY54", title_ar: "الاستخدام من المتصفح", title_en: "Using it in the browser" },
    ],
  },
  {
    slug: "baheth",
    color: "#1d1b20",
    date: "2023-07",
    meta_ar: "يوليو ٢٠٢٣",
    meta_en: "July 2023",
    name_ar: "باحث",
    name_en: "Baheth",
    tagline_ar: "منصة تدمج تقنيات الذكاء الاصطناعي في العملية التعليمية الشرعية. توفِّر المنصة تفريغ دروس ومحاضرات العلماء والمشايخ مع إمكانية البحث فيها والبحث بالمعنى في الأحاديث النبوية والمكتبة الشاملة، لتكون بديلًا غير مُشتت يُيسّر الوصول إلى العلم الشرعي.",
    tagline_en: "A platform integrating AI into Islamic education. It provides transcriptions of scholars’ lectures with the ability to search within them, plus semantic search across Prophetic hadiths and al-Maktaba al-Shamila — a focused, distraction-free way to access Islamic knowledge.",
    motif: "search",
    logo: "/assets/logos/baheth.png",
    links: [
      { type: "website", url: "https://baheth.ieasybooks.com" },
      { type: "android", url: "https://play.google.com/store/apps/details?id=com.ieasybooks.baheth" },
      { type: "ios",     url: "https://apps.apple.com/us/app/%D8%A8%D8%A7%D8%AD%D8%AB/id6451044688" },
      { type: "chrome",  url: "https://chromewebstore.google.com/detail/baheth-%D8%A8%D8%A7%D8%AD%D8%AB/ijdjnkiocmodojidknkpajajbpghhacl" },
      { type: "firefox", url: "https://addons.mozilla.org/en-GB/firefox/addon/baheth-%D8%A8%D8%A7%D8%AD%D8%AB/" },
    ],
    tutorials: [
      { id: "vl90LkLgfE4", title_ar: "المنصة", title_en: "The platform" },
      { id: "BHslgbgwmIQ", title_ar: "إضافة المتصفح", title_en: "The browser extension" },
    ],
  },
  {
    slug: "taqtie",
    color: "#5a36c8",
    date: "2023-04",
    meta_ar: "أبريل ٢٠٢٣",
    meta_en: "April 2023",
    name_ar: "تقطيع",
    name_en: "Taqtie",
    tagline_ar: "أداة سطح مكتب لتسهيل معالجة المرئيات والصوتيات على الدعاة والعلماء. تسمح بتقطيع المواد الطويلة إلى أجزاء بناءً على فترات زمنية محددة، مع إمكانية دمج بادئة وخاتمة لكل جزء.",
    tagline_en: "A desktop tool to help scholars and preachers process audio and video. Split long recordings into segments based on time intervals, with the ability to merge an intro and outro into each segment.",
    motif: "timeline",
    logo: "/assets/logos/taqtie.png",
    links: [
      { type: "windows", url: "https://drive.google.com/file/d/1bz_f_dGW580Xj4QiVhBlcxYclniAa_1v/view" },
      { type: "macos",   url: "https://drive.google.com/file/d/1VHogV49kfRJntAv5cQ5oGRrotc4qXGzG/view" },
      { type: "github",  url: "https://github.com/ieasybooks/taqtie" },
    ],
    tutorials: [
      { id: "iZfanvvwxL8", title_ar: "التثبيت على ويندوز", title_en: "Installing on Windows" },
      { id: "L0eSBRZqk58", title_ar: "التثبيت على ماك", title_en: "Installing on macOS" },
      { id: "Di0vcmnxULs", title_ar: "طريقة الاستخدام", title_en: "How to use it" },
    ],
  },
  {
    slug: "tafrigh",
    color: "#2e3478",
    date: "2023-03",
    meta_ar: "مارس ٢٠٢٣",
    meta_en: "March 2023",
    name_ar: "تفريغ",
    name_en: "Tafrigh",
    tagline_ar: "أداة لتفريغ المواد المرئية والمسموعة إلى نصوص باستخدام تقنيات الذكاء الاصطناعي من Wit.ai، أو بنماذج عربية تعمل على جهازك، مع دعم التحميل المباشر من YouTube وتوفير صيَغ مخرجات متعددة.",
    tagline_en: "A tool to transcribe audio and video to text using AI from Wit.ai, or Arabic models that run on your own computer, with direct YouTube download support and multiple output formats.",
    motif: "transcribe",
    logo: "/assets/logos/tafrigh.png",
    links: [
      { type: "browser", url: "https://arabi.tools/transcribe" },
      { type: "cli",     url: "https://github.com/ieasybooks/tafrigh-rs" },
    ],
    tutorials: [
      { id: "kQUc04Xtu7k", title_ar: "الاستخدام من المتصفح", title_en: "Using it in the browser" },
    ],
  },
  {
    slug: "islam200qa",
    color: "#5e3d24",
    date: "2022-10",
    meta_ar: "أكتوبر ٢٠٢٢ — أول مشروع",
    meta_en: "October 2022 — the first project",
    name_ar: "الإسلام في ٢٠٠ سؤال وجواب",
    name_en: "Islam 200 QA",
    tagline_ar: "تطبيق يقدّم كتاب «أعلام السنة المنشورة» للشيخ حافظ بن أحمد الحكمي بشرح الشيخ إبراهيم رفيق، في ٢٠٠ سؤال وجواب تُقرّب العقيدة الصحيحة بأسلوب مباشر وبسيط، مع إمكانية متابعة الشرح المرئي والمسموع.",
    tagline_en: "An app presenting the book “A‘lam al-Sunnah al-Manshurah” by Sheikh Hafiz al-Hakami with Sheikh Ibrahim Rafiq’s commentary, in 200 Q&As that bring correct creed closer in a simple and direct style, with audio and video explanation.",
    motif: "qa",
    logo: "/assets/logos/islam200qa.png",
    links: [
      { type: "website", url: "https://islam200qa.ieasybooks.com" },
      { type: "android", url: "https://play.google.com/store/apps/details?id=com.easybooks.islam200qa" },
      { type: "huawei",  url: "https://appgallery.huawei.com/app/C115120279" },
      { type: "github",  url: "https://github.com/ieasybooks/islam200qa" },
    ],
    tutorials: [],
  },
];
