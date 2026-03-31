// ─────────────────────────────────────────────────────────────────────────────
// Velaris — i18n key parity validator
// Run: npx tsx src/app/i18n/validate.ts
// Ensures en.ts, es.ts, and kr.ts have the exact same set of translation keys.
// ─────────────────────────────────────────────────────────────────────────────

import { en } from "./en";
import { es } from "./es";
import { kr } from "./kr";

type LocaleName = "en" | "es" | "kr";
const locales: Record<LocaleName, Record<string, string>> = { en, es, kr };

let hasErrors = false;

const allKeys = new Set<string>();
for (const dict of Object.values(locales)) {
    for (const key of Object.keys(dict)) {
        allKeys.add(key);
    }
}

const localeNames = Object.keys(locales) as LocaleName[];

// 1. Check for missing keys per locale
for (const name of localeNames) {
    const missing = [...allKeys].filter((k) => !(k in locales[name]));
    if (missing.length > 0) {
        hasErrors = true;
        console.error(`\n❌ ${name.toUpperCase()} is missing ${missing.length} key(s):`);
        for (const k of missing.sort()) {
            console.error(`   - "${k}"`);
        }
    }
}

// 2. Check for placeholder variable consistency ({var} patterns)
const varPattern = /\{(\w+)\}/g;

for (const key of [...allKeys].sort()) {
    const varsPerLocale: Record<string, string[]> = {};
    for (const name of localeNames) {
        const value = locales[name][key];
        if (!value) continue;
        const matches = [...value.matchAll(varPattern)].map((m) => m[1]).sort();
        varsPerLocale[name] = matches;
    }

    const reference = varsPerLocale["en"];
    if (!reference) continue;

    for (const name of localeNames) {
        if (name === "en") continue;
        const vars = varsPerLocale[name];
        if (!vars) continue;

        const refStr = reference.join(",");
        const varStr = vars.join(",");

        if (refStr !== varStr) {
            hasErrors = true;
            console.error(
                `\n⚠️  Variable mismatch in "${key}": EN={${refStr}} vs ${name.toUpperCase()}={${varStr}}`
            );
        }
    }
}

// 3. Summary
console.log("\n─── i18n Validation Summary ───");
console.log(`Total unique keys: ${allKeys.size}`);
for (const name of localeNames) {
    console.log(`  ${name.toUpperCase()}: ${Object.keys(locales[name]).length} keys`);
}

if (!hasErrors) {
    console.log("\n✅ All locales are in perfect sync. No missing keys or variable mismatches.\n");
    process.exit(0);
} else {
    console.error("\n❌ Validation failed. Fix the issues above.\n");
    process.exit(1);
}
