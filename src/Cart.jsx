import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import './Cart.css'
import { useCart } from './CartContext'
import Checkout from './Checkout'

const API_BASE_URL = 'https://imageseventsbackend-production.up.railway.app'

function Cart({ onClose }) {
  const [searchParams] = useSearchParams()
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, getCartCount } = useCart()
  const [checkoutItem, setCheckoutItem] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Prevent scrolling on mount
    document.body.style.overflow = 'hidden'
    
    // Re-enable scrolling on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleCheckout = async () => {
    setIsProcessing(true)
    
    try {
      // Get project ID from URL params
      const projectId = searchParams.get('e') || ''
      
      console.log('Cart - Project ID from URL:', searchParams.get('e'))
      console.log('Cart - Full search params:', searchParams.toString())
      console.log('Cart - Final Project ID:', projectId)
      
      // Format cart items for backend
      const items = cartItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        size: item.selectedSize,
        color: item.selectedColor.name,
        imageUrl: item.image?.src || item.product.preview
      }))

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

      console.log('Cart - Sending to backend:', { items, metadata })

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

  if (checkoutItem) {
    return (
      <Checkout 
        product={checkoutItem.product}
        image={checkoutItem.image}
        onBack={() => setCheckoutItem(null)}
        initialSize={checkoutItem.selectedSize}
        initialColor={checkoutItem.selectedColor}
        initialQuantity={checkoutItem.quantity}
        isFromCart={true}
      />
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="cart-overlay" onClick={onClose}>
        <div className="cart-panel" onClick={(e) => e.stopPropagation()}>
          <div className="cart-header">
            <h2>Your Cart</h2>
            <button onClick={onClose} className="cart-close">×</button>
          </div>
          <div className="cart-empty">
            <p>Your cart is empty</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-overlay" onClick={onClose}>
      <div className="cart-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cart-header">
          <h2>Your Cart ({getCartCount()} items)</h2>
          <button onClick={onClose} className="cart-close">×</button>
        </div>

        <div className="cart-items">
          {cartItems.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-image-container">
                <img src={item.product.preview} alt={item.product.name} className="cart-item-frame-image" />
              </div>
              <div className="cart-item-info">
                <div className="cart-item-header">
                  <h3 className="cart-item-title">{item.product.name}</h3>
                  <div className="cart-item-price">${(item.product.price * item.quantity).toFixed(2)}</div>
                </div>
                <div className="cart-item-specs">
                  <div className="cart-spec-row">
                    <span className="spec-label">Size:</span>
                    <span className="spec-value">{item.selectedSize}"</span>
                  </div>
                  <div className="cart-spec-row">
                    <span className="spec-label">Frame:</span>
                    <span className="spec-value">
                      <span 
                        className="color-dot"
                        style={{ 
                          backgroundColor: item.selectedColor.value,
                          border: item.selectedColor.value === '#FFFFFF' ? '1px solid #e0e0e0' : 'none'
                        }}
                      ></span>
                      {item.selectedColor.name}
                    </span>
                  </div>
                  <div className="cart-spec-row">
                    <span className="spec-label">Unit Price:</span>
                    <span className="spec-value">${item.product.price.toFixed(2)}</span>
                  </div>
                </div>
                <div className="cart-item-actions">
                  <div className="cart-item-quantity">
                    <span className="quantity-label">Quantity:</span>
                    <div className="quantity-controls">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="quantity-btn"
                      >
                        -
                      </button>
                      <span className="quantity-value">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="quantity-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="cart-item-remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-footer">
          <div className="cart-pricing">
            <div className="cart-subtotal-row">
              <span>Subtotal:</span>
              <span>${getCartTotal().toFixed(2)}</span>
            </div>
            <div className="cart-shipping-container">
              <div className="cart-shipping-row">
                <span>
                  🇺🇸 Shipping:
                  {getCartTotal() >= 100 && <span className="free-shipping-badge">FREE</span>}
                </span>
                <span>
                  {getCartTotal() >= 100 ? (
                    <span className="free-shipping">$7.00</span>
                  ) : (
                    '$7.00'
                  )}
                </span>
              </div>
              {getCartTotal() < 100 && (
                <div className="cart-shipping-notice">
                  Add ${(100 - getCartTotal()).toFixed(2)} more for free shipping!
                </div>
              )}
            </div>
            <div className="cart-total">
              <span>Total:</span>
              <span className="cart-total-price">
                ${(getCartTotal() + (getCartTotal() >= 100 ? 0 : 7)).toFixed(2)}
              </span>
            </div>
          </div>
          <button 
            className="cart-checkout-button stripe-button" 
            onClick={handleCheckout}
            disabled={isProcessing}
          >
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
      </div>
    </div>
  )
}

export default Cart

