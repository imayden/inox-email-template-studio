# VS Code 编辑与部署简明教程

## 1. 启动本地预览

在 VS Code 中打开整个 `inox-email-template-studio` 文件夹，再选择“终端 → 新建终端”，输入：

```bash
npm run dev
```

终端显示 `http://127.0.0.1:4173` 后，在浏览器打开该地址。编辑并保存后会自动重新构建，刷新浏览器即可看到最新内容。

也可以按 `Command + Shift + P`，输入“运行任务”，选择“启动本地邮件预览”。

## 2. 修改某一个模板的三种语言

例如永久自定义 Access Code 模板位于：

```text
src/templates/MAIL_0443708729/template.html
```

同一个文件中依次放置三种语言：

```html
<template data-language="zh">
  <!-- @subject INOX Smart 访问密码已创建 -->
  中文正文
</template>

<template data-language="en">
  <!-- @subject INOX Smart Access Code Created -->
  English content
</template>

<template data-language="es">
  <!-- @subject INOX Smart Código de acceso creado -->
  Contenido en español
</template>
```

`@subject` 后是邮件主题，下面是该语言正文。请保留三个 `data-language` 值和原有业务变量格式，例如：

```html
${userName}
${password}
${propertyName}
```

不要把测试姓名或密码写进源文件。网页中的 Sample Data 只用于预览，不会进入导出文件。

## 3. 批量修改主题色、字体和组件样式

打开唯一的公共样式文件：

```text
src/shared/email.css
```

文件顶部 `:root` 是全局设计变量。例如修改全部模板的品牌主色：

```css
--email-primary: #80C41C;
```

下面的 `.promo-*` 和 `.footer-*` 是 App 宣传区与 Footer 的公共样式。修改并构建后，脚本会把 CSS 自动内联到全部 90 个最终文件中，保证邮件客户端兼容性。

## 4. 修改三语公共组件

App 宣传区和 Footer 都集中在：

```text
src/shared/components.html
```

每个组件通过 `data-component` 标识，通过 `data-language` 区分语言。例如：

```html
<template data-component="app-promo" data-language="en">
  ...
</template>
```

这里负责组件结构和文案，不写行内 CSS；样式统一在 `email.css` 中维护。修改一个语言区块后，会应用到该语言的全部 30 套模板。

## 5. 修改 Logo、App 图标或支持信息

打开：

```text
src/shared/assets.json
```

可统一修改 App 图标、Logo、支持链接、显示文字和电话。图片地址应为公开、长期稳定的绝对 HTTPS URL；本机文件路径无法在收件人的邮箱中显示。

## 6. 三语切换的工作方式

三种语言确实保存在同一个模板源文件中。`scripts/build.mjs` 的 JavaScript 函数会根据语言选择对应区块，再组合布局、公共组件和 CSS。

构建结果仍是三个独立文件：

```text
模板ID/
  zh.html
  en.html
  es.html
```

邮件客户端通常禁用 JavaScript，因此交付文件中不会放语言切换脚本。预览网页负责切换语言，收件系统使用对应语言的独立成品 HTML。

## 7. 检查修改

提交到 GitHub 前运行：

```bash
npm run check
```

它会检查：

- 30 个三语源文件与 90 个导出 HTML 是否完整；
- 三个语言区块、Subject 和语言标记是否正确；
- 公共组件是否误写了行内 CSS；
- CSS 类名、素材标记和构建标记是否已完全转换；
- 同一模板的三种语言是否使用一致的业务变量。

## 8. 提交到 GitHub

在 VS Code 中：

1. 点击左侧“源代码管理”。
2. 查看本次修改。
3. 输入说明，例如 `Update access code footer`。
4. 点击“提交”。
5. 点击“同步更改”或“推送”。

建议在新分支修改并创建 Pull Request。Netlify 会自动生成预览网址，确认无误后再合并到主分支。

## 9. 连接 Netlify

1. 登录 Netlify。
2. 选择“Add new project → Import an existing project”。
3. 选择 GitHub 和对应仓库。
4. Netlify 会自动读取 `netlify.toml`。
5. 确认 Build command 为 `npm run build`，Publish directory 为 `dist`。
6. 点击 Deploy。

以后向 GitHub 主分支推送，Netlify 就会自动更新网站。

## 10. 在部署网站导出模板

1. 在用途分类中勾选整个分类，或逐个勾选模板。
2. 选择中文、英文、西班牙语，也可以三种全选。
3. 点击“下载 ZIP”。
4. ZIP 内每个模板包含所选语言的最终 HTML。

导出文件不包含 Sample Data，可以交付其他系统二次编辑或部署。

## 重要规则

- 只编辑 `src/`，不要编辑 `dist/`。
- 业务变量使用 `${variable}`，不要改名或删除。
- 公共颜色和样式只在 `src/shared/email.css` 修改。
- 公共组件文案和结构只在 `src/shared/components.html` 修改。
- 图片使用公开 HTTPS URL。
- 修改后先运行 `npm run check`，再提交 GitHub。
