import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import './Checkout.css'
import { useCart } from './CartContext'
import Cart from './Cart'
import Footer from './Footer'

// Custom Dropdown Component
function CustomDropdown({ value, options, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <div className="custom-dropdown-header" onClick={() => setIsOpen(!isOpen)}>
        <span>{value}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M13 6L8 11 3 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {isOpen && (
        <div className="custom-dropdown-list">
          {options.map((option) => (
            <div
              key={option}
              className={`custom-dropdown-option ${option === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option)
                setIsOpen(false)
              }}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const API_BASE_URL = 'https://imageseventsbackend-production.up.railway.app'

// Sizes organized by ratio
const sizesByRatio = {
  '1:1 Ratio': ['6x6', '8x8', '10x10', '12x12', '14x14', '16x16', '18x18', '20x20', '24x24', '28x28', '30x30', '32x32', '36x36', '40x40'],
  '2:3 Ratio': ['4x6', '8x12', '12x18', '16x24', '20x30', '24x36', '32x48', '36x54', '40x60', '18x27'],
  '3:4 Ratio': ['6x8', '9x12', '12x16', '18x24', '24x32', '30x40', '36x48'],
  '4:5 Ratio': ['8x10', '16x20', '20x25', '24x30'],
  'Other Ratios': ['4x10', '5x7', '5x10', '5x12', '6.8x16', '6x12', '8x20', '8x24', '8x28', '8.5x11', '9x11', '9x18', '10x13', '10x17', '10x20', '10x24', '10x30', '10x36', '11x14', '11x17', '11x22', '12x14', '12x20', '12x24', '12x36', '13x19', '14x18', '14x20', '14x23', '14x24']
}

// Flatten all sizes for easy access
const allSizes = Object.values(sizesByRatio).flat()

const frameTypes = ['Standard', 'Premium']

const metalColors = [
  { name: 'Black Metal', value: '#1a1a1a' },
  { name: 'Silver Metal', value: '#c0c0c0' },
  { name: 'Gold Metal', value: '#d4af37' },
  { name: 'White Metal', value: '#f5f5f5' },
]

const oakColors = [
  { name: 'Beige Oak', value: '#D4A574' },
  { name: 'Black Oak', value: '#5C4033' },
  { name: 'White Oak', value: '#e8dcc4' },
  { name: 'Walnut Oak', value: '#4a3426' },
]

const getFrameImage = (colorName, frameType) => {
  const formattedName = colorName.toLowerCase().replace(' ', '-')
  const framePrefix = frameType.toLowerCase()
  return `/frameColor/${framePrefix}-${formattedName}.png`
}

const printTypes = ['Poster', 'Photo', 'Fine Art']

const paperTypes = ['Matte', 'Glossy', 'Semi Gloss', 'Semi Matte Linen']

function Checkout({ product, image, eventId, onBack, onBackToGallery, initialSize, initialColor, initialQuantity, isFromCart }) {
  const [searchParams] = useSearchParams()
  const [selectedSize, setSelectedSize] = useState(initialSize || '8x10')
  const [frameType, setFrameType] = useState('Standard')
  const [material, setMaterial] = useState('Metal')
  const [selectedColor, setSelectedColor] = useState(metalColors[0])
  const [printType, setPrintType] = useState('Poster')
  const [paperType, setPaperType] = useState('Matte')
  const [readyToHang, setReadyToHang] = useState(true)
  const [includeHangingPins, setIncludeHangingPins] = useState(false)
  const [includeMats, setIncludeMats] = useState(false)
  const [quantity, setQuantity] = useState(initialQuantity || 1)
  const [showCart, setShowCart] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const { addToCart, getCartCount, getCartTotal, getShippingCost, cartItems, removeFromCart, FREE_SHIPPING_THRESHOLD } = useCart()

  const currentColors = material === 'Metal' ? metalColors : oakColors

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const currentItemTotal = product.price * quantity
  const cartTotal = getCartTotal()
  const subtotalBeforeShipping = currentItemTotal + cartTotal
  
  // Shipping calculation including the current item being configured
  const currentItem = {
    product,
    selectedSize,
    selectedColor,
    quantity,
    frameType,
    material
  }
  const allItems = [...cartItems, currentItem]
  const shipping = subtotalBeforeShipping >= FREE_SHIPPING_THRESHOLD ? 0 : getShippingCost(allItems)
  const grandTotal = subtotalBeforeShipping + shipping

  const handleCheckout = async (e) => {
    e.preventDefault()
    setIsProcessing(true)
    
    try {
      // Get event ID from props or URL params
      const projectId = eventId || searchParams.get('e') || ''
      
      console.log('Checkout - Project ID from prop:', eventId)
      console.log('Checkout - Project ID from URL:', searchParams.get('e'))
      console.log('Checkout - Final Project ID:', projectId)
      
      // Helper function to format size (e.g., "8x10" → "x8x10")
      const formatSize = (size) => `x${size.replace('"', '')}`
      
      // Helper function to get Artelo frameColor enum
      const getFrameColor = (frameType, material, colorName) => {
        // Remove material type from color name (e.g., "Black Metal" → "Black")
        const color = colorName.replace(/\s+(Metal|Oak)$/i, '').replace(/\s+/g, '')
        if (frameType === 'Premium') {
          return material === 'Oak' ? `${color}PremiumOak` : `${color}PremiumMetal`
        } else {
          return material === 'Oak' ? `${color}Oak` : `${color}Metal`
        }
      }
      
      // Helper function to get Artelo paperType enum
      const getPaperType = (printType, paperType) => {
        const paper = paperType.replace(/\s+/g, '')
        if (printType === 'Poster') {
          return `${paper}Poster`
        } else if (printType === 'Photo') {
          return `${paper}Photo`
        } else {
          return `Archival${paper}FineArt`
        }
      }
      
      // Determine orientation from size
      const getOrientation = (size) => {
        const [width, height] = size.replace('"', '').split('x').map(Number)
        return width > height ? 'Horizontal' : width < height ? 'Vertical' : null
      }
      
      // Format items with BOTH Stripe and Artelo data
      const orientation = getOrientation(selectedSize)
      const items = [{
        // Stripe fields (for checkout session)
        productId: product.id,
        productName: `${product.name} - ${selectedSize}" ${orientation || 'Square'} ${frameType} ${material} ${selectedColor.name}`,
        price: product.price,
        quantity: quantity,
        imageUrl: image?.src || product.preview,
        // Artelo API fields (for order fulfillment)
        orderItemId: `item-${product.id}-${Date.now()}`,
        productInfo: {
          catalogProductId: "IndividualArtPrint",
          frameColor: getFrameColor(frameType, material, selectedColor.name),
          includeFramingService: readyToHang,
          includeHangingPins: includeHangingPins,
          includeMats: includeMats,
          orientation: getOrientation(selectedSize),
          paperType: getPaperType(printType, paperType),
          size: formatSize(selectedSize),
          unitCost: product.price
        },
        designs: [{
          sourceImage: {
            url: image?.src || product.preview
          }
        }],
        unitPrice: product.price
      }]

      // Add shipping as a separate line item
      items.push({
        productId: 'shipping',
        productName: shipping === 0 ? '🇺🇸 FREE Shipping (7 days)' : '🇺🇸 Shipping (7 days)',
        price: shipping,
        quantity: 1
      })

      // Create metadata object with full order details including shipping
      const metadata = {
        userId: 'guest',
        projectId: projectId,
        itemCount: '1', // Only count actual products, not shipping
        shippingCost: shipping.toFixed(2),
        shippingDescription: shipping === 0 ? '🇺🇸 FREE Shipping (7 days)' : '🇺🇸 Shipping (7 days)',
        subtotal: subtotalBeforeShipping.toFixed(2),
        total: grandTotal.toFixed(2),
        freeShipping: shipping === 0 ? 'true' : 'false',
        // Add detailed product information (exclude shipping)
        products: JSON.stringify(items.filter(item => item.productId !== 'shipping'))
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
                <h3 className="section-title">Size</h3>
                
                {/* Ratio-based organization for all screens */}
                <div className="size-ratios-container">
                  {Object.entries(sizesByRatio).map(([ratio, sizes]) => (
                    <div key={ratio} className="ratio-group">
                      <h4 className="ratio-title">{ratio}</h4>
                      <div className="ratio-sizes">
                        {sizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            className={`size-button ${selectedSize === size ? 'selected' : ''}`}
                            onClick={() => setSelectedSize(size)}
                          >
                            {size}"
                          </button>
                        ))}
                      </div>
                    </div>
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
                <div className="frame-color-sections">
                  <div className="frame-material-section">
                    <h4 className="material-label">Metal</h4>
                    <div className="frame-color-grid">
                      {metalColors.map((color) => (
                        <div
                          key={color.name}
                          className={`frame-color-card ${selectedColor.name === color.name ? 'selected' : ''}`}
                          onClick={() => {
                            setMaterial('Metal')
                            setSelectedColor(color)
                          }}
                        >
                          <div className="frame-color-image">
                            <img src={getFrameImage(color.name, frameType)} alt={color.name} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="frame-material-section">
                    <h4 className="material-label">Oak</h4>
                    <div className="frame-color-grid">
                      {oakColors.map((color) => (
                        <div
                          key={color.name}
                          className={`frame-color-card ${selectedColor.name === color.name ? 'selected' : ''}`}
                          onClick={() => {
                            setMaterial('Oak')
                            setSelectedColor(color)
                          }}
                        >
                          <div className="frame-color-image">
                            <img src={getFrameImage(color.name, frameType)} alt={color.name} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Print Type</h3>
                <div className="mobile-only">
                  <CustomDropdown
                    value={printType}
                    options={printTypes}
                    onChange={setPrintType}
                  />
                </div>
                <div className="size-options desktop-only">
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
                <div className="mobile-only">
                  <CustomDropdown
                    value={paperType}
                    options={paperTypes}
                    onChange={setPaperType}
                  />
                </div>
                <div className="paper-options desktop-only">
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
                <h3 className="section-title">Framing Service</h3>
                <div className="framing-service-container">
                  <label className={`framing-service-option ${readyToHang ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="framingService"
                      checked={readyToHang}
                      onChange={() => setReadyToHang(true)}
                    />
                    <div className="framing-service-content">
                      <span className="framing-service-title">Ready-to-hang</span>
                      <span className="framing-service-desc">Print is placed in frame</span>
                    </div>
                  </label>
                  <label className={`framing-service-option ${!readyToHang ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="framingService"
                      checked={!readyToHang}
                      onChange={() => setReadyToHang(false)}
                    />
                    <div className="framing-service-content">
                      <div className="framing-service-header">
                        <span className="framing-service-title">Insert Print Yourself</span>
                        <span className="framing-service-badge">-save $5</span>
                      </div>
                      <span className="framing-service-desc">Print and frame shipped together</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">Add-Ons</h3>
                <div className="addons-container">
                  <label className="addon-checkbox">
                    <input
                      type="checkbox"
                      checked={includeHangingPins}
                      onChange={(e) => setIncludeHangingPins(e.target.checked)}
                    />
                    <span>Include Hanging Pins</span>
                    <button type="button" className="info-icon" title="Easy installation hardware included">ⓘ</button>
                  </label>
                  <label className="addon-checkbox">
                    <input
                      type="checkbox"
                      checked={includeMats}
                      onChange={(e) => setIncludeMats(e.target.checked)}
                    />
                    <span>Include Mats</span>
                    <button type="button" className="info-icon" title="Professional matting for enhanced presentation">ⓘ</button>
                  </label>
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
                    <p>Size: {selectedSize}" ({orientation || 'Square'})</p>
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
                    {cartItems.map((item) => {
                      const [width, height] = item.selectedSize.replace('"', '').split('x').map(Number)
                      const itemOrientation = width > height ? 'Horizontal' : width < height ? 'Vertical' : 'Square'
                      return (
                        <div key={item.id} className="summary-item">
                          <img src={item.product.preview} alt={item.product.name} className="summary-item-image" />
                          <div className="summary-item-details">
                            <h4>{item.product.name}</h4>
                            <p>Size: {item.selectedSize}" ({itemOrientation})</p>
                            <p>Frame: {item.frameType || 'Standard'} {item.material || 'Metal'} - {item.selectedColor.name}</p>
                            <p>Print: {item.printType || 'Poster'} on {item.paperType || 'Matte'}</p>
                            <p>{item.framingService || 'Ready to Hang'}</p>
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
                      )
                    })}
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
                      🇺🇸 Shipping (7 days):
                      {shipping === 0 && <span className="free-shipping-badge">FREE</span>}
                    </span>
                    <span>
                      {shipping === 0 ? (
                        <span className="free-shipping">${getShippingCost(allItems).toFixed(2)}</span>
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
                    quantity,
                    frameType,
                    material,
                    printType,
                    paperType,
                    framingService: readyToHang ? 'Ready-to-hang' : 'Insert Print Yourself',
                    includeHangingPins,
                    includeMats
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

