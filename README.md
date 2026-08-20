# dsh-prompt-optimizer

一个 DeepSeek Harness（DSH）Web 插件：在输入框工具行新增一个 ✨ 图标按钮，点击后调用当前激活模型，把输入框里的提示词优化得更清晰、更具体，并自动回填。

> 核心功能封装为可复用、可持久化的 DSH Web 插件包，随组合（composition）挂载后即可随部署自动加载。

## 功能特性

- **一键优化提示词**：点击 ✨ 按钮，将当前草稿改写为更适合 AI 编程助手的高质量提示词；
- **保留意图与语言**：只做清晰化、具体化改写，不改变原任务意图与语言；
- **图标按钮 + 悬停提示**：界面不显示说明文字，仅在鼠标悬停时显示「优化提示词」；
- **进度反馈**：优化过程中按钮切换为旋转加载圈，并在按钮底部显示滑动进度条；
- **空内容保护**：输入框为空时按钮自动置灰，避免误触发；
- **流式生成**：Host 端通过 `ctx.llm.stream` 流式读取模型输出，再统一回填。

## 目录结构

```
dsh-prompt-optimizer/
├── package.json        # 包元信息 + dsh.bundle / dsh.client 清单
├── cordis.patch.yml    # 组合补丁：向组合挂载本插件
├── lib/
│   ├── index.js        # Host 半：注册 /api/prompt-optimizer 数据路由
│   └── client.js       # Client 半：__ModuleLoader__ 图标按钮 UI
├── LICENSE             # MIT
└── README.md
```

## 工作原理

- **Host 半**（`lib/index.js`）：导出 Cordis 插件，`inject` 依赖 `webServer`、`llm`、`agentDefaultModel`，注册精确路由 `POST /api/prompt-optimizer`。收到 `{ text }` 后读取当前默认模型（`agentDefaultModel.currentSelection()`），组装优化提示词，通过 `ctx.llm.stream` 流式生成并返回 `{ optimized }`。
- **Client 半**（`lib/client.js`）：通过 `window.__ModuleLoader__.load` 注册，`apply` 时向 `conversation.input.left` 槽位注入图标按钮，读取草稿（`props.input.draft`）、调用接口、再写回（`props.inputActions.setDraft`）。

## 安装步骤

### 方式一：本地路径安装（已验证，无需网络 / SSH）

```bash
dsh plugin --profile web add "file:/绝对路径/to/dsh-prompt-optimizer"
```

`dsh plugin add` 会自动完成两步：把包写入 profile 的 `dependencies`，并注册进 `dsh.profile.bundles`。重启对应 profile 的 Web 界面后，插件即随组合自动加载，无需每次手动激活。

### 方式二：从 GitHub 安装

```bash
dsh plugin --profile web add "github:<owner>/dsh-prompt-optimizer#main"
```

> ⚠️ 注意：pnpm 对 `github:` 源走 SSH（`git+ssh://git@github.com/...`），要求本机已配置 GitHub SSH 密钥。没有 SSH 密钥时会报 `Permission denied (publickey)`，此时请改用方式一（本地路径）。也可以先把仓库发布到 npm 再用 `dsh plugin --profile web add dsh-prompt-optimizer` 安装。

### 方式三：手动接入组合

在目标 profile 的 `package.json` 中把本包加入 `dependencies` 与 `dsh.profile.bundles`，然后运行 `dsh plugin --profile web install` 并重启。

### 方式四：动态插件（临时试用，不持久化）

仅用于临时验证、重启即失效：

1. 打开 DSH Web 的 Cordis 插件开发能力；
2. 分别把 `lib/index.js`（Host）与 `lib/client.js`（Client）的 `apply` 逻辑封装为动态 Package；
3. 运行并批准。

## 使用说明

1. 在输入框输入一段提示词；
2. 点击输入框工具行左侧的 ✨ 图标按钮；
3. 按钮进入加载状态（旋转图标 + 底部进度条）；
4. 完成后，优化后的提示词自动替换输入框内容；
5. 将鼠标悬停在按钮上可查看说明文字。

## 常见问题 (FAQ)

- **按钮为什么是灰色的？** 输入框为空时按钮会自动置灰（`disabled`），避免对空内容发起优化请求；输入内容后即可点击。
- **优化用的是哪个模型？** 使用当前激活的默认模型（`agentDefaultModel.currentSelection()`）；在界面上切换模型即可改变优化所用的模型。
- **为什么 `dsh plugin add "github:..."` 报 `Permission denied (publickey)`？** pnpm 对 `github:` 源默认走 SSH。请改用本地路径安装，或先配置 GitHub SSH 密钥，或发布到 npm 后按包名安装（见上文「安装步骤」）。
- **优化会改变提示词的原意吗？** 不会。系统提示要求只做清晰化、具体化改写，保留原任务意图与语言。

## 贡献指南

欢迎提交 Issue 与 Pull Request。

- **代码风格**：普通 JavaScript（ESM），不使用 TypeScript/JSX 转译；
- **Host/Client 约定**：Host 半导出 `name` / `inject` / `apply`；Client 半通过 `__ModuleLoader__.load` 注册并返回 `{ inject, apply }`；
- **副作用可逆**：所有注册（路由、槽位、样式）都通过 `ctx.effect` / `slots.inject` 等生命周期 API 挂载，随插件卸载自动清理；
- **数据最小化**：跨端只传递 JSON 标量，不序列化运行时对象；
- **提交前自检**：`node --check lib/index.js` 校验 Host 语法；确认 `cordis.patch.yml` 的 `insert` 条目与包名一致。

### 开发流程

1. Fork 本仓库并克隆到本地；
2. 修改 `lib/` 下的 Host/Client 代码；
3. 本地链接到 DSH profile 验证 UI 与接口行为；
4. 提交 PR，附上改动说明与截图（如有）。

## 许可证

[MIT](./LICENSE)
