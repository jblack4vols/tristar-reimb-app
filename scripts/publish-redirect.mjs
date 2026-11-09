import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(SCRIPT_DIR, '..');

const DESTINATION = 'https://tristar-reimbursement.vercel.app';
const ALLOWED_FILES = ['404.html', 'CNAME', 'index.html', 'sw.js'];

// Vite treats the repository root index.html as the app entry and emits that
// page, plus hashed bundles, into dist/. GitHub Pages publishes dist/ as the
// site, so a static file dropped beside the app would lose: the built page
// would still mount the calculator. This script replaces dist/ entirely.
export function publishRedirectSite({ root = repoRoot, dist = path.join(root, 'dist') } = {}) {
  const resolvedRoot = path.resolve(root);
  const resolvedDist = path.resolve(dist);
  if (resolvedDist === resolvedRoot || resolvedDist === path.parse(resolvedDist).root) {
    throw new Error(`Refusing to replace ${resolvedDist}`);
  }

  const html = fs.readFileSync(path.join(resolvedRoot, 'redirect', 'index.html'));
  const sw = fs.readFileSync(path.join(resolvedRoot, 'redirect', 'sw.js'));
  const cname = fs.readFileSync(path.join(resolvedRoot, 'public', 'CNAME'));

  fs.rmSync(resolvedDist, { recursive: true, force: true });
  fs.mkdirSync(resolvedDist, { recursive: true });
  fs.writeFileSync(path.join(resolvedDist, 'index.html'), html);
  fs.writeFileSync(path.join(resolvedDist, '404.html'), html);
  fs.writeFileSync(path.join(resolvedDist, 'CNAME'), cname);
  fs.writeFileSync(path.join(resolvedDist, 'sw.js'), sw);

  verifyRedirectDist(resolvedDist);
  return resolvedDist;
}

export function verifyRedirectDist(dist) {
  const resolvedDist = path.resolve(dist);
  const index = fs.readFileSync(path.join(resolvedDist, 'index.html'), 'utf8');
  const notFound = fs.readFileSync(path.join(resolvedDist, '404.html'), 'utf8');
  const cname = fs.readFileSync(path.join(resolvedDist, 'CNAME'), 'utf8').trim();
  const sw = fs.readFileSync(path.join(resolvedDist, 'sw.js'), 'utf8');
  const names = fs.readdirSync(resolvedDist).sort();
  const problems = [];

  if (notFound !== index) problems.push('404.html does not match index.html');
  if (!index.includes(`content="5; url=${DESTINATION}"`)) {
    problems.push('missing 5-second meta refresh to the live calculator');
  }
  if (!index.includes(`<link rel="canonical" href="${DESTINATION}">`)) {
    problems.push('missing canonical link');
  }
  if (!index.includes(`<a href="${DESTINATION}">`)) {
    problems.push('missing a clickable link to the live calculator');
  }
  if (/<script\b/i.test(index) || index.includes('id="root"') || index.includes('src/index.jsx') || index.includes('/assets/')) {
    problems.push('page still references the Vite calculator');
  }
  if (index.toLowerCase().includes('after phi data export')) {
    problems.push('page still says to wait for a PHI export');
  }
  if (!/nov 9, 2026/i.test(index) || !/waived exporting/i.test(index)) {
    problems.push('page is missing the Nov 9, 2026 PHI-export waiver');
  }
  if (cname !== 'rcalc.tristarpt.com') problems.push(`CNAME is ${JSON.stringify(cname)}`);
  if (names.includes('assets')) problems.push('dist/assets is still present');
  if (names.join(',') !== ALLOWED_FILES.join(',')) {
    problems.push(`dist files are ${names.join(', ') || '(empty)'}`);
  }
  if (!sw.includes('caches.delete') || !sw.includes('unregister')) {
    problems.push('service worker does not clear the installed calculator');
  }
  if (sw.includes('respondWith') || sw.includes('APP_SHELL')) {
    problems.push('service worker can still serve the cached calculator');
  }

  if (problems.length > 0) {
    throw new Error(`Retirement redirect check failed:\n- ${problems.join('\n- ')}`);
  }
}

const isDirect = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  try {
    const dist = publishRedirectSite();
    process.stdout.write(`Published retirement redirect to ${dist}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
