import { createZip } from './zip.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const state = {
  locale: localStorage.getItem('inox-studio-locale') || (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'),
  manifest: { groups: [], templates: [] }, filterGroup: 'all', query: '', selected: new Set(),
  previewId: null, previewLanguage: 'zh', sampleData: true, viewport: 'desktop', cache: new Map(), exportLanguages: new Set(['zh', 'en', 'es']),
};

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
  unitName: 'Unit 1208', deviceName: 'Main Entrance', deviceID: 'INOX-A7C92', password: '4862', code: '825914', ekey: 'Permanent',
  startTime: 'May 15, 2026 · 9:00 AM', endTime: 'May 22, 2026 · 6:00 PM', time: 'May 15, 2026 · 3:42 PM',
  link: 'https://inoxsmart.com/register', cardID: 'RFID-2048-91', cardName: 'Lobby Card', cardOwner: 'Taylor Smith', lostTime: 'May 12, 2026',
  plan_name: 'INOX Smart Pro', effective_date: 'June 15, 2026', requester_name: 'Alex Chen', requester_email: 'alex@example.com',
  manager_name: 'Morgan Lee', manager_email: 'morgan@example.com', contact_name: 'Jordan Kim', contact_email: 'billing@example.com',
};
const escapeHtml = (value = '') => String(value).replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);
const templateName = (template) => template.name[state.locale] || template.name.en;
const templateScenario = (template) => template.scenario[state.locale] || template.scenario.en;
const groupName = (group) => group[state.locale] || group.en;

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
function withSampleData(html) { return html.replace(/\$\{([^}]+)\}/g, (_, name) => sampleValues[name] ?? `[${name}]`); }

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
    row.querySelector('.group-filter').addEventListener('click', () => { state.filterGroup = row.dataset.group; renderAll(); });
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
    row.querySelector('.template-open').addEventListener('click', () => { state.previewId = row.dataset.id; renderAll(); renderPreview(); });
  });
}

function renderTemplateMeta() {
  const template = currentTemplate(); if (!template) return;
  $('#templateId').textContent = template.id; $('#templateName').textContent = templateName(template); $('#templateScenario').textContent = templateScenario(template);
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
    $('#emailFrame').srcdoc = state.sampleData ? withSampleData(raw) : raw;
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
  $$('#languageTabs button').forEach((button) => button.addEventListener('click', () => { state.previewLanguage = button.dataset.language; $$('#languageTabs button').forEach((item) => item.classList.toggle('active', item === button)); renderPreview(); }));
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
  $('#openPreview').addEventListener('click', async () => { const raw = await fetchHtml(state.previewId, state.previewLanguage); const url = URL.createObjectURL(new Blob([state.sampleData ? withSampleData(raw) : raw], { type: 'text/html' })); window.open(url, '_blank', 'noopener,noreferrer'); setTimeout(() => URL.revokeObjectURL(url), 30000); });
}

async function init() {
  bindEvents();
  try {
    const response = await fetch('manifest.json'); state.manifest = await response.json(); state.previewId = state.manifest.templates[0]?.id;
    applyLocale(state.locale); renderPreview();
  } catch (error) { toast(error.message); }
}
init();
