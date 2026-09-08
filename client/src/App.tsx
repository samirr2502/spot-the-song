import { Routes, Route, Navigate } from 'react-router-dom'
import { ConnectionStatus } from './components/ConnectionStatus'
import { RequireName } from './components/RequireName'
import { SketchLayout } from './components/sketch/SketchLayout'
import { CreateModePage } from './pages/CreateModePage'
import { HomePage } from './pages/HomePage'
import { JoinPage } from './pages/JoinPage'
import { LandingPage } from './pages/LandingPage'
import { LobbyPage } from './pages/LobbyPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { RoomHowToPlayPage } from './pages/RoomHowToPlayPage'

export function App() {
  return (
    <SketchLayout>
      <ConnectionStatus />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/home"
          element={
            <RequireName>
              <HomePage />
            </RequireName>
          }
        />
        <Route
          path="/join"
          element={
            <RequireName>
              <JoinPage />
            </RequireName>
          }
        />
        <Route
          path="/create/mode"
          element={
            <RequireName>
              <CreateModePage />
            </RequireName>
          }
        />
        <Route
          path="/create/all-in"
          element={<PlaceholderPage title="All In setup" phase="Phase 2" />}
        />
        <Route
          path="/create/turns"
          element={<PlaceholderPage title="Turns setup" phase="Phase 4–6" />}
        />
        <Route
          path="/how-to-play"
          element={<PlaceholderPage title="How to play" phase="see room flow" />}
        />
        <Route
          path="/room/:code"
          element={
            <RequireName>
              <LobbyPage />
            </RequireName>
          }
        />
        <Route
          path="/room/:code/how-to-play"
          element={
            <RequireName>
              <RoomHowToPlayPage />
            </RequireName>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SketchLayout>
  )
}
