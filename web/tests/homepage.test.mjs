import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))

test('mixed-input controls retain touch, keyboard and mouse instructions', async () => {
  const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { ControlsMenu } = await server.ssrLoadModule('/src/components/ExperienceUI.jsx')
    const markup = renderToStaticMarkup(
      createElement(ControlsMenu, {
        open: true,
        isPhone: false,
        touchControls: true,
        cameraMode: 'free',
        isStatic: true,
      }),
    )
    assert.match(markup, /Joystick, WASD or arrow keys/)
    assert.match(markup, /hold Shift/)
    assert.match(markup, /Use the mouse wheel/)
    assert.match(markup, /right side on touch/)
  } finally {
    await server.close()
  }
})

for (const mode of ['static', 'backend']) {
  test(`homepage keeps ${mode} explanations inside About`, async () => {
    const server = await createServer({
      root,
      server: { middlewareMode: true },
      appType: 'custom',
      define: { 'import.meta.env.VITE_APP_MODE': JSON.stringify(mode) },
    })
    try {
      const { default: HomePage } = await server.ssrLoadModule('/src/components/HomePage.jsx')
      const markup = renderToStaticMarkup(createElement(HomePage, { onEnter() {} }))
      const [landing, about] = markup.split('<dialog')
      assert.equal((landing.match(/Resonance/g) ?? []).length, 1)
      assert.doesNotMatch(landing, /Meet Riri|catalog|Before you enter|experiment|Choose a vibe/)
      assert.match(landing, /classroom-poster\.jpg/)
      assert.match(about, /Meet Riri/)
      assert.match(about, /small experiment in music discovery/)
      assert.match(about, /Claude/)
      assert.match(about, /Last.fm/)
      assert.match(markup, /Enter the room/)
      if (mode === 'backend') {
        assert.match(about, /local recommendation server/)
        assert.match(about, /Tell Riri what you like/)
        assert.doesNotMatch(about, /This public demo uses/)
      } else {
        assert.match(about, /built-in catalog of 36 songs/)
        assert.match(about, /Choose a vibe/)
        assert.match(about, /does not connect to Claude/)
      }
    } finally {
      await server.close()
    }
  })
}

test('preparation and rotation show entry guidance, while errors prioritize recovery', async () => {
  const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: RoomLoading } = await server.ssrLoadModule('/src/components/RoomLoading.jsx')
    for (const rotate of [false, true]) {
      const markup = renderToStaticMarkup(createElement(RoomLoading, { rotate, onBack() {} }))
      assert.match(markup, rotate ? /Turn your screen sideways/ : /Preparing the room…/)
      assert.match(markup, /Before You Enter/)
      assert.match(markup, /WASD or the arrow keys/)
      assert.match(markup, /Hold Shift to run/)
      assert.match(markup, /joystick; push to its outer edge to run/)
      assert.match(markup, /Small touch screens need landscape/)
      assert.match(markup, /Free camera is on/)
      assert.match(markup, /Choose Follow/)
      assert.match(markup, /Voice is off/)
      assert.match(markup, /Back to home/)
    }
    const error = renderToStaticMarkup(createElement(RoomLoading, { failed: true, onBack() {} }))
    assert.match(error, /role="alert"/)
    assert.match(error, /Reload page/)
    assert.match(error, /Back to home/)
    assert.doesNotMatch(error, /Before You Enter/)
    assert.doesNotMatch(error, />Continue</)
  } finally {
    await server.close()
  }
})

test('Continue is enabled only when ready, correctly oriented and not fading', async () => {
  const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { default: RoomLoading } = await server.ssrLoadModule('/src/components/RoomLoading.jsx')
    const render = (props) =>
      renderToStaticMarkup(createElement(RoomLoading, { onBack() {}, onContinue() {}, ...props }))
    for (const props of [
      {},
      { ready: true, rotate: true },
      { ready: true, fading: true },
      { ready: true, onContinue: undefined },
    ]) {
      assert.match(render(props), /<button[^>]*disabled=""[^>]*>Continue<\/button>/)
    }
    const ready = render({ ready: true })
    assert.match(ready, /The room is ready/)
    assert.match(ready, /role="status">The room is ready/)
    assert.doesNotMatch(ready, /loading-screen__ring/)
    assert.match(ready, /<button class="button button--primary">Continue<\/button>/)
    assert.match(ready, /Before You Enter/)
  } finally {
    await server.close()
  }
})
