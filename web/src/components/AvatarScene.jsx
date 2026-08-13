import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import {
  VRMLookAtQuaternionProxy,
} from '@pixiv/three-vrm-animation'
import { createBlinkState, updateBlink } from '../animations/idle.js'
import {
  AVATAR_ANIMATION_ASSIGNMENTS,
  getAvailableAnimationPreviewGroups,
  getAnimationPreviewLabel,
  getAnimationPreviewSequence,
  isAnimationPreviewSequence,
  LONG_IDLE_VARIATIONS,
  shouldLoopAnimationPreview,
} from '../animations/animationPreview.js'
import { createHumanoidAnimationClip } from '../animations/createHumanoidAnimation.js'
import { createAvatarAnimationController } from '../animations/avatarAnimationController.js'
import { disableUnwantedSpringBones } from '../animations/avatarPhysics.js'
import { applyRestPose } from '../animations/avatarRestPose.js'
import { createLipSyncState, startSpeaking, stopSpeaking, updateLipSync } from '../animations/lipsync.js'
import {
  createSpeakingFaceState,
  startSpeakingFace,
  stopSpeakingFace,
  updateSpeakingFace,
} from '../animations/speakingFace.js'
import { createClassroomInspectionCamera } from '../classroom/classroomInspectionCamera.js'
import { createClassroomInspector } from '../classroom/classroomInspector.js'
import {
  createClassroomMovementEnvironment,
  createCollisionDebugView,
} from '../classroom/classroomMovementEnvironment.js'
import {
  createClassroomCampusEnvironment,
} from '../classroom/classroomCampusEnvironment.js'
import { createAvatarMovementController } from '../classroom/avatarMovementController.js'
import {
  createClassroomOcclusionController,
} from '../classroom/classroomOcclusionController.js'
import {
  createClassroomRecommendationBoard,
} from '../classroom/classroomRecommendationBoard.js'
import {
  OPENING_FADE_DURATION_MS,
  OPENING_GREETING_REVEAL_DELAY_MS,
  positionOpeningAvatar,
  positionOpeningCamera,
  shouldStartOpeningGreeting,
} from '../classroom/classroomOpeningSequence.js'
import {
  createClassroomRecommendationBoardInteraction,
  getBoardInteractionMinimumZ,
  isBoardInteractionEnabled,
} from '../classroom/classroomRecommendationBoardInteraction.js'
import {
  isSongSelected,
  removeSongSelection,
  toggleSongSelection,
} from '../ui/songSelection.js'
import { calculateSpeechBubblePosition } from '../ui/speechBubblePosition.js'
import { createAppConfig } from '../config/appConfig.js'
import { createChatClient } from '../chat/chatClient.js'
import { GUIDED_VIBES } from '../recommendations/fallbackRecommender.js'
import { deriveTasteProfile } from '../recommendations/tasteProfile.js'
import { createBackendVoiceClient } from '../voice/backendVoiceClient.js'
import {
  loadBrowserVoices,
  selectPreferredBrowserVoice,
} from '../voice/browserVoice.js'
import {
  ControlsMenu,
  ExperienceEntryScreen,
  OrientationGate,
  VoiceReminder,
} from './ExperienceUI.jsx'
import {
  MobileTouchControls,
} from './MobileExperience.jsx'
import {
  classifyPhoneViewport,
  shouldShowMobileControls,
} from '../ui/mobileControls.js'

const APP_CONFIG = createAppConfig({
  mode: import.meta.env.VITE_APP_MODE,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
})
const REQUEST_CHAT_REPLY = createChatClient({ appConfig: APP_CONFIG })
const BACKEND_VOICE = createBackendVoiceClient({ appConfig: APP_CONFIG })
const MAX_CHAT_MESSAGES = 20
const SPEECH_BUBBLE_VISIBLE_MS = 7000
const WELCOME_PROMPT = APP_CONFIG.usesBackend
  ? 'Hi, I\u2019m Esme. What kind of songs do you like? You can name a genre, artist, mood, or activity.'
  : 'Hi, I\u2019m Esme. Pick a vibe below and I\u2019ll find six songs for you.'
const PAGE_PARAMETERS = new URLSearchParams(window.location.search)
const CLASSROOM_INSPECTION_ENABLED = import.meta.env.DEV
  && PAGE_PARAMETERS.get('inspectClassroom') === '1'
const COLLISION_DEBUG_ENABLED = import.meta.env.DEV
  && PAGE_PARAMETERS.get('debugCollisions') === '1'
const ANIMATION_PREVIEW_ENABLED = import.meta.env.DEV
  && PAGE_PARAMETERS.get('testAnimations') === '1'

function readPhoneViewport() {
  const mobileUserAgent = navigator.userAgentData?.mobile === true
    || /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent)

  return classifyPhoneViewport({
    width: window.innerWidth,
    height: window.innerHeight,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    touchCapable: navigator.maxTouchPoints > 0,
    mobileUserAgent,
  })
}

