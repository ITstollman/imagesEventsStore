/**
 * Frame Compositor Utility
 * Handles finding best matching frames and compositing user images into frame overlays
 */

import { buildOverlayData } from './perspectiveTransform.js'

/**
 * Calculate the aspect ratio of an image
 * Handles CORS by fetching through blob
 */
export const getImageDimensions = async (imageUrl) => {
  try {
    // Fetch image as blob to avoid CORS issues
    const imageBlob = await fetch(imageUrl).then(res => {
      if (!res.ok) throw new Error('Failed to fetch image')
      return res.blob()
    })
    const imageBlobUrl = URL.createObjectURL(imageBlob)
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(imageBlobUrl)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = () => {
        URL.revokeObjectURL(imageBlobUrl)
        reject(new Error('Failed to load image dimensions'))
      }
      img.src = imageBlobUrl
    })
  } catch (error) {
    throw new Error(`Failed to get image dimensions: ${error.message}`)
  }
}

/**
 * Determine orientation from dimensions
 */
export const determineOrientation = (width, height) => {
  if (width === height) return 'square'
  return width > height ? 'horizontal' : 'vertical'
}

/**
 * Calculate aspect ratio
 */
export const calculateAspectRatio = (width, height) => {
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b)
  const divisor = gcd(width, height)
  return { width: width / divisor, height: height / divisor, ratio: width / height }
}

/**
 * Parse size string to dimensions (e.g., "16x20" -> { width: 16, height: 20 })
 */
export const parseSize = (sizeStr) => {
  const [width, height] = sizeStr.split('x').map(Number)
  return { width, height }
}

/**
 * Calculate how well a frame size matches the image dimensions
 * Returns a score (lower is better)
 */
export const calculateFrameMatch = (imageWidth, imageHeight, frameSize) => {
  const frame = parseSize(frameSize)
  const imageRatio = imageWidth / imageHeight
  const frameRatio = frame.width / frame.height
  
  // Calculate ratio difference (penalize aspect ratio mismatch heavily)
  const ratioDiff = Math.abs(imageRatio - frameRatio)
  
  // Calculate scale difference (how much the image needs to be resized)
  const imageArea = imageWidth * imageHeight
  const frameArea = frame.width * frame.height
  const scaleDiff = Math.abs(Math.log(frameArea / imageArea))
  
  // Weighted score: aspect ratio is more important than scale
  return ratioDiff * 100 + scaleDiff * 10
}

/**
 * Find the top N best matching frame sizes for an image
 */
export const findBestFrameSizes = (imageWidth, imageHeight, frameMapping, topN = 4) => {
  if (!frameMapping?.data?.frames) return []
  
  const orientation = determineOrientation(imageWidth, imageHeight)
  const frames = frameMapping.data.frames
  
  // Extract all unique sizes from frame paths that match orientation
  const sizeMap = new Map()
  
  for (const [framePath, frameData] of Object.entries(frames)) {
    // Only consider frames with matching orientation
    if (frameData.orientation !== orientation) continue
    
    // Extract size from filename (e.g., "H-16x20-premium-metal.png" -> "16x20")
    const filename = framePath.split('/').pop()
    const sizeMatch = filename.match(/(\d+x\d+)/)
    
    if (sizeMatch) {
      const size = sizeMatch[1]
      const score = calculateFrameMatch(imageWidth, imageHeight, size)
      
      if (!sizeMap.has(size) || sizeMap.get(size).score > score) {
        sizeMap.set(size, {
          size,
          score,
          framePath,
          frameData
        })
      }
    }
  }
  
  // Sort by score and return top N
  return Array.from(sizeMap.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, topN)
}

/**
 * Composite an image into a frame using canvas
 * Returns a data URL of the composited image
 */
