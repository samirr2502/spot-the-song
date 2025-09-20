import About from './pages/about'
import Home from './pages/home'
import NotFound from './pages/notFound'
import Order from './pages/order'
import Play from './pages/play'
import Footer from './snippets/footer'
import Header from './snippets/headet'
import './style/App.css'
import {BrowserRouter, Route, Routes} from 'react-router-dom'
function App() {

  return (
    <>
    <BrowserRouter>
    <Header />
     <Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/play" element={<Play/>}/>
      <Route path="/order" element={<Order/>}/>
      <Route path="/about" element={<About/>}/>
      <Route path="*" element={<NotFound/>} />
     </Routes>

     <Footer/>
     </BrowserRouter>
    </>
  )
}

export default App
