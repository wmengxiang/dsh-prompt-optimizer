# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [1.0.5] - 2026-10-29

### Fixed

- **点击 ✨ 后“没有优化”**：原文此前以裸 user message 发送，模型会把「帮我优化一下这个需求描述」这类自带动词的输入当成对话请求，答成「请把需求描述粘贴出来」或输出带 `[在此粘贴]` 占位符的模板，用户看到的就是“根本没优化”。现在原文包进 `<prompt_to_optimize>` 标签并作为数据下发，system 明确禁止回答/执行/追问/占位符，并用两条 few-shot 覆盖“空泛短指令”和“元指令”两类输入；实测「写个登录页」「把首页改好看点」等短指令会扩展为可执行提示词，长指令保持原意并结构化。
- **点击后没有任何提示反应**：请求失败、宿主未提供 `setDraft`、网络异常此前只写 `console.error`，界面完全静默。现在成功回填后短暂显示绿色对勾（1.4s），任何失败都切到红色感叹号并把原因放进 title/aria-label（5s），不再有静默失败。
- 草稿读取加双保险：`useInput` 选择器返回空串时回退到旧宿主 `props.input` 快照，避免草稿有内容而按钮仍置灰导致“点了没反应”。
- `maxTokens` 2000 → 4000，长提示词优化不再被截断。

## [1.0.4] - 2026-09-12

### Fixed

- 1.0.3 的禁用态过度保守（opacity .95 + saturate .45 对 15px emoji 几乎不可感知），启用/禁用看起来相同。改为 `filter:grayscale(1)`：禁用 = 纯灰 ✨，启用 = 全彩 ✨，色相差异一眼可辨；同时实测前景对比度 35.4 vs 35.8（像素统计），禁用态与启用态一样清晰、不再发虚。

## [1.0.3] - 2026-09-12

### Fixed

- 禁用态图标过淡难以辨认：原「次级文字色 + 45% 透明度」双重衰减把 ✨ emoji 压得近乎隐形。现改为保持亮度（opacity .95）+ 降饱和（saturate .45）表达禁用感，配合原有 `cursor:not-allowed`，语义清晰且看得清。
- 样式注入改为幂等刷新：HMR 热替换模块（不刷新页面）时旧样式元素会残留上一版 CSS，此前"已存在即跳过"的写法让新样式永不落地；现每次 apply 都重写 textContent。

## [1.0.2] - 2026-09-11

### Changed

- 空闲图标由手绘 SVG 星芒改为真正的 ✨ emoji 字形（15px，随主题文字色），加载旋转图标保持不变。
- 已在 DSH Web 0.1.5-rc.x 环境经 headless 浏览器端到端实测：输入解除置灰、点击优化、草稿回填全链路正常（1.0.1 的 `useInput` 契约兼容代码在新宿主下无回归）。

## [1.0.1] - 2026-09-10

### Fixed

- 适配 DSH Web 0.1.2 槽位系统重构：`conversation.input.left` 的渲染点不再把 `input` 快照作为 owner props 下发，草稿改经会话标准 kit 的 `useInput(selector)` hook 提供（`inputActions` 仍为 prop）。旧读法恒得 `undefined`，✨ 按钮被永久置灰。现优先走 `useInput`，同时保留对旧宿主 `props.input` 的兼容回退。
- Host 半无需改动：`webServer` / `llm` / `agentDefaultModel` 契约在 0.1.2-rc.1 中保持不变（已对运行中的实例实测 `POST /api/prompt-optimizer` 返回正常）。

## [1.0.0] - 2026-08-18

### Added

- 首次发布 `dsh-prompt-optimizer`：在 DSH Web 输入框工具行左侧新增 ✨ 图标按钮，一键调用当前激活模型把草稿提示词优化得更清晰、更具体，并自动回填。
- Host 半：注册 `POST /api/prompt-optimizer` 数据路由，读取当前默认模型并通过 `ctx.llm.stream` 流式生成优化结果。
- Client 半：通过 `__ModuleLoader__` 向 `conversation.input.left` 槽位注入图标按钮，含悬停提示、加载旋转圈与底部进度条、空内容置灰保护。
- 组合补丁 `cordis.patch.yml`：随 profile 组合自动挂载，`dsh plugin add` 后重启即可持久化加载。
- 安装方式：本地路径、`github:` 源、手动接入组合、动态插件（临时试用）。
