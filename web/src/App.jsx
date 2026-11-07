import { Component, lazy, Suspense, useState } from 'react'
import HomePage from './components/HomePage.jsx'
import RoomLoading from './components/RoomLoading.jsx'

const AvatarScene = lazy(() => import('./components/AvatarScene.jsx'))

class RoomBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <RoomLoading failed onBack={this.props.onBack} />
    ) : (
      this.props.children
    )
  }
}

export default function App() {
  const [entered, setEntered] = useState(false)
  const [returning, setReturning] = useState(false)
  function goHome() {
    setEntered(false)
    setReturning(true)
  }
  if (!entered) return <HomePage returning={returning} onEnter={() => setEntered(true)} />
  return (
    <RoomBoundary onBack={goHome}>
      <Suspense fallback={<RoomLoading onBack={goHome} />}>
        <AvatarScene onBackHome={goHome} />
      </Suspense>
    </RoomBoundary>
  )
}
