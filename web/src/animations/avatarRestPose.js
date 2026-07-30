import { bone } from './utils.js'

// Z-axis rotations for VRM normalized humanoid bones at rest.
const REST = {
  leftUpperArm: 1,
  rightUpperArm: -1,
  leftLowerArm: 0,
  rightUpperLeg: 0,
  hips: 0,
}

// Set the initial pose so the avatar does not briefly appear in a T-pose
// before the first animation takes control.
export function applyRestPose(vrm) {
  for (const [name, rotationZ] of Object.entries(REST)) {
    const node = bone(vrm, name)
    if (node) node.rotation.z = rotationZ
  }
}
