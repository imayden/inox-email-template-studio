# INOX Email Template Studio

这是 INOX Smart 邮件模板的 VS Code + GitHub + Netlify 静态管理版本。

- 30 套邮件场景，每套只维护一个 `template.html`。
- 中文、英文、西班牙语放在同一个源文件的三个语言区块中。
- 公共组件与公共 CSS 集中维护，一次修改应用到全部模板。
- 构建后生成 90 个可直接交付的独立邮件 HTML。
- 部署网页支持按用途复选、全选，并下载所选模板的三语 ZIP。
- 导出文件不包含 Sample Data，`${variable}` 会原样保留。

## 第一次使用

1. 使用 VS Code 打开整个项目文件夹。
2. 打开“终端 → 新建终端”。
3. 运行：

```bash
npm run dev
```

4. 浏览器打开 <http://127.0.0.1:4173>。
5. 修改 `src/` 中的文件并保存；项目会自动重新构建，刷新浏览器查看结果。

本项目没有第三方运行依赖，不需要先执行 `npm install`。

## 最常用的编辑位置

| 要修改的内容 | 文件位置 |
|---|---|
| 某个模板的三语主题和正文 | `src/templates/模板ID/template.html` |
| 全部邮件的颜色、字体、宽度和组件样式 | `src/shared/email.css` |
| 三语 App 宣传区和 Footer 文案/结构 | `src/shared/components.html` |
| Logo、App 图标、支持链接和电话 | `src/shared/assets.json` |
| 公共邮件外层布局 | `src/shared/layout.html` |
| 模板名称、用途分类和场景说明 | `src/template-catalog.json` |

详细操作见 [VS Code 编辑与部署简明教程](docs/VS_CODE_GUIDE.md)。

## 三语构建方式

每个 `template.html` 中包含 `zh`、`en`、`es` 三个 `<template data-language>` 区块。`scripts/build.mjs` 中的 JavaScript 会在构建时选择语言、插入公共组件，并把 `email.css` 自动转换为邮件兼容的行内样式。

最终导出的邮件仍分别是 `zh.html`、`en.html`、`es.html`，且不包含 JavaScript。这样可以避免 Gmail、Outlook 等邮件客户端禁用脚本所造成的兼容问题。

## 构建与检查

```bash
npm run build
npm run check
```

最终网页和可导出的邮件生成在 `dist/`。不要直接编辑 `dist/`，每次构建都会重新生成它。

## Netlify

仓库根目录的 `netlify.toml` 已配置：

- Build command：`npm run build`
- Publish directory：`dist`
- Node.js：20

把 GitHub 仓库连接到 Netlify 后，每次推送都会自动构建和部署；Pull Request 会得到独立的 Deploy Preview。
