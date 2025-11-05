import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import Store from './Store'
import ImageDetail from './ImageDetail'
import Checkout from './Checkout'

function Home() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [email, setEmail] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedImage && email) {
      // Here you would typically send the data to your backend
      console.log('Submitting:', { image: selectedImage.name, email })
      setIsSubmitted(true)
    }
  }

  const handleReset = () => {
    setSelectedImage(null)
    setPreviewUrl(null)
    setEmail('')
    setIsSubmitted(false)
  }

  if (isSubmitted) {
    return (
      <div className="container">
        <div className="success-container">
          <div className="success-icon">✓</div>
          <h1>All Set!</h1>
          <p className="success-message">
            We'll search for your photos and send you an email at <strong>{email}</strong> when they're ready.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="content">
        <h2 className="event-title">John and Sara's Wedding</h2>
        <h1 className="title">Find Your Photos</h1>
        <p className="subtitle">Upload a reference image and we'll find all your photos from the event</p>

        <div
          className={`upload-area ${isDragging ? 'dragging' : ''} ${previewUrl ? 'has-image' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {previewUrl ? (
            <div className="preview-container">
              <img src={previewUrl} alt="Preview" className="preview-image" />
              <button onClick={handleReset} className="remove-button">
                Remove
              </button>
            </div>
          ) : (
            <label htmlFor="file-input" className="upload-label">
              <div className="upload-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="upload-text">Drop your image here or click to browse</p>
              <p className="upload-hint">Supports: JPG, PNG, HEIC</p>
            </label>
          )}
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="file-input"
          />
        </div>

        {selectedImage && (
          <form onSubmit={handleSubmit} className="form">
            <div className="input-group">
              <label htmlFor="email" className="label">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="email-input"
                required
              />
            </div>
            <button type="submit" className="submit-button">
              Send me email when it's ready
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/gallery" element={<Store />} />
      <Route path="/gallery/:imageId" element={<ImageDetail />} />
      <Route path="/checkout/:productId" element={<Checkout />} />
    </Routes>
  )
}

export default App

