/**
 * dsh-prompt-optimizer — prompt optimizer (host half)
 *
 * Serves one JSON endpoint to the browser:
 *
 *   POST /api/prompt-optimizer   { text }  ->  { optimized } | { error }
 *
 * Uses the active default model (`agentDefaultModel`) to rewrite the draft
 * prompt so it is clearer and more specific, streaming the reply via `ctx.llm`.
 * Only scalars cross the wire — no live objects.
 */
export const name = 'dsh-prompt-optimizer'

// Hard dependencies: the plugin waits until these services are mounted.
export const inject = ['webServer', 'llm', 'agentDefaultModel']

/** 注册数据路由；关键依赖缺失时静默跳过（优化按钮是锦上添花，不阻塞宿主）。 */
export function apply(ctx) {
  const webServer = ctx.webServer
  const llm = ctx.llm
  const defaultModel = ctx.agentDefaultModel
  if (webServer === undefined || llm === undefined) return

  ctx.effect(() => webServer.register({
    kind: 'exact',
    path: '/api/prompt-optimizer',
    handler: async (req, res) => {
      try {
        if (req.method !== 'POST') {
          writeJson(res, 405, { error: 'method not allowed' })
          return
        }

        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        const raw = Buffer.concat(chunks).toString('utf8')

        let payload
        try {
          payload = JSON.parse(raw)
        } catch {
          writeJson(res, 400, { error: 'invalid JSON' })
          return
        }

        const text = payload && typeof payload.text === 'string' ? payload.text : ''
        if (text.trim() === '') {
          writeJson(res, 400, { error: 'empty prompt' })
          return
        }

        const sel = defaultModel !== undefined ? defaultModel.currentSelection() : undefined
        const provider = sel && typeof sel.provider === 'string' ? sel.provider : undefined
        const model = sel && typeof sel.model === 'string' ? sel.model : undefined
        if (provider === undefined || model === undefined) {
          writeJson(res, 503, { error: 'no model selection available' })
          return
        }

        const system = [
          'You are a prompt optimization assistant.',
          'Rewrite the user prompt to be clearer, more specific, and more effective for an AI coding agent.',
          'Preserve the original intent, task, and language.',
          'Output ONLY the optimized prompt: no preamble, no quotes, no explanation.'
        ].join(' ')

        const messages = [{
          id: 'prompt-optimizer-user',
          role: 'user',
          content: [{ type: 'text', text: text }],
          source: { kind: 'user' }
        }]

        const options = {
          provider: provider,
          model: model,
          messages: messages,
          system: system,
          maxTokens: 2000
        }
        if (typeof sel.reasoningEffort === 'string') options.reasoningEffort = sel.reasoningEffort

        let out = ''
        let finishKind = 'stop'
        let finishMessage = ''
        for await (const chunk of llm.stream(options)) {
          if (chunk.type === 'text-delta') {
            out += chunk.text
          } else if (chunk.type === 'finish' && chunk.reason) {
            finishKind = chunk.reason.kind
            if (chunk.reason.failure && typeof chunk.reason.failure.message === 'string') {
              finishMessage = chunk.reason.failure.message
            }
          }
        }

        if (finishKind !== 'stop') {
          writeJson(res, 502, { error: finishMessage !== '' ? finishMessage : ('model call finished: ' + finishKind) })
          return
        }

        const optimized = out.trim()
        if (optimized === '') {
          writeJson(res, 502, { error: 'model produced no output' })
          return
        }

        writeJson(res, 200, { optimized: optimized })
      } catch (error) {
        writeJson(res, 500, { error: error instanceof Error ? error.message : String(error) })
      }
    }
  }), 'dsh-prompt-optimizer: /api/prompt-optimizer route')
}

/** 统一 JSON 响应。 */
function writeJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  })
  res.end(JSON.stringify(body))
}
