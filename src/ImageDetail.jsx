import { useState, useEffect } from 'react'
import './ImageDetail.css'
import Checkout from './Checkout'
import Cart from './Cart'
import { useCart } from './CartContext'

// Default fallback products if none are provided from API
const defaultProducts = [
  { 
    id: 1, 
    name: 'Classic Black Frame',
    price: 49.99,
    preview: '/print-preview.png'
  },
  { 
    id: 2, 
    name: 'Modern White Frame',
    price: 54.99,
    preview: '/print-preview.png'
  },
  { 
    id: 3, 
    name: 'Elegant Wood Frame',
    price: 59.99,
    preview: '/print-preview.png'
  },
  { 
    id: 4, 
    name: 'Minimalist Silver Frame',
    price: 52.99,
    preview: '/print-preview.png'
  },
]

function ImageDetail({ image, printOptions, onBack, onAddedToCart }) {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showCart, setShowCart] = useState(false)
  const { getCartCount } = useCart()

  // Use API print options if available, otherwise use default products
  const frameProducts = printOptions && printOptions.length > 0 ? printOptions : defaultProducts

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleDownload = () => {
    // Simulate download
    const link = document.createElement('a')
    link.href = image.url
    link.download = `${image.alt}.jpg`
    link.click()
  }

  if (selectedProduct) {
    return (
      <Checkout 
        product={selectedProduct}
        image={image}
        onBack={() => setSelectedProduct(null)}
        onBackToGallery={onAddedToCart}
      />
    )
  }

  const cartCount = getCartCount()

  return (
    <div className="detail-container">
      {showCart && <Cart onClose={() => setShowCart(false)} />}
      
      {cartCount > 0 && (
        <button className="cart-icon-button" onClick={() => setShowCart(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span className="cart-badge">{cartCount}</span>
        </button>
      )}

      <button onClick={onBack} className="back-button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>

      <div className="detail-content">
        <div className="image-section">
          <div className="image-wrapper">
            <img src={image.url} alt={image.alt} />
          </div>
          <button onClick={handleDownload} className="download-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="8 10 12 14 16 10" />
              <line x1="12" y1="14" x2="12" y2="3" />
            </svg>
            Download Original
          </button>
        </div>

        <div className="products-section">
          <h2 className="products-title">Order Prints</h2>
          <p className="products-subtitle">Choose your favorite frame style</p>
          
          <div className="products-grid">
            {frameProducts.map((product) => (
              <div 
                key={product.id}
                className="product-card"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="product-image">
                  <img src={product.preview} alt={product.name} />
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-price">${product.price}</p>
                </div>
                <button className="product-button">Select</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageDetail

