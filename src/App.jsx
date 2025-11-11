import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useSearchParams } from 'react-router-dom'
import './App.css'
import Store from './Store'
import ImageDetail from './ImageDetail'
import Checkout from './Checkout'
import Cart from './Cart'
import Success from './Success'
import Cancel from './Cancel'
import { useCart } from './CartContext'

const API_BASE_URL = 'https://imageseventsbackend-production.up.railway.app'

function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showCart, setShowCart] = useState(false)
  const [faces, setFaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [eventId, setEventId] = useState(null)
  const [eventName, setEventName] = useState('Event')
  const [loadedImages, setLoadedImages] = useState(new Set())
  const { getCartCount } = useCart()

  const handleImageLoad = (faceId) => {
    setLoadedImages(prev => new Set(prev).add(faceId))
  }

  useEffect(() => {
    window.scrollTo(0, 0)
    
    // Get event ID from URL query params
    const e = searchParams.get('e')
    if (e) {
      setEventId(e)
      fetchFaces(e)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const fetchFaces = async (eventId) => {
    try {
      // Check cache first (before setting loading)
      const cacheKey = `faces_${eventId}`
      const cached = sessionStorage.getItem(cacheKey)
      
      if (cached) {
        const { faces: cachedFaces, eventName: cachedEventName, timestamp } = JSON.parse(cached)
        // Use cache if it's less than 10 minutes old
        const tenMinutes = 10 * 60 * 1000
        if (Date.now() - timestamp < tenMinutes) {
          console.log('Using cached faces data')
          setFaces(cachedFaces)
          setEventName(cachedEventName)
          setLoading(false)
          return
        }
      }
      
      setLoading(true)
      
      // Fetch from API if no cache or cache expired
      const response = await fetch(`${API_BASE_URL}/faces?e=${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch faces')
      const data = await response.json()
      
      // Backend returns { eventId, eventName, count, faces: [...] }
      if (data && Array.isArray(data.faces)) {
        setFaces(data.faces)
        if (data.eventName) {
          setEventName(data.eventName)
        }
        // Cache the data
        sessionStorage.setItem(cacheKey, JSON.stringify({
          faces: data.faces,
          eventName: data.eventName,
          timestamp: Date.now()
        }))
      } else if (Array.isArray(data)) {
        // Fallback if backend returns array directly
        setFaces(data)
        sessionStorage.setItem(cacheKey, JSON.stringify({
          faces: data,
          eventName: eventName,
          timestamp: Date.now()
        }))
      } else {
        console.warn('Unexpected backend response format:', data)
        setFaces([])
      }
    } catch (error) {
      console.error('Error fetching faces:', error)
      setFaces([])
    } finally {
      setLoading(false)
    }
  }

  const handleFaceClick = (face) => {
    console.log('Selected face:', face.id)
    // Navigate to gallery with person ID
    navigate(`/gallery?p=${face.id}&e=${eventId}`)
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
        <h2 className="event-title">{eventName}</h2>
        <h1 className="title">Find Your Photos</h1>
        <p className="subtitle">Click on yourself to find all your photos from the event</p>

        {loading ? (
          <div className="faces-grid">
            {[...Array(12)].map((_, index) => (
              <div key={`skeleton-${index}`} className="face-circle skeleton">
                <div className="skeleton-shimmer"></div>
              </div>
            ))}
          </div>
        ) : faces.length === 0 ? (
          <div className="no-data">No faces available. Please check the event ID.</div>
        ) : (
          <div className="faces-grid">
            {faces.map((face, index) => (
              <div
                key={face.id}
                className={`face-circle ${loadedImages.has(face.id) ? 'loaded' : ''}`}
                onClick={() => loadedImages.has(face.id) && handleFaceClick(face)}
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  cursor: loadedImages.has(face.id) ? 'pointer' : 'default'
                }}
              >
                <img 
                  src={face.imageUrl} 
                  alt={face.label || `Person ${face.id}`}
                  onLoad={() => handleImageLoad(face.id)}
                />
              </div>
            ))}
          </div>
        )}
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
      <Route path="/checkout/success" element={<Success />} />
      <Route path="/checkout/cancel" element={<Cancel />} />
    </Routes>
  )
}

export default App

