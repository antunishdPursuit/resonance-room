// Null-safe bone lookup. All callers guard on the return value so missing bones
// silently skip rather than throwing.
export function bone(vrm, name) {
  return vrm.humanoid?.getNormalizedBoneNode(name) ?? null
}
