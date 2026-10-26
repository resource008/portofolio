/**
 * Sanitasi HTML dari editor konten proyek sebelum dirender dengan
 * `dangerouslySetInnerHTML`. Memakai allowlist: hanya tag format teks yang
 * dihasilkan editor yang dipertahankan, semua atribut dibuang kecuali `href`
 * yang aman pada tautan.
 */

const ALLOWED_TAGS = new Set([
  "A", "B", "BR", "DIV", "EM", "H1", "H2", "H3", "I", "LI", "OL", "P", "S",
  "SPAN", "STRIKE", "STRONG", "U", "UL",
]);

/** Tag yang isinya ikut dibuang (bukan sekadar dibuka bungkusnya). */
const DROP_WITH_CONTENT = new Set([
  "SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "NOSCRIPT", "SVG", "MATH",
]);

const SAFE_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

/**
 * Kembalikan URL bila aman dipakai sebagai `href`, selain itu `undefined`.
 * Menolak skema berbahaya seperti `javascript:` dan `data:`, termasuk yang
 * disamarkan dengan spasi/karakter kontrol (`java\tscript:`).
 */
export function safeHref(url: string | null | undefined): string | undefined {
  const value = (url ?? "").trim();
  if (!value) return undefined;
  // eslint-disable-next-line no-control-regex
  const normalized = value.replace(/[\u0000- \u007f]/g, "").toLowerCase();
  const scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/)?.[1];
  if (scheme && !SAFE_SCHEMES.has(scheme)) return undefined;
  return value;
}

function cleanNode(node: Node): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }

    const el = child as Element;
    const tag = el.tagName.toUpperCase();

    if (DROP_WITH_CONTENT.has(tag)) {
      el.remove();
      continue;
    }

    cleanNode(el);

    if (!ALLOWED_TAGS.has(tag)) {
      // Buka bungkus tag yang tidak dikenal, pertahankan teksnya.
      el.replaceWith(...Array.from(el.childNodes));
      continue;
    }

    const href = tag === "A" ? safeHref(el.getAttribute("href")) : undefined;
    for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
    if (tag === "A" && href) {
      el.setAttribute("href", href);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  }
}

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  cleanNode(doc.body);
  return doc.body.innerHTML;
}
