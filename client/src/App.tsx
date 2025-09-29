import { useState } from 'react'
import About from './pages/about'
import Home from './pages/home'
import NotFound from './pages/notFound'
import Order from './pages/order'
import Play from './pages/play'
import Room from './pages/room'

import Footer from './snippets/footer'
import Header from './snippets/header'
import './style/App.css'
import './style/utilities.css'
import './style/elements.css'
import './style/buttons.css'
import './style/cards.css'
import './style/popup.css'
import '../src/_actions/TestData'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import user from './_resources/userInfo.json'
import { TestDataServiceProvider } from "./TestDataContext";

function App() {
  const [auth, setAuth] = useState(false)
  const [currentUser, setCurrentUser] = useState(user[0])
  return (
    <>
      <BrowserRouter>
        <Header user={currentUser} auth={auth} />
        <TestDataServiceProvider>
          <main>
            <Routes>
              <Route path="/" element={<Home user={user[0]} setCurrentUser={setCurrentUser} auth={auth} setAuth={setAuth} />} />
              <Route path="/play" element={<Play />} />
              <Route path="/order" element={<Order auth={auth} user={currentUser} />} />
              <Route path="/about" element={<About />} />
              <Route path="/room/:groupNumber" element={<Room />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </TestDataServiceProvider>

        <Footer />
      </BrowserRouter>
    </>
  )
}

export default App
