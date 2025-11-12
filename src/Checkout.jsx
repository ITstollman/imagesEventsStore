import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import './Checkout.css'
import { useCart } from './CartContext'
import Cart from './Cart'
import Footer from './Footer'

const API_BASE_URL = 'https://imageseventsbackend-production.up.railway.app'

const sizes = ['8x10', '11x14', '16x20', '20x30', '24x36']

const frameTypes = ['Standard', 'Premium']

const metalColors = [
  { name: 'Black Metal', value: '#1a1a1a', image: '/frameColor/premium-black-metal.png' },
  { name: 'Silver Metal', value: '#c0c0c0', image: '/frameColor/premium-silver-metal.png' },
  { name: 'Gold Metal', value: '#d4af37', image: '/frameColor/premium-gold-metal.png' },
  { name: 'White Metal', value: '#f5f5f5', image: '/frameColor/premium-white-metal.png' },
]

const oakColors = [
  { name: 'Beige Oak', value: '#D4A574', image: '/frameColor/premium-beige-oak.png' },
  { name: 'Black Oak', value: '#5C4033', image: '/frameColor/premium-black-oak.png' },
  { name: 'White Oak', value: '#e8dcc4', image: '/frameColor/premium-white-oak.png' },
  { name: 'Walnut Oak', value: '#4a3426', image: '/frameColor/premium-walnut-oak.png' },
]

const printTypes = ['Poster', 'Photo', 'Fine Art']

const paperTypes = ['Matte', 'Glossy', 'Semi Gloss', 'Semi Matte Linen']

