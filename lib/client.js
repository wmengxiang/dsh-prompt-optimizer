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
      ".dsh-po-spinner{animation:dsh-po-spin .8s linear infinite}",
      "@keyframes dsh-po-spin{to{transform:rotate(360deg)}}",
      ".dsh-po-progress{position:absolute;left:0;bottom:0;width:100%;height:2px;overflow:hidden}",
      ".dsh-po-progress::before{content:\"\";position:absolute;width:40%;height:100%;background:var(--dsw-alias-brand-primary,#3b82f6);border-radius:9999px;animation:dsh-po-slide 1.1s ease-in-out infinite}",
      "@keyframes dsh-po-slide{0%{left:-40%}100%{left:100%}}"
    ].join("\n")

    function SparkleIcon() {
      return react.createElement("svg", {
        width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
        stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
        "aria-hidden": true
      },
        react.createElement("path", { d: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z" }),
        react.createElement("path", { d: "M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8L16.5 17.5l1.8-.7L19 15z" })
      )
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

    function OptimizeButton(props) {
      const [busy, setBusy] = react.useState(false)
      const draft = props.input && typeof props.input.draft === "string" ? props.input.draft : ""
      const disabled = busy || draft.trim() === ""

      const onClick = async () => {
        const text = props.input && typeof props.input.draft === "string" ? props.input.draft : ""
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
