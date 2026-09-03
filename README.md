# INOX Email Template Studio v3

A static, multilingual email-template workspace for developing, previewing, validating, and exporting production-ready INOX Smart HTML emails.

INOX Smart 多语言邮件模板开发、预览、检查与导出工具。项目不依赖后端服务，可由 GitHub + Netlify 自动构建部署。

[中文说明](#中文说明) · [English Guide](#english-guide) · [Online Preview](https://inox-smart-email-template-studio.netlify.app/)

---

## 中文说明

### 1. 项目概览

- 30 套业务邮件模板。
- 每套模板包含简体中文、英文和西班牙语，共生成 90 个 HTML 文件。
- 三种语言集中在同一个 `template.html` 中维护。
- App Promotion、Footer、主题色、布局和图片素材集中维护。
- 前端支持模板分类、搜索、语言切换、桌面/手机预览、Sample Data 和批量 ZIP 导出。
- 导出的 HTML 不包含 Sample Data，保留原始 `${variables}` 供邮件服务二次渲染。
- 项目为纯静态网站，无数据库、API 或服务器依赖。

### 2. 快速开始

环境要求：Node.js 20 或更高版本。

```bash
git clone https://github.com/imayden/inox-email-template-studio.git
cd inox-email-template-studio
npm run dev
```

本地访问：

```text
http://127.0.0.1:4173
```

常用指令：

```bash
npm run dev      # 构建并启动本地实时预览
npm run build    # 生成 dist/ 和 90 个邮件 HTML
npm run check    # 构建并执行完整结构检查
```

### 3. 目录结构

```text
inox-email-template-studio/
├── src/
│   ├── shared/
│   │   ├── assets.json       # 公共图片与链接配置
│   │   ├── components.html   # 三语言 App Promotion 和 Footer
│   │   ├── email.css         # 邮件主题变量与公共组件样式
│   │   └── layout.html       # 邮件外层结构和移动端媒体查询
│   ├── templates/
│   │   └── <TEMPLATE_ID>/
│   │       └── template.html # 单个模板的中/英/西三语言正文
│   └── template-catalog.json # 模板名称、场景、分类和顺序
├── web/
│   ├── assets/               # 项目自己维护的邮件图片素材
│   ├── app.js                # 预览器路由、Sample Data 和导出逻辑
│   ├── index.html            # 预览器页面结构
│   ├── styles.css            # 预览器 UI 样式
│   └── zip.js                # 浏览器端 ZIP 生成
├── scripts/
│   ├── build.mjs             # 邮件构建程序
│   ├── check.mjs             # 自动检查程序
│   └── dev.mjs               # 本地开发服务器与文件监听
├── dist/                     # 自动生成；不要手工修改或提交
├── docs/                     # 补充使用文档
├── netlify.toml              # Netlify 构建、发布和路由配置
└── package.json
```

### 4. 构建流程

```text
template.html（三语言正文）
          +
layout.html（邮件外框）
          +
components.html（App Promotion / Footer）
          +
email.css + assets.json（样式与素材）
          ↓
scripts/build.mjs
          ↓
dist/templates/<TEMPLATE_ID>/{zh,en,es}.html
```

构建程序会：

1. 读取模板目录和 `template-catalog.json`。
2. 分别选择 `zh`、`en`、`es` 语言块。
3. 插入公共 App Promotion 和 Footer。
4. 应用主题变量、图片链接并内联公共 CSS。
5. 保留 480px 移动端响应式样式。
6. 生成 90 个完整 HTML 和 `dist/manifest.json`。
7. 将 `web/` 复制到 `dist/`，形成可直接部署的静态网站。

### 5. 单个邮件模板结构

每个模板只使用一个文件：

```text
src/templates/MAIL_xxxxxxxxxx/template.html
```

基本格式：

```html
<template data-language="zh">
  <!-- @subject 中文邮件标题 -->
  <h1>中文正文标题</h1>
  <p>${userName}，您好：</p>
</template>

<template data-language="en">
  <!-- @subject English email subject -->
  <h1>English heading</h1>
  <p>Hello ${userName},</p>
</template>

<template data-language="es">
  <!-- @subject Asunto del correo -->
  <h1>Título en español</h1>
  <p>Hola, ${userName}:</p>
</template>
```

模板规则：

- 语言块顺序必须为 `zh`、`en`、`es`。
- 每个语言块必须包含 `<!-- @subject ... -->`。
- 三种语言必须使用完全一致的变量名称和变量集合。
- 不要在业务模板中复制 App Promotion 或 Footer。
- 不要把 Sample Data 写进模板源文件。
- 不要直接修改 `dist/templates/`，它会在下次构建时被覆盖。
- 邮件布局优先使用 `<table role="presentation">` 和邮件客户端兼容的内联样式。

### 6. 变量与数据结构

业务变量使用以下格式：

```html
${userName}
${propertyName}
${startTime}
${endTime}
```

常见变量类型：

| 类型 | 示例 |
|---|---|
| 用户与联系人 | `${userName}`, `${inviterName}`, `${email}` |
| Property / Unit / Device | `${propertyName}`, `${unitName}`, `${deviceName}`, `${deviceID}` |
| Passcode / E-key | `${password}`, `${code}`, `${ekey}` |
| 时间 | `${startTime}`, `${endTime}`, `${time}`, `${lostTime}` |
| 链接 | `${link}` |
| License | `${plan_name}`, `${manager_email}`, `${contact_email}` |

注意：

- 变量名属于邮件发送系统的数据契约，未经后端确认不要重命名。
- `dist/manifest.json` 会列出每个模板各语言的准确变量集合。
- 前端预览会替换 Sample Data；下载、复制和 ZIP 导出的源 HTML 仍保留 `${variables}`。
- 最终发送邮件前，邮件服务必须完成变量替换、HTML 转义和业务数据校验。

#### 多 Unit / Device 展示

访问范围组件使用以下数据标记：

```html
data-access-scope-list
data-access-scope-row
data-access-scope-unit
data-access-device-tags
data-access-device-tag
```

预览器会使用 `sampleAuthorizedUnits` 生成多行 Unit 和 Device 标签。正式邮件服务应根据真实数组复制行与标签；导出的 HTML 不包含预览用的多条 Sample Data。

#### Permanent 有效期

`data-validity-period` 用于预览 Permanent 或起止时间两种效果。导出的邮件不运行 JavaScript，因此正式邮件服务需要在发送前根据业务数据渲染最终有效期文字。

### 7. Sample Data

Sample Data 只用于前端预览，集中在：

```text
web/app.js
```

主要数据入口：

```js
sampleValues
templateSampleValues
sampleAuthorizedUnits
```

- `sampleValues`：全部模板的通用示例值。
- `templateSampleValues`：指定模板的覆盖值。
- `sampleAuthorizedUnits`：多 Unit / Device 的预览数组。

修改这些数据不会改变导出的源 HTML，也不会改变后端变量名称。

### 8. 公共组件、样式与图片

#### 修改 App Promotion 或 Footer

编辑：

```text
src/shared/components.html
```

每个公共组件都有 `zh`、`en`、`es` 三个版本。修改时必须同步检查三种语言。

#### 修改主题与组件样式

编辑：

```text
src/shared/email.css
```

主要主题变量位于 `:root`：

```css
--email-canvas
--email-card
--email-text
--email-primary
--email-footer
--email-width
--font-body
--font-system
```

共享组件在源代码中使用 class，构建后 CSS 会自动内联。移动端媒体查询保留在最终 HTML 的 `<head>` 中。

#### 修改图片或公共链接

1. 将图片放入 `web/assets/`。
2. 在 `src/shared/assets.json` 中更新公开 HTTPS 地址。
3. 运行 `npm run check`。

当前邮件图片由项目自己的 Netlify 资源地址提供。本地预览会自动将线上素材地址替换为本地 `/assets/`，因此本地和线上使用同一套文件。

### 9. 模板目录数据

`src/template-catalog.json` 控制前端展示，不包含邮件正文。

模板记录格式：

```json
{
  "order": 1,
  "id": "MAIL_8994369155",
  "name": {
    "zh": "新增ekey",
    "en": "E-key Created"
  },
  "scenario": {
    "zh": "中文使用场景",
    "en": "English use case"
  },
  "groups": ["e-keys"],
  "languages": ["zh", "en", "es"]
}
```

- `id` 必须与 `src/templates/<id>/` 目录名称完全一致。
- `order` 决定列表排序。
- `groups` 中的 ID 必须存在于顶层 `groups` 数组。
- 一个模板可以属于多个用途分类。
- `languages` 当前固定为 `zh`、`en`、`es`。

### 10. 常见开发任务

#### 修改某一个模板文案

1. 编辑 `src/templates/<TEMPLATE_ID>/template.html`。
2. 同步检查中、英、西三种语言。
3. 保持三种语言变量一致。
4. 运行 `npm run check`。

#### 新增模板

1. 新建 `src/templates/<NEW_ID>/template.html`。
2. 添加 `zh`、`en`、`es` 三个语言块和 subject。
3. 在 `src/template-catalog.json` 添加模板记录。
4. 如需特殊预览数据，在 `web/app.js` 添加 `templateSampleValues`。
5. 运行 `npm run check` 并在桌面/手机视图中检查三种语言。

#### 批量修改全部模板

- 文案或业务结构：谨慎修改各 `template.html`。
- App Promotion / Footer：只改 `components.html`。
- 主题色和公共组件样式：只改 `email.css`。
- 外层宽度或移动端布局：只改 `layout.html`。
- 图片和公共 URL：修改 `assets.json` 与 `web/assets/`。

### 11. 链接规范

正文中的 URL 和邮箱必须可点击：

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer"
   style="color:#80C41C; text-decoration:underline;">example.com</a>

<a href="mailto:${email}" target="_blank" rel="noopener noreferrer"
   style="color:#80C41C; text-decoration:underline;">${email}</a>
```

- 网站必须使用 HTTPS。
- 邮箱必须使用 `mailto:`。
- 外部链接必须打开新标签页。
- `npm run check` 会检查以上规则。

### 12. 构建、导出与部署

生成结果：

```text
dist/templates/<TEMPLATE_ID>/zh.html
dist/templates/<TEMPLATE_ID>/en.html
dist/templates/<TEMPLATE_ID>/es.html
```

前端批量导出的 ZIP 使用相同目录结构。导出文件不包含 Sample Data。

Netlify 配置：

```text
Build command: npm run build
Publish directory: dist
Node version: 20
```

GitHub `main` 分支更新后，Netlify 会自动构建并发布线上版本。建议所有修改先在功能分支完成，通过 `npm run check` 和本地三语言、桌面/手机预览后再合并到 `main`。

---

## English Guide

### 1. Overview

- 30 business email templates.
- Each template contains Simplified Chinese, English, and Spanish, producing 90 HTML files.
- All three languages for one template live in a single `template.html`.
- App Promotion, Footer, theme styles, layout, links, and image assets are centrally managed.
- The studio supports use-case filtering, search, language switching, desktop/mobile preview, sample data, and batch ZIP export.
- Exported HTML excludes sample data and keeps the original `${variables}` for the delivery system.
- The project is fully static and requires no API, database, or application server.

### 2. Quick start

Requirement: Node.js 20 or newer.

```bash
git clone https://github.com/imayden/inox-email-template-studio.git
cd inox-email-template-studio
npm run dev
```

Open:

```text
http://127.0.0.1:4173
```

Commands:

```bash
npm run dev      # Build and start the local live-preview server
npm run build    # Generate dist/ and all 90 email HTML files
npm run check    # Build and run the complete validation suite
```

### 3. Project structure

```text
inox-email-template-studio/
├── src/
│   ├── shared/
│   │   ├── assets.json       # Shared image and link configuration
│   │   ├── components.html   # Trilingual App Promotion and Footer
│   │   ├── email.css         # Email theme tokens and shared styles
│   │   └── layout.html       # Email shell and mobile media query
│   ├── templates/
│   │   └── <TEMPLATE_ID>/
│   │       └── template.html # Chinese, English, and Spanish email body
│   └── template-catalog.json # Template metadata, groups, and order
├── web/
│   ├── assets/               # Project-managed email image assets
│   ├── app.js                # Router, sample data, preview, and export logic
│   ├── index.html            # Studio page structure
│   ├── styles.css            # Studio UI styles
│   └── zip.js                # Browser-side ZIP generation
├── scripts/
│   ├── build.mjs             # Email compiler
│   ├── check.mjs             # Automated validation
│   └── dev.mjs               # Local server and file watcher
├── dist/                     # Generated output; never edit or commit
├── docs/                     # Additional guides
├── netlify.toml              # Netlify build, publish, and route settings
└── package.json
```

### 4. Build pipeline

```text
template.html (trilingual body)
          +
layout.html (email shell)
          +
components.html (App Promotion / Footer)
          +
email.css + assets.json (styles and assets)
          ↓
scripts/build.mjs
          ↓
dist/templates/<TEMPLATE_ID>/{zh,en,es}.html
```

The compiler:

1. Reads the template directories and `template-catalog.json`.
2. Selects the `zh`, `en`, and `es` language blocks.
3. Inserts the shared App Promotion and Footer.
4. Resolves theme tokens and assets, then inlines shared CSS.
5. Preserves the 480px responsive email styles.
6. Generates 90 complete email files and `dist/manifest.json`.
7. Copies `web/` into `dist/` to create the deployable static site.

### 5. Template format

Each email uses one source file:

```text
src/templates/MAIL_xxxxxxxxxx/template.html
```

```html
<template data-language="zh">
  <!-- @subject 中文邮件标题 -->
  <h1>中文正文标题</h1>
  <p>${userName}，您好：</p>
</template>

<template data-language="en">
  <!-- @subject English email subject -->
  <h1>English heading</h1>
  <p>Hello ${userName},</p>
</template>

<template data-language="es">
  <!-- @subject Asunto del correo -->
  <h1>Título en español</h1>
  <p>Hola, ${userName}:</p>
</template>
```

Rules:

- Language blocks must be ordered `zh`, `en`, `es`.
- Every language block must contain `<!-- @subject ... -->`.
- All three languages must use exactly the same variable names and variable set.
- Do not copy the App Promotion or Footer into business templates.
- Do not place sample values in template source files.
- Never edit `dist/templates/`; the next build will overwrite it.
- Prefer presentation tables and email-client-safe inline styles for business content.

### 6. Variables and data contract

Variables use this syntax:

```html
${userName}
${propertyName}
${startTime}
${endTime}
```

Common groups:

| Type | Examples |
|---|---|
| Users and contacts | `${userName}`, `${inviterName}`, `${email}` |
| Property / Unit / Device | `${propertyName}`, `${unitName}`, `${deviceName}`, `${deviceID}` |
| Passcode / E-key | `${password}`, `${code}`, `${ekey}` |
| Time | `${startTime}`, `${endTime}`, `${time}`, `${lostTime}` |
| Links | `${link}` |
| License | `${plan_name}`, `${manager_email}`, `${contact_email}` |

Important:

- Variable names are part of the delivery-system contract. Do not rename them without backend coordination.
- `dist/manifest.json` contains the exact variable set for every language of every template.
- The studio replaces variables only for preview. Copy, download, and ZIP export keep `${variables}` intact.
- Before sending, the delivery service must replace variables, escape untrusted values, and validate business data.

#### Multiple units and devices

Access-scope markup uses these data attributes:

```html
data-access-scope-list
data-access-scope-row
data-access-scope-unit
data-access-device-tags
data-access-device-tag
```

The previewer expands `sampleAuthorizedUnits` into multiple unit rows and device tags. The production renderer must repeat the relevant rows and tags from the real array. Exported HTML never includes the expanded sample records.

#### Permanent validity period

`data-validity-period` lets the studio preview either `Permanent` or a start/end range. Exported emails contain no JavaScript, so the production renderer must output the final validity text before sending.

### 7. Sample data

Preview-only data is centralized in:

```text
web/app.js
```

Main entries:

```js
sampleValues
templateSampleValues
sampleAuthorizedUnits
```

- `sampleValues`: shared preview values.
- `templateSampleValues`: per-template overrides.
- `sampleAuthorizedUnits`: preview array for multiple units and devices.

Changing these values does not change exported source HTML or backend variable names.

### 8. Shared components, styles, and assets

#### App Promotion and Footer

Edit:

```text
src/shared/components.html
```

Each component has `zh`, `en`, and `es` variants. Always review all three languages.

#### Theme and component styles

Edit:

```text
src/shared/email.css
```

Core `:root` tokens:

```css
--email-canvas
--email-card
--email-text
--email-primary
--email-footer
--email-width
--font-body
--font-system
```

Shared components use classes in source. The compiler converts those rules to inline CSS, while mobile media queries remain in the final email `<head>`.

#### Images and shared links

1. Add the image to `web/assets/`.
2. Update its public HTTPS URL in `src/shared/assets.json`.
3. Run `npm run check`.

Email images are served from the project-managed Netlify asset host. Local preview automatically maps the production asset URLs to local `/assets/`, keeping local and deployed files consistent.

### 9. Template catalog

`src/template-catalog.json` controls the studio navigation and does not contain email body HTML.

```json
{
  "order": 1,
  "id": "MAIL_8994369155",
  "name": {
    "zh": "新增ekey",
    "en": "E-key Created"
  },
  "scenario": {
    "zh": "中文使用场景",
    "en": "English use case"
  },
  "groups": ["e-keys"],
  "languages": ["zh", "en", "es"]
}
```

- `id` must exactly match `src/templates/<id>/`.
- `order` controls list ordering.
- Every ID in `groups` must exist in the top-level `groups` array.
- One template may belong to multiple groups.
- `languages` is currently fixed to `zh`, `en`, and `es`.

### 10. Common workflows

#### Edit one template

1. Edit `src/templates/<TEMPLATE_ID>/template.html`.
2. Review Chinese, English, and Spanish.
3. Keep the three variable sets identical.
4. Run `npm run check`.

#### Add a template

1. Create `src/templates/<NEW_ID>/template.html`.
2. Add all three language blocks and subjects.
3. Add the record to `src/template-catalog.json`.
4. Add a `templateSampleValues` override in `web/app.js` only when needed.
5. Run `npm run check`, then review every language in desktop and mobile preview.

#### Make a global change

- Business copy or structure: edit the relevant `template.html` files.
- App Promotion / Footer: edit only `components.html`.
- Theme and shared component styles: edit only `email.css`.
- Email width or responsive shell: edit only `layout.html`.
- Images and shared URLs: edit `assets.json` and `web/assets/`.

### 11. Link rules

Visible URLs and email addresses in the email body must be clickable:

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer"
   style="color:#80C41C; text-decoration:underline;">example.com</a>

<a href="mailto:${email}" target="_blank" rel="noopener noreferrer"
   style="color:#80C41C; text-decoration:underline;">${email}</a>
```

- Web links must use HTTPS.
- Email links must use `mailto:`.
- External links must open in a new tab.
- `npm run check` validates these requirements.

### 12. Build, export, and deployment

Generated files:

```text
dist/templates/<TEMPLATE_ID>/zh.html
dist/templates/<TEMPLATE_ID>/en.html
dist/templates/<TEMPLATE_ID>/es.html
```

The studio ZIP export follows the same structure and never includes sample data.

Netlify settings:

```text
Build command: npm run build
Publish directory: dist
Node version: 20
```

Netlify automatically builds and publishes after the GitHub `main` branch changes. Develop on a feature branch, run `npm run check`, review all languages in desktop and mobile preview, and merge into `main` only after validation.
