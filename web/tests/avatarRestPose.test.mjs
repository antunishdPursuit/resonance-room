import test from 'node:test'
import assert from 'node:assert/strict'

import { applyRestPose } from '../src/animations/avatarRestPose.js'

function createVrm(boneNames) {
  const bones = new Map(
    boneNames.map((name) => [name, { rotation: { z: 99 } }]),
  )

  return {
    bones,
    vrm: {
      humanoid: {
        getNormalizedBoneNode(name) {
          return bones.get(name) ?? null
        },
      },
    },
  }
}

test('applyRestPose sets the required normalized bones', () => {
  const { bones, vrm } = createVrm([
    'leftUpperArm',
    'rightUpperArm',
    'leftLowerArm',
    'rightUpperLeg',
    'hips',
  ])

  applyRestPose(vrm)

  assert.equal(bones.get('leftUpperArm').rotation.z, 1)
  assert.equal(bones.get('rightUpperArm').rotation.z, -1)
  assert.equal(bones.get('leftLowerArm').rotation.z, 0)
  assert.equal(bones.get('rightUpperLeg').rotation.z, 0)
  assert.equal(bones.get('hips').rotation.z, 0)
})

test('applyRestPose tolerates optional missing bones', () => {
  const { bones, vrm } = createVrm(['hips'])

  assert.doesNotThrow(() => applyRestPose(vrm))
  assert.equal(bones.get('hips').rotation.z, 0)
})
