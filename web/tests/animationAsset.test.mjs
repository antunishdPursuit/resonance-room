import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const ANIMATION_ASSET_URL = new URL(
  '../public/animations/UAL1_Standard.glb',
  import.meta.url,
)

const APPROVED_ANIMATION_CLIPS = [
  'A_TPose',
  'Dance_Loop',
  'Idle_Loop',
  'Idle_Talking_Loop',
  'Idle_Torch_Loop',
  'Interact',
  'Jog_Fwd_Loop',
  'Punch_Cross',
  'Punch_Jab',
  'Spell_Simple_Enter',
  'Spell_Simple_Exit',
  'Spell_Simple_Idle_Loop',
  'Spell_Simple_Shoot',
  'Walk_Loop',
]

function readAnimationNames(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF')

  const jsonChunkLength = buffer.readUInt32LE(12)
  const jsonChunkType = buffer.readUInt32LE(16)
  assert.equal(jsonChunkType, 0x4e4f534a)

  const document = JSON.parse(
    buffer
      .subarray(20, 20 + jsonChunkLength)
      .toString('utf8')
      .replace(/\0+$/u, '')
      .trimEnd(),
  )

  return document.animations
    .map(animation => animation.name)
    .sort((left, right) => left.localeCompare(right))
}

test('bundles only the approved production animation clips', () => {
  const animationAsset = readFileSync(ANIMATION_ASSET_URL)

  assert.deepEqual(
    readAnimationNames(animationAsset),
    [...APPROVED_ANIMATION_CLIPS].sort((left, right) => (
      left.localeCompare(right)
    )),
  )
})
