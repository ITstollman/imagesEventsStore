# 3D Perspective Frame Transform System

This document explains how the perspective-corrected frame overlay system works.

## Overview

The system now supports **both** legacy rectangular frames and new **tilted/perspective frames** using CSS 3D transforms. The server can provide either:

1. **Legacy Format**: `topLeft`, `bottomRight` coordinates (rectangular bounding box)
2. **3D Format**: 4-point `points` array with labeled corners for perspective correction

## Server Data Format

### 3D Perspective Frame (with tilt)
```json
{
  "topLeft": { "x": 1097, "y": 1083 },
  "bottomRight": { "x": 2062, "y": 1958 },
  "width": 965,
  "height": 875,
  "imageWidth": 3000,
  "imageHeight": 3000,
  "orientation": "horizontal",
  "is3D": true,
  "points": [
    { "x": 1112, "y": 1114, "label": "topLeft" },
    { "x": 1929, "y": 1063, "label": "topRight" },
    { "x": 2023, "y": 1930, "label": "bottomRight" },
    { "x": 1196, "y": 2011, "label": "bottomLeft" }
  ],
  "legacyTopLeft": { "x": 1097, "y": 1083 },
  "legacyBottomRight": { "x": 2062, "y": 1958 }
}
```

### Legacy Rectangular Frame
```json
{
  "topLeft": { "x": 627, "y": 813 },
  "bottomRight": { "x": 2377, "y": 2187 },
  "width": 1750,
  "height": 1374,
  "imageWidth": 3000,
  "imageHeight": 3000,
  "orientation": "horizontal"
}
```

## How It Works

### 1. Detection
The system automatically detects which format to use:
- If `is3D: true` or valid `points` array exists → Use 3D perspective transform
- Otherwise → Use legacy rectangle mode

### 2. Perspective Transform Calculation

For 3D frames, the system:

1. **Orders the 4 points**: topLeft, topRight, bottomRight, bottomLeft
2. **Calculates bounding box**: Gets min/max X and Y from all 4 points
3. **Normalizes points**: Converts points to 0-1 range within bounding box
4. **Computes homography matrix**: Maps from unit square to normalized quad
5. **Converts to CSS**: Transforms 3x3 matrix to CSS `matrix3d()` format

The math uses homography transformation:
- **Homography**: A projective transformation that maps a plane to another plane
- Preserves straight lines but allows perspective distortion
- Perfect for tilted rectangular frames

### 3. CSS Application

The transformed image is positioned using:
- **Bounding box** for absolute position (`left`, `top`, `width`, `height`)
- **Transform matrix** for perspective warp (`transform: matrix3d(...)`)
- **Transform origin** at `0 0` (top-left corner)

## Files

### Core Files
- **`src/perspectiveTransform.js`**: Matrix math and perspective calculations
- **`src/frameCompositor.js`**: Frame matching and preview generation
- **`src/ImageDetail.jsx`**: React component that applies transforms
- **`src/ImageDetail.css`**: CSS with 3D transform support

### Key Functions

```javascript
// Calculate overlay data from frame metadata
buildOverlayData(frameData) 
// Returns: { mode: '3d'|'rect', boundingBox/rect: {...}, transform?: '...' }

// Generate frame previews with overlay data
generateSimpleFramePreviews(userImageUrl, imageDimensions, frameMapping)

// Calculate 3D perspective transform
calculatePerspectiveOverlay(frameData)

// Calculate legacy rectangle overlay
calculateLegacyOverlay(frameData)
```

## CSS Requirements

For 3D transforms to work:
```css
.frame-preview-container {
  transform-style: preserve-3d;
  perspective: 1000px;
}

.user-photo-preview {
  transform-style: preserve-3d;
  transform-origin: 0 0;
  backface-visibility: hidden;
}
```

## Debugging

The debug HTML file `public/frame-overlay-debug.html` provides:
- Interactive testing of frame coordinates
- Visual bounding box display
- Matrix calculation visualization
- Both 3D and rectangle mode testing

## Future Enhancements

Potential improvements:
1. **Canvas clipping** for non-rectangular cutouts (circular/oval frames)
2. **Shadow/reflection** effects for more realistic previews
3. **Batch processing** for multiple frame overlays
4. **Quality settings** for transform rendering

## Browser Support

CSS 3D transforms are supported in:
- ✅ Chrome/Edge (all recent versions)
- ✅ Safari (all recent versions)
- ✅ Firefox (all recent versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

Hardware acceleration is automatic for `transform: matrix3d()`.

