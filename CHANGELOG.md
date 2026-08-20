# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-08-18

### Added

- 首次发布 `dsh-prompt-optimizer`：在 DSH Web 输入框工具行左侧新增 ✨ 图标按钮，一键调用当前激活模型把草稿提示词优化得更清晰、更具体，并自动回填。
- Host 半：注册 `POST /api/prompt-optimizer` 数据路由，读取当前默认模型并通过 `ctx.llm.stream` 流式生成优化结果。
- Client 半：通过 `__ModuleLoader__` 向 `conversation.input.left` 槽位注入图标按钮，含悬停提示、加载旋转圈与底部进度条、空内容置灰保护。
- 组合补丁 `cordis.patch.yml`：随 profile 组合自动挂载，`dsh plugin add` 后重启即可持久化加载。
- 安装方式：本地路径、`github:` 源、手动接入组合、动态插件（临时试用）。
