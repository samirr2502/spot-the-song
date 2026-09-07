import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import LocalPlay from './pages/LocalPlay'
import LocalSetup from './pages/LocalSetup'
import OnlineCreate from './pages/OnlineCreate'
import OnlineJoin from './pages/OnlineJoin'
import OnlinePlay from './pages/OnlinePlay'
import OnlineRoom from './pages/OnlineRoom'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/local/setup" element={<LocalSetup />} />
          <Route path="/local/play" element={<LocalPlay />} />
          <Route path="/online/create" element={<OnlineCreate />} />
          <Route path="/online/join" element={<OnlineJoin />} />
          <Route path="/online/room/:roomId" element={<OnlineRoom />} />
          <Route path="/online/play/:roomId" element={<OnlinePlay />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
