/**
 * Perspective Transform Utility
 * Calculates CSS matrix3d transforms for 4-point perspective correction
 * Based on homography transformation mathematics
 */

/**
 * Calculate the adjugate (classical adjoint) of a 3x3 matrix
 */
const adj = (m) => [
  m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]
]

/**
 * Multiply two 3x3 matrices
 */
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

/**
 * Multiply a 3x3 matrix by a 3D vector
 */
const multmv = (m, v) => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
]

/**
 * Calculate transformation matrix from unit square to arbitrary quadrilateral
 */
const basisToPoints = (x1, y1, x2, y2, x3, y3, x4, y4) => {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1]
  const v = multmv(adj(m), [x4, y4, 1])
  return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]])
}

/**
 * Calculate general 2D projection (homography) from source quad to destination quad
 * Args: x1,y1, x2,y2, x3,y3, x4,y4 (source), x5,y5, x6,y6, x7,y7, x8,y8 (destination)
 */
const general2DProjection = (...args) => {
  const s = basisToPoints(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7])
  const d = basisToPoints(args[8], args[9], args[10], args[11], args[12], args[13], args[14], args[15])
  return multmm(d, adj(s))
}

/**
 * Normalize a matrix by dividing all elements by the last element
 */
const normalizeMatrix = (matrix) => {
  const scale = matrix[8] === 0 ? 1 : matrix[8]
  return matrix.map(value => value / scale)
}

/**
 * Format a matrix number for CSS (limit precision)
 */
const formatMatrixNumber = (value) => {
  if (!Number.isFinite(value)) return 0
  return Number(value.toFixed(6))
}

/**
 * Convert a 3x3 homography matrix to CSS matrix3d format
 * CSS matrix3d uses a 4x4 matrix, so we embed the 3x3 homography into it
 */
const matrixToCSS = (matrix) => {
  const normalized = normalizeMatrix(matrix)
  const formatted = normalized.map(formatMatrixNumber)
  
  // Convert 3x3 to 4x4 matrix for CSS matrix3d
  // Layout: [a, b, 0, c, d, e, 0, f, 0, 0, 1, 0, g, h, 0, i]
  return `matrix3d(${formatted[0]}, ${formatted[1]}, 0, ${formatted[2]}, ${formatted[3]}, ${formatted[4]}, 0, ${formatted[5]}, 0, 0, 1, 0, ${formatted[6]}, ${formatted[7]}, 0, ${formatted[8]})`
}

/**
 * Get bounding box from 4 points
 */
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

/**
 * Format percentage for CSS
 */
const formatPercent = (value, total) => {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total === 0) return '0%'
  return `${((value / total) * 100).toFixed(4)}%`
}

/**
 * Order frame points in the required sequence: topLeft, topRight, bottomRight, bottomLeft
 */
const orderFramePoints = (frameData) => {
  if (!frameData?.points || frameData.points.length < 4) return null
  
  const labeled = {}
  frameData.points.forEach(point => {
    if (point?.label) labeled[point.label] = point
  })
  
  const REQUIRED_LABELS = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']
  const ordered = REQUIRED_LABELS.map(label => labeled[label] || null)
  
  return ordered.every(Boolean) ? ordered : null
}

/**
 * Calculate perspective overlay data for 3D transform
 * Returns CSS positioning and transform string
 */
export const calculatePerspectiveOverlay = (frameData) => {
  const points = orderFramePoints(frameData)
  if (!points) return null

  const frameWidth = frameData?.imageWidth
  const frameHeight = frameData?.imageHeight
  if (!Number.isFinite(frameWidth) || !Number.isFinite(frameHeight) || frameWidth === 0 || frameHeight === 0) {
    return null
  }

  // Get bounding box of the 4 points
  const bbox = getBoundingBox(points)
  const bboxWidth = bbox.maxX - bbox.minX
  const bboxHeight = bbox.maxY - bbox.minY
  if (bboxWidth <= 0 || bboxHeight <= 0) return null

  // Normalize points to 0-1 range within the bounding box
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

  // Calculate perspective transformation matrix
  // Map from unit square (0,0 -> 1,0 -> 1,1 -> 0,1) to normalized quad
  let matrix
  try {
    matrix = general2DProjection(
      0, 0, 1, 0, 1, 1, 0, 1, // source: unit square
      tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y // destination: normalized quad
    )
  } catch (error) {
    console.warn('Failed to compute perspective matrix:', error)
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

/**
 * Calculate legacy rectangular overlay (for non-3D frames)
 */
export const calculateLegacyOverlay = (frameData) => {
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

/**
 * Build overlay data from frame data
 * Automatically detects if 3D transform or legacy rectangle should be used
 */
export const buildOverlayData = (frameData) => {
  if (!frameData) return null
  
  // Try 3D first if marked as 3D or has valid points
  if (frameData.is3D || (frameData.points && frameData.points.length === 4)) {
    const perspectiveOverlay = calculatePerspectiveOverlay(frameData)
    if (perspectiveOverlay) {
      console.log('🎯 Using 3D perspective transform')
      return perspectiveOverlay
    }
  }
  
  // Fall back to legacy rectangle mode
  console.log('📐 Using legacy rectangle mode')
  return calculateLegacyOverlay(frameData)
}

