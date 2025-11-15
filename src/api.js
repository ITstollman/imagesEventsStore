const API_BASE_URL = 'https://imageseventsbackend-production.up.railway.app'

/**
 * Fetch frame mapping configuration from the server
 * Returns frame types, materials, colors, and other configuration options
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
 * Expected response format:
 * {
 *   frameTypes: ['Standard', 'Premium'],
 *   materials: {
 *     Metal: {
 *       colors: [
 *         { name: 'Black Metal', value: '#1a1a1a', arteloName: 'BlackMetal' },
 *         { name: 'White Metal', value: '#FFFFFF', arteloName: 'WhiteMetal' },
 *         { name: 'Silver Metal', value: '#C0C0C0', arteloName: 'SilverMetal' },
 *         { name: 'Gold Metal', value: '#FFD700', arteloName: 'GoldMetal' }
 *       ]
 *     },
 *     Oak: {
 *       colors: [
 *         { name: 'Natural Oak', value: '#DEB887', arteloName: 'NaturalOak' },
 *         { name: 'Black Oak', value: '#2C2416', arteloName: 'BlackOak' },
 *         { name: 'White Oak', value: '#F5F5DC', arteloName: 'WhiteOak' },
 *         { name: 'Beige Oak', value: '#D2B48C', arteloName: 'BeigeOak' }
 *       ]
 *     }
 *   },
 *   printTypes: ['Poster', 'Photo', 'Fine Art'],
 *   paperTypes: ['Matte', 'Glossy', 'Semi Gloss', 'Semi Matte Linen'],
 *   sizes: {
 *     Square: ['6x6', '8x8', '10x10', '12x12', '16x16', '18x18', '20x20', '24x24'],
 *     'Landscape 3:2': ['4x6', '8x12', '12x18', '16x24', '20x30', '24x36'],
 *     'Portrait 4:3': ['6x8', '9x12', '12x16', '18x24', '24x32'],
 *     'Landscape 5:4': ['8x10', '16x20', '24x30'],
 *     'Portrait 5:7': ['5x7', '8.5x11', '11x14', '11x17', '20x28']
 *   }
 * }
 */

