import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(projectRoot, 'src');
const webRoot = path.join(projectRoot, 'web');
const distRoot = path.join(projectRoot, 'dist');
const languageCodes = { zh: 'zh-CN', en: 'en', es: 'es' };

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const escapeHtml = (value) => String(value).replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]);
const escapeAttribute = (value) => escapeHtml(value).replace(/"/g, '&quot;');

function readBlocks(source, filename) {
  const blocks = [];
  for (const match of source.matchAll(/<template\b([^>]*)>([\s\S]*?)<\/template>/gi)) {
    const attributes = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)=["']([^"']*)["']/g)].map((attribute) => [attribute[1], attribute[2]]),
    );
    blocks.push({ attributes, content: match[2].trim() });
  }
  if (!blocks.length) throw new Error(`No <template> blocks found in ${filename}`);
  return blocks;
}

// 三种语言共存在一个源文件中；此函数在构建时选择指定语言。
function selectLanguageBlock(blocks, language, filename, component) {
  const block = blocks.find(({ attributes }) =>
    attributes['data-language'] === language
    && (!component || attributes['data-component'] === component));
  if (!block) throw new Error(`Missing ${component ? `${component}/` : ''}${language} block in ${filename}`);
  return block.content;
}

function parseFragment(fragment, filename) {
  const subjectMatch = fragment.match(/^\s*<!--\s*@subject\s+([\s\S]*?)\s*-->\s*/i);
  if (!subjectMatch) throw new Error(`Missing <!-- @subject ... --> in ${filename}`);
  return { subject: subjectMatch[1].trim(), content: fragment.slice(subjectMatch[0].length).trim() };
}

function compileCss(css, filename) {
  const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rootMatch = cleanCss.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootMatch) throw new Error(`Missing :root variables in ${filename}`);

  const variables = Object.fromEntries(
    [...rootMatch[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]),
  );
  const resolve = (value) => value.replace(/var\((--[\w-]+)\)/g, (match, name) => {
    if (!(name in variables)) throw new Error(`Unknown CSS variable ${name} in ${filename}`);
    return variables[name];
  });

  const classes = new Map();
  for (const match of cleanCss.matchAll(/\.([\w-]+)\s*\{([^}]+)\}/g)) {
    classes.set(match[1], resolve(match[2]).replace(/\s+/g, ' ').trim());
  }
  return { variables, classes };
}

function applySharedTheme(content, variables) {
  const replacements = new Map([
    ['#e6e6e6', variables['--email-canvas']],
    ['#f5f5f5', variables['--email-card']],
    ['#333333', variables['--email-text']],
    ['#80C41C', variables['--email-primary']],
    ['#77b739', variables['--email-primary-dark']],
    ['#6cc24a', variables['--email-divider']],
    ['#414141', variables['--email-footer']],
    ['#ffffff', variables['--email-footer-text']],
    ['#d3d3d3', variables['--email-footer-muted']],
    ['Roboto, sans-serif', variables['--font-body']],
    ['Arial, sans-serif', variables['--font-system']],
  ]);
  let result = content;
  for (const [from, to] of replacements) result = result.replaceAll(from, to);
  return result;
}

function hydrateAssets(html, assets) {
  const getAsset = (key) => {
    if (!(key in assets)) throw new Error(`Unknown asset key: ${key}`);
    return assets[key];
  };
  return html
    .replace(/\sdata-asset-(src|href)="([^"]+)"/g, (match, attribute, key) => ` ${attribute}="${escapeAttribute(getAsset(key))}"`)
    .replace(/<span\s+data-asset-text="([^"]+)"><\/span>/g, (match, key) => escapeHtml(getAsset(key)));
}

