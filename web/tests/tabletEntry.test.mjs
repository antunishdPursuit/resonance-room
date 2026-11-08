import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyPhoneViewport,
  supportsTouchControls,
  getEntryState,
  shouldShowMobileControls,
} from '../src/ui/mobileControls.js'

test('touch tablets and desktops get movement controls without forced rotation', () => {
  for (const input of [
    { width: 768, height: 1024, coarsePointer: true },
    { width: 1024, height: 768, coarsePointer: true },
    { width: 768, height: 1024, touchCapable: true, coarsePointer: false },
    { width: 1080, height: 1920, touchCapable: true, coarsePointer: false },
  ]) {
    const viewport = classifyPhoneViewport(input)
    assert.equal(viewport.isPhone, false)
    assert.equal(supportsTouchControls(input), true)
    assert.equal(
      getEntryState({
        requiresLandscape: viewport.isPhone,
        isLandscape: viewport.isLandscape,
        assetsReady: true,
        entryStarted: false,
      }),
      'ready',
    )
    assert.equal(
      shouldShowMobileControls({
        isPhone: supportsTouchControls(input),
        isLandscape: !viewport.isPhone || viewport.isLandscape,
        entryStarted: true,
        loaderVisible: false,
      }),
      true,
    )
  }
})

test('narrow touch screens keep rotation gating while keyboard and invalid viewports stay unchanged', () => {
  const phone = classifyPhoneViewport({ width: 390, height: 844, touchCapable: true })
  assert.equal(
    getEntryState({
      requiresLandscape: phone.isPhone,
      isLandscape: phone.isLandscape,
      assetsReady: true,
      entryStarted: false,
    }),
    'rotate-to-start',
  )
  for (const input of [
    { width: 1024, height: 768, coarsePointer: false },
    { width: 1080, height: 1920, coarsePointer: false },
    { width: Infinity, height: 768, touchCapable: true },
  ]) {
    const viewport = classifyPhoneViewport(input)
    assert.equal(viewport.isPhone, false)
    assert.equal(supportsTouchControls(input), false)
  }
})
