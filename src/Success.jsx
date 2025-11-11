import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCart } from './CartContext'
import './Success.css'

function Success() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { clearCart } = useCart()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    window.scrollTo(0, 0)
    // Clear the cart after successful purchase
    if (sessionId) {
      clearCart()
    }
  }, [sessionId, clearCart])

  return (
    <div className="success-container">
      <div className="success-content">
        <div className="success-card">
          <div className="success-icon-wrapper">
            <svg 
              className="success-icon" 
              viewBox="0 0 52 52" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle 
                className="success-circle" 
                cx="26" 
                cy="26" 
                r="25" 
                fill="none"
              />
              <path 
                className="success-check" 
                fill="none" 
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
              />
            </svg>
          </div>

          <h1 className="success-title">Order Successful!</h1>
          
          <p className="success-message">
            Thank you for your purchase. Your order has been confirmed.
          </p>

          <div className="success-info-box">
            <p className="success-email-message">
              We will send you a confirmation email in a few moments.
            </p>
            <p className="success-support">
              Didn't get one? Email us at{' '}
              <a href="mailto:support@imagesevents.com" className="support-link">
                support@imagesevents.com
              </a>
            </p>
          </div>

          {sessionId && (
            <p className="success-session">
              Order ID: <span>{sessionId.slice(-8)}</span>
            </p>
          )}

          <button 
            className="success-button"
            onClick={() => navigate('/')}
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default Success