function inlineSharedCss(html, classes) {
  return html.replace(/<([A-Za-z][\w:-]*)\b([^<>]*)>/g, (tag, name, attributes) => {
    const classMatch = attributes.match(/\sclass="([^"]+)"/);
    if (!classMatch) return tag;

    const declarations = classMatch[1].split(/\s+/).filter(Boolean).map((className) => {
      if (!classes.has(className)) throw new Error(`Unknown shared CSS class: ${className}`);
      return classes.get(className);
    });
    let updatedAttributes = attributes.replace(classMatch[0], '');
    const selfClosing = /\/\s*$/.test(updatedAttributes);
    if (selfClosing) updatedAttributes = updatedAttributes.replace(/\/\s*$/, '');
    const styleMatch = updatedAttributes.match(/\sstyle="([^"]*)"/);
    const sharedStyle = declarations.join(' ');
    if (styleMatch) {
      updatedAttributes = updatedAttributes.replace(styleMatch[0], ` style="${sharedStyle} ${styleMatch[1]}"`);
    } else {
      updatedAttributes += ` style="${sharedStyle}"`;
    }
    return `<${name}${updatedAttributes}${selfClosing ? ' /' : ''}>`;
  });
}

function renderLayout(layout, values) {
  const replacements = new Map([
    ['__LANG__', values.languageCode],
    ['__SUBJECT__', escapeHtml(values.subject)],
    ['__EMAIL_WIDTH__', values.emailWidth],
    ['<!-- @slot:content -->', values.content],
    ['<!-- @slot:app-promo -->', values.appPromo],
    ['<!-- @slot:footer -->', values.footer],
  ]);
  let html = layout;
  for (const [marker, value] of replacements) html = html.replace(marker, value);
  return html;
}

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else fs.copyFileSync(from, to);
  }
}

export function build() {
  const sharedRoot = path.join(sourceRoot, 'shared');
  const catalog = readJson(path.join(sourceRoot, 'template-catalog.json'));
  const assets = readJson(path.join(sharedRoot, 'assets.json'));
  const layout = fs.readFileSync(path.join(sharedRoot, 'layout.html'), 'utf8');
  const componentsFile = path.join(sharedRoot, 'components.html');
  const componentBlocks = readBlocks(fs.readFileSync(componentsFile, 'utf8'), componentsFile);
  const cssFile = path.join(sharedRoot, 'email.css');
  const sharedCss = compileCss(fs.readFileSync(cssFile, 'utf8'), cssFile);

  fs.rmSync(distRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(distRoot, 'templates'), { recursive: true });
  copyDirectory(webRoot, distRoot);
  copyDirectory(path.join(sourceRoot, 'assets'), path.join(distRoot, 'assets'));

  const outputTemplates = [];
  for (const template of catalog.templates) {
    const sourceFile = path.join(sourceRoot, 'templates', template.id, 'template.html');
    const languageBlocks = readBlocks(fs.readFileSync(sourceFile, 'utf8'), sourceFile);
    const subjects = {};
    const variables = {};

    for (const language of template.languages) {
      const fragment = parseFragment(selectLanguageBlock(languageBlocks, language, sourceFile), sourceFile);
      const appPromo = selectLanguageBlock(componentBlocks, language, componentsFile, 'app-promo');
      const footer = selectLanguageBlock(componentBlocks, language, componentsFile, 'footer');
      const composed = renderLayout(layout, {
        languageCode: languageCodes[language],
        subject: fragment.subject,
        emailWidth: sharedCss.variables['--email-width'].replace(/px$/i, ''),
        content: fragment.content,
        appPromo,
        footer,
      });
      const html = inlineSharedCss(
        applySharedTheme(hydrateAssets(composed, assets), sharedCss.variables),
        sharedCss.classes,
      );

      const outputDirectory = path.join(distRoot, 'templates', template.id);
      fs.mkdirSync(outputDirectory, { recursive: true });
      fs.writeFileSync(path.join(outputDirectory, `${language}.html`), `${html.trim()}\n`);
      subjects[language] = fragment.subject;
      variables[language] = [...new Set([...html.matchAll(/\$\{([^}]+)\}/g)].map((match) => match[1]))];
    }
    outputTemplates.push({ ...template, subjects, variables });
  }

  const manifest = { generatedAt: new Date().toISOString(), groups: catalog.groups, templates: outputTemplates };
  fs.writeFileSync(path.join(distRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Built ${outputTemplates.length} templates / ${outputTemplates.length * 3} HTML files into dist/`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) build();
