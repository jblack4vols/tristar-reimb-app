import path from 'node:path';
import { repoRoot, verifyRedirectDist } from './publish-redirect.mjs';

const dist = path.resolve(process.argv[2] || path.join(repoRoot, 'dist'));

try {
  verifyRedirectDist(dist);
  process.stdout.write(`Confirmed ${dist} is the retirement redirect\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
