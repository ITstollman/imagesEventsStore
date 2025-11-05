import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Store.css'
import ImageDetail from './ImageDetail'
import Cart from './Cart'
import Toast from './Toast'
import { useCart } from './CartContext'

const galleryImages = [
  { id: 1, url: '/image1.png', alt: 'Photo 1' },
  { id: 2, url: '/image2.png', alt: 'Photo 2' },
  { id: 3, url: '/image3.png', alt: 'Photo 3' },
  { id: 4, url: '/image4.png', alt: 'Photo 4' },
]

function Store() {
  const navigate = useNavigate()
  const [selectedImage, setSelectedImage] = useState(null)
  const [showCart, setShowCart] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [cartVibrate, setCartVibrate] = useState(false)
  const { getCartCount } = useCart()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (selectedImage) {
    return (
      <ImageDetail 
        image={selectedImage} 
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

        <div className="gallery">
          {galleryImages.map((image) => (
            <div 
              key={image.id} 
              className="gallery-item"
              onClick={() => setSelectedImage(image)}
            >
              <img src={image.url} alt={image.alt} />
              <div className="gallery-overlay">
                <span>View</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Store

