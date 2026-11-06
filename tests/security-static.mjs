import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { staticPath, inside } = require('../scripts/static-access.cjs');
const root = path.resolve('/tmp/guide-security-fixture');
const dirs = [['src'], ['assets'], ['hub', 'companion']];
assert.equal(staticPath(root, '/index.html', dirs), path.join(root, 'index.html'));
assert.equal(staticPath(root, '/v/test/src/app.js', dirs), null); // server strips /v/ first
assert.equal(staticPath(root, '/src/app.js', dirs), path.join(root, 'src/app.js'));
assert.equal(staticPath(root, '/hub/companion/index.html', dirs), path.join(root, 'hub/companion/index.html'));
for (const blocked of ['/server.js', '/android/signing-public.pem', '/.git/config', '/%2e%67it/HEAD',
  '/src/%2e%2e/server.js', '/assets/%2e%2e/.git/config', '/src/%252e%252e/secret',
  '/src/\\..\\.git', '/src/%00secret.js', '//other-host/src/app.js', '/hub/hub-server.js']) {
  assert.equal(staticPath(root, blocked, dirs), null, `should reject ${blocked}`);
}
assert.equal(inside(root, path.join(root, 'assets', 'icon.webp')), true);
assert.equal(inside(root, root + '-other/secret'), false);
console.log('Static server path boundaries OK');