export default function AvatarScene() {
  const canvasRef  = useRef(null)
  const vrmRef     = useRef(null)
  const speakRef        = useRef(null)
  const inputRef        = useRef(null)
  const speechBubbleRef = useRef(null)
  const startLipSyncRef = useRef(null)
  const stopLipSyncRef  = useRef(null)
  const analyserRef     = useRef(null)
  const analyserDataRef = useRef(null)
  const classroomInspectorRef = useRef(null)
  const recommendationBoardRef = useRef(null)
  const movementControllerRef = useRef(null)
  const resetCameraRef = useRef(null)
  const animationPreviewRef = useRef(null)
  const animationControllerRef = useRef(null)
  const openingGreetingActionRef = useRef(null)
  const boardInteractionActionRef = useRef(null)
  const openingGreetingPlayedRef = useRef(false)
  const openingTimersRef = useRef({ fade: null, hide: null })
  const speechBubbleVisibleRef = useRef(false)
  const speechBubbleTimerRef = useRef(null)
  const [messages,      setMessages]      = useState([])
  const [loading,       setLoading]       = useState(false)
  const [pickedSongs,   setPickedSongs]   = useState([])
  const [loaderVisible, setLoaderVisible] = useState(true)
  const [loaderFading,  setLoaderFading]  = useState(false)
  const [profileBuilt,       setProfileBuilt]       = useState(false)
  const [voiceEnabled,       setVoiceEnabled]       = useState(false)
  const [useElevenLabs,      setUseElevenLabs]      = useState(false)
  const [elevenLabsAvailable, setElevenLabsAvailable] = useState(false)
  const [phoneViewport, setPhoneViewport] = useState(readPhoneViewport)
  const [entryStarted, setEntryStarted] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)
  const [vibePickerOpen, setVibePickerOpen] = useState(false)
  const [selectedVibe, setSelectedVibe] = useState(null)
  const [voiceReminderShown, setVoiceReminderShown] = useState(false)
  const [voiceReminderVisible, setVoiceReminderVisible] = useState(false)
  const [likedPanelOpen, setLikedPanelOpen] = useState(false)
  const [transcriptOpen, setTranscriptOpen] = useState(false)
  const [inspectedClassroomMesh, setInspectedClassroomMesh] = useState(null)
  const [classroomInventory, setClassroomInventory] = useState([])
  const [classroomCollisionZones, setClassroomCollisionZones] = useState([])
  const [selectedCollisionZone, setSelectedCollisionZone] = useState(null)
  const [collisionZonesVisible, setCollisionZonesVisible] = useState(true)
  const [movementReady, setMovementReady] = useState(false)
  const [previewAnimation, setPreviewAnimation] = useState('Idle_Loop')
  const [loopAnimationPreview, setLoopAnimationPreview] = useState(false)
  const [animationPreviewGroups, setAnimationPreviewGroups] = useState([])
  const [animationPreviewReady, setAnimationPreviewReady] = useState(false)
  const [animationPreviewStatus, setAnimationPreviewStatus] = useState('Loading animations…')
  const [classroomReady, setClassroomReady] = useState(false)
  const [openingGreetingReady, setOpeningGreetingReady] = useState(false)
  const messagesRef      = useRef([])
  const recommendationsRef = useRef([])
  const pickedSongsRef = useRef([])
  const voiceEnabledRef  = useRef(false)
  const useElevenlabsRef = useRef(false)
  const isPhoneExperience = phoneViewport.isPhone
  const isPhoneLandscape = phoneViewport.isLandscape
  const experienceAssetsReady = classroomReady
    && openingGreetingReady
    && movementReady
  const mobileControlsActive = shouldShowMobileControls({
    isPhone: isPhoneExperience,
    isLandscape: isPhoneLandscape,
    entryStarted,
    loaderVisible,
  })

  useEffect(() => { messagesRef.current      = messages      }, [messages])
  useEffect(() => { voiceEnabledRef.current  = voiceEnabled  }, [voiceEnabled])
  useEffect(() => { useElevenlabsRef.current = useElevenLabs }, [useElevenLabs])
  useEffect(() => {
    pickedSongsRef.current = pickedSongs
    recommendationBoardRef.current?.setSelectedSongs(pickedSongs)
  }, [pickedSongs])

  useEffect(() => {
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)')
    const updatePhoneViewport = () => setPhoneViewport(readPhoneViewport())

    window.addEventListener('resize', updatePhoneViewport)
    coarsePointerQuery.addEventListener?.('change', updatePhoneViewport)

    return () => {
      window.removeEventListener('resize', updatePhoneViewport)
      coarsePointerQuery.removeEventListener?.('change', updatePhoneViewport)
    }
  }, [])

  useEffect(() => {
    if (mobileControlsActive) return
    movementControllerRef.current?.cancelTouchInput()
  }, [mobileControlsActive])

  const chatLimitReached = messages.length >= MAX_CHAT_MESSAGES
  const latestEsmeMessage = messages.slice().reverse().find(message => message.role === 'assistant')
  const latestRecommendationMessage = messages
    .slice()
    .reverse()
    .find(message => Array.isArray(message.songs) && message.songs.length > 0)
  const latestRecommendations = latestRecommendationMessage?.songs ?? []

  useEffect(() => {
    recommendationsRef.current = latestRecommendations
    recommendationBoardRef.current?.update(latestRecommendations)
  }, [latestRecommendationMessage])

  useEffect(() => {
    let cancelled = false

    BACKEND_VOICE.checkAvailability()
      .then((available) => {
        if (cancelled) return
        setElevenLabsAvailable(available)
        setUseElevenLabs(available)
        useElevenlabsRef.current = available
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (pickedSongs.length < 5 || profileBuilt) return

    if (APP_CONFIG.usesBackend) {
      setProfileBuilt(true)
      const songList = pickedSongs.map(s => `"${s.title}" by ${s.artist}`).join(', ')
      const autoMsg = `I just picked 5 songs I love: ${songList}. Based on these picks, what can you tell about my music taste? Please recommend new songs I haven't heard — do not suggest any of the songs I just listed.`
      sendMessage(autoMsg)
      return
    }

    const tasteProfile = deriveTasteProfile(pickedSongs)
    if (!tasteProfile) return

    setProfileBuilt(true)
    setMessages(previous => [...previous, {
      role: 'assistant',
      content: `${tasteProfile.summary} I’ll keep that in mind for your next picks.`,
      kind: 'profile',
    }])
    showSpeechBubbleTemporarily()
    speak(tasteProfile.summary)
  }, [pickedSongs, profileBuilt])

  function clearOpeningTimers() {
    clearTimeout(openingTimersRef.current.fade)
    clearTimeout(openingTimersRef.current.hide)
    openingTimersRef.current = { fade: null, hide: null }
  }

  function showSpeechBubbleTemporarily() {
    clearTimeout(speechBubbleTimerRef.current)
    speechBubbleVisibleRef.current = true
    speechBubbleTimerRef.current = setTimeout(() => {
      speechBubbleVisibleRef.current = false
      if (speechBubbleRef.current) {
        speechBubbleRef.current.dataset.visible = 'false'
      }
    }, SPEECH_BUBBLE_VISIBLE_MS)
  }

  function beginOpeningExperience() {
    if (!shouldStartOpeningGreeting({
      classroomReady,
      greetingReady: openingGreetingReady,
      greetingPlayed: openingGreetingPlayedRef.current,
    })) {
      return false
    }

    openingGreetingPlayedRef.current = true
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animationControllerRef.current?.playContextual(
        openingGreetingActionRef.current,
        { repetitions: 3 },
      )
    }
    speak(WELCOME_PROMPT)
    clearOpeningTimers()
    openingTimersRef.current.fade = setTimeout(
      () => setLoaderFading(true),
      OPENING_GREETING_REVEAL_DELAY_MS,
    )
    openingTimersRef.current.hide = setTimeout(() => {
      setLoaderVisible(false)
      showSpeechBubbleTemporarily()
    }, OPENING_GREETING_REVEAL_DELAY_MS + OPENING_FADE_DURATION_MS)
    return true
  }

  function handleReady() {
    if (
      !experienceAssetsReady
      || (isPhoneExperience && !isPhoneLandscape)
      || entryStarted
    ) return

    if (beginOpeningExperience()) {
      setEntryStarted(true)
    }
  }

  useEffect(() => () => {
    clearOpeningTimers()
    clearTimeout(speechBubbleTimerRef.current)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    let disposed = false
    let classroomInspector = null
    let classroomInspectionCamera = null
    let movementEnvironment = null
    let campusEnvironment = null
    let cameraBlockers = null
    let sceneOcclusionMeshes = null
    let movementController = null
    let occlusionController = null
    let collisionDebugView = null
    let animationController = null
    let recommendationBoard = null
    let recommendationBoardInteraction = null
    const previewActions = new Map()

    function startMovementIfReady() {
      if (
        CLASSROOM_INSPECTION_ENABLED
        || movementController
        || !movementEnvironment
        || !vrmRef.current
      ) {
        return
      }

      movementController = createAvatarMovementController({
        avatarRoot: vrmRef.current.scene,
        camera,
        canvas,
        environment: movementEnvironment,
        cameraBlockers,
      })
      movementControllerRef.current = movementController
      resetCameraRef.current = movementController.resetCamera
      if (COLLISION_DEBUG_ENABLED) {
        window.__ESME_MOVEMENT__ = movementController
      }
      setMovementReady(true)
    }

    function startOcclusionIfReady() {
      if (
        CLASSROOM_INSPECTION_ENABLED
        || occlusionController
        || !movementEnvironment
        || !vrmRef.current
      ) {
        return
      }

      occlusionController = createClassroomOcclusionController({
        camera,
        avatarRoot: vrmRef.current.scene,
        classroomMeshes: sceneOcclusionMeshes,
        reducedMotion: window.matchMedia(
          '(prefers-reduced-motion: reduce)',
        ).matches,
      })
    }

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.outputColorSpace = THREE.SRGBColorSpace

    // Scene
    const scene = new THREE.Scene()

    // Camera
    const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 60)
    positionOpeningCamera(camera)

    if (CLASSROOM_INSPECTION_ENABLED) {
      classroomInspectionCamera = createClassroomInspectionCamera({ canvas, camera })
    }

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2)
    keyLight.position.set(1, 2, -2)
    scene.add(keyLight)
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3)
    fillLight.position.set(-2, 1, -1)
    scene.add(fillLight)

    // Shared loader
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))

    // Classroom environment
    loader.load(
      '/Classroom/scene.gltf',
      (gltf) => {
        if (disposed) return

        scene.add(gltf.scene)
        recommendationBoard = createClassroomRecommendationBoard()
        recommendationBoard.update(recommendationsRef.current)
        recommendationBoard.setSelectedSongs(pickedSongsRef.current)
        recommendationBoardRef.current = recommendationBoard
        scene.add(recommendationBoard.object3d)
        movementEnvironment = createClassroomMovementEnvironment({
          classroomRoot: gltf.scene,
          parser: gltf.parser,
        })
        campusEnvironment = createClassroomCampusEnvironment({
          roomBounds: movementEnvironment.walkableBounds,
        })
        scene.add(campusEnvironment.object3d)
        const importedRoomShells = movementEnvironment.classroomMeshes.filter(
          mesh => mesh.userData.classroomSource?.nodeIndex === 52,
        )
        cameraBlockers = [
          ...campusEnvironment.cameraBlockers,
          ...importedRoomShells,
        ]
        sceneOcclusionMeshes = [
          ...movementEnvironment.classroomMeshes.filter(
            mesh => mesh.userData.classroomSource?.nodeIndex !== 52,
          ),
          ...campusEnvironment.occlusionMeshes,
        ]
        const boardInteractionMinimumZ = getBoardInteractionMinimumZ(
          movementEnvironment.deskZones,
        )
        recommendationBoardInteraction = createClassroomRecommendationBoardInteraction({
          canvas,
          camera,
          board: recommendationBoard,
          isInteractionEnabled: () => isBoardInteractionEnabled(
            vrmRef.current?.scene.position,
            boardInteractionMinimumZ,
          ),
          onToggleSong: song => {
            animationControllerRef.current?.playContextual(
              boardInteractionActionRef.current,
            )
            setPickedSongs(prev => toggleSongSelection(prev, song))
          },
        })
        if (COLLISION_DEBUG_ENABLED) {
          collisionDebugView = createCollisionDebugView(
            scene,
            movementEnvironment,
          )
        }
        startOcclusionIfReady()
        startMovementIfReady()
        setClassroomReady(true)

        if (CLASSROOM_INSPECTION_ENABLED) {
          classroomInspector = createClassroomInspector({
            canvas,
            camera,
            scene,
            classroomRoot: gltf.scene,
            parser: gltf.parser,
            onSelection: setInspectedClassroomMesh,
            onFocusCandidate: (bounds, roomBounds) => {
              classroomInspectionCamera?.focusOnBounds(bounds, roomBounds)
            },
            onCollisionZoneSelection: setSelectedCollisionZone,
          })
          classroomInspectorRef.current = classroomInspector
          const inventory = classroomInspector.getInventory()
          const collisionZones = classroomInspector.getCollisionZones()
          setClassroomInventory(inventory)
          setClassroomCollisionZones(collisionZones)
          window.__ESME_CLASSROOM_INVENTORY__ = inventory
          window.__ESME_CLASSROOM_COLLISION_ZONES__ = collisionZones
          classroomInspector.selectInventoryItem(0)
        }
      },
      undefined,
      (err) => {
        if (!disposed) {
          console.error('Classroom load error:', err)
          setClassroomReady(true)
        }
      },
    )

    // Lip sync state
    const lipSync = createLipSyncState()
    const speakingFace = createSpeakingFaceState()
    startLipSyncRef.current = () => {
      startSpeaking(lipSync)
      startSpeakingFace(speakingFace)
      animationControllerRef.current?.setSpeaking(true)
    }
    stopLipSyncRef.current = () => {
      stopSpeaking(lipSync, vrmRef.current)
      stopSpeakingFace(speakingFace)
      animationControllerRef.current?.setSpeaking(false)
    }

    // TTS — exposed to speak button
    speakRef.current = async (text) => {
      if (!text.trim() || !vrmRef.current) return
      window.speechSynthesis.cancel()
      const availableVoices = await loadBrowserVoices(window.speechSynthesis)
      const utterance       = new SpeechSynthesisUtterance(text)
      const preferredVoice  = selectPreferredBrowserVoice(
        availableVoices,
      )
      if (preferredVoice) utterance.voice = preferredVoice
      utterance.onstart     = () => startLipSyncRef.current?.()
      utterance.onend       = () => stopLipSyncRef.current?.()
      utterance.onerror     = () => stopLipSyncRef.current?.()
      window.speechSynthesis.speak(utterance)
    }

    // Load VRM
    loader.load(
      '/Esme.vrm',
      (gltf) => {
        if (disposed) return

        const vrm = gltf.userData.vrm
        disableUnwantedSpringBones(vrm)
        VRMUtils.combineSkeletons(vrm.scene)
        positionOpeningAvatar(vrm.scene)
        scene.add(vrm.scene)
        vrmRef.current = vrm
        applyRestPose(vrm)
        startOcclusionIfReady()
        startMovementIfReady()

        // The animation library creates this proxy implicitly and warns. Creating
        // the same proxy here keeps look-at tracks explicit and the console clean.
        if (vrm.lookAt) {
          const lookAtProxy = new VRMLookAtQuaternionProxy(vrm.lookAt)
          lookAtProxy.name = 'VRMLookAtQuaternionProxy'
          vrm.scene.add(lookAtProxy)
        }

        loader.load(
          '/animations/UAL1_Standard.glb',
          (animationGltf) => {
            if (disposed) return

            const mixer = new THREE.AnimationMixer(vrm.scene)
            const actionFor = (name) => {
              const sourceClip = animationGltf.animations.find(
                animation => animation.name === name,
              )
              if (!sourceClip) return null

              const clip = createHumanoidAnimationClip({
                sourceScene: animationGltf.scene,
                sourceClip,
                vrm,
              })
              return mixer.clipAction(clip)
            }

            const coreActions = {
              idle: actionFor(AVATAR_ANIMATION_ASSIGNMENTS.idle),
              talking: actionFor(AVATAR_ANIMATION_ASSIGNMENTS.talking),
              walking: actionFor(AVATAR_ANIMATION_ASSIGNMENTS.walking),
              running: actionFor(AVATAR_ANIMATION_ASSIGNMENTS.running),
            }
            if (Object.values(coreActions).some(action => !action)) {
              console.error(
                'Animation load error: a required idle, talking, walking, or running clip was not found.',
              )
              return
            }

            const idleVariationsEnabled = !window.matchMedia(
              '(prefers-reduced-motion: reduce)',
            ).matches
            animationController = createAvatarAnimationController({
              mixer,
              actions: coreActions,
              idleVariationsEnabled,
            })
            animationControllerRef.current = animationController
            animationController.setIdleVariations(
              LONG_IDLE_VARIATIONS.map(variation => ({
                ...variation,
                steps: variation.steps.map(step => ({
                  ...step,
                  action: actionFor(step.name),
                })),
              })),
            )
            openingGreetingActionRef.current = actionFor(
              AVATAR_ANIMATION_ASSIGNMENTS.openingGreeting,
            )
            boardInteractionActionRef.current = actionFor(
              AVATAR_ANIMATION_ASSIGNMENTS.interacting,
            )
            if (!openingGreetingActionRef.current) {
              console.error(
                `Opening greeting load error: ${AVATAR_ANIMATION_ASSIGNMENTS.openingGreeting} was not found.`,
              )
            }
            setOpeningGreetingReady(true)

            if (ANIMATION_PREVIEW_ENABLED) {
              const availableAnimations = animationGltf.animations
                .map(animation => animation.name)
                .filter(Boolean)
              availableAnimations.forEach((name) => {
                previewActions.set(name, actionFor(name))
              })
              setAnimationPreviewGroups(
                getAvailableAnimationPreviewGroups(availableAnimations),
              )

              animationPreviewRef.current = {
                play(id, { loop = false } = {}) {
                  try {
                    if (id === 'Current_Pose') {
                      animationController.returnToCoreState()
                      setAnimationPreviewStatus('Current core state')
                      return
                    }
                    const sequence = getAnimationPreviewSequence(id)
                    if (sequence) {
                      const steps = sequence.map(step => ({
                        ...step,
                        action: previewActions.get(step.name),
                      }))
                      if (steps.some(step => !step.action)) {
                        throw new Error(`${id} is incomplete.`)
                      }
                      animationController.playPreviewSequence(steps, {
                        onComplete: () => {
                          setAnimationPreviewStatus('Current core state')
                        },
                      })
                      setAnimationPreviewStatus(`Playing ${id}`)
                      return
                    }
                    const action = previewActions.get(id)

                    if (!action) {
                      throw new Error(`${id} is not available.`)
                    }
                    animationController.playPreview(action, {
                      loop,
                      onComplete: loop
                        ? null
                        : () => {
                          setAnimationPreviewStatus('Current core state')
                        },
                    })
                    setAnimationPreviewStatus(`Playing ${id}`)
                  } catch (error) {
                    console.error('Animation preview error:', error)
                    setAnimationPreviewStatus(`Could not play ${id}`)
                  }
                },
                reset() {
                  animationController.returnToCoreState()
                  setAnimationPreviewStatus('Current core state')
                },
              }
              setAnimationPreviewReady(true)
              setAnimationPreviewStatus('Ready')
            }
          },
          undefined,
          (err) => {
            if (!disposed) console.error('Walk animation load error:', err)
          },
        )
      },
      undefined,
      (err) => {
        if (!disposed) console.error('VRM load error:', err)
      },
    )

    // Blink state
    const blinkState = createBlinkState()

    // Render loop
    const timer = new THREE.Timer()
    timer.connect(document)
    const speechAnchorWorld = new THREE.Vector3()
    const speechAnchorCamera = new THREE.Vector3()
    let animId

    function updateSpeechBubblePosition() {
      const bubble = speechBubbleRef.current
      const vrm = vrmRef.current
      const head = vrm?.humanoid?.getNormalizedBoneNode('head')

      if (!bubble || !head) {
        if (bubble) bubble.dataset.visible = 'false'
        return
      }

      vrm.scene.updateMatrixWorld(true)
      camera.updateMatrixWorld(true)
      head.getWorldPosition(speechAnchorWorld)
      speechAnchorWorld.y += 0.32
      speechAnchorCamera
        .copy(speechAnchorWorld)
        .applyMatrix4(camera.matrixWorldInverse)
      const inFront = speechAnchorCamera.z < 0
      speechAnchorWorld.project(camera)

      const position = calculateSpeechBubblePosition({
        normalizedX: speechAnchorWorld.x,
        normalizedY: speechAnchorWorld.y,
        normalizedZ: speechAnchorWorld.z,
        inFront,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        bubbleWidth: bubble.offsetWidth || 320,
        bubbleHeight: bubble.offsetHeight || 96,
      })

      bubble.style.setProperty('--speech-bubble-x', `${position.left}px`)
      bubble.style.setProperty('--speech-bubble-y', `${position.top}px`)
      bubble.style.setProperty(
        '--speech-bubble-tail-x',
        `${position.tailOffset}px`,
      )
      bubble.dataset.visible = String(
        speechBubbleVisibleRef.current && position.visible,
      )
    }

    function animate(timestamp) {
      animId = requestAnimationFrame(animate)
      timer.update(timestamp)
      const delta = timer.getDelta()
      const vrm = vrmRef.current

      const movement = movementController?.update(delta) ?? {
        moving: false,
        running: false,
      }
      recommendationBoardInteraction?.update()
      if (vrm) {
        animationController?.setMoving(
          movement.moving,
          { running: movement.running },
        )
        animationController?.update(delta)
        updateBlink(vrm, blinkState, delta)
        if (analyserRef.current && analyserDataRef.current) {
          analyserRef.current.getByteFrequencyData(analyserDataRef.current)
          const avg   = analyserDataRef.current.reduce((a, b) => a + b, 0) / analyserDataRef.current.length
          const value = Math.min((avg / 80) * 0.9, 0.9)
          vrm.expressionManager?.setValue('aa', value)
          const jaw = vrm.humanoid?.getNormalizedBoneNode('jaw')
          if (jaw) jaw.rotation.x = value * 0.3
        } else {
          updateLipSync(vrm, lipSync, delta)
        }
        updateSpeakingFace(
          vrm,
          speakingFace,
          delta,
          {
            enabled: ![
              'contextual',
              'long-idle',
              'preview',
            ].includes(animationController?.getState()),
          },
        )
        vrm.update(delta)
      }

      classroomInspectionCamera?.update(delta)
      updateSpeechBubblePosition()
      occlusionController?.update(delta)
      renderer.render(scene, camera)
    }

    animate()

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      cancelAnimationFrame(animId)
      timer.dispose()
      window.removeEventListener('resize', onResize)
      window.speechSynthesis.cancel()
      classroomInspector?.dispose()
      classroomInspectorRef.current = null
      delete window.__ESME_CLASSROOM_INVENTORY__
      delete window.__ESME_CLASSROOM_COLLISION_ZONES__
      classroomInspectionCamera?.dispose()
      movementController?.dispose()
      movementController = null
      movementControllerRef.current = null
      occlusionController?.dispose()
      occlusionController = null
      resetCameraRef.current = null
      animationPreviewRef.current = null
      animationController?.dispose()
      animationController = null
      animationControllerRef.current = null
      openingGreetingActionRef.current = null
      boardInteractionActionRef.current = null
      delete window.__ESME_MOVEMENT__
      collisionDebugView?.dispose()
      campusEnvironment?.dispose()
      campusEnvironment = null
      recommendationBoardInteraction?.dispose()
      if (recommendationBoard) {
        scene.remove(recommendationBoard.object3d)
        recommendationBoard.dispose()
      }
      recommendationBoardRef.current = null
      renderer.dispose()
    }
  }, [])

  async function speak(text) {
    if (!voiceEnabledRef.current || !text.trim()) return

    if (useElevenlabsRef.current) {
      try {
        const blob = await BACKEND_VOICE.synthesize(text)
        if (!blob) throw new Error('ElevenLabs unavailable')
        const url      = URL.createObjectURL(blob)
        const audio    = new Audio(url)
        const audioCtx = new AudioContext()
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        const source   = audioCtx.createMediaElementSource(audio)
        source.connect(analyser)
        analyser.connect(audioCtx.destination)
        analyserRef.current     = analyser
        analyserDataRef.current = new Uint8Array(analyser.frequencyBinCount)

        const cleanup = () => {
          analyserRef.current     = null
          analyserDataRef.current = null
          audioCtx.close()
          URL.revokeObjectURL(url)
          stopLipSyncRef.current?.()
        }
        audio.onplay = () => startLipSyncRef.current?.()
        audio.onended = cleanup
        audio.onerror = cleanup
        await audio.play()
        return
      } catch {
        // fall through to browser TTS
      }
    }

    speakRef.current?.(text)
  }

  async function sendMessage(text) {
    // Reserve space for both the user's message and Esme's reply.
    if (messagesRef.current.length + 2 > MAX_CHAT_MESSAGES) return

    const userMsg = { role: 'user', content: text }
    const history = [...messagesRef.current, userMsg]
    const requestHistory = history.slice(-MAX_CHAT_MESSAGES)
    setMessages(history)
    setLoading(true)

    try {
      const data = await REQUEST_CHAT_REPLY(requestHistory, {
        tasteProfile: deriveTasteProfile(pickedSongsRef.current),
      })
      const reply = data.response

      setMessages(prev => [...prev, {
        role:    'assistant',
        content: reply,
        songs:   data.recommendations ?? null,
      }])
      showSpeechBubbleTemporarily()
      speak(reply)
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I couldn't prepare recommendations right now. Please try again.",
        kind: 'error',
      }])
      showSpeechBubbleTemporarily()
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    const text = inputRef.current?.value?.trim()
    if (!text || loading || chatLimitReached) return
    inputRef.current.value = ''
    sendMessage(text)
  }

  function startNewChat() {
    messagesRef.current = []
    setMessages([])
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSend()
  }

  function togglePick(song) {
    setPickedSongs(prev => toggleSongSelection(prev, song))
  }

  function removePick(song) {
    setPickedSongs(prev => removeSongSelection(prev, song))
  }

  function isPicked(song) {
    return isSongSelected(pickedSongs, song)
  }

  const handleMobileMove = useCallback(({ sideways, forward, running }) => {
    movementControllerRef.current?.setTouchMovement(
      sideways,
      forward,
      running,
    )
  }, [])

  function toggleTranscriptPanel() {
    const nextOpen = !transcriptOpen
    setTranscriptOpen(nextOpen)
    if (nextOpen) {
      setLikedPanelOpen(false)
      setControlsOpen(false)
      setVibePickerOpen(false)
    }
  }

  function toggleLikedPanel() {
    const nextOpen = !likedPanelOpen
    setLikedPanelOpen(nextOpen)
    if (nextOpen) {
      setTranscriptOpen(false)
      setControlsOpen(false)
      setVibePickerOpen(false)
    }
  }

  function handleVibeSelection(vibe) {
    setSelectedVibe(vibe.label)
    setVibePickerOpen(false)

    if (!voiceEnabledRef.current && !voiceReminderShown) {
      setVoiceReminderShown(true)
      setVoiceReminderVisible(true)
    }

    sendMessage(vibe.label)
  }

  function openControls() {
    setVoiceReminderVisible(false)
    setTranscriptOpen(false)
    setLikedPanelOpen(false)
    setVibePickerOpen(false)
    setControlsOpen(true)
  }

  function toggleControlsMenu() {
    if (controlsOpen) {
      setControlsOpen(false)
      return
    }
    openControls()
  }

  function toggleVibePicker() {
    const nextOpen = !vibePickerOpen
    setVibePickerOpen(nextOpen)
    if (nextOpen) {
      setControlsOpen(false)
      setTranscriptOpen(false)
      setLikedPanelOpen(false)
    }
  }

  function resetCamera(event) {
    resetCameraRef.current?.()
    event?.currentTarget?.blur()
  }

  const gameplayUiVisible = entryStarted
    && !loaderVisible
    && (!isPhoneExperience || isPhoneLandscape)

  return (
    <main
      className="esme-app"
      data-phone={isPhoneExperience}
      data-phone-landscape={isPhoneLandscape}
    >
      <canvas ref={canvasRef} className="esme-canvas" />

      {/* Loading screen */}
      {loaderVisible && (
        <ExperienceEntryScreen
          assetsReady={experienceAssetsReady}
          entryStarted={entryStarted}
          fading={loaderFading}
          isPhone={isPhoneExperience}
          isLandscape={isPhoneLandscape}
          isStatic={!APP_CONFIG.usesBackend}
          onReady={handleReady}
        />
      )}

      {isPhoneExperience
        && entryStarted
        && !isPhoneLandscape
        && !loaderVisible
        && <OrientationGate />}

      {mobileControlsActive && (
        <MobileTouchControls onMove={handleMobileMove} />
      )}

      {/* Picked songs panel */}
      <section
        className="liked-panel"
        aria-label="Liked songs"
        data-open={likedPanelOpen}
      >
        <div className="panel-heading">
          Liked Songs ({pickedSongs.length})
        </div>

        {pickedSongs.length === 0 && (
          <div className="panel-empty">
            Pick songs you like from the board or transcript.
          </div>
        )}

        {pickedSongs.map((s) => {
          const safeUrl = safeLastFmUrl(s.url)
          const SongDetails = safeUrl ? 'a' : 'div'
          return (
          <div className="liked-song" key={`${s.title}-${s.artist}`}>
            <SongDetails
              {...(safeUrl ? { href: safeUrl, target: '_blank', rel: 'noreferrer' } : {})}
              className="song-copy"
            >
              <strong>{s.title}</strong>
              <span>{s.artist}</span>
            </SongDetails>
            <button
              className="icon-button"
              onClick={() => removePick(s)}
              title={`Remove ${s.title} by ${s.artist}`}
              aria-label={`Remove ${s.title} by ${s.artist} from liked songs`}
            >
              {'\u2665'}
            </button>
          </div>
          )
        })}
      </section>

      <div
        ref={speechBubbleRef}
        className="esme-response"
        aria-hidden="true"
        data-visible="false"
      >
        <span className="esme-response__content">
          {latestEsmeMessage?.content ?? WELCOME_PROMPT}
        </span>
      </div>
      <div
        className="visually-hidden"
        role={latestEsmeMessage?.kind === 'error' ? 'alert' : 'status'}
        aria-live={latestEsmeMessage?.kind === 'error' ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        {latestEsmeMessage?.content ?? WELCOME_PROMPT}
      </div>

      {/* Chat history */}
      <section
        className="transcript"
        aria-label="Conversation transcript"
        data-open={transcriptOpen}
      >
        <div className="transcript-heading">
          <strong>Conversation</strong>
          <button className="text-button" onClick={() => setTranscriptOpen(false)}>Close</button>
        </div>
        <div className="transcript-entry transcript-entry--assistant" aria-label={"Esme\u2019s opening question"}>
          <div className="transcript-bubble transcript-bubble--assistant">
            {WELCOME_PROMPT}
          </div>
        </div>

        {messages.map((m, i) => (
          <div
            key={i}
            className={`transcript-entry ${
              m.role === 'user' ? 'transcript-entry--user' : 'transcript-entry--assistant'
            } ${m.kind === 'error' ? 'transcript-entry--error' : ''}`}
          >
            <div
              className={`transcript-bubble ${
                m.role === 'user' ? 'transcript-bubble--user' : 'transcript-bubble--assistant'
              } ${m.kind === 'error' ? 'transcript-bubble--error' : ''}`}
            >
              {m.content}
            </div>

            {m.songs && (
              <div className="transcript-songs">
                {m.songs.map((s, j) => (
                  <div key={j} className="transcript-song">
                    <div className="transcript-song__copy">
                      <strong>{s.title}</strong>
                      <span>{s.artist}</span>
                    </div>
                    <button
                      className="transcript-song__toggle"
                      onClick={() => togglePick(s)}
                      title={isPicked(s) ? `Unlike ${s.title} by ${s.artist}` : `Like ${s.title} by ${s.artist}`}
                      aria-label={isPicked(s) ? `Unlike ${s.title} by ${s.artist}` : `Like ${s.title} by ${s.artist}`}
                      aria-pressed={isPicked(s)}
                      data-selected={isPicked(s)}
                    >
                      {isPicked(s) ? '\u2665' : '\u2661'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="transcript-status">
            Esme is thinking...
          </div>
        )}
      </section>

      {ANIMATION_PREVIEW_ENABLED && (
        <aside className="animation-preview" aria-label="Animation tester">
          <strong>Animation tester</strong>
          <label htmlFor="animation-preview-select">Animation</label>
          <select
            id="animation-preview-select"
            value={previewAnimation}
            onChange={(event) => {
              const animationName = event.target.value
              const loop = shouldLoopAnimationPreview(animationName)
              setPreviewAnimation(animationName)
              setLoopAnimationPreview(loop)
              animationPreviewRef.current?.play(animationName, { loop })
            }}
            disabled={!animationPreviewReady}
          >
            <option value="Current_Pose">Current rest pose</option>
            {animationPreviewGroups.map(group => (
              <optgroup key={group.label} label={group.label}>
                {group.names.map(name => (
                  <option key={name} value={name}>
                    {getAnimationPreviewLabel(name)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <label className="animation-preview__loop-option">
            <input
              type="checkbox"
              checked={loopAnimationPreview}
              onChange={(event) => {
                const loop = event.target.checked
                setLoopAnimationPreview(loop)
                animationPreviewRef.current?.play(previewAnimation, { loop })
              }}
              disabled={
                previewAnimation === 'Current_Pose'
                || isAnimationPreviewSequence(previewAnimation)
              }
            />
            Repeat selected animation
          </label>
          <div className="animation-preview__actions">
            <button
              type="button"
              onClick={() => animationPreviewRef.current?.reset()}
              disabled={!animationPreviewReady}
            >
              Return to current idle
            </button>
          </div>
          <p role="status">{animationPreviewStatus}</p>
        </aside>
      )}

      {CLASSROOM_INSPECTION_ENABLED && (
        <aside className="classroom-inspector" aria-live="polite">
          <script id="classroom-inventory-data" type="application/json">
            {JSON.stringify(classroomInventory)}
          </script>
          <script id="classroom-collision-zone-data" type="application/json">
            {JSON.stringify(classroomCollisionZones)}
          </script>
          <details className="classroom-inspector__disclosure" open>
            <summary>Classroom inspection mode</summary>
            <div className="classroom-inspector__body">
              <p className="classroom-inspector__controls">
                Right-drag to look · scroll to zoom · click to inspect
              </p>
              {inspectedClassroomMesh ? (
                <>
              <div className="classroom-inspector__target-controls">
                <button
                  type="button"
                  onClick={() => classroomInspectorRef.current?.selectPreviousInventoryItem()}
                >
                  Previous object
                </button>
                <span>
                  Object {inspectedClassroomMesh.inventoryIndex} of {inspectedClassroomMesh.inventoryCount}
                </span>
                <button
                  type="button"
                  onClick={() => classroomInspectorRef.current?.selectNextInventoryItem()}
                >
                  Next object
                </button>
              </div>
              <section className="classroom-inspector__collision-review">
                <div className="classroom-inspector__section-heading">
                  <span>Desk collision zones</span>
                  <button
                    type="button"
                    onClick={() => {
                      const visible = !collisionZonesVisible
                      setCollisionZonesVisible(visible)
                      classroomInspectorRef.current?.setCollisionZonesVisible(visible)
                    }}
                  >
                    {collisionZonesVisible ? 'Hide zones' : 'Show zones'}
                  </button>
                </div>
                {selectedCollisionZone ? (
                  <>
                    <div className="classroom-inspector__target-controls">
                      <button
                        type="button"
                        onClick={() => classroomInspectorRef.current?.selectPreviousCollisionZone()}
                      >
                        Previous zone
                      </button>
                      <span>
                        Zone {selectedCollisionZone.collisionZoneIndex} of{' '}
                        {selectedCollisionZone.collisionZoneCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => classroomInspectorRef.current?.selectNextCollisionZone()}
                      >
                        Next zone
                      </button>
                    </div>
                    <dl className="classroom-inspector__details classroom-inspector__details--compact">
                      <div><dt>Source</dt><dd>GLTF nodes {selectedCollisionZone.sourceNodeIndices.join(' and ')}</dd></div>
                      <div><dt>Center</dt><dd>{selectedCollisionZone.center.join(', ')}</dd></div>
                      <div><dt>Size</dt><dd>{selectedCollisionZone.size.join(', ')}</dd></div>
                    </dl>
                  </>
                ) : (
                  <p>
                    Collision zones could not be derived. The merged classroom
                    geometry may have changed.
                  </p>
                )}
              </section>
              {inspectedClassroomMesh.candidateCount > 1 && (
              <div className="classroom-inspector__target-controls">
                <button type="button" onClick={() => classroomInspectorRef.current?.selectPrevious()}>
                  Previous target
                </button>
                <span>
                  Target {inspectedClassroomMesh.candidateIndex} of {inspectedClassroomMesh.candidateCount}
                </span>
                <button type="button" onClick={() => classroomInspectorRef.current?.selectNext()}>
                  Next target
                </button>
              </div>
              )}
              <dl className="classroom-inspector__details">
                <div><dt>Suggested</dt><dd>{inspectedClassroomMesh.suggestedLabel}</dd></div>
                <div><dt>Node</dt><dd>{inspectedClassroomMesh.nodeName}</dd></div>
                <div><dt>GLTF node</dt><dd>{inspectedClassroomMesh.nodeIndex ?? 'unknown'}</dd></div>
                <div><dt>GLTF mesh</dt><dd>{inspectedClassroomMesh.meshIndex ?? 'unknown'}</dd></div>
                <div><dt>Primitive</dt><dd>{inspectedClassroomMesh.primitiveIndex ?? 'unknown'}</dd></div>
                <div><dt>Parent</dt><dd>{inspectedClassroomMesh.parentName}</dd></div>
                <div><dt>Material</dt><dd>{inspectedClassroomMesh.materialNames.join(', ')}</dd></div>
                <div>
                  <dt>Surface</dt>
                  <dd>
                    {inspectedClassroomMesh.isFallbackTarget
                      ? 'combined fallback mesh'
                      : inspectedClassroomMesh.isRoomSurface
                        ? 'large room surface'
                        : 'object'}
                  </dd>
                </div>
                <div><dt>Center</dt><dd>{inspectedClassroomMesh.center.join(', ')}</dd></div>
                <div><dt>Size</dt><dd>{inspectedClassroomMesh.size.join(', ')}</dd></div>
                <div><dt>Min</dt><dd>{inspectedClassroomMesh.min.join(', ')}</dd></div>
                <div><dt>Max</dt><dd>{inspectedClassroomMesh.max.join(', ')}</dd></div>
              </dl>
                </>
              ) : (
                <p>Click a classroom object to identify its source mesh and world bounds.</p>
              )}
            </div>
          </details>
        </aside>
      )}

      {COLLISION_DEBUG_ENABLED && (
        <aside className="movement-debug" aria-live="polite">
          <strong>Movement collision test</strong>
          <span>
            Use WASD or the arrow keys to move Esme. Hold Shift to run.
          </span>
          <span>
            Pink: desks · Orange: fixed objects · Yellow: window boundary · Blue: room boundary
          </span>
        </aside>
      )}

      {gameplayUiVisible && (
        <>
          <ControlsMenu
            isPhone={isPhoneExperience}
            isStatic={!APP_CONFIG.usesBackend}
            movementReady={movementReady}
            onClose={() => setControlsOpen(false)}
            onResetCamera={resetCamera}
            onToggleVoice={() => {
              setVoiceEnabled(value => !value)
              setVoiceReminderVisible(false)
            }}
            open={controlsOpen}
            voiceEnabled={voiceEnabled}
          />

          {voiceReminderVisible && (
            <VoiceReminder
              onDismiss={() => setVoiceReminderVisible(false)}
              onOpenControls={openControls}
            />
          )}

          {chatLimitReached && (
            <div
              className="chat-limit-notice"
              data-tone="warning"
              role="status"
              aria-live="polite"
            >
              You've reached the 20-message limit for this chat. Start a new chat to continue.
            </div>
          )}

          <section className="gameplay-actions" aria-label="Experience actions">
            {APP_CONFIG.usesBackend ? (
              <div className="composer">
                <input
                  className="composer-input"
                  ref={inputRef}
                  onKeyDown={handleKeyDown}
                  placeholder={chatLimitReached ? 'Start a new chat to continue' : loading ? 'Esme is thinking...' : 'Say something to Esme...'}
                  disabled={loading || chatLimitReached}
                />
                {chatLimitReached ? (
                  <button className="button button--primary" onClick={startNewChat}>
                    Start new chat
                  </button>
                ) : (
                  <button className="button button--primary" onClick={handleSend} disabled={loading}>
                    {loading ? 'Thinking…' : 'Send'}
                  </button>
                )}
              </div>
            ) : (
              <div className="vibe-control">
                {chatLimitReached ? (
                  <button className="button button--primary" onClick={startNewChat}>
                    Start new chat
                  </button>
                ) : (
                  <>
                    <button
                      className="button button--primary vibe-control__trigger"
                      aria-expanded={vibePickerOpen}
                      onClick={toggleVibePicker}
                    >
                      {selectedVibe ? `Vibe: ${selectedVibe}` : 'Choose a vibe'}
                    </button>
                    {vibePickerOpen && (
                      <div className="vibe-tray" role="group" aria-label="Choose a music vibe">
                        {GUIDED_VIBES.map(vibe => (
                          <button
                            key={vibe.id}
                            className="button button--secondary button--vibe"
                            disabled={loading}
                            onClick={() => handleVibeSelection(vibe)}
                          >
                            {vibe.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="gameplay-actions__utilities">
              <button
                className="button button--secondary button--compact"
                aria-expanded={transcriptOpen}
                onClick={toggleTranscriptPanel}
              >
                Transcript
              </button>
              <button
                className="button button--secondary button--compact"
                aria-expanded={likedPanelOpen}
                onClick={toggleLikedPanel}
              >
                Liked ({pickedSongs.length})
              </button>
              <button
                className="button button--secondary button--compact"
                aria-expanded={controlsOpen}
                onClick={toggleControlsMenu}
              >
                Controls
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  )
}


function safeLastFmUrl(value) {
  if (!value) return null

  try {
    const url = new URL(value)
    const isLastFm = url.hostname === 'last.fm' || url.hostname.endsWith('.last.fm')
    return url.protocol === 'https:' && isLastFm ? url.href : null
  } catch {
    return null
  }
}

