// Single source of truth for all projects on the ieasybooks landing page.
// To add a project: append an object to this array and push. Order matters —
// entries render top-to-bottom in the timeline, grouped by year.
//
// Field reference:
//   slug       - unique short name (used in DOM ids, logo filename)
//   year       - integer, used to group cards into year sections
//   date       - "YYYY-MM" (first commit), displayed as meta label
//   meta_ar    - Arabic meta label (e.g., "يوليو 2022 · أول مشروع")
//   meta_en    - English meta label (e.g., "July 2022 · First project")
//   name_ar    - Arabic project name (displayed prominently on both locales)
//   name_en    - Latin/English project name (displayed as secondary on ar, primary on en)
//   tagline_ar - Arabic one-line description
//   tagline_en - English one-line description
//   logo       - path to logo image, or null for typographic fallback
//   gradient   - "navy" | "burgundy"  (matches CSS gradient variable)
//   links      - array of { type, url } (primary links — website, app stores, main repo)
//   repositories - OPTIONAL array of { type, url } (for multi-repo projects like Tahweel)

export const projects = [
  {
    slug: "islam200qa",
    year: 2022,
    date: "2022-10",
    meta_ar: "أكتوبر 2022 · أول مشروع",
    meta_en: "October 2022 · First project",
    name_ar: "الإسلام في ٢٠٠ سؤال وجواب",
    name_en: "Islam 200 QA",
    tagline_ar: "تطبيق يقدّم كتاب \"أعلام السنة المنشورة\" للشيخ حافظ بن أحمد الحكمي بشرح الشيخ إبراهيم رفيق، في ٢٠٠ سؤال وجواب تُقرّب العقيدة الصحيحة بأسلوب مباشر وبسيط، مع إمكانية متابعة الشرح المرئي والمسموع.",
    tagline_en: "An app presenting the book 'A'lam al-Sunnah al-Manshurah' by Sheikh Hafiz al-Hakami with Sheikh Ibrahim Rafiq's commentary, in 200 Q&As that bring correct creed closer in a simple and direct style, with audio and video explanation.",
    logo: "/assets/logos/islam200qa.png",
    gradient: "burgundy",
    links: [
      { type: "website", url: "https://islam200qa.ieasybooks.com" },
      { type: "android", url: "https://play.google.com/store/apps/details?id=com.easybooks.islam200qa" },
      { type: "huawei",  url: "https://appgallery.huawei.com/app/C115120279" },
      { type: "github",  url: "https://github.com/ieasybooks/islam200qa" },
    ],
  },
  {
    slug: "taqtie",
    year: 2023,
    date: "2023-04",
    meta_ar: "أبريل 2023",
    meta_en: "April 2023",
    name_ar: "تقطيع",
    name_en: "Taqtie",
    tagline_ar: "أداة سطح مكتب لتسهيل معالجة المرئيات والصوتيات على الدعاة والعلماء. تسمح بتقطيع المواد الطويلة إلى أجزاء بناءً على فترات زمنية محددة، مع إمكانية دمج بادئة وخاتمة لكل جزء.",
    tagline_en: "A desktop tool to help scholars and preachers process audio and video. Split long recordings into segments based on time intervals, with the ability to merge an intro and outro into each segment.",
    logo: "/assets/logos/taqtie.png",
    gradient: "navy",
    links: [
      { type: "windows", url: "https://drive.google.com/file/d/1bz_f_dGW580Xj4QiVhBlcxYclniAa_1v/view" },
      { type: "macos",   url: "https://drive.google.com/file/d/1VHogV49kfRJntAv5cQ5oGRrotc4qXGzG/view" },
      { type: "github",  url: "https://github.com/ieasybooks/taqtie" },
    ],
  },
  {
    slug: "tafrigh",
    year: 2023,
    date: "2023-03",
    meta_ar: "مارس 2023",
    meta_en: "March 2023",
    name_ar: "تفريغ",
    name_en: "Tafrigh",
    tagline_ar: "أداة لتفريغ المواد المرئية والمسموعة إلى نصوص باستخدام تقنيات الذكاء الاصطناعي من OpenAI و wit.ai، مع دعم التحميل المباشر من YouTube وتوفير صيَغ مخرجات متعددة.",
    tagline_en: "A tool to transcribe audio and video to text using AI from OpenAI and wit.ai, with direct YouTube download support and multiple output formats.",
    logo: "/assets/logos/tafrigh.png",
    gradient: "navy",
    links: [
      { type: "website", url: "https://tafrigh.ieasybooks.com" },
      { type: "github",  url: "https://github.com/ieasybooks/tafrigh" },
    ],
  },
  {
    slug: "baheth",
    year: 2023,
    date: "2023-07",
    meta_ar: "يوليو 2023",
    meta_en: "July 2023",
    name_ar: "باحث",
    name_en: "Baheth",
    tagline_ar: "منصة تدمج تقنيات الذكاء الاصطناعي في العملية التعليمية الشرعية. توفِّر المنصة تفريغ دروس ومحاضرات العلماء والمشايخ مع إمكانية البحث فيها والبحث بالمعنى في الأحاديث النبوية والمكتبة الشاملة، لتكون بديلًا غير مُشتت يُيسّر الوصول إلى العلم الشرعي.",
    tagline_en: "A platform integrating AI into Islamic education. It provides transcriptions of scholars' lectures with the ability to search within them, plus semantic search across Prophetic hadiths and al-Maktaba al-Shamila — a focused, distraction-free way to access Islamic knowledge.",
    logo: "/assets/logos/baheth.png",
    gradient: "burgundy",
    links: [
      { type: "website", url: "https://baheth.ieasybooks.com" },
      { type: "android", url: "https://play.google.com/store/apps/details?id=com.ieasybooks.baheth" },
      { type: "ios",     url: "https://apps.apple.com/us/app/%D8%A8%D8%A7%D8%AD%D8%AB/id6451044688" },
      { type: "chrome",  url: "https://chromewebstore.google.com/detail/baheth-%D8%A8%D8%A7%D8%AD%D8%AB/ijdjnkiocmodojidknkpajajbpghhacl" },
      { type: "firefox", url: "https://addons.mozilla.org/en-GB/firefox/addon/baheth-%D8%A8%D8%A7%D8%AD%D8%AB/" },
    ],
  },
  {
    slug: "tahweel",
    year: 2024,
    date: "2024-10",
    meta_ar: "أكتوبر 2024",
    meta_en: "October 2024",
    name_ar: "تحويل",
    name_en: "Tahweel",
    tagline_ar: "أداة لتحويل ملفات PDF إلى DOCX و TXT باستخدام تقنيات التعرّف الضوئي على الحروف من Google، مع إمكانية تحويل ملف واحد أو مجلد كامل والحصول على مخرجات بنفس عدد صفحات الملف الأصلي.",
    tagline_en: "A tool to convert PDF files to DOCX and TXT using Google's OCR, with support for single files or entire folders and output that preserves the original page count.",
    logo: "/assets/logos/tahweel.png",
    gradient: "navy",
    links: [
      { type: "website", url: "https://tahweel.ieasybooks.com" },
      { type: "windows", url: "https://github.com/ieasybooks/tahweel-tauri/releases/latest" },
      { type: "macos",   url: "https://github.com/ieasybooks/tahweel-tauri/releases/latest" },
    ],
    repositories: [
      { type: "github_python",  url: "https://github.com/ieasybooks/tahweel" },
      { type: "github_ruby",    url: "https://github.com/ieasybooks/tahweel.rb" },
      { type: "github_tauri",   url: "https://github.com/ieasybooks/tahweel-tauri" },
      { type: "github_website", url: "https://github.com/ieasybooks/tahweel-website" },
    ],
  },
  {
    slug: "aljam3",
    year: 2025,
    date: "2025-07",
    meta_ar: "يوليو 2025",
    meta_en: "July 2025",
    name_ar: "الجامع",
    name_en: "Aljam3",
    tagline_ar: "مكتبة رقمية تضم أكثر من 63,500 كتاب و 37 مليون صفحة من أمهات الكتب الإسلامية، مع إمكانية البحث داخل محتوى الصفحات والتحميل بصيغ متعددة.",
    tagline_en: "A digital library with over 63,500 books and 37 million pages of classical Islamic texts, with full-text search inside pages and downloads in multiple formats.",
    logo: "/assets/logos/aljam3.png",
    gradient: "burgundy",
    links: [
      { type: "website", url: "https://aljam3.com" },
      { type: "android", url: "https://play.google.com/store/apps/details?id=com.ieasybooks.aljam3" },
      { type: "ios",     url: "https://apps.apple.com/uz/app/aljam3-library/id6749810366" },
      { type: "huawei",  url: "https://appgallery.huawei.com/app/C115078047" },
      { type: "github",  url: "https://github.com/ieasybooks/aljam3-web-app" },
    ],
  },
];
