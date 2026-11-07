import { useState } from 'react'
import AvatarScene from './components/AvatarScene'
import HomePage from './components/HomePage.jsx'

export default function App() {
  const [entered, setEntered] = useState(false)
  return entered ? <AvatarScene /> : <HomePage onEnter={() => setEntered(true)} />
}
