import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { STRINGS, LANGS } from "../js/i18n.js";

const codes = LANGS.map((l) => l.code);
const allKeys = [...new Set(codes.flatMap((c) => Object.keys(STRINGS[c])))].sort();
const placeholders = (v) => [...String(v).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("4 言語がそろっている", () => {
  assert.deepEqual(codes, ["ja-easy", "en", "zh", "ko"]);
  for (const c of codes) assert.ok(STRINGS[c], c);
});

for (const c of codes) {
  test(`${c}: 全キーがあり、空でない`, () => {
    const missing = allKeys.filter((k) => !(k in STRINGS[c]));
    assert.deepEqual(missing, [], `${c} に無いキー`);
    for (const k of allKeys) {
      const v = STRINGS[c][k];
      if (Array.isArray(v)) {
        assert.equal(v.length, STRINGS.en[k].length, `${c}.${k} の要素数`);
        v.forEach((x, i) => assert.ok(String(x).trim(), `${c}.${k}[${i}] が空`));
      } else assert.ok(String(v).trim(), `${c}.${k} が空`);
    }
  });

  test(`${c}: {変数} が英語版と同じ`, () => {
    for (const k of allKeys) {
      if (typeof STRINGS.en[k] !== "string") continue;
      assert.deepEqual(placeholders(STRINGS[c][k]), placeholders(STRINGS.en[k]), `${c}.${k}`);
    }
  });
}

test("コードで使っているキーが辞書にある", () => {
  const src = ["index.html", ...readdirSync(new URL("../js/", import.meta.url)).filter((f) => f.endsWith(".js")).map((f) => "js/" + f)]
    .map((f) => readFileSync(new URL("../" + f, import.meta.url), "utf8"))
    .join("\n");
  const used = new Set();
  for (const m of src.matchAll(/data-i18n(?:-[a-z]+)?="(\w+)"/g)) used.add(m[1]);
  for (const m of src.matchAll(/\bt\(\s*"(\w+)"\s*[,)]/g)) used.add(m[1]);
  const missing = [...used].filter((k) => !(k in STRINGS.en));
  assert.deepEqual(missing, []);
});
