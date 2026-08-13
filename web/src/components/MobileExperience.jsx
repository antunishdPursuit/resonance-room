import { useEffect, useRef, useState } from 'react'
import { calculateJoystickInput } from '../ui/mobileControls.js'

const CENTERED_JOYSTICK = Object.freeze({ x: 0, y: 0 })

export function MobileTouchControls({ onMove }) {
  const joystickRef = useRef(null)
  const activePointerRef = useRef(null)
  const onMoveRef = useRef(onMove)
  const [knobPosition, setKnobPosition] = useState(CENTERED_JOYSTICK)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    onMoveRef.current = onMove
  }, [onMove])

  useEffect(() => () => {
    onMoveRef.current({ sideways: 0, forward: 0, running: false })
  }, [])

  function updateJoystick(event) {
    const joystick = joystickRef.current
    if (!joystick) return

    const bounds = joystick.getBoundingClientRect()
    const radius = bounds.width * 0.32
    const input = calculateJoystickInput({
      centerX: bounds.left + (bounds.width / 2),
      centerY: bounds.top + (bounds.height / 2),
      pointerX: event.clientX,
      pointerY: event.clientY,
      radius,
    })

    setKnobPosition({ x: input.offsetX, y: input.offsetY })
    setIsRunning(input.running)
    onMoveRef.current({
      sideways: input.sideways,
      forward: input.forward,
      running: input.running,
    })
  }

  function startJoystick(event) {
    if (event.button !== 0 || activePointerRef.current !== null) return

    event.preventDefault()
    activePointerRef.current = event.pointerId
    event.currentTarget.setPointerCapture?.(event.pointerId)
    updateJoystick(event)
  }

  function moveJoystick(event) {
    if (event.pointerId !== activePointerRef.current) return

    event.preventDefault()
    updateJoystick(event)
  }

  function stopJoystick(event) {
    if (event.pointerId !== activePointerRef.current) return

    activePointerRef.current = null
    setKnobPosition(CENTERED_JOYSTICK)
    setIsRunning(false)
    onMoveRef.current({ sideways: 0, forward: 0, running: false })
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <div className="mobile-touch-controls" role="group" aria-label="Touch controls">
      <div
        ref={joystickRef}
        className="mobile-joystick"
        aria-label={isRunning ? 'Movement joystick, running' : 'Movement joystick'}
        data-running={isRunning}
        onPointerDown={startJoystick}
        onPointerMove={moveJoystick}
        onPointerUp={stopJoystick}
        onPointerCancel={stopJoystick}
        onLostPointerCapture={stopJoystick}
      >
        <span
          className="mobile-joystick__knob"
          style={{
            transform: `translate(${knobPosition.x}px, ${knobPosition.y}px)`,
          }}
        />
        <span className="mobile-joystick__label">
          {isRunning ? 'Run' : 'Move'}
        </span>
      </div>
    </div>
  )
}
