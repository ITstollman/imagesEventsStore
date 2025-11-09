import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import Store from './Store'
import ImageDetail from './ImageDetail'
import Checkout from './Checkout'
import Cart from './Cart'
import { useCart } from './CartContext'

// Mock face data - replace with actual face images
const faces = [
  { id: 1, image: '/image1.png', name: 'Person 1' },
  { id: 2, image: '/image2.png', name: 'Person 2' },
  { id: 3, image: '/image3.png', name: 'Person 3' },
  { id: 4, image: '/image4.png', name: 'Person 4' },
  { id: 5, image: '/image1.png', name: 'Person 5' },
  { id: 6, image: '/image2.png', name: 'Person 6' },
  { id: 7, image: '/image3.png', name: 'Person 7' },
  { id: 8, image: '/image4.png', name: 'Person 8' },
  { id: 9, image: '/image1.png', name: 'Person 9' },
  { id: 10, image: '/image2.png', name: 'Person 10' },
  { id: 11, image: '/image3.png', name: 'Person 11' },
  { id: 12, image: '/image4.png', name: 'Person 12' },
  { id: 13, image: '/image1.png', name: 'Person 13' },
  { id: 14, image: '/image2.png', name: 'Person 14' },
  { id: 15, image: '/image3.png', name: 'Person 15' },
  { id: 16, image: '/image4.png', name: 'Person 16' },
  { id: 17, image: '/image1.png', name: 'Person 17' },
  { id: 18, image: '/image2.png', name: 'Person 18' },
  { id: 19, image: '/image3.png', name: 'Person 19' },
  { id: 20, image: '/image4.png', name: 'Person 20' },
  { id: 21, image: '/image1.png', name: 'Person 21' },
  { id: 22, image: '/image2.png', name: 'Person 22' },
  { id: 23, image: '/image3.png', name: 'Person 23' },
  { id: 24, image: '/image4.png', name: 'Person 24' },
  { id: 25, image: '/image1.png', name: 'Person 25' },
  { id: 26, image: '/image2.png', name: 'Person 26' },
  { id: 27, image: '/image3.png', name: 'Person 27' },
  { id: 28, image: '/image4.png', name: 'Person 28' },
  { id: 29, image: '/image1.png', name: 'Person 29' },
  { id: 30, image: '/image2.png', name: 'Person 30' },
  { id: 31, image: '/image3.png', name: 'Person 31' },
  { id: 32, image: '/image4.png', name: 'Person 32' },
  { id: 33, image: '/image1.png', name: 'Person 33' },
  { id: 34, image: '/image2.png', name: 'Person 34' },
  { id: 35, image: '/image3.png', name: 'Person 35' },
  { id: 36, image: '/image4.png', name: 'Person 36' },
  { id: 37, image: '/image1.png', name: 'Person 37' },
  { id: 38, image: '/image2.png', name: 'Person 38' },
  { id: 39, image: '/image3.png', name: 'Person 39' },
  { id: 40, image: '/image4.png', name: 'Person 40' },
]

function Home() {
  const navigate = useNavigate()
  const [showCart, setShowCart] = useState(false)
  const { getCartCount } = useCart()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleFaceClick = (face) => {
    console.log('Selected face:', face.id)
    // Navigate to gallery
    navigate('/gallery')
  }

  const cartCount = getCartCount()

  return (
    <div className="container">
      {showCart && <Cart onClose={() => setShowCart(false)} />}
      
      {cartCount > 0 && (
        <button className="home-cart-icon-button" onClick={() => setShowCart(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span className="home-cart-badge">{cartCount}</span>
        </button>
      )}

      <div className="content face-selection-content">
        <h2 className="event-title">John and Sara's Wedding</h2>
        <h1 className="title">Find Your Photos</h1>
        <p className="subtitle">Click on yourself to find all your photos from the event</p>

        <div className="faces-grid">
          {faces.map((face) => (
            <div
              key={face.id}
              className="face-circle"
              onClick={() => handleFaceClick(face)}
            >
              <img src={face.image} alt={face.name} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/gallery" element={<Store />} />
      <Route path="/gallery/:imageId" element={<ImageDetail />} />
      <Route path="/checkout/:productId" element={<Checkout />} />
    </Routes>
  )
}

export default App

