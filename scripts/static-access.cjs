const path = require('node:path');

/** Allow only public browser assets; never expose repository metadata, source secrets or symlinks. */
function staticPath(root, rawPath, publicDirs) {
  try {
    const decoded = decodeURIComponent(rawPath);
    if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\') ||
        decoded.includes('\0') || decoded.includes('%')) return null;
    const parts = decoded.split('/').filter(Boolean);
    if (parts.some(p => p === '.' || p === '..' || p.startsWith('.'))) return null;
    const publicFile = parts.length === 1 && parts[0] === 'index.html';
    const publicDir = parts.length >= 1 && publicDirs.some(dir =>
      parts.length >= dir.length && parts.slice(0, dir.length).join('/') === dir.join('/'));
    if (!publicFile && !publicDir) return null;
    const target = path.resolve(root, '.' + decoded);
    return target.startsWith(root + path.sep) ? target : null;
  } catch { return null; }
}
function inside(root, realPath) {
  return realPath.startsWith(root + path.sep);
}
module.exports = { staticPath, inside };
