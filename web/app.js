import { createZip } from './zip.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const state = {
  locale: localStorage.getItem('inox-studio-locale') || (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'),
  manifest: { groups: [], templates: [] }, filterGroup: 'all', query: '', selected: new Set(),
  previewId: null, previewLanguage: 'zh', sampleData: true, viewport: 'desktop', cache: new Map(), exportLanguages: new Set(['zh', 'en', 'es']),
};
const previewLanguages = new Set(['zh', 'en', 'es']);
let lastAppliedRoute = null;

const messages = {
  zh: {
    purposes: '用途分类', templates: '模板', selectVisible: '选择当前', clear: '清除', gitManaged: '由 Git 源码生成',
    exportTitle: '批量导出', exportDescription: '选择用途、模板和语言，下载可直接二次编辑的原始 HTML。', templatesSelected: '个模板已选择',
    exportLanguages: '导出语言', selectionTools: '选择工具', selectAll: '全选 30 套模板', selectGroup: '选择当前用途', clearAll: '全部清除',
    sourceFiles: '导出源文件', sourceNote: '不包含 Sample Data，保留全部 ${variables}。', downloadZip: '下载 ZIP',
    zipStructure: 'ZIP 按“模板 ID / 语言”组织，方便二次编辑与系统部署。', copyHtml: '复制 HTML', openPreview: '新窗口预览', sampleData: '示例数据',
    allPurposes: '全部用途', noMatches: '没有匹配的模板', searchPlaceholder: '搜索模板、ID 或场景', copied: 'HTML 已复制',
    chooseTemplate: '请至少选择一个模板', chooseLanguage: '请至少选择一种导出语言', preparing: '正在准备 ZIP…', downloaded: 'ZIP 已生成', files: '个文件',
  },
  en: {
    purposes: 'Use cases', templates: 'Templates', selectVisible: 'Select visible', clear: 'Clear', gitManaged: 'Generated from Git source',
    exportTitle: 'Batch export', exportDescription: 'Choose use cases, templates, and languages to download editable source HTML.', templatesSelected: 'templates selected',
    exportLanguages: 'Export languages', selectionTools: 'Selection tools', selectAll: 'Select all 30 templates', selectGroup: 'Select current use case', clearAll: 'Clear all',
    sourceFiles: 'Source HTML export', sourceNote: 'No sample data. All ${variables} remain intact.', downloadZip: 'Download ZIP',
    zipStructure: 'The ZIP is organized by template ID and language for easy editing and deployment.', copyHtml: 'Copy HTML', openPreview: 'Open preview', sampleData: 'Sample data',
    allPurposes: 'All use cases', noMatches: 'No matching templates', searchPlaceholder: 'Search templates, IDs, or scenarios', copied: 'HTML copied',
    chooseTemplate: 'Select at least one template', chooseLanguage: 'Select at least one export language', preparing: 'Preparing ZIP…', downloaded: 'ZIP created', files: 'files',
  },
};
const t = (key) => messages[state.locale][key] || key;
const sampleValues = {
  userName: 'Alex Chen', inviterName: 'Morgan Lee', contactName: 'Jordan Kim', email: 'morgan@example.com', propertyName: 'Harbor Point',
  unitName: 'Unit 1208', deviceName: 'Main Entrance', deviceID: 'INOX-A7C92', password: '4862', code: '825914', ekey: 'RFID E-key',
  startTime: 'May 15, 2026 · 9:00 AM', endTime: 'May 22, 2026 · 6:00 PM', time: 'May 15, 2026 · 3:42 PM',
  link: 'https://inoxsmart.com/register', cardID: 'RFID-2048-91', cardName: 'Lobby Card', cardOwner: 'Taylor Smith', lostTime: 'May 22, 2026 · 6:00 PM',
  plan_name: 'INOX Smart Pro', effective_date: 'June 15, 2026', requester_name: 'Alex Chen', requester_email: 'alex@example.com',
  manager_name: 'Morgan Lee', manager_email: 'morgan@example.com', contact_name: 'Jordan Kim', contact_email: 'billing@example.com',
};
const templateSampleValues = {
  MAIL_0093089911: { unitName: 'Unit 1208, Unit 1003' },
  MAIL_5310808349: { unitName: 'Unit 1208, Unit 1003' },
};
const sampleAuthorizedUnits = [
  { unitName: 'Unit 1208', devices: ['Main Door', 'Rear Door'] },
  { unitName: 'Unit 1004', devices: ['Front Door'] },
];
const escapeHtml = (value = '') => String(value).replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
const templateName = (template) => template.name[state.locale] || template.name.en;
const templateScenario = (template) => template.scenario[state.locale] || template.scenario.en;
const groupName = (group) => group[state.locale] || group.en;

