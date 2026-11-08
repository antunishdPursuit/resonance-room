import * as THREE from 'three'

const WOOD_NODES = new Set([18, 21, 23, 31, 50])
const SHADOW_NODES = new Set([18, 19, 21, 23, 31, 33, 34, 50])

export function createClassroomLighting({ scene, renderer }) {
  const previousShadowSettings = {
    enabled: renderer.shadowMap.enabled,
    type: renderer.shadowMap.type,
  }
  const lights = new THREE.Group()
  lights.name = 'Classroom afternoon lighting'
  lights.add(new THREE.HemisphereLight(0xffe8d5, 0x685568, 1.25))
  const sun = new THREE.DirectionalLight(0xffd2ad, 2.2)
  sun.position.set(8, 7, -2)
  sun.target.position.set(0, 0, 0)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 25 })
  sun.shadow.normalBias = 0.025
  sun.shadow.bias = -0.0001
  lights.add(sun, sun.target)
  scene.add(lights)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  return {
    dispose() {
      lights.removeFromParent()
      sun.shadow.dispose()
      Object.assign(renderer.shadowMap, previousShadowSettings)
    },
  }
}

function addSurfaceVariation(material, kind) {
  material.roughness = kind === 'wood' ? 0.7 : 0.9
  material.onBeforeCompile = (shader) => {
    const varying = 'varying vec3 vRoomPosition; varying float vRoomUp;\n'
    shader.vertexShader =
      varying +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `vRoomPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
       vRoomUp = abs(normalize(mat3(modelMatrix) * objectNormal).y);
       #include <project_vertex>`,
      )
    const variation =
      kind === 'wood'
        ? `float grain = sin(vRoomPosition.x * 210.0 + sin(vRoomPosition.z * 18.0) * 2.0);
         grain *= 1.0 - smoothstep(0.1, 0.8, fwidth(vRoomPosition.x * 210.0));
         diffuseColor.rgb *= 0.98 + grain * 0.02;`
        : `if (vRoomUp > 0.9 && abs(vRoomPosition.y) < 0.025) {
           vec2 p = vRoomPosition.xz;
           float row = floor(p.x / 0.22);
           vec2 plank = fract(vec2(p.x / 0.22, p.y / 1.4 + mod(row, 2.0) * 0.5));
           float edge = smoothstep(0.0, 0.025, min(plank.x, 1.0 - plank.x));
           edge *= smoothstep(0.0, 0.012, min(plank.y, 1.0 - plank.y));
           float grain = sin(p.x * 200.0 + sin(p.y * 8.0));
           diffuseColor.rgb = vec3(0.24, 0.13, 0.075) * mix(0.78, 1.04 + grain * 0.025, edge);
           float reach = max(4.3 - vRoomPosition.x, 0.0);
           float height = vRoomPosition.y + reach * 0.875;
           float along = vRoomPosition.z - reach * 0.25;
           float aperture = smoothstep(1.13, 1.2, height) * (1.0 - smoothstep(2.85, 2.95, height));
           float opening = smoothstep(-3.7, -3.6, along) * (1.0 - smoothstep(-1.5, -1.4, along));
           opening += smoothstep(1.5, 1.6, along) * (1.0 - smoothstep(3.5, 3.6, along));
           float panes = smoothstep(0.04, 0.08, fract((along + 4.6) / 0.9));
           panes *= smoothstep(0.04, 0.08, fract((height - 1.13) / 0.9));
           diffuseColor.rgb *= 1.0 + aperture * opening * panes * 0.38;
         }`
    shader.fragmentShader =
      varying +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n${variation}`,
      )
  }
  material.customProgramCacheKey = () => `classroom-surface-${kind}-1`
}

export function applyClassroomAppearance(classroomMeshes) {
  const originals = []
  const materials = new Map()
  for (const mesh of classroomMeshes) {
    const node = mesh.userData.classroomSource?.nodeIndex
    const state = {
      mesh,
      material: mesh.material,
      castShadow: mesh.castShadow,
      receiveShadow: mesh.receiveShadow,
      position: mesh.position.clone(),
      scale: mesh.scale.clone(),
    }
    originals.push(state)
    mesh.castShadow = SHADOW_NODES.has(node)
    mesh.receiveShadow = true
    const kind = WOOD_NODES.has(node) ? 'wood' : node === 52 ? 'room' : null
    if (kind && !Array.isArray(mesh.material)) {
      const key = `${mesh.material.uuid}-${kind}`
      if (!materials.has(key)) {
        const material = mesh.material.clone()
        addSurfaceVariation(material, kind)
        materials.set(key, material)
      }
      mesh.material = materials.get(key)
    }
    if (node === 45) {
      mesh.geometry.computeBoundingBox()
      mesh.scale.z *= 0.25
      mesh.position.z += mesh.geometry.boundingBox.min.z * state.scale.z * 0.75
    }
  }
  return {
    dispose() {
      for (const state of originals) {
        Object.assign(state.mesh, {
          material: state.material,
          castShadow: state.castShadow,
          receiveShadow: state.receiveShadow,
        })
        state.mesh.position.copy(state.position)
        state.mesh.scale.copy(state.scale)
      }
      materials.forEach((material) => material.dispose())
    },
  }
}
