import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
};

build();
let timer;
const watchedPaths = new Set();

function collectWatchPaths(directory, paths = new Set()) {
  if (!fs.existsSync(directory)) return paths;
  paths.add(directory);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collectWatchPaths(target, paths);
    else paths.add(target);
  }
  return paths;
}

function syncWatchPaths() {
  const nextPaths = new Set();
  for (const directory of [path.join(root, 'src'), path.join(root, 'web')]) collectWatchPaths(directory, nextPaths);
  for (const watchedPath of watchedPaths) {
    if (!nextPaths.has(watchedPath)) {
      fs.unwatchFile(watchedPath);
      watchedPaths.delete(watchedPath);
    }
  }
  for (const watchedPath of nextPaths) {
    if (watchedPaths.has(watchedPath)) continue;
    watchedPaths.add(watchedPath);
    fs.watchFile(watchedPath, { interval: 500 }, () => {
      syncWatchPaths();
      clearTimeout(timer);
      timer = setTimeout(() => {
        try { build(); console.log('Rebuilt after file change. Refresh the browser to view it.'); }
        catch (error) { console.error(error.message); }
      }, 120);
    });
  }
}
syncWatchPaths();

http.createServer((request, response) => {
  const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const safePath = requested === '/' ? '/index.html' : requested;
  const file = path.resolve(dist, `.${safePath}`);
  if (!file.startsWith(dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    response.writeHead(404); response.end('Not found'); return;
  }
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(response);
}).listen(4173, '127.0.0.1', () => console.log('Email Template Studio: http://127.0.0.1:4173'));
