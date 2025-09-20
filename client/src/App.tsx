import { useState } from 'react'
import About from './pages/about'
import Home from './pages/home'
import NotFound from './pages/notFound'
import Order from './pages/order'
import Play from './pages/play'
import Footer from './snippets/footer'
import Header from './snippets/headet'
import './style/App.css'
import './style/utilities.css'
import './style/elements.css'
import './style/buttons.css'
import './style/cards.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import user from './_resources/userInfo.json'
function App() {
  const [auth, setAuth] = useState(false)
  const [currentUser, setCurrentUser] = useState({})

  return (
    <>
      <BrowserRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home user={user} setCurrentUser={setCurrentUser} auth={auth} setAuth={setAuth}/>} />
            <Route path="/play" element={<Play />} />
            <Route path="/order" element={<Order user={currentUser} />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <Footer />
      </BrowserRouter>
    </>
  )
}

export default App
