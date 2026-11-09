import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { publishRedirectSite } from '../../scripts/publish-redirect.mjs';

const DESTINATION = 'https://tristar-reimbursement.vercel.app';

describe('retirement redirect site', () => {
  it('replaces a Vite bundle with a no-JS move notice and keeps the custom domain', () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'rcalc-redirect-'));
    fs.mkdirSync(path.join(dist, 'assets'));
    fs.writeFileSync(path.join(dist, 'assets', 'index-abc123.js'), 'createRoot');
    fs.writeFileSync(
      path.join(dist, 'index.html'),
      '<div id="root"></div><script type="module" src="/assets/index-abc123.js"></script>',
    );

    publishRedirectSite({ dist });

    const names = fs.readdirSync(dist).sort();
    expect(names).toEqual(['404.html', 'CNAME', 'index.html', 'sw.js']);
    expect(fs.existsSync(path.join(dist, 'assets'))).toBe(false);

    const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
    expect(fs.readFileSync(path.join(dist, '404.html'), 'utf8')).toBe(html);
    expect(fs.readFileSync(path.join(dist, 'CNAME'), 'utf8').trim()).toBe('rcalc.tristarpt.com');

    const document = new JSDOM(html).window.document;
    expect(document.querySelector('meta[http-equiv="refresh"]').getAttribute('content'))
      .toBe(`5; url=${DESTINATION}`);
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(DESTINATION);
    const link = document.querySelector('a');
    expect(link.getAttribute('href')).toBe(DESTINATION);
    expect(link.textContent).toBe('Tristar Reimbursement Calculator');
    expect(document.body.textContent).toContain('This calculator has moved');
    expect(document.body.textContent).toContain('Microsoft 365 sign-in');
    expect(document.body.textContent).toContain('Redirecting in 5 seconds');
    expect(document.querySelector('script')).toBeNull();
    expect(document.getElementById('root')).toBeNull();
    expect(html).toContain('Nov 9, 2026');
    expect(html.toLowerCase()).toContain('waived exporting');
    expect(html.toLowerCase()).not.toContain('after phi data export');

    const sw = fs.readFileSync(path.join(dist, 'sw.js'), 'utf8');
    expect(sw).toContain('caches.delete');
    expect(sw).toContain('unregister');
    expect(sw).not.toContain('respondWith');
    expect(sw).not.toContain('APP_SHELL');
  });
});
