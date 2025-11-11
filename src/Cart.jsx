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
      
      console.log('Cart - Project ID from URL:', projectId)
      console.log('Cart - Full search params:', searchParams.toString())
      
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

      // Prepare checkout data with projectId at top level
      const checkoutData = {
        items: items,
        userId: 'guest',
        projectId: projectId,
        customerEmail: null
      }

      console.log('Cart - Sending to backend:', checkoutData)

      // Call backend to create Stripe checkout session
      const response = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData)
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
              <img src={item.product.preview} alt={item.product.name} className="cart-item-image" />
              <div className="cart-item-details">
                <h3>{item.product.name}</h3>
                <p className="cart-item-options">
                  Size: {item.selectedSize}" | Color: {item.selectedColor.name}
                </p>
                <div className="cart-item-quantity">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="quantity-btn"
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="quantity-btn"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="cart-item-price">
                <p>${(item.product.price * item.quantity).toFixed(2)}</p>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="cart-item-remove"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-footer">
          <div className="cart-total">
            <span>Total:</span>
            <span className="cart-total-price">${getCartTotal().toFixed(2)}</span>
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

