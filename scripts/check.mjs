import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
build();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'dist', 'manifest.json'), 'utf8'));
const issues = [];
const sourceRoot = path.join(root, 'src');
const indexHtml = fs.readFileSync(path.join(root, 'web', 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'web', 'app.js'), 'utf8');
const componentsHtml = fs.readFileSync(path.join(sourceRoot, 'shared', 'components.html'), 'utf8');
const sharedCss = fs.readFileSync(path.join(sourceRoot, 'shared', 'email.css'), 'utf8');
const indexIds = new Set([...indexHtml.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
const referencedIds = new Set([...appJs.matchAll(/\$\('#([A-Za-z][\w:-]*)[^']*'\)/g)].map((match) => match[1]));

for (const id of referencedIds) if (!indexIds.has(id)) issues.push(`web/app.js references missing #${id}`);
for (const template of manifest.templates) if (!template.groups.length) issues.push(`${template.id}: not assigned to any export use case`);
if (/\sstyle=/.test(componentsHtml)) issues.push('shared/components.html contains inline CSS');
if (!/:root\s*\{/.test(sharedCss)) issues.push('shared/email.css is missing :root design variables');

for (const template of manifest.templates) {
  const sourceFile = path.join(sourceRoot, 'templates', template.id, 'template.html');
  if (!fs.existsSync(sourceFile)) {
    issues.push(`${template.id}: missing single template.html source`);
    continue;
  }
  const source = fs.readFileSync(sourceFile, 'utf8');
  const languages = [...source.matchAll(/<template\s+data-language="(zh|en|es)">/g)].map((match) => match[1]);
  if (languages.join(',') !== 'zh,en,es') issues.push(`${template.id}: language blocks must be zh, en, es in one template.html`);
  for (const language of template.languages) {
    if (fs.existsSync(path.join(sourceRoot, 'templates', template.id, `${language}.html`))) {
      issues.push(`${template.id}: obsolete ${language}.html source still exists`);
    }
  }
}

for (const template of manifest.templates) {
  const variableSets = [];
  for (const language of template.languages) {
    const file = path.join(root, 'dist', 'templates', template.id, `${language}.html`);
    const html = fs.readFileSync(file, 'utf8');
    if (!html.trimStart().toLowerCase().startsWith('<!doctype html>')) issues.push(`${template.id}/${language}: missing doctype`);
    if (!html.includes(`<html lang="${language === 'zh' ? 'zh-CN' : language}">`)) issues.push(`${template.id}/${language}: incorrect lang`);
    if (!/<title>[^<]+<\/title>/i.test(html)) issues.push(`${template.id}/${language}: missing subject`);
    if (!html.includes('role="presentation"')) issues.push(`${template.id}/${language}: missing email table role`);
    if (/\{\{[\w.]+\}\}/.test(html)) issues.push(`${template.id}/${language}: unresolved shared token`);
    if (/class=|data-asset-|__[A-Z_]+__|@slot:|var\(--/.test(html)) issues.push(`${template.id}/${language}: unresolved build source markup`);
    if (/<img[^>]*\/\s+style=/.test(html)) issues.push(`${template.id}/${language}: malformed self-closing image`);
    if (!html.includes('${')) issues.push(`${template.id}/${language}: no business variables found`);
    variableSets.push(JSON.stringify([...template.variables[language]].sort()));
  }
  if (!variableSets.every((set) => set === variableSets[0])) issues.push(`${template.id}: variables differ across languages`);
}

if (issues.length) {
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checks passed: ${manifest.templates.length} templates, ${manifest.templates.length * 3} HTML files, shared variables consistent.`);
}
