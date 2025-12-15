/**
 * Aspect Ratio Utilities for FIBO API
 * 
 * FIBO only accepts specific aspect ratios. This module provides
 * helpers to normalize and validate aspect ratios.
 */

// Valid aspect ratios for FIBO API
export const VALID_ASPECT_RATIOS = [
  { label: '1:1', value: 1 },
  { label: '2:3', value: 2/3 },
  { label: '3:2', value: 3/2 },
  { label: '3:4', value: 3/4 },
  { label: '4:3', value: 4/3 },
  { label: '4:5', value: 4/5 },
  { label: '5:4', value: 5/4 },
  { label: '9:16', value: 9/16 },
  { label: '16:9', value: 16/9 },
];

export const VALID_ASPECT_RATIO_LABELS = VALID_ASPECT_RATIOS.map(r => r.label);

/**
 * Check if an aspect ratio string is valid for FIBO
 * @param {string} ratio - Aspect ratio string like "3:4"
 * @returns {boolean}
 */
export function isValidAspectRatio(ratio) {
  return VALID_ASPECT_RATIO_LABELS.includes(ratio);
}

/**
 * Parse an aspect ratio string to a numeric value
 * @param {string} ratio - Aspect ratio string like "3:4" or "0.75:1"
 * @returns {number} - Numeric ratio (width/height)
 */
export function parseAspectRatio(ratio) {
  if (!ratio || typeof ratio !== 'string') return 1;
  
  const parts = ratio.split(':');
  if (parts.length !== 2) return 1;
  
  const width = parseFloat(parts[0]);
  const height = parseFloat(parts[1]);
  
  if (isNaN(width) || isNaN(height) || height === 0) return 1;
  
  return width / height;
}

/**
 * Find the closest valid FIBO aspect ratio to a given ratio
 * @param {string|number} input - Either a ratio string like "0.75:1" or numeric value
 * @returns {string} - Valid FIBO aspect ratio label like "3:4"
 */
export function getClosestAspectRatio(input) {
  // If it's already a valid FIBO ratio, return it
  if (typeof input === 'string' && isValidAspectRatio(input)) {
    return input;
  }
  
  // Parse the input to a numeric value
  const targetRatio = typeof input === 'number' 
    ? input 
    : parseAspectRatio(input);
  
  // Find the closest valid ratio
  let closest = VALID_ASPECT_RATIOS[0];
  let minDiff = Math.abs(targetRatio - closest.value);
  
  for (const ratio of VALID_ASPECT_RATIOS) {
    const diff = Math.abs(targetRatio - ratio.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ratio;
    }
  }
  
  return closest.label;
}

/**
 * Get closest aspect ratio from width and height dimensions
 * @param {number} width - Width in pixels
 * @param {number} height - Height in pixels
 * @returns {string} - Valid FIBO aspect ratio label
 */
export function getAspectRatioFromDimensions(width, height) {
  if (!width || !height || width <= 0 || height <= 0) {
    return '1:1';
  }
  
  const ratio = width / height;
  return getClosestAspectRatio(ratio);
}

export default {
  VALID_ASPECT_RATIOS,
  VALID_ASPECT_RATIO_LABELS,
  isValidAspectRatio,
  parseAspectRatio,
  getClosestAspectRatio,
  getAspectRatioFromDimensions,
};
