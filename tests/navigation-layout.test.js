const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "assets", "js", "app.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "assets", "css", "styles.css"), "utf8");
const pages = fs.readdirSync(root).filter((name) => (
  name.endsWith(".html") &&
  !["dashboard.html", "index.html"].includes(name)
));

assert.match(app, /id="topbarNav"/);
assert.match(app, /class="topbar-nav"/);
assert.match(app, /topbar-menu-toggle/);
assert.match(app, /aria-expanded/);
assert.match(app, /nav\.hidden = true/);
assert.match(app, /storage-notice/);
assert.doesNotMatch(app, /Exportar base/);
assert.doesNotMatch(app, /Importar base/);

assert.match(styles, /\.app-shell\s*\{[\s\S]*display: block;/);
assert.match(styles, /\.topbar\s*\{[\s\S]*position: sticky;/);
assert.match(styles, /\.topbar-nav/);
assert.match(styles, /\.topbar-menu-toggle/);
assert.match(styles, /\.sidebar\s*\{[\s\S]*display: none;/);
assert.match(styles, /\.content\s*\{[\s\S]*width: 100%;/);
assert.match(styles, /@media \(max-width: 820px\)/);
assert.match(styles, /\.topbar-nav\.is-open/);
assert.match(styles, /\.storage-notice summary::after/);

pages.forEach((page) => {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  if (html.includes('data-page="login"')) return;
  assert.match(html, /<header id="appHeader" class="topbar"><\/header>/, page);
  assert.match(html, /<main class="content/, page);
});

console.log("Testes da navegacao horizontal OK");