function Checkout({ product, image, eventId, onBack, onBackToGallery, initialSize, initialColor, initialQuantity, isFromCart }) {
  const [searchParams] = useSearchParams()
  const [selectedSize, setSelectedSize] = useState(initialSize || sizes[0])
  const [frameType, setFrameType] = useState('Standard')
  const [material, setMaterial] = useState('Metal')
  const [selectedColor, setSelectedColor] = useState(metalColors[0])
  const [printType, setPrintType] = useState('Poster')
  const [paperType, setPaperType] = useState('Matte')
  const [readyToHang, setReadyToHang] = useState(true)
  const [quantity, setQuantity] = useState(initialQuantity || 1)
  const [showCart, setShowCart] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { addToCart, getCartCount, getCartTotal } = useCart()

  const currentColors = material === 'Metal' ? metalColors : oakColors

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const currentItemTotal = product.price * quantity
  const cartTotal = getCartTotal()
  const subtotalBeforeShipping = currentItemTotal + cartTotal
  
  // Shipping calculation
  const SHIPPING_COST = 7.00
  const FREE_SHIPPING_THRESHOLD = 100.00
  const shipping = subtotalBeforeShipping >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  const grandTotal = subtotalBeforeShipping + shipping

  // Get cart items for display
  const { cartItems, removeFromCart } = useCart()

  const handleCheckout = async (e) => {
    e.preventDefault()
    setIsProcessing(true)
    
    try {
      // Get event ID from props or URL params
      const projectId = eventId || searchParams.get('e') || ''
      
      console.log('Checkout - Project ID from prop:', eventId)
      console.log('Checkout - Project ID from URL:', searchParams.get('e'))
      console.log('Checkout - Final Project ID:', projectId)
      
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

      // Create metadata object with product details
      const metadata = {
        userId: 'guest',
        projectId: projectId,
        itemCount: items.length.toString(),
        // Add detailed product information
        products: JSON.stringify(items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          imageUrl: item.imageUrl
        })))
      }

      console.log('Checkout - Sending to backend:', { items, metadata })

      // Call backend to create Stripe checkout session
      const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items, metadata })
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
                <h3 className="section-title">Frame Type</h3>
                <div className="size-options">
                  {frameTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`option-button ${frameType === type ? 'selected' : ''}`}
                      onClick={() => setFrameType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Frame Material</h3>
                <div className="size-options">
                  <button
                    type="button"
                    className={`option-button ${material === 'Metal' ? 'selected' : ''}`}
                    onClick={() => {
                      setMaterial('Metal')
                      setSelectedColor(metalColors[0])
                    }}
                  >
                    Metal
                  </button>
                  <button
                    type="button"
                    className={`option-button ${material === 'Oak' ? 'selected' : ''}`}
                    onClick={() => {
                      setMaterial('Oak')
                      setSelectedColor(oakColors[0])
                    }}
                  >
                    Oak
                  </button>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Frame Color</h3>
                <div className="frame-color-grid">
                  {currentColors.map((color) => (
                    <div
                      key={color.name}
                      className={`frame-color-card ${selectedColor.name === color.name ? 'selected' : ''}`}
                      onClick={() => setSelectedColor(color)}
                    >
                      <div className="frame-color-image">
                        <img src={color.image} alt={color.name} />
                      </div>
                      <p className="frame-color-name">{color.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Print Type</h3>
                <div className="size-options">
                  {printTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`option-button ${printType === type ? 'selected' : ''}`}
                      onClick={() => setPrintType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Paper Type</h3>
                <div className="paper-options">
                  {paperTypes.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`option-button ${paperType === type ? 'selected' : ''}`}
                      onClick={() => setPaperType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Installation</h3>
                <div className="toggle-container">
                  <button
                    type="button"
                    className={`toggle-option ${readyToHang ? 'selected' : ''}`}
                    onClick={() => setReadyToHang(true)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                    </svg>
                    Ready to Hang
                  </button>
                  <button
                    type="button"
                    className={`toggle-option ${!readyToHang ? 'selected' : ''}`}
                    onClick={() => setReadyToHang(false)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path>
                    </svg>
                    Insert Print Yourself
                  </button>
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
                <h3 className="summary-title">Order Summary</h3>
                
                {/* Current Item */}
                <div className="summary-item">
                  <img src={product.preview} alt={product.name} className="summary-item-image" />
                  <div className="summary-item-details">
                    <h4>{product.name}</h4>
                    <p>Size: {selectedSize}"</p>
                    <p>Frame: {frameType} {material} - {selectedColor.name}</p>
                    <p>Print: {printType} on {paperType}</p>
                    <p>{readyToHang ? 'Ready to Hang' : 'Insert Print Yourself'}</p>
                    <p className="summary-item-price">
                      ${product.price.toFixed(2)} × {quantity} = ${currentItemTotal.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Cart Items */}
                {cartItems.length > 0 && (
                  <>
                    <div className="summary-divider"></div>
                    <h4 className="summary-section-title">Items in Cart ({cartItems.length})</h4>
                    {cartItems.map((item) => (
                      <div key={item.id} className="summary-item">
                        <img src={item.product.preview} alt={item.product.name} className="summary-item-image" />
                        <div className="summary-item-details">
                          <h4>{item.product.name}</h4>
                          <p>Size: {item.selectedSize}" | Color: {item.selectedColor.name}</p>
                          <p className="summary-item-price">
                            ${item.product.price.toFixed(2)} × {item.quantity} = ${(item.product.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <button 
                          className="summary-item-remove"
                          onClick={() => removeFromCart(item.id)}
                          title="Remove item"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </>
                )}

                <div className="summary-divider"></div>
                <div className="price-row">
                  <span>Subtotal:</span>
                  <span>${subtotalBeforeShipping.toFixed(2)}</span>
                </div>
                <div className="shipping-container">
                  <div className="price-row shipping-row">
                    <span>
                      🇺🇸 Shipping:
                      {shipping === 0 && <span className="free-shipping-badge">FREE</span>}
                    </span>
                    <span>
                      {shipping === 0 ? (
                        <span className="free-shipping">$7.00</span>
                      ) : (
                        `$${shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  {shipping !== 0 && (
                    <div className="shipping-notice">
                      Add ${(FREE_SHIPPING_THRESHOLD - subtotalBeforeShipping).toFixed(2)} more for free shipping!
                    </div>
                  )}
                </div>
                <div className="price-row total">
                  <span>Total:</span>
                  <span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="checkout-button-wrapper">
                <button type="submit" className="checkout-button stripe-button" disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
                </button>
                
                <div className="stripe-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Secured with </span>
                  <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="stripe-link">
                    Stripe
                  </a>
                </div>
              </div>

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
      <Footer />
    </div>
  )
}

export default Checkout

