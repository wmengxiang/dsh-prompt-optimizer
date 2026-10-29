/**
 * dsh-prompt-optimizer — prompt optimizer (client half)
 *
 * 在输入框工具行左侧注册一个图标按钮：点击后 POST /api/prompt-optimizer
 * 优化当前草稿并回填。界面不显示说明文字，仅在悬停时通过 title 展示；
 * 优化中按钮切换为旋转图标并叠加一条不确定进度条，成功后短暂显示对勾，
 * 失败则变红并显示感叹号（title 给出原因）——任何结果都有可见反馈。
 */
window.__ModuleLoader__.load({
  id: "dsh-prompt-optimizer",
  factory(require) {
    const react = require("react")
    const inject = ["slots"]

    const STYLE_ID = "dsh-prompt-optimizer-style"
    // 反馈态的自动复位定时器。按钮是单实例，模块级即可；宿主 react 只保证核心 hooks。
    let flashTimer = 0
    const CSS = [
      ".dsh-po-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex:none;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#666);cursor:pointer;padding:0;overflow:hidden;transition:color .15s ease}",
      ".dsh-po-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,0.06));color:var(--dsw-alias-label-primary,#222)}",
      ".dsh-po-btn:disabled{cursor:not-allowed;filter:grayscale(1)}",
      ".dsh-po-btn.dsh-po-busy:disabled{cursor:progress;filter:none}",
      ".dsh-po-btn.dsh-po-error{color:var(--dsw-alias-label-danger,#e5484d)}",
      ".dsh-po-btn.dsh-po-error:hover:not(:disabled){color:var(--dsw-alias-label-danger,#e5484d)}",
      ".dsh-po-btn.dsh-po-success{color:var(--dsw-alias-label-success,#12a594)}",
      ".dsh-po-spark{font-size:15px;line-height:1}",
      ".dsh-po-spinner{animation:dsh-po-spin .8s linear infinite}",
      ".dsh-po-pop{animation:dsh-po-pop .18s ease-out}",
      "@keyframes dsh-po-spin{to{transform:rotate(360deg)}}",
      "@keyframes dsh-po-pop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}",
      ".dsh-po-progress{position:absolute;left:0;bottom:0;width:100%;height:2px;overflow:hidden}",
      ".dsh-po-progress::before{content:\"\";position:absolute;width:40%;height:100%;background:var(--dsw-alias-brand-primary,#3b82f6);border-radius:9999px;animation:dsh-po-slide 1.1s ease-in-out infinite}",
      "@keyframes dsh-po-slide{0%{left:-40%}100%{left:100%}}"
    ].join("\n")

    /** 空闲图标：真正的 ✨ emoji 字形（用户指定），跨平台 NotoColorEmoji / Apple Color Emoji 均有该字形。 */
    function SparkleIcon() {
      return react.createElement("span", { className: "dsh-po-spark", "aria-hidden": true }, "✨")
    }

    function SpinnerIcon() {
      return react.createElement("svg", {
        width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
        stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round",
        className: "dsh-po-spinner",
        "aria-hidden": true
      },
        react.createElement("circle", { cx: 12, cy: 12, r: 9, opacity: 0.25 }),
        react.createElement("path", { d: "M21 12a9 9 0 0 0-9-9" })
      )
    }

    function CheckIcon() {
      return react.createElement("svg", {
        width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
        stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round",
        className: "dsh-po-pop",
        "aria-hidden": true
      }, react.createElement("path", { d: "M20 6 9 17l-5-5" }))
    }

    function AlertIcon() {
      return react.createElement("svg", {
        width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
        stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round",
        className: "dsh-po-pop",
        "aria-hidden": true
      },
        react.createElement("circle", { cx: 12, cy: 12, r: 9, opacity: 0.25 }),
        react.createElement("path", { d: "M12 7.5v5.5" }),
        react.createElement("circle", { cx: 12, cy: 16.5, r: 1.1, fill: "currentColor", stroke: "none" })
      )
    }

    /** 稳定 selector：返回字符串原始值，配合 useSyncExternalStoreWithSelector 无订阅抖动。 */
    const selectDraft = (s) => s && typeof s.draft === "string" ? s.draft : ""

    function OptimizeButton(props) {
      // idle | busy | success | error —— 每个终态都带可见反馈，避免"点了没反应"。
      const [status, setStatus] = react.useState("idle")
      const [message, setMessage] = react.useState("")

      const flash = (next, text, ms) => {
        setStatus(next)
        setMessage(text)
        clearTimeout(flashTimer)
        flashTimer = setTimeout(() => { setStatus("idle"); setMessage("") }, ms)
      }

      // 0.1.2+ 宿主：草稿经会话标准 kit 的 useInput 选择器 hook 下发（renderSlot 的
      // owner props 已改为空对象）；旧宿主：直接传 props.input 快照。宿主版本在页面
      // 生命周期内恒定，两条分支不会在重渲染之间切换，不违反 hook 规则。
      // hook 值恒优先：若 hook 存在但草稿被清空，绝不能回落到 props.input 里的
      // 陈旧快照，否则按钮会对着旧文本错误地保持可用。
      const draft = typeof props.useInput === "function"
        ? props.useInput(selectDraft)
        : selectDraft(props.input)
      const busy = status === "busy"
      const disabled = busy || draft.trim() === ""

      const onClick = async () => {
        const text = draft
        if (text.trim() === "" || busy) return
        setStatus("busy")
        setMessage("")
        try {
          const res = await fetch("/api/prompt-optimizer", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: text }),
            cache: "no-store"
          })
          const data = await res.json().catch(() => null)
          if (!res.ok || !data || typeof data.optimized !== "string" || data.optimized.trim() === "") {
            const message = data && typeof data.error === "string" ? data.error : ("HTTP " + res.status)
            console.error("[dsh-prompt-optimizer]", message)
            flash("error", message, 5000)
            return
          }
          const actions = props.inputActions
          if (actions && typeof actions.setDraft === "function") {
            actions.setDraft(data.optimized)
            flash("success", "已优化", 1400)
          } else {
            console.error("[dsh-prompt-optimizer]", "host did not provide inputActions.setDraft")
            flash("error", "宿主未提供草稿回填能力", 5000)
          }
        } catch (error) {
          console.error("[dsh-prompt-optimizer]", error)
          flash("error", error instanceof Error ? error.message : String(error), 5000)
        }
      }

      const title = status === "busy"
        ? "正在优化提示词…"
        : status === "success"
          ? (message || "已优化")
          : status === "error"
            ? "优化失败：" + (message || "未知错误")
            : "优化提示词"

      const icon = status === "busy"
        ? react.createElement(SpinnerIcon)
        : status === "success"
          ? react.createElement(CheckIcon)
          : status === "error"
            ? react.createElement(AlertIcon)
            : react.createElement(SparkleIcon)

      const className = "dsh-po-btn"
        + (status === "busy" ? " dsh-po-busy" : "")
        + (status === "success" ? " dsh-po-success" : "")
        + (status === "error" ? " dsh-po-error" : "")

      return react.createElement("button", {
        type: "button",
        className: className,
        title: title,
        "aria-label": title,
        disabled: disabled,
        onClick: onClick
      },
        icon,
        busy ? react.createElement("span", { className: "dsh-po-progress" }) : null
      )
    }

    function apply(ctx) {
      // 幂等样式注入：存在则刷新内容（HMR 只重放模块不重载页面时，旧写法会让新 CSS 失效）。
      let style = document.getElementById(STYLE_ID)
      if (style === null) {
        style = document.createElement("style")
        style.id = STYLE_ID
        style.setAttribute("data-plugin", "dsh-prompt-optimizer")
        document.head.appendChild(style)
      }
      style.textContent = CSS

      const slots = ctx.get("slots")
      if (slots === undefined) return

      slots.inject("conversation.input.left", () => slots.register(
        { name: "conversation.input.left", id: "dsh-prompt-optimizer" },
        (props) => react.createElement(OptimizeButton, props)
      ))
    }

    return { inject, apply }
  }
})
