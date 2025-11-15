/**
 * Frame Compositor Utility
 * Handles finding best matching frames and compositing user images into frame overlays
 */

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

const REQUIRED_POINT_LABELS = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']

const defaultOverlay = {
  mode: 'rect',
  rect: {
    left: '0%',
    top: '0%',
    width: '100%',
    height: '100%'
  }
}

const formatPercent = (value, total) => {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total === 0) return '0%'
  return `${((value / total) * 100).toFixed(4)}%`
}

const orderFramePoints = (frameData) => {
  if (!frameData?.points || frameData.points.length < 4) return null
  const labeled = {}
  frameData.points.forEach(point => {
    if (point?.label) {
      labeled[point.label] = point
    }
  })

  const ordered = REQUIRED_POINT_LABELS.map(label => labeled[label] || null)
  return ordered.every(Boolean) ? ordered : null
}

const getBoundingBox = (points) => {
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys)
  }
}

const adj = (m) => ([
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]
])

const multmm = (a, b) => {
  const c = Array(9).fill(0)
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let cij = 0
      for (let k = 0; k < 3; k++) {
        cij += a[3 * i + k] * b[3 * k + j]
      }
      c[3 * i + j] = cij
    }
  }
  return c
}

const multmv = (m, v) => ([
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
])

const basisToPoints = (x1, y1, x2, y2, x3, y3, x4, y4) => {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1]
  const v = multmv(adj(m), [x4, y4, 1])
  return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]])
}

const general2DProjection = (...args) => {
  const s = basisToPoints(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7])
  const d = basisToPoints(args[8], args[9], args[10], args[11], args[12], args[13], args[14], args[15])
  return multmm(d, adj(s))
}

const normalizeMatrix = (matrix) => {
  const scale = matrix[8] === 0 ? 1 : matrix[8]
  return matrix.map(value => value / scale)
}

const formatMatrixNumber = (value) => {
  if (!Number.isFinite(value)) return 0
  return Number(value.toFixed(6))
}

const matrixToCSS = (matrix) => {
  const normalized = normalizeMatrix(matrix)
  const formatted = normalized.map(formatMatrixNumber)
  return `matrix3d(${formatted[0]}, ${formatted[1]}, 0, ${formatted[2]}, ${formatted[3]}, ${formatted[4]}, 0, ${formatted[5]}, 0, 0, 1, 0, ${formatted[6]}, ${formatted[7]}, 0, ${formatted[8]})`
}

const calculatePerspectiveOverlay = (frameData) => {
  const points = orderFramePoints(frameData)
  if (!points) return null

  const frameWidth = frameData?.imageWidth
  const frameHeight = frameData?.imageHeight
  if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight) || frameWidth === 0 || frameHeight === 0) {
    return null
  }

  const bbox = getBoundingBox(points)
  const bboxWidth = bbox.maxX - bbox.minX
  const bboxHeight = bbox.maxY - bbox.minY
  if (bboxWidth <= 0 || bboxHeight <= 0) return null

  const normalized = points.map(point => ({
    label: point.label,
    x: (point.x - bbox.minX) / bboxWidth,
    y: (point.y - bbox.minY) / bboxHeight
  }))

  const tl = normalized.find(p => p.label === 'topLeft')
  const tr = normalized.find(p => p.label === 'topRight')
  const br = normalized.find(p => p.label === 'bottomRight')
  const bl = normalized.find(p => p.label === 'bottomLeft')

  if (!tl || !tr || !br || !bl) return null

  let matrix
  try {
    matrix = general2DProjection(
      0, 0, 1, 0, 1, 1, 0, 1,
      tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y
    )
  } catch (error) {
    console.warn('[frameCompositor] Failed to compute perspective matrix:', error)
    return null
  }

  return {
    mode: '3d',
    boundingBox: {
      left: formatPercent(bbox.minX, frameWidth),
      top: formatPercent(bbox.minY, frameHeight),
      width: formatPercent(bboxWidth, frameWidth),
      height: formatPercent(bboxHeight, frameHeight)
    },
    transform: matrixToCSS(matrix),
    metadata: {
      boundingBoxPx: bbox,
      normalizedPoints: normalized
    }
  }
}

