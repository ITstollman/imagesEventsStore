import { useState, useEffect } from 'react'
import './Checkout.css'
import { useCart } from './CartContext'
import Cart from './Cart'

const API_BASE_URL = 'https://imageseventsbackend-production.up.railway.app'

const sizes = ['8x10', '11x14', '16x20', '20x30', '24x36']
const colors = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Natural Wood', value: '#D4A574' },
  { name: 'Dark Wood', value: '#5C4033' },
]

function Checkout({ product, image, onBack, onBackToGallery, initialSize, initialColor, initialQuantity, isFromCart }) {
  const [selectedSize, setSelectedSize] = useState(initialSize || sizes[0])
  const [selectedColor, setSelectedColor] = useState(initialColor || colors[0])
  const [quantity, setQuantity] = useState(initialQuantity || 1)
  const [showCart, setShowCart] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { addToCart, getCartCount } = useCart()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleCheckout = async (e) => {
    e.preventDefault()
    setIsProcessing(true)
    
    try {
      // Format single item for backend
      const items = [{
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: quantity,
        size: selectedSize,
        color: selectedColor.name,
        imageUrl: image?.src || product.preview
      }]

      // Call backend to create Stripe checkout session
      const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items })
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to proceed to checkout. Please try again.')
      setIsProcessing(false)
    }
  }

  const cartCount = getCartCount()

  return (
    <div className="checkout-container">
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

      <div className="checkout-content">
        <div className="checkout-card">
          <h1 className="checkout-title">Checkout</h1>
          
          <div className="checkout-grid">
            <div className="preview-section">
              <div className="preview-image-wrapper">
                <img src={product.preview} alt={product.name} />
              </div>
              <h3 className="product-name-large">{product.name}</h3>
            </div>

            <form onSubmit={handleCheckout} className="checkout-form">
              <div className="form-section">
                <h3 className="section-title">Select Size</h3>
                <div className="size-options">
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`option-button ${selectedSize === size ? 'selected' : ''}`}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}"
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Select Color</h3>
                <div className="color-options">
                  {colors.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      className={`color-button ${selectedColor.name === color.name ? 'selected' : ''}`}
                      onClick={() => setSelectedColor(color)}
                    >
                      <span 
                        className="color-swatch"
                        style={{ 
                          backgroundColor: color.value,
                          border: color.value === '#FFFFFF' ? '1px solid #e0e0e0' : 'none'
                        }}
                      ></span>
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Quantity</h3>
                <div className="quantity-selector">
                  <button 
                    type="button"
                    className="quantity-button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </button>
                  <span className="quantity-display">{quantity}</span>
                  <button 
                    type="button"
                    className="quantity-button"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="price-summary">
                <div className="price-row">
                  <span>Price:</span>
                  <span>${product.price.toFixed(2)}</span>
                </div>
                <div className="price-row">
                  <span>Quantity:</span>
                  <span>{quantity}</span>
                </div>
                <div className="price-row total">
                  <span>Total:</span>
                  <span>${(product.price * quantity).toFixed(2)}</span>
                </div>
              </div>

              <button type="submit" className="checkout-button" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
              </button>

              <button 
                type="button" 
                className="add-to-cart-button"
                onClick={() => {
                  addToCart({
                    product,
                    image,
                    selectedSize,
                    selectedColor,
                    quantity
                  })
                  // Navigate back immediately
                  if (onBackToGallery) {
                    onBackToGallery()
                  } else {
                    onBack()
                  }
                }}
              >
                Add to Cart
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout

