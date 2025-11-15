import { useState, useEffect } from 'react'
import './ImageDetail.css'
import Checkout from './Checkout'
import Cart from './Cart'
import Footer from './Footer'
import { useCart } from './CartContext'
import { fetchFrameMapping } from './api'
import { generateFramePreviews } from './frameCompositor'

const API_BASE_URL = 'https://imageseventsbackend-production.up.railway.app'

// Frame colors
const frameColors = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Natural Wood', value: '#D4A574' },
  { name: 'Dark Wood', value: '#5C4033' },
]

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

function ImageDetail({ image, printOptions, eventId, onBack, onAddedToCart }) {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showCart, setShowCart] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [frameMapping, setFrameMapping] = useState(null)
  const [framePreviews, setFramePreviews] = useState([])
  const [loadingPreviews, setLoadingPreviews] = useState(true)
  const { getCartCount } = useCart()

  // Use API print options if available, otherwise use default products
  const frameProducts = printOptions && printOptions.length > 0 ? printOptions : defaultProducts

  // Load frame mapping on mount
  useEffect(() => {
    const loadFrameMapping = async () => {
      try {
        const mapping = await fetchFrameMapping()
        setFrameMapping(mapping)
        console.log('✅ Frame mapping loaded for ImageDetail')
      } catch (error) {
        console.error('❌ Failed to load frame mapping:', error)
      }
    }
    
    loadFrameMapping()
  }, [])

  // Generate frame previews when image or mapping changes
  useEffect(() => {
    const generatePreviews = async () => {
      if (!frameMapping || !image.src) {
        setLoadingPreviews(false)
        return
      }
      
      try {
        setLoadingPreviews(true)
        console.log('🎨 Generating frame previews for image:', image.id)
        
        // Use production base URL for frame images
        const frameBaseUrl = 'https://gallery.images.events/frameImages'
        
        const previews = await generateFramePreviews(
          image.src,
          frameMapping,
          frameBaseUrl, // Use full production URL
          image.dimensions // Pass existing dimensions if available
        )
        
        setFramePreviews(previews)
        console.log('✅ Generated', previews.length, 'frame previews')
        console.log('📸 Frame preview URLs:', previews.map(p => p.frameImageUrl))
      } catch (error) {
        console.error('❌ Failed to generate frame previews:', error)
      } finally {
        setLoadingPreviews(false)
      }
    }
    
    generatePreviews()
  }, [frameMapping, image.src, image.id])

  useEffect(() => {
    window.scrollTo(0, 0)
    setImageLoaded(false) // Reset loading state when image changes
    setDownloading(false) // Reset downloading state when image changes
    setDownloaded(false) // Reset download state when image changes
  }, [image.id])

  const handleDownload = async () => {
    try {
      setDownloading(true)
      
      // Try to use a CORS proxy or fetch through backend
      const response = await fetch(`${API_BASE_URL}/download-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: image.src,
          filename: `${image.id}.jpg`
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `${image.id}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(blobUrl)
        
        // Mark as downloaded
        setDownloading(false)
        setDownloaded(true)
      } else {
        throw new Error('Backend download failed')
      }
    } catch (error) {
      console.error('Error downloading via backend:', error)
      setDownloading(false)
      
      // Fallback: Try direct download with content-disposition
      let downloadUrl = image.src
      
      if (downloadUrl.includes('firebasestorage.googleapis.com')) {
        const separator = downloadUrl.includes('?') ? '&' : '?'
        downloadUrl = `${downloadUrl}${separator}response-content-disposition=attachment`
      }
      
      // Open in new tab as last resort
      window.open(downloadUrl, '_blank')
    }
  }

  if (selectedProduct) {
    return (
      <Checkout 
        product={selectedProduct}
        image={image}
        eventId={eventId}
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
        <div className={`image-section ${downloaded ? 'collapsed' : ''}`}>
          {!downloaded ? (
            <>
              <div className={`image-wrapper ${imageLoaded ? 'loaded' : ''}`}>
                {!imageLoaded && (
                  <div className="image-skeleton">
                    <div className="skeleton-shimmer"></div>
                  </div>
                )}
                <img 
                  src={image.src} 
                  alt={`Photo ${image.id}`}
                  onLoad={() => setImageLoaded(true)}
                  style={{ opacity: imageLoaded ? 1 : 0 }}
                />
              </div>
              <button onClick={handleDownload} className="download-button" disabled={downloading}>
                {downloading ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="8 10 12 14 16 10" />
                      <line x1="12" y1="14" x2="12" y2="3" />
                    </svg>
                    Downloading<span className="dots"></span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="8 10 12 14 16 10" />
                      <line x1="12" y1="14" x2="12" y2="3" />
                    </svg>
                    Download Original
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="download-success">
              <div className="success-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 className="success-title">Downloaded</h3>
              <p className="success-subtitle">Your image has been saved</p>
            </div>
          )}
        </div>

        <div className="products-section">
          <h2 className="products-title">Order Prints</h2>
          <p className="products-subtitle">Choose your perfect size</p>
          
          {loadingPreviews ? (
            <div className="products-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="product-card loading">
                  <div className="product-image skeleton">
                    <div className="skeleton-shimmer"></div>
                  </div>
                  <div className="product-info">
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text short"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : framePreviews.length > 0 ? (
            <div className="products-grid">
              {framePreviews.map((preview, index) => {
                const product = {
                  id: index + 1,
                  name: `${preview.size}" Framed Print`,
                  price: 49.99, // Base price, will be calculated properly in checkout
                  preview: preview.compositedImage,
                  size: preview.size
                }
                
                return (
                  <div 
                    key={preview.size}
                    className="product-card"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="product-image">
                      <img 
                        src={preview.compositedImage} 
                        alt={`${preview.size} frame`}
                      />
                      <div className="product-colors">
                        {frameColors.map((color) => (
                          <span
                            key={color.name}
                            className="product-color-circle"
                            style={{
                              backgroundColor: color.value,
                              border: color.value === '#FFFFFF' ? '1px solid #d0d0d0' : 'none'
                            }}
                            title={color.name}
                          ></span>
                        ))}
                      </div>
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{preview.size}"</h3>
                      <p className="product-price">From $49.99</p>
                    </div>
                    <button className="product-button">Select</button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="products-grid">
              {frameProducts.map((product) => (
                <div 
                  key={product.id}
                  className="product-card"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="product-image">
                    <img src={product.preview} alt={product.name} />
                    <div className="product-colors">
                      {frameColors.map((color) => (
                        <span
                          key={color.name}
                          className="product-color-circle"
                          style={{
                            backgroundColor: color.value,
                            border: color.value === '#FFFFFF' ? '1px solid #d0d0d0' : 'none'
                          }}
                          title={color.name}
                        ></span>
                      ))}
                    </div>
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-price">${product.price}</p>
                  </div>
                  <button className="product-button">Select</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default ImageDetail

