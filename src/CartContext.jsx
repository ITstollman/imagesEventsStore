import { createContext, useContext, useState } from 'react'

const CartContext = createContext()

// Shipping cost lookup table
const SHIPPING_COSTS = {
  'Premium-Oak': {
    '6x6': 7.11, '8x8': 7.85, '10x10': 7.85, '12x12': 9.09, '16x16': 10.07,
    '18x18': 10.88, '20x20': 11.28, '24x24': 11.67,
    '4x6': 5.92, '8x12': 7.85, '12x18': 9.75, '16x24': 11.28, '20x30': 11.78, '24x36': 21.92,
    '6x8': 7.71, '9x12': 8.17, '12x16': 9.17, '18x24': 11.19, '24x32': 21.92,
    '8x10': 7.85, '16x20': 10.95, '24x30': 21.92,
    '5x7': 7.11, '8.5x11': 8.03, '11x14': 8.46, '11x17': 9.17, '20x28': 11.78
  },
  'Premium-Metal': {
    '8x8': 7.85, '10x10': 7.85, '12x12': 9.09, '16x16': 10.07, '20x20': 11.28,
    '4x6': 5.92, '12x18': 9.75, '16x24': 11.28, '20x30': 11.78, '24x36': 21.92,
    '6x8': 7.71, '9x12': 8.17, '12x16': 9.17, '18x24': 11.19,
    '8x10': 7.85, '16x20': 10.95,
    '5x7': 7.11, '8.5x11': 8.03, '11x14': 8.46, '11x17': 9.17
  },
  'Standard-Metal': {
    '8x8': 6.35, '10x10': 6.94, '12x12': 7.31, '16x16': 7.86, '20x20': 9.32,
    '4x6': 5.61, '12x18': 7.89, '16x24': 8.46, '20x30': 9.84, '24x36': 13.73,
    '6x8': 6.02, '9x12': 6.94, '12x16': 7.84, '18x24': 8.89,
    '8x10': 6.37, '16x20': 7.92,
    '5x7': 5.72, '8.5x11': 6.94, '11x14': 7.31, '11x17': 7.33
  },
  'Standard-Oak': {
    '6x6': 5.94, '8x8': 6.35, '10x10': 6.94, '12x12': 7.31, '16x16': 7.86,
    '18x18': 8.04, '20x20': 9.32, '24x24': 10.17,
    '4x6': 5.61, '8x12': 6.94, '12x18': 7.89, '16x24': 8.46, '20x30': 9.84, '24x36': 13.73,
    '6x8': 6.02, '9x12': 6.94, '12x16': 7.84, '18x24': 8.89, '24x32': 13.73,
    '8x10': 6.37, '16x20': 7.92, '24x30': 13.73,
    '5x7': 5.72, '8.5x11': 6.94, '11x14': 7.31, '11x17': 7.33
  }
}

const FREE_SHIPPING_THRESHOLD = 100

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([])

  const addToCart = (item) => {
    setCartItems(prev => {
      // Check if item already exists
      const existingIndex = prev.findIndex(
        i => i.product.id === item.product.id && 
             i.selectedSize === item.selectedSize && 
             i.selectedColor.name === item.selectedColor.name
      )

      if (existingIndex > -1) {
        // Update quantity if exists
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity
        }
        return updated
      }

      // Add new item
      return [...prev, { ...item, id: Date.now() }]
    })
  }

  const removeFromCart = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId))
  }

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId)
      return
    }
    setCartItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const clearCart = () => {
    setCartItems([])
  }

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0)
  }

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0)
  }

  const getShippingCost = (items = cartItems) => {
    if (items.length === 0) return 0

    // Helper function to get smallest dimension
    const getSmallestDimension = (size) => {
      const dimensions = size.replace('"', '').split('x').map(d => parseFloat(d))
      return Math.min(...dimensions)
    }

    // Helper function to get shipping cost for an item
    const getItemShippingCost = (item) => {
      const frameKey = `${item.frameType || 'Standard'}-${item.material || 'Metal'}`
      const size = item.selectedSize.replace('"', '')
      return SHIPPING_COSTS[frameKey]?.[size] || 7.00 // Default fallback
    }

    // Sort items by shipping cost (highest first)
    const sortedItems = [...items].sort((a, b) => {
      return getItemShippingCost(b) - getItemShippingCost(a)
    })

    // Base cost is the largest item
    let totalShipping = getItemShippingCost(sortedItems[0])

    // Add incremental costs for additional items
    for (let i = 1; i < sortedItems.length; i++) {
      const item = sortedItems[i]
      const smallestSide = getSmallestDimension(item.selectedSize)
      
      // Add cost for each quantity of this item
      for (let q = 0; q < item.quantity; q++) {
        if (i === 0 && q === 0) continue // First item already counted
        totalShipping += smallestSide > 20 ? 2.00 : 1.00
      }
    }

    // Add for multiple quantities of the first item
    if (sortedItems[0].quantity > 1) {
      const smallestSide = getSmallestDimension(sortedItems[0].selectedSize)
      for (let q = 1; q < sortedItems[0].quantity; q++) {
        totalShipping += smallestSide > 20 ? 2.00 : 1.00
      }
    }

    return totalShipping
  }

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getCartCount,
      getShippingCost,
      FREE_SHIPPING_THRESHOLD
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}

