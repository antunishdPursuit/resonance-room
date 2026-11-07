import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

for (const mode of ['static', 'backend']) {
  test(`homepage describes the actual ${mode} recommendation controls`, async () => {
    const server = await createServer({
      root,
      server: { middlewareMode: true },
      appType: 'custom',
      define: { 'import.meta.env.VITE_APP_MODE': JSON.stringify(mode) },
    })
    try {
      const { default: HomePage } = await server.ssrLoadModule('/src/components/HomePage.jsx')
      const markup = renderToStaticMarkup(createElement(HomePage, { onEnter() {} }))
      assert.match(markup, /Meet Riri/)
      assert.match(markup, /Enter the room/)
      if (mode === 'backend') {
        assert.match(markup, /Connected recommendations/)
        assert.match(markup, /Tell her what you like/)
        assert.doesNotMatch(markup, /class="home__promise">[^<]*Choose a vibe/)
      } else {
        assert.match(markup, /Built-in 36-song catalog/)
        assert.match(markup, /Meet Riri\. Choose a vibe/)
      }
    } finally {
      await server.close()
    }
  })
}