const calculateLegacyOverlay = (frameData) => {
  const frameWidth = frameData?.imageWidth
  const frameHeight = frameData?.imageHeight
  if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight) || frameWidth === 0 || frameHeight === 0) {
    return null
  }

  const topLeft = frameData.topLeft || frameData.legacyTopLeft
  const bottomRight = frameData.bottomRight || frameData.legacyBottomRight

  const widthPx = frameData.width ?? (bottomRight && topLeft ? bottomRight.x - topLeft.x : null)
  const heightPx = frameData.height ?? (bottomRight && topLeft ? bottomRight.y - topLeft.y : null)

  if (!topLeft || !Number.isFinite(widthPx) || !Number.isFinite(heightPx) || widthPx <= 0 || heightPx <= 0) {
    return null
  }

  return {
    mode: 'rect',
    rect: {
      left: formatPercent(topLeft.x, frameWidth),
      top: formatPercent(topLeft.y, frameHeight),
      width: formatPercent(widthPx, frameWidth),
      height: formatPercent(heightPx, frameHeight)
    }
  }
}

export const buildFrameOverlayData = (frameData) => {
  if (!frameData) return defaultOverlay

  const perspectiveOverlay = calculatePerspectiveOverlay(frameData)
  if (perspectiveOverlay) {
    return perspectiveOverlay
  }

  return calculateLegacyOverlay(frameData) || defaultOverlay
}

/**
 * Composite user image into frame using canvas clipping (for tilted frames)
 * @param {string} userImageUrl - URL of the user's photo
 * @param {string} frameImageUrl - URL of the frame overlay
 * @param {Object} frameData - Frame data with points array
 * @returns {Promise<string>} - Data URL of the composited image
 */
export const compositeWithCanvasClipping = async (userImageUrl, frameImageUrl, frameData) => {
  return new Promise((resolve, reject) => {
    // Check if we have the 4 points needed for clipping
    if (!frameData?.points || frameData.points.length !== 4) {
      reject(new Error('Frame data missing required 4 points'))
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = frameData.imageWidth || 3000
    canvas.height = frameData.imageHeight || 3000
    const ctx = canvas.getContext('2d')

    // Load both images
    const userImg = new Image()
    const frameImg = new Image()
    userImg.crossOrigin = 'anonymous'
    frameImg.crossOrigin = 'anonymous'

    let userLoaded = false
    let frameLoaded = false

    const tryComposite = () => {
      if (!userLoaded || !frameLoaded) return

      try {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Save context state before clipping
        ctx.save()

        // Set clipping path from the 4 points
        ctx.beginPath()
        ctx.moveTo(frameData.points[0].x, frameData.points[0].y)
        ctx.lineTo(frameData.points[1].x, frameData.points[1].y)
        ctx.lineTo(frameData.points[2].x, frameData.points[2].y)
        ctx.lineTo(frameData.points[3].x, frameData.points[3].y)
        ctx.closePath()
        ctx.clip()

        // Get bounding box of the 4 points
        const xs = frameData.points.map(p => p.x)
        const ys = frameData.points.map(p => p.y)
        const minX = Math.min(...xs)
        const minY = Math.min(...ys)
        const maxX = Math.max(...xs)
        const maxY = Math.max(...ys)
        const bboxWidth = maxX - minX
        const bboxHeight = maxY - minY

        // Draw user image to fill bounding box (object-fit: cover)
        const imageRatio = userImg.width / userImg.height
        const bboxRatio = bboxWidth / bboxHeight
        let drawWidth
        let drawHeight

        if (imageRatio > bboxRatio) {
          // Image is wider - match height, crop width
          drawHeight = bboxHeight
          drawWidth = bboxHeight * imageRatio
        } else {
          // Image is taller - match width, crop height
          drawWidth = bboxWidth
          drawHeight = bboxWidth / imageRatio
        }

        const drawX = minX + (bboxWidth - drawWidth) / 2
        const drawY = minY + (bboxHeight - drawHeight) / 2

        ctx.drawImage(userImg, drawX, drawY, drawWidth, drawHeight)

        // Restore context to remove clipping
        ctx.restore()

        // Draw frame on top
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height)

        // Convert to data URL
        resolve(canvas.toDataURL('image/png', 0.92))
      } catch (error) {
        reject(error)
      }
    }

    userImg.onload = () => {
      userLoaded = true
      tryComposite()
    }

    frameImg.onload = () => {
      frameLoaded = true
      tryComposite()
    }

    userImg.onerror = () => reject(new Error('Failed to load user image'))
    frameImg.onerror = () => reject(new Error('Failed to load frame image'))

    // Start loading
    userImg.src = userImageUrl
    frameImg.src = frameImageUrl
  })
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
 * Generate frame previews for the top 4 matching sizes
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