function readPreviewRoute() {
  const match = location.hash.match(/^#\/group\/([^/]+)\/template\/([^/]+)(?:\/(zh|en|es))?\/?$/i);
  const legacyMatch = location.hash.match(/^#\/template\/([^/]+)(?:\/(zh|en|es))?\/?$/i);
  if (!match && !legacyMatch) return null;
  try {
    return match
      ? { groupId: decodeURIComponent(match[1]), templateId: decodeURIComponent(match[2]), language: (match[3] || 'zh').toLowerCase() }
      : { groupId: null, templateId: decodeURIComponent(legacyMatch[1]), language: (legacyMatch[2] || 'zh').toLowerCase() };
  } catch {
    return null;
  }
}

function previewRouteHash(groupId, templateId, language) {
  return `#/group/${encodeURIComponent(groupId)}/template/${encodeURIComponent(templateId)}/${language}`;
}

function knownGroup(groupId) {
  return groupId === 'all' || state.manifest.groups.some((group) => group.id === groupId);
}

function resolvePreviewRoute(route) {
  const fallbackTemplate = state.manifest.templates[0];
  if (!route) return { groupId: 'all', template: fallbackTemplate, language: 'zh' };

  let groupId = knownGroup(route.groupId) ? route.groupId : null;
  let template = state.manifest.templates.find((item) => item.id === route.templateId);
  if (groupId && groupId !== 'all' && (!template || !template.groups.includes(groupId))) {
    template = groupMembers(groupId)[0] || template;
  }
  template ||= fallbackTemplate;
  if (groupId && groupId !== 'all' && !template.groups.includes(groupId)) groupId = null;
  if (!groupId) groupId = template.groups[0] || 'all';
  const language = previewLanguages.has(route.language) && template.languages.includes(route.language) ? route.language : template.languages[0];
  return { groupId, template, language };
}

function syncPreviewLanguageTabs() {
  $$('#languageTabs button').forEach((button) => {
    const active = button.dataset.language === state.previewLanguage;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function navigatePreview(templateId, language = state.previewLanguage, { groupId = state.filterGroup, replace = false } = {}) {
  const template = state.manifest.templates.find((item) => item.id === templateId);
  if (!template) return false;
  const nextLanguage = previewLanguages.has(language) && template.languages.includes(language) ? language : template.languages[0];
  const nextGroup = knownGroup(groupId) && (groupId === 'all' || template.groups.includes(groupId)) ? groupId : (template.groups[0] || 'all');
  const nextHash = previewRouteHash(nextGroup, template.id, nextLanguage);

  state.filterGroup = nextGroup;
  state.previewId = template.id;
  state.previewLanguage = nextLanguage;
  if (location.hash !== nextHash) {
    const nextUrl = `${location.pathname}${location.search}${nextHash}`;
    history[replace ? 'replaceState' : 'pushState']({}, '', nextUrl);
  }
  lastAppliedRoute = nextHash;
  syncPreviewLanguageTabs();
  renderAll();
  renderPreview();
  return true;
}

function navigateGroup(groupId) {
  if (!knownGroup(groupId)) return;
  const members = groupMembers(groupId);
  const nextTemplate = members.find((template) => template.id === state.previewId) || members[0];
  if (nextTemplate) navigatePreview(nextTemplate.id, state.previewLanguage, { groupId });
}

function restorePreviewFromRoute() {
  if (!state.manifest.templates.length || location.hash === lastAppliedRoute) return;
  const resolved = resolvePreviewRoute(readPreviewRoute());
  const canonicalHash = previewRouteHash(resolved.groupId, resolved.template.id, resolved.language);
  navigatePreview(resolved.template.id, resolved.language, {
    groupId: resolved.groupId,
    replace: location.hash !== canonicalHash,
  });
}

function toast(message) { const element = $('#toast'); element.textContent = message; element.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.remove('show'), 1800); }
function currentTemplate() { return state.manifest.templates.find((template) => template.id === state.previewId); }
function groupMembers(groupId) { return groupId === 'all' ? state.manifest.templates : state.manifest.templates.filter((template) => template.groups.includes(groupId)); }
function filteredTemplates() {
  const query = state.query.trim().toLowerCase();
  return state.manifest.templates.filter((template) => {
    const groupMatch = state.filterGroup === 'all' || template.groups.includes(state.filterGroup);
    const text = `${template.id} ${template.name.zh} ${template.name.en} ${template.scenario.zh} ${template.scenario.en}`.toLowerCase();
    return groupMatch && (!query || text.includes(query));
  });
}

async function fetchHtml(id, language) {
  const key = `${id}:${language}`;
  if (!state.cache.has(key)) state.cache.set(key, fetch(`templates/${id}/${language}.html`).then((response) => {
    if (!response.ok) throw new Error(`Unable to load ${key}`); return response.text();
  }));
  return state.cache.get(key);
}

// 导出文件继续使用可公开访问的绝对 URL；站内预览改用当前站点的素材，方便本地开发。
function withPreviewAssets(html) {
  const deployedAssets = 'https://inox-smart-email-template-studio.netlify.app/assets/';
  const localAssets = new URL('assets/', document.baseURI).href;
  return html.replaceAll(deployedAssets, localAssets);
}

function withSampleData(html, templateId = state.previewId) {
  const values = { ...sampleValues, ...(templateSampleValues[templateId] || {}) };
  let rendered = html;
  if (html.includes('data-access-scope-list') || html.includes('data-validity-period')) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    parsed.querySelectorAll('[data-access-scope-list]').forEach((scope) => {
      const rowTemplate = scope.querySelector('[data-access-scope-row]');
      const tagTemplate = rowTemplate?.querySelector('[data-access-device-tag]');
      if (!rowTemplate || !tagTemplate) return;

      const rows = sampleAuthorizedUnits.map((unit) => {
        const row = rowTemplate.cloneNode(true);
        row.querySelector('[data-access-scope-unit]').textContent = `${unit.unitName}:`;
        const tags = row.querySelector('[data-access-device-tags]');
        tags.replaceChildren(...unit.devices.map((deviceName) => {
          const tag = tagTemplate.cloneNode(true);
          tag.textContent = deviceName;
          return tag;
        }));
        return row;
      });
      scope.replaceChildren(...rows);
    });

    const validityIsPermanent = [values.startTime, values.endTime]
      .some((value) => String(value).trim().toLowerCase() === 'permanent');
    parsed.querySelectorAll('[data-validity-period]').forEach((period) => {
      period.textContent = validityIsPermanent
        ? period.dataset.permanentLabel
        : `${values.startTime} — ${values.endTime}`;
    });
    rendered = `<!DOCTYPE html>\n${parsed.documentElement.outerHTML}`;
  }
  return rendered.replace(/\$\{([^}]+)\}/g, (_, name) => values[name] ?? `[${name}]`);
}

function applyLocale(locale) {
  state.locale = locale; localStorage.setItem('inox-studio-locale', locale); document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  $$('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
  $('#searchInput').placeholder = t('searchPlaceholder');
  $$('#uiLocaleTabs button').forEach((button) => button.classList.toggle('active', button.dataset.locale === locale));
  renderAll();
}

function renderGroups() {
  const groups = [{ id: 'all', zh: t('allPurposes'), en: t('allPurposes') }, ...state.manifest.groups];
  $('#groupCount').textContent = state.manifest.groups.length;
  $('#groupList').innerHTML = groups.map((group) => {
    const members = groupMembers(group.id); const selectedCount = members.filter((template) => state.selected.has(template.id)).length;
    return `<div class="group-row ${state.filterGroup === group.id ? 'active' : ''}" data-group="${group.id}">
      <input type="checkbox" aria-label="Select ${escapeHtml(groupName(group))}" ${selectedCount === members.length && members.length ? 'checked' : ''} />
      <button class="group-filter" title="${escapeHtml(groupName(group))}">${escapeHtml(groupName(group))}</button><small>${members.length}</small>
    </div>`;
  }).join('');
  $$('#groupList .group-row').forEach((row) => {
    const members = groupMembers(row.dataset.group); const selectedCount = members.filter((template) => state.selected.has(template.id)).length;
    const checkbox = row.querySelector('input'); checkbox.indeterminate = selectedCount > 0 && selectedCount < members.length;
    checkbox.addEventListener('change', () => { members.forEach((template) => checkbox.checked ? state.selected.add(template.id) : state.selected.delete(template.id)); renderAll(); });
    row.querySelector('.group-filter').addEventListener('click', () => navigateGroup(row.dataset.group));
  });
}

function renderTemplates() {
  const templates = filteredTemplates(); $('#visibleCount').textContent = `${templates.length}/${state.manifest.templates.length}`;
  $('#templateList').innerHTML = templates.length ? templates.map((template) => `<div class="template-row ${state.previewId === template.id ? 'active' : ''}" data-id="${template.id}">
    <input type="checkbox" aria-label="Select ${escapeHtml(templateName(template))}" ${state.selected.has(template.id) ? 'checked' : ''} />
    <span class="template-index">${String(template.order).padStart(2, '0')}</span>
    <button class="template-open"><strong>${escapeHtml(templateName(template))}</strong><small>${template.id}</small></button>
  </div>`).join('') : `<div class="empty">${t('noMatches')}</div>`;
  $$('#templateList .template-row').forEach((row) => {
    row.querySelector('input').addEventListener('change', (event) => { event.target.checked ? state.selected.add(row.dataset.id) : state.selected.delete(row.dataset.id); renderAll(); });
    row.querySelector('.template-open').addEventListener('click', () => navigatePreview(row.dataset.id));
  });
}

function renderTemplateMeta() {
  const template = currentTemplate(); if (!template) return;
  $('#templateId').textContent = template.id; $('#templateName').textContent = templateName(template); $('#templateScenario').textContent = templateScenario(template);
  document.title = `${templateName(template)} · INOX Email Template Studio`;
  $('#groupBadges').innerHTML = template.groups.map((id) => {
    const group = state.manifest.groups.find((item) => item.id === id); return `<span class="group-badge">${escapeHtml(groupName(group))}</span>`;
  }).join('');
}

function renderExportSummary() {
  const files = state.selected.size * state.exportLanguages.size;
  $('#selectedCount').textContent = state.selected.size; $('#fileCount').textContent = `${files} HTML files`; $('#downloadDetail').textContent = `${files} ${t('files')}`;
  $('#downloadButton').disabled = !state.selected.size || !state.exportLanguages.size;
}
function renderAll() { renderGroups(); renderTemplates(); renderTemplateMeta(); renderExportSummary(); }

async function renderPreview() {
  const template = currentTemplate(); if (!template) return;
  renderTemplateMeta();
  try {
    const raw = await fetchHtml(template.id, state.previewLanguage); if (state.previewId !== template.id) return;
    const preview = withPreviewAssets(raw);
    $('#emailFrame').srcdoc = state.sampleData ? withSampleData(preview, template.id) : preview;
  } catch (error) { toast(error.message); }
}

async function downloadSelected() {
  if (!state.selected.size) return toast(t('chooseTemplate')); if (!state.exportLanguages.size) return toast(t('chooseLanguage'));
  const button = $('#downloadButton'); button.disabled = true; button.querySelector('b').textContent = t('preparing');
  try {
    const templates = state.manifest.templates.filter((template) => state.selected.has(template.id)); const files = [];
    for (const template of templates) for (const language of template.languages) if (state.exportLanguages.has(language)) {
      files.push({ name: `${template.id}/${language}.html`, data: await fetchHtml(template.id, language) });
    }
    const blob = createZip(files); const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `inox-email-templates-${new Date().toISOString().slice(0, 10)}.zip`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast(`${t('downloaded')}: ${files.length} ${t('files')}`);
  } catch (error) { toast(error.message); }
  finally { button.querySelector('b').textContent = t('downloadZip'); renderExportSummary(); }
}

function bindEvents() {
  $('#searchInput').addEventListener('input', (event) => { state.query = event.target.value; renderAll(); });
  document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#searchInput').focus(); } });
  $$('#uiLocaleTabs button').forEach((button) => button.addEventListener('click', () => applyLocale(button.dataset.locale)));
  $$('#languageTabs button').forEach((button) => button.addEventListener('click', () => navigatePreview(state.previewId, button.dataset.language)));
  $('#sampleToggle').addEventListener('change', (event) => { state.sampleData = event.target.checked; renderPreview(); });
  $$('#viewportTabs button').forEach((button) => button.addEventListener('click', () => { state.viewport = button.dataset.viewport; $$('#viewportTabs button').forEach((item) => item.classList.toggle('active', item === button)); $('#emailCanvas').classList.toggle('mobile', state.viewport === 'mobile'); }));
  $('#selectVisible').addEventListener('click', () => { filteredTemplates().forEach((template) => state.selected.add(template.id)); renderAll(); });
  $('#clearSelection').addEventListener('click', () => { filteredTemplates().forEach((template) => state.selected.delete(template.id)); renderAll(); });
  $('#selectAll').addEventListener('click', () => { state.manifest.templates.forEach((template) => state.selected.add(template.id)); renderAll(); });
  $('#selectCurrentGroup').addEventListener('click', () => { groupMembers(state.filterGroup).forEach((template) => state.selected.add(template.id)); renderAll(); });
  $('#clearExport').addEventListener('click', () => { state.selected.clear(); renderAll(); });
  $$('.language-choice input').forEach((input) => input.addEventListener('change', () => { input.checked ? state.exportLanguages.add(input.value) : state.exportLanguages.delete(input.value); renderExportSummary(); }));
  $('#downloadButton').addEventListener('click', downloadSelected);
  $('#copyHtml').addEventListener('click', async () => { await navigator.clipboard.writeText(await fetchHtml(state.previewId, state.previewLanguage)); toast(t('copied')); });
  $('#openPreview').addEventListener('click', async () => { const raw = withPreviewAssets(await fetchHtml(state.previewId, state.previewLanguage)); const url = URL.createObjectURL(new Blob([state.sampleData ? withSampleData(raw, state.previewId) : raw], { type: 'text/html' })); window.open(url, '_blank', 'noopener,noreferrer'); setTimeout(() => URL.revokeObjectURL(url), 30000); });
  window.addEventListener('popstate', restorePreviewFromRoute);
  window.addEventListener('hashchange', restorePreviewFromRoute);
}

async function init() {
  bindEvents();
  try {
    const response = await fetch('manifest.json'); state.manifest = await response.json();
    const resolved = resolvePreviewRoute(readPreviewRoute());
    state.filterGroup = resolved.groupId;
    state.previewId = resolved.template.id;
    state.previewLanguage = resolved.language;
    applyLocale(state.locale);
    navigatePreview(state.previewId, state.previewLanguage, { groupId: state.filterGroup, replace: true });
  } catch (error) { toast(error.message); }
}
init();
