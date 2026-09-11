/**
 * dsh-prompt-optimizer — prompt optimizer (client half)
 *
 * 在输入框工具行左侧注册一个图标按钮：点击后 POST /api/prompt-optimizer
 * 优化当前草稿并回填。界面不显示说明文字，仅在悬停时通过 title 展示；
 * 优化中按钮切换为旋转图标并叠加一条不确定进度条。
 */
window.__ModuleLoader__.load({
  id: "dsh-prompt-optimizer",
  factory(require) {
    const react = require("react")
    const inject = ["slots"]

    const STYLE_ID = "dsh-prompt-optimizer-style"
    const CSS = [
      ".dsh-po-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;flex:none;border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#666);cursor:pointer;padding:0;overflow:hidden}",
      ".dsh-po-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,0.06));color:var(--dsw-alias-label-primary,#222)}",
      ".dsh-po-btn:disabled{opacity:.45;cursor:not-allowed}",
      ".dsh-po-btn.dsh-po-busy:disabled{opacity:1;cursor:progress}",
      ".dsh-po-spark{font-size:15px;line-height:1}",
      ".dsh-po-spinner{animation:dsh-po-spin .8s linear infinite}",
      "@keyframes dsh-po-spin{to{transform:rotate(360deg)}}",
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

    /** 稳定 selector：返回字符串原始值，配合 useSyncExternalStoreWithSelector 无订阅抖动。 */
    const selectDraft = (s) => s && typeof s.draft === "string" ? s.draft : ""

    function OptimizeButton(props) {
      const [busy, setBusy] = react.useState(false)
      // 0.1.2+ 宿主：草稿经会话标准 kit 的 useInput 选择器 hook 下发（renderSlot 的
      // owner props 已改为空对象）；旧宿主：直接传 props.input 快照。宿主版本在页面
      // 生命周期内恒定，两条分支不会在重渲染之间切换，不违反 hook 规则。
      const draft = typeof props.useInput === "function"
        ? props.useInput(selectDraft)
        : selectDraft(props.input)
      const disabled = busy || draft.trim() === ""

      const onClick = async () => {
        const text = draft
        if (text.trim() === "" || busy) return
        setBusy(true)
        try {
          const res = await fetch("/api/prompt-optimizer", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ text: text }),
            cache: "no-store"
          })
          const data = await res.json().catch(() => null)
          if (res.ok && data && typeof data.optimized === "string" && data.optimized.trim() !== "") {
            if (props.inputActions && typeof props.inputActions.setDraft === "function") {
              props.inputActions.setDraft(data.optimized)
            }
          } else {
            const message = data && typeof data.error === "string" ? data.error : ("HTTP " + res.status)
            console.error("[dsh-prompt-optimizer]", message)
          }
        } catch (error) {
          console.error("[dsh-prompt-optimizer]", error)
        } finally {
          setBusy(false)
        }
      }

      return react.createElement("button", {
        type: "button",
        className: "dsh-po-btn" + (busy ? " dsh-po-busy" : ""),
        title: busy ? "正在优化提示词…" : "优化提示词",
        "aria-label": busy ? "正在优化提示词…" : "优化提示词",
        disabled: disabled,
        onClick: onClick
      },
        busy ? react.createElement(SpinnerIcon) : react.createElement(SparkleIcon),
        busy ? react.createElement("span", { className: "dsh-po-progress" }) : null
      )
    }

    function apply(ctx) {
      if (document.getElementById(STYLE_ID) === null) {
        const style = document.createElement("style")
        style.id = STYLE_ID
        style.setAttribute("data-plugin", "dsh-prompt-optimizer")
        style.textContent = CSS
        document.head.appendChild(style)
      }

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