export const compositeImageIntoFrame = async (
  userImageUrl,
  framePath,
  frameData,
  frameBaseUrl = 'https://gallery.images.events/frameImages'
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // Set canvas size to frame dimensions
      canvas.width = frameData.imageWidth
      canvas.height = frameData.imageHeight
      
      // Fetch user image as blob to avoid CORS issues
      console.log('📥 Fetching user image:', userImageUrl.substring(0, 80) + '...')
      const userImageBlob = await fetch(userImageUrl)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch user image: ${res.status} ${res.statusText}`)
          return res.blob()
        })
      const userImageBlobUrl = URL.createObjectURL(userImageBlob)
      console.log('✅ User image fetched successfully')
      
      // Fetch frame image as blob to avoid CORS issues
      const frameImageUrl = `${frameBaseUrl}/${framePath}`
      console.log('🖼️ Fetching frame from:', frameImageUrl)
      const frameImageBlob = await fetch(frameImageUrl)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch frame image: ${res.status} ${res.statusText}`)
          return res.blob()
        })
      const frameImageBlobUrl = URL.createObjectURL(frameImageBlob)
      console.log('✅ Frame image fetched successfully')
      
      const userImage = new Image()
      const frameImage = new Image()
      
      let userImageLoaded = false
      let frameImageLoaded = false
      
      const checkBothLoaded = () => {
        if (!userImageLoaded || !frameImageLoaded) return
        
        try {
          // Calculate photo area dimensions from coordinates
          const photoX = frameData.topLeft.x
          const photoY = frameData.topLeft.y
          const photoWidth = frameData.width
          const photoHeight = frameData.height
          
          // Draw user image (fit to cover the photo area)
          ctx.save()
          ctx.rect(photoX, photoY, photoWidth, photoHeight)
          ctx.clip()
          
          // Calculate scale to cover the photo area
          const scaleX = photoWidth / userImage.width
          const scaleY = photoHeight / userImage.height
          const scale = Math.max(scaleX, scaleY)
          
          const scaledWidth = userImage.width * scale
          const scaledHeight = userImage.height * scale
          
          // Center the image in the photo area
          const offsetX = photoX + (photoWidth - scaledWidth) / 2
          const offsetY = photoY + (photoHeight - scaledHeight) / 2
          
          ctx.drawImage(userImage, offsetX, offsetY, scaledWidth, scaledHeight)
          ctx.restore()
          
          // Draw frame overlay on top
          ctx.drawImage(frameImage, 0, 0, frameData.imageWidth, frameData.imageHeight)
          
          // Clean up blob URLs
          URL.revokeObjectURL(userImageBlobUrl)
          URL.revokeObjectURL(frameImageBlobUrl)
          
          // Convert to data URL
          resolve(canvas.toDataURL('image/png', 0.9))
        } catch (error) {
          URL.revokeObjectURL(userImageBlobUrl)
          URL.revokeObjectURL(frameImageBlobUrl)
          reject(error)
        }
      }
      
      userImage.onload = () => {
        userImageLoaded = true
        checkBothLoaded()
      }
      
      frameImage.onload = () => {
        frameImageLoaded = true
        checkBothLoaded()
      }
      
      userImage.onerror = () => {
        URL.revokeObjectURL(userImageBlobUrl)
        URL.revokeObjectURL(frameImageBlobUrl)
        reject(new Error('Failed to load user image'))
      }
      frameImage.onerror = () => {
        URL.revokeObjectURL(userImageBlobUrl)
        URL.revokeObjectURL(frameImageBlobUrl)
        reject(new Error('Failed to load frame image'))
      }
      
      // Load images from blob URLs
      userImage.src = userImageBlobUrl
      frameImage.src = frameImageBlobUrl
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Generate simple CSS-based frame previews (no canvas compositing)
 * Uses perspective transforms for 3D frames and simple rectangles for legacy frames
 */
export const generateSimpleFramePreviews = (
  userImageUrl,
  imageDimensions,
  frameMapping,
  frameBaseUrl = 'https://gallery.images.events/frameImages',
  topN = 4
) => {
  if (!imageDimensions || !frameMapping) return []
  
  // Find best matching frame sizes
  const bestMatches = findBestFrameSizes(
    imageDimensions.width,
    imageDimensions.height,
    frameMapping,
    topN
  )
  
  if (bestMatches.length === 0) {
    console.warn('No matching frames found for image dimensions:', imageDimensions.width, imageDimensions.height)
    return []
  }
  
  console.log('🎯 Best matching frames:', bestMatches.map(m => m.size).join(', '))
  
  // Generate preview data with overlay calculations
  const previews = bestMatches.map(match => {
    const frameData = match.frameData
    const overlayData = buildOverlayData(frameData)
    
    if (!overlayData) {
      console.warn(`⚠️ Could not calculate overlay for frame ${match.size}`)
      return null
    }
    
    // Log the overlay mode for debugging
    console.log(`🎨 Frame ${match.size}: ${overlayData.mode} mode`)
    
    return {
      size: match.size,
      userImage: userImageUrl,
      frameImageUrl: `${frameBaseUrl}/${match.framePath}`,
      framePath: match.framePath,
      score: match.score,
      overlayData, // Contains mode, positioning, and transform
      frameData // Keep original for reference
    }
  })
  
  return previews.filter(p => p !== null)
}

/**
 * Generate frame previews for the top 4 matching sizes
 * @deprecated Use generateSimpleFramePreviews instead for CSS-based overlays
 */
export const generateFramePreviews = async (
  userImageUrl,
  frameMapping,
  frameBaseUrl = 'https://gallery.images.events/frameImages',
  imageDimensions = null
) => {
  try {
    // Get image dimensions (use provided dimensions if available, otherwise fetch)
    let width, height
    if (imageDimensions && imageDimensions.width && imageDimensions.height) {
      console.log('✅ Using provided dimensions:', imageDimensions.width, 'x', imageDimensions.height)
      width = imageDimensions.width
      height = imageDimensions.height
    } else {
      console.log('⚠️ No dimensions provided, fetching from image...')
      const dims = await getImageDimensions(userImageUrl)
      width = dims.width
      height = dims.height
    }
    
    // Find best matching frame sizes
    const bestMatches = findBestFrameSizes(width, height, frameMapping, 4)
    
    if (bestMatches.length === 0) {
      console.warn('No matching frames found for image dimensions:', width, height)
      return []
    }
    
    console.log('📐 Final dimensions used:', width, 'x', height)
    console.log('🎯 Best matching frames:', bestMatches.map(m => m.size).join(', '))
    
    // Generate composited previews
    const previews = await Promise.all(
      bestMatches.map(async (match) => {
        try {
          const frameImageUrl = `${frameBaseUrl}/${match.framePath}`
          const compositedImage = await compositeImageIntoFrame(
            userImageUrl,
            match.framePath,
            match.frameData,
            frameBaseUrl
          )
          
          return {
            size: match.size,
            compositedImage,
            framePath: match.framePath,
            frameImageUrl, // Full URL to the frame overlay image
            score: match.score
          }
        } catch (error) {
          console.error(`Failed to composite frame ${match.size}:`, error)
          return null
        }
      })
    )
    
    return previews.filter(p => p !== null)
  } catch (error) {
    console.error('Failed to generate frame previews:', error)
    return []
  }
}

