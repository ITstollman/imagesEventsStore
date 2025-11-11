import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Cancel.css'

function Cancel() {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="cancel-container">
      <div className="cancel-content">
        <div className="cancel-card">
          <div className="cancel-icon-wrapper">
            <svg 
              className="cancel-icon" 
              viewBox="0 0 52 52" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle 
                className="cancel-circle" 
                cx="26" 
                cy="26" 
                r="25" 
                fill="none"
              />
              <path 
                className="cancel-x" 
                fill="none" 
                d="M16 16 L36 36 M36 16 L16 36"
              />
            </svg>
          </div>

          <h1 className="cancel-title">Checkout Cancelled</h1>
          
          <p className="cancel-message">
            Your order was not completed. No charges have been made.
          </p>

          <div className="cancel-info-box">
            <p className="cancel-text">
              If you experienced any issues during checkout, please contact us at{' '}
              <a href="mailto:support@imagesevents.com" className="support-link">
                support@imagesevents.com
              </a>
            </p>
          </div>

          <div className="cancel-actions">
            <button 
              className="cancel-return-button"
              onClick={() => navigate(-1)}
            >
              Return to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cancel

