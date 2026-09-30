/**
 * Static Verifier: Checks that every getElementById('id') call in JS files
 * has a corresponding id="id" in index.html.
 */
const fs = require('fs');
const path = require('path');

const HTML_FILES = ['index.html', 'dashboard.html', 'slots.html', 'reservations.html', 'map.html', 'analytics.html', 'auth.html'];
const JS_FILES = ['app.js','analytics.js','simulation.js','storage.js','booking-logic.js','reservation-logic.js','map.js','geolocation.js'];

// Extract all id="..." from all HTML files
const htmlIds = new Set();
const fileIdMap = new Map();
const htmlIdRegex = /\bid="([^"]+)"/g;

HTML_FILES.forEach(file => {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = htmlIdRegex.exec(content)) !== null) {
    htmlIds.add(m[1]);
    if (!fileIdMap.has(m[1])) fileIdMap.set(m[1], []);
    fileIdMap.get(m[1]).push(file);
  }
});
console.log(`HTML IDs found across ${HTML_FILES.length} pages: ${htmlIds.size}`);

// Extract all getElementById('...') from JS
const jsRefs = new Map(); // id -> [file:line]
const jsIdRegex = /getElementById\(['"`]([^'"`]+)['"`]\)/g;
JS_FILES.forEach(file => {
  if (!fs.existsSync(file)) return;
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, idx) => {
    let jm;
    while ((jm = jsIdRegex.exec(line)) !== null) {
      const id = jm[1];
      if (!jsRefs.has(id)) jsRefs.set(id, []);
      jsRefs.get(id).push(`${file}:${idx + 1}`);
    }
    jsIdRegex.lastIndex = 0; // reset for per-line scan
  });
});

console.log(`\nJS getElementById references: ${jsRefs.size} unique IDs\n`);

let errors = 0;
let ok = 0;
for (const [id, refs] of jsRefs) {
  if (!htmlIds.has(id)) {
    console.log(`  ✗ MISSING in HTML: "${id}" (referenced in ${refs[0]})`);
    errors++;
  } else {
    ok++;
  }
}

console.log(`\n✓ ${ok} IDs found in HTML`);
if (errors > 0) {
  console.log(`✗ ${errors} IDs MISSING from HTML — these elements will silently return null`);
} else {
  console.log('✓ ALL getElementById references have matching HTML elements!');
}
