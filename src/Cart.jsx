import { useState, useEffect } from 'react'
import './Cart.css'
import { useCart } from './CartContext'
import Checkout from './Checkout'

function Cart({ onClose }) {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, getCartCount } = useCart()
  const [checkoutItem, setCheckoutItem] = useState(null)

  useEffect(() => {
    // Prevent scrolling on mount
    document.body.style.overflow = 'hidden'
    
    // Re-enable scrolling on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

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
          <button className="cart-checkout-button" onClick={() => {
            // For now, just show alert. In real app, would navigate to full checkout
            alert('Proceeding to checkout with all items!')
            onClose()
          }}>
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  )
}

export default Cart

