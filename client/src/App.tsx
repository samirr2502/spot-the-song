import { Routes, Route, Navigate } from 'react-router-dom'
import { ConnectionStatus } from './components/ConnectionStatus'
import { RequireName } from './components/RequireName'
import { SketchLayout } from './components/sketch/SketchLayout'
import { AllInSetupPage } from './pages/AllInSetupPage'
import { GamePlayPage } from './pages/GamePlayPage'
import { CreateModePage } from './pages/CreateModePage'
import { FinalResultsPage } from './pages/FinalResultsPage'
import { HomePage } from './pages/HomePage'
import { JoinPage } from './pages/JoinPage'
import { LandingPage } from './pages/LandingPage'
import { LobbyPage } from './pages/LobbyPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { SingAlongSetupPage } from './pages/SingAlongSetupPage'
import { TurnGuessSetupPage } from './pages/TurnGuessSetupPage'
import { TurnsModePage } from './pages/TurnsModePage'
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
          element={
            <RequireName>
              <AllInSetupPage />
            </RequireName>
          }
        />
        <Route
          path="/create/turns"
          element={
            <RequireName>
              <TurnsModePage />
            </RequireName>
          }
        />
        <Route
          path="/create/turns/guess"
          element={
            <RequireName>
              <TurnGuessSetupPage />
            </RequireName>
          }
        />
        <Route
          path="/create/turns/sing"
          element={
            <RequireName>
              <SingAlongSetupPage />
            </RequireName>
          }
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
          path="/room/:code/play"
          element={
            <RequireName>
              <GamePlayPage />
            </RequireName>
          }
        />
        <Route
          path="/room/:code/results"
          element={
            <RequireName>
              <FinalResultsPage />
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
