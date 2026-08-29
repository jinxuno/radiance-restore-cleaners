/**
 * Accessibility + layout gate. Run against a local server before committing.
 *
 *   npx serve -l 8888 .          (or: python3 -m http.server 8888)
 *   npm i -D playwright axe-core
 *   node tools/audit.js
 *
 * Fails on any WCAG 2.1 A/AA violation, any horizontal overflow at phone widths,
 * any broken image, or a mobile menu that will not open.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8888;
const SITE = path.join(__dirname, '..');
const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

(async () => {
  const files = fs.readdirSync(SITE).filter(f => f.endsWith('.html'));
  const browser = await chromium.launch();
  const problems = [];

  // reducedMotion stops axe from reading colours mid-fade and inventing contrast failures
  const pg = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  for (const f of files) {
    await pg.goto(`http://localhost:${PORT}/${f}`, { waitUntil: 'load' });
    await pg.waitForTimeout(120);
    await pg.addScriptTag({ content: axe });
    const r = await pg.evaluate(async () =>
      await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }));
    for (const v of r.violations) problems.push(`${f}: ${v.id} (${v.nodes.length}) — ${v.nodes[0].html.slice(0, 80)}`);

    const layout = await pg.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
    }));
    if (layout.overflow) problems.push(`${f}: page scrolls sideways at 390px`);
    for (const b of layout.broken) problems.push(`${f}: broken image ${b}`);

    const menu = await pg.evaluate(async () => {
      const t = document.querySelector('.nav-toggle,#navToggle,[aria-controls]');
      if (!t) return 'no toggle found';
      t.click();
      await new Promise(r => setTimeout(r, 320));
      const id = t.getAttribute('aria-controls');
      const panel = id ? document.getElementById(id) : null;
      const open = panel ? panel.getBoundingClientRect().height > 40 : t.getAttribute('aria-expanded') === 'true';
      return open ? null : 'menu did not open';
    });
    if (menu) problems.push(`${f}: mobile ${menu}`);
  }
  await browser.close();

  console.log(`audited ${files.length} pages`);
  if (problems.length) {
    console.log(`\n${problems.length} problem(s):`);
    problems.forEach(p => console.log('  -', p));
    process.exit(1);
  }
  console.log('all clear');
})();
