/**
 * Perspective Transform Utility
 * Calculates CSS matrix3d for warping images to match 4-point perspective
 */

/**
 * Calculate the adjugate of a 3x3 matrix
 */
function adj(m) {
  return [
    m[4]*m[8]-m[5]*m[7], m[2]*m[7]-m[1]*m[8], m[1]*m[5]-m[2]*m[4],
    m[5]*m[6]-m[3]*m[8], m[0]*m[8]-m[2]*m[6], m[2]*m[3]-m[0]*m[5],
    m[3]*m[7]-m[4]*m[6], m[1]*m[6]-m[0]*m[7], m[0]*m[4]-m[1]*m[3]
  ]
}

/**
 * Multiply two 3x3 matrices
 */
function multmm(a, b) {
  const c = Array(9)
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let cij = 0
      for (let k = 0; k < 3; k++) {
        cij += a[3*i + k]*b[3*k + j]
      }
      c[3*i + j] = cij
    }
  }
  return c
}

/**
 * Multiply a 3x3 matrix by a vector
 */
function multmv(m, v) {
  return [
    m[0]*v[0] + m[1]*v[1] + m[2]*v[2],
    m[3]*v[0] + m[4]*v[1] + m[5]*v[2],
    m[6]*v[0] + m[7]*v[1] + m[8]*v[2]
  ]
}

/**
 * Calculate basis to points transformation
 */
function basisToPoints(x1, y1, x2, y2, x3, y3, x4, y4) {
  const m = [
    x1, x2, x3,
    y1, y2, y3,
    1,  1,  1
  ]
  const v = multmv(adj(m), [x4, y4, 1])
  return multmm(m, [
    v[0], 0, 0,
    0, v[1], 0,
    0, 0, v[2]
  ])
}

/**
 * Calculate general 2D projection transformation from 4 points to 4 points
 */
function general2DProjection(
  x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s,
  x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d
) {
  const s = basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s)
  const d = basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d)
  return multmm(d, adj(s))
}

/**
 * Convert 3x3 transform matrix to CSS matrix3d (4x4)
 */
function matrixToCSS(m) {
  return `matrix3d(
    ${m[0]}, ${m[3]}, 0, ${m[6]},
    ${m[1]}, ${m[4]}, 0, ${m[7]},
    0, 0, 1, 0,
    ${m[2]}, ${m[5]}, 0, ${m[8]}
  )`
}

/**
 * Calculate CSS transform for mapping an image to 4 corner points
 * 
 * @param {Object} points - Object with topLeft, topRight, bottomRight, bottomLeft
 * @param {number} frameWidth - Width of the frame image
 * @param {number} frameHeight - Height of the frame image
 * @param {number} photoWidth - Width of the photo area (for scaling)
 * @param {number} photoHeight - Height of the photo area (for scaling)
 * @returns {string} CSS matrix3d transform
 */
export function calculatePerspectiveTransform(points, frameWidth, frameHeight, photoWidth, photoHeight) {
  // Normalize points to percentages (0-1 range)
  const topLeft = {
    x: points.topLeft.x / frameWidth,
    y: points.topLeft.y / frameHeight
  }
  const topRight = {
    x: points.topRight.x / frameWidth,
    y: points.topRight.y / frameHeight
  }
  const bottomRight = {
    x: points.bottomRight.x / frameWidth,
    y: points.bottomRight.y / frameHeight
  }
  const bottomLeft = {
    x: points.bottomLeft.x / frameWidth,
    y: points.bottomLeft.y / frameHeight
  }
  
  // Source rectangle (normalized 0-1)
  const srcX1 = 0, srcY1 = 0        // top-left
  const srcX2 = 1, srcY2 = 0        // top-right
  const srcX3 = 1, srcY3 = 1        // bottom-right
  const srcX4 = 0, srcY4 = 1        // bottom-left
  
  // Destination quadrilateral (normalized coordinates)
  const dstX1 = topLeft.x,      dstY1 = topLeft.y
  const dstX2 = topRight.x,     dstY2 = topRight.y
  const dstX3 = bottomRight.x,  dstY3 = bottomRight.y
  const dstX4 = bottomLeft.x,   dstY4 = bottomLeft.y
  
  // Calculate transformation matrix
  const matrix = general2DProjection(
    srcX1, srcY1, srcX2, srcY2, srcX3, srcY3, srcX4, srcY4,
    dstX1, dstY1, dstX2, dstY2, dstX3, dstY3, dstX4, dstY4
  )
  
  return matrixToCSS(matrix)
}

/**
 * Extract points from frameData in correct order
 * Handles both array format and object format
 */
export function extractPoints(frameData) {
  if (!frameData.points || !Array.isArray(frameData.points)) {
    return null
  }
  
  const pointsObj = {}
  frameData.points.forEach(point => {
    pointsObj[point.label] = { x: point.x, y: point.y }
  })
  
  // Validate we have all 4 corners
  if (!pointsObj.topLeft || !pointsObj.topRight || 
      !pointsObj.bottomRight || !pointsObj.bottomLeft) {
    return null
  }
  
  return pointsObj
}

/**
 * Check if frame supports 3D perspective transform
 */
export function is3DFrame(frameData) {
  return frameData.is3D === true && 
         frameData.points && 
         Array.isArray(frameData.points) && 
         frameData.points.length === 4
}

