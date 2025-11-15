import { useState, useEffect } from 'react'
import './ImageDetail.css'
import Checkout from './Checkout'
import Cart from './Cart'
import Footer from './Footer'
import { useCart } from './CartContext'
import { fetchFrameMapping } from './api'
import { findBestFrameSizes } from './frameCompositor'

const API_BASE_URL = 'https://imageseventsbackend-production.up.railway.app'

// Frame colors
const frameColors = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Natural Wood', value: '#D4A574' },
  { name: 'Dark Wood', value: '#5C4033' },
]

// Frame preview card with loading state
function FramePreviewCard({ preview, product, onSelect, frameColors }) {
  const [userPhotoLoaded, setUserPhotoLoaded] = useState(false)
  const [frameLoaded, setFrameLoaded] = useState(false)
  
  const bothLoaded = userPhotoLoaded && frameLoaded
  const is3D = preview.is3D || preview.mode === '3d'
  
  return (
    <div 
      className="product-card"
      onClick={bothLoaded ? onSelect : undefined}
      style={{ cursor: bothLoaded ? 'pointer' : 'default' }}
    >
      {/* Show skeleton while loading */}
      {!bothLoaded && (
        <div className="product-image skeleton">
          <div className="skeleton-shimmer"></div>
        </div>
      )}
      
      {/* Hide preview until both images loaded */}
      <div 
        className="product-image frame-preview-container"
        style={{ display: bothLoaded ? 'block' : 'none' }}
      >
        {is3D ? (
          // 3D Mode: Clipped user image already contains both photo and transparency
          // Just display it behind the frame overlay
          <>
            <img 
              src={preview.userImage} 
              alt={`Your photo clipped`}
              className="user-photo-preview user-photo-3d"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                zIndex: 1
              }}
              onLoad={() => {
                console.log('✅ 3D clipped photo loaded:', preview.size)
                setUserPhotoLoaded(true)
              }}
              onError={(e) => {
                console.error('❌ 3D photo failed:', preview.size, e)
                setUserPhotoLoaded(true)
              }}
            />
            {/* Frame overlay on top */}
            <img 
              src={preview.frameImageUrl}
              alt={`${preview.size} frame`}
              className="frame-image-base"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                zIndex: 2,
                pointerEvents: 'none'
              }}
              onLoad={() => {
                console.log('✅ Frame loaded (3D):', preview.frameImageUrl.substring(0, 80))
                setFrameLoaded(true)
              }}
              onError={(e) => {
                console.error('❌ Frame failed (3D):', preview.frameImageUrl)
                setFrameLoaded(true)
              }}
            />
          </>
        ) : (
          // 2D Mode: CSS positioning with coordinates
          <>
            <img 
              src={preview.userImage} 
              alt={`Your photo`}
              className="user-photo-preview"
              style={{
                left: preview.coordinates.left,
                top: preview.coordinates.top,
                width: preview.coordinates.width,
                height: preview.coordinates.height
              }}
              onLoad={() => {
                console.log('✅ 2D User photo loaded:', preview.size)
                setUserPhotoLoaded(true)
              }}
              onError={(e) => {
                console.error('❌ 2D User photo failed:', preview.size, e)
                setUserPhotoLoaded(true)
              }}
            />
            {/* Frame overlay on top */}
            <img 
              src={preview.frameImageUrl}
              alt={`${preview.size} frame`}
              className="frame-image-base"
              onLoad={() => {
                console.log('✅ Frame loaded (2D):', preview.frameImageUrl.substring(0, 80))
                setFrameLoaded(true)
              }}
              onError={(e) => {
                console.error('❌ Frame failed (2D):', preview.frameImageUrl)
                setFrameLoaded(true)
              }}
            />
          </>
        )}
        
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
        <h3 className="product-name">{preview.size}" {is3D ? '🎭' : ''}</h3>
        <p className="product-price">From $49.99</p>
      </div>
      <button className="product-button" disabled={!bothLoaded}>
        {bothLoaded ? 'Select' : 'Loading...'}
      </button>
    </div>
  )
}

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
  const [downloadEnabled, setDownloadEnabled] = useState(false)
  const [downloadCountdown, setDownloadCountdown] = useState(5)
  const { getCartCount } = useCart()

  // Use API print options if available, otherwise empty array (no fallback)
  const frameProducts = printOptions && printOptions.length > 0 ? printOptions : []

  // Load frame mapping on mount
  useEffect(() => {
    const loadFrameMapping = async () => {
      try {
        const mapping = await fetchFrameMapping()
        setFrameMapping(mapping)
        console.log('✅ Frame mapping loaded for ImageDetail')
        console.log('📦 COMPLETE FRAME MAPPING FROM SERVER:')
        console.log(JSON.stringify(mapping, null, 2))
        console.log('📊 Summary:', {
          totalFrames: mapping?.data?.totalFrames,
          organization: mapping?.data?.organization,
          availableFrames: mapping?.data?.frames ? Object.keys(mapping.data.frames).length : 0
        })
        console.log('🖼️ Available frame paths:', mapping?.data?.frames ? Object.keys(mapping.data.frames) : [])
      } catch (error) {
        console.error('❌ Failed to load frame mapping:', error)
      }
    }
    
    loadFrameMapping()
  }, [])

  // Generate frame previews when image or mapping changes
  useEffect(() => {
    const generateFramePreviews = async () => {
      if (!frameMapping || !image.src || !image.dimensions) {
        setLoadingPreviews(false)
        return
      }
      
      try {
        setLoadingPreviews(true)
        console.log('🎨 Generating frame previews for image:', image.id)
        console.log('📐 Image dimensions:', image.dimensions.width, 'x', image.dimensions.height)
        
        // Find best matching frame sizes
        const bestMatches = findBestFrameSizes(
          image.dimensions.width,
          image.dimensions.height,
          frameMapping,
          4
        )
        
        console.log('🎯 Best matching frames:', bestMatches.map(m => m.size).join(', '))
        
        // Generate previews with canvas clipping for 3D frames
        const previewPromises = bestMatches.map(async (match) => {
          const frameData = match.frameData
          
          // Check if this frame has 3D perspective (4 points)
          const is3D = frameData.is3D && frameData.points && frameData.points.length === 4
          
          if (is3D) {
            console.log(`🎭 3D frame detected for ${match.size}, using canvas clipping`)
            
            // Use canvas to clip user image to the 4-point polygon
            try {
              const clippedImageUrl = await clipImageToPolygon(
                image.src,
                frameData.points,
                frameData.imageWidth,
                frameData.imageHeight
              )
              
              return {
                size: match.size,
                userImage: clippedImageUrl, // Canvas-generated clipped image
                frameImageUrl: `https://gallery.images.events/frameImages/${match.framePath}`,
                framePath: match.framePath,
                score: match.score,
                mode: '3d',
                is3D: true
              }
            } catch (error) {
              console.error(`❌ Failed to clip 3D frame ${match.size}:`, error)
              // Fall back to 2D mode
            }
          }
          
          // 2D mode: Use CSS positioning (legacy or fallback)
          const photoX = frameData.topLeft?.x || frameData.legacyTopLeft?.x
          const photoY = frameData.topLeft?.y || frameData.legacyTopLeft?.y
          const photoWidth = frameData.width
          const photoHeight = frameData.height
          const frameWidth = frameData.imageWidth
          const frameHeight = frameData.imageHeight
          
          // Calculate percentages for CSS positioning
          const left = (photoX / frameWidth) * 100
          const top = (photoY / frameHeight) * 100
          const width = (photoWidth / frameWidth) * 100
          const height = (photoHeight / frameHeight) * 100
          
          return {
            size: match.size,
            userImage: image.src,
            frameImageUrl: `https://gallery.images.events/frameImages/${match.framePath}`,
            framePath: match.framePath,
            score: match.score,
            mode: '2d',
            is3D: false,
            coordinates: {
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`
            }
          }
        })
        
        const previews = await Promise.all(previewPromises)
        
        setFramePreviews(previews)
        console.log('✅ Generated', previews.length, 'frame previews')
        console.log('📊 Modes:', {
          '3D': previews.filter(p => p.is3D).length,
          '2D': previews.filter(p => !p.is3D).length
        })
      } catch (error) {
        console.error('❌ Failed to generate frame previews:', error)
        setFramePreviews([])
      } finally {
        setLoadingPreviews(false)
      }
    }
    
    // Helper function to clip image to a 4-point polygon using canvas
    const clipImageToPolygon = async (imageUrl, points, canvasWidth, canvasHeight) => {
      return new Promise(async (resolve, reject) => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = canvasWidth
          canvas.height = canvasHeight
          const ctx = canvas.getContext('2d')
          
          // Clear canvas (transparent background)
          ctx.clearRect(0, 0, canvasWidth, canvasHeight)
          
          // Fetch image as blob to bypass CORS
          console.log('📥 Fetching user image as blob for 3D clipping...')
          const imageBlob = await fetch(imageUrl).then(res => {
            if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
            return res.blob()
          })
          const imageBlobUrl = URL.createObjectURL(imageBlob)
          console.log('✅ User image blob created successfully')
          
          // Load user image from blob URL
          const img = new Image()
          
          img.onload = () => {
            try {
              // Create clipping path from the 4 points
              ctx.beginPath()
              ctx.moveTo(points[0].x, points[0].y)
              for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y)
              }
              ctx.closePath()
              ctx.clip()
              
              // Calculate bounding box of the 4 points to know where to draw
              const xs = points.map(p => p.x)
              const ys = points.map(p => p.y)
              const minX = Math.min(...xs)
              const minY = Math.min(...ys)
              const maxX = Math.max(...xs)
              const maxY = Math.max(...ys)
              const bboxWidth = maxX - minX
              const bboxHeight = maxY - minY
              
              // Calculate scale to cover the bounding box
              const scaleX = bboxWidth / img.width
              const scaleY = bboxHeight / img.height
              const scale = Math.max(scaleX, scaleY)
              
              const scaledWidth = img.width * scale
              const scaledHeight = img.height * scale
              
              // Center the image in the bounding box
              const offsetX = minX + (bboxWidth - scaledWidth) / 2
              const offsetY = minY + (bboxHeight - scaledHeight) / 2
              
              // Draw the image (will be clipped to the polygon)
              ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
              
              // Clean up blob URL
              URL.revokeObjectURL(imageBlobUrl)
              
              // Convert canvas to data URL
              const dataUrl = canvas.toDataURL('image/png', 0.95)
              console.log('✅ 3D clipping successful, canvas converted to data URL')
              resolve(dataUrl)
            } catch (error) {
              URL.revokeObjectURL(imageBlobUrl)
              reject(error)
            }
          }
          
          img.onerror = () => {
            URL.revokeObjectURL(imageBlobUrl)
            reject(new Error('Failed to load user image for clipping'))
          }
          
          img.src = imageBlobUrl
        } catch (error) {
          reject(error)
        }
      })
    }
    
    generateFramePreviews()
  }, [frameMapping, image.src, image.id, image.dimensions])

  // 5-second countdown before enabling download
  useEffect(() => {
    setDownloadEnabled(false)
    setDownloadCountdown(5)
    
    const timer = setInterval(() => {
      setDownloadCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setDownloadEnabled(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [image.id])

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
              <button 
                onClick={handleDownload} 
                className="download-button" 
                disabled={!downloadEnabled || downloading}
                style={{ 
                  opacity: !downloadEnabled ? 0.5 : 1,
                  cursor: !downloadEnabled ? 'not-allowed' : 'pointer'
                }}
              >
                {downloading ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="8 10 12 14 16 10" />
                      <line x1="12" y1="14" x2="12" y2="3" />
                    </svg>
                    Downloading<span className="dots"></span>
                  </>
                ) : !downloadEnabled ? (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Wait {downloadCountdown}s to download...
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
                  preview: preview.userImage,
                  size: preview.size
                }
                
                return (
                  <FramePreviewCard 
                    key={preview.size}
                    preview={preview}
                    product={product}
                    onSelect={() => setSelectedProduct(product)}
                    frameColors={frameColors}
                  />
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

