const API_BASE_URL = 'https://imageseventsbackend-production.up.railway.app'

/**
 * Fetch frame overlay mapping from the server
 * Returns frame overlay images with pixel coordinates for photo placement
 */
export const fetchFrameMapping = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/frame-mapping`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch frame mapping: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching frame mapping:', error)
    throw error
  }
}

/**
 * Helper function to find a frame by parameters
 * @param {Object} frameMapping - The frame mapping data from server
 * @param {string} orientation - 'horizontal', 'vertical', or 'square'
 * @param {string} material - 'metal' or 'oak'
 * @param {string} quality - 'standard' or 'premium'
 * @param {string} color - 'black', 'white', 'silver', 'gold', 'natural', 'beige'
 * @param {string} size - e.g., '16x20', '8x10'
 * @returns {Object|null} Frame data with coordinates, or null if not found
 */
export const findFrame = (frameMapping, orientation, material, quality, color, size) => {
  if (!frameMapping?.data?.frames) return null
  
  const normalizedOrientation = orientation.toLowerCase()
  const normalizedMaterial = material.toLowerCase()
  const normalizedQuality = quality.toLowerCase()
  const normalizedColor = color.toLowerCase()
  
  // Search for matching frame
  // Pattern: orientation/material/quality/color/[O]-size-quality-material.png
  // Example: horizontal/metal/premium/black/H-16x20-premium-metal.png
  
  for (const [framePath, frameData] of Object.entries(frameMapping.data.frames)) {
    const pathParts = framePath.split('/')
    if (pathParts.length === 5) {
      const [pathOrientation, pathMaterial, pathQuality, pathColor, filename] = pathParts
      
      // Check if all parameters match
      if (
        pathOrientation === normalizedOrientation &&
        pathMaterial === normalizedMaterial &&
        pathQuality === normalizedQuality &&
        pathColor === normalizedColor &&
        filename.includes(size)
      ) {
        return {
          ...frameData,
          path: framePath,
          filename: filename
        }
      }
    }
  }
  
  return null
}

/**
 * Expected response format:
 * {
 *   success: true,
 *   data: {
 *     frames: {
 *       "horizontal/metal/premium/black/H-16x20-premium-metal.png": {
 *         topLeft: { x: 813, y: 627 },
 *         bottomRight: { x: 2187, y: 2377 },
 *         width: 1374,
 *         height: 1750,
 *         imageWidth: 3000,
 *         imageHeight: 3000,
 *         orientation: "horizontal"
 *       },
 *       // ... more frames
 *     },
 *     totalFrames: 78,
 *     organization: {
 *       horizontal: 39,
 *       vertical: 22,
 *       square: 17
 *     },
 *     version: "2.0",
 *     uploadedAt: "2025-11-15T...",
 *     metadata: {
 *       description: "Organized frame mappings by orientation",
 *       structure: "orientation/material/quality/color/filename",
 *       coordinateSystem: "pixels (x, y from top-left)"
 *     }
 *   }
 * }
 */

