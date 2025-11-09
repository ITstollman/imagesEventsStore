import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Store.css'
import ImageDetail from './ImageDetail'
import Cart from './Cart'
import Toast from './Toast'
import { useCart } from './CartContext'

const API_BASE_URL = 'https://imageseventsbackend-production.up.railway.app'

function Store() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [selectedImage, setSelectedImage] = useState(null)
  const [showCart, setShowCart] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [cartVibrate, setCartVibrate] = useState(false)
  const [galleryImages, setGalleryImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [printOptions, setPrintOptions] = useState([])
  const { getCartCount } = useCart()

  useEffect(() => {
    window.scrollTo(0, 0)
    
    // Get person ID and event ID from URL query params
    const personId = searchParams.get('p')
    const eventId = searchParams.get('e')
    
    if (personId && eventId) {
      fetchPersonImages(personId, eventId)
    } else {
      setLoading(false)
    }
  }, [searchParams])

  const fetchPersonImages = async (personId, eventId) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/images?p=${personId}&e=${eventId}`)
      if (!response.ok) throw new Error('Failed to fetch images')
      const data = await response.json()
      
      // Store images and print options
      setGalleryImages(data.images || data)
      if (data.options) {
        setPrintOptions(data.options)
      }
    } catch (error) {
      console.error('Error fetching person images:', error)
      setGalleryImages([])
    } finally {
      setLoading(false)
    }
  }

  if (selectedImage) {
    return (
      <ImageDetail 
        image={selectedImage}
        printOptions={printOptions}
        onBack={() => {
          setSelectedImage(null)
          window.scrollTo(0, 0)
        }}
        onAddedToCart={() => {
          setSelectedImage(null)
          window.scrollTo(0, 0)
          setShowToast(true)
          // Trigger cart vibrate animation after toast starts flying (700ms delay)
          setTimeout(() => {
            setCartVibrate(true)
            setTimeout(() => setCartVibrate(false), 250)
          }, 700)
        }}
      />
    )
  }

  const cartCount = getCartCount()

  return (
    <div className="store-container">
      {showCart && <Cart onClose={() => setShowCart(false)} />}
      {showToast && <Toast message="Added to cart" onClose={() => setShowToast(false)} />}
      
      <button onClick={() => {
        const params = new URLSearchParams(window.location.search)
        const eventId = params.get('e')
        navigate(eventId ? `/?e=${eventId}` : '/')
      }} className="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>
      
      {cartCount > 0 && (
        <button className={`cart-icon-button ${cartVibrate ? 'vibrate' : ''}`} onClick={() => setShowCart(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span className="cart-badge">{cartCount}</span>
        </button>
      )}

      <div className="store-content">
        <h1 className="store-title">Your Photos</h1>
        <p className="store-subtitle">Click on any photo to view and purchase prints</p>

        {loading ? (
          <div className="loading">Loading your photos...</div>
        ) : galleryImages.length === 0 ? (
          <div className="no-data">No photos found for this person.</div>
        ) : (
          <div className="gallery">
            {galleryImages.map((image) => (
              <div 
                key={image.id} 
                className="gallery-item"
                onClick={() => setSelectedImage(image)}
              >
                <img src={image.url} alt={image.alt || `Photo ${image.id}`} />
                <div className="gallery-overlay">
                  <span>View</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Store

