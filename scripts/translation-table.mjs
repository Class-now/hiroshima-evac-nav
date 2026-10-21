// Prints a Markdown table of all UI strings for translation review.
// Usage: node scripts/translation-table.mjs > review.md
const { STRINGS, LANGS } = await import("../js/i18n.js");
const codes = LANGS.map((l) => l.code);
const keys = Object.keys(STRINGS.en);
const cell = (v) => (Array.isArray(v) ? v.join(" / ") : String(v ?? "")).replace(/\|/g, "\\|");
console.log(`| key | ${LANGS.map((l) => l.label).join(" | ")} |`);
console.log(`|---|${codes.map(() => "---").join("|")}|`);
for (const k of keys) console.log(`| ${k} | ${codes.map((c) => cell(STRINGS[c][k])).join(" | ")} |`);
