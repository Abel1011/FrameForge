import { generateId } from './storage';

/**
 * Add a new layer to panel content
 * @param {import('../types').PanelContent} content
 * @param {import('../types').LayerType} type
 * @param {import('../types').ImageLayerData | import('../types').TextLayerData | import('../types').SpeechBubbleData} data
 * @param {Object} options - Optional settings
 * @param {boolean} options.fillPanel - If true, image will fill the entire panel
 * @returns {import('../types').PanelContent}
 */
export function addLayer(content, type, data, options = {}) {
  const { fillPanel = false } = options;
  
  let size, position;
  
  if (fillPanel && type === 'image') {
    // Special flag to indicate the image should fill the panel
    // ImageLayer will handle this by using 100% dimensions
    position = { x: 0, y: 0 };
    size = { width: '100%', height: '100%', fillPanel: true };
  } else {
    size = getDefaultSize(type);
    // Center text and speech bubbles, keep images at corner
    const shouldCenter = type === 'text' || type === 'speech-bubble';
    position = shouldCenter
      ? { x: 50, y: 50, centered: true } // Flag to indicate initial centered placement
      : { x: 20, y: 20 };
  }
    
  const newLayer = {
    id: generateId(),
    type,
    position,
    size,
    data
  };

  return {
    ...content,
    layers: [...content.layers, newLayer]
  };
}

/**
 * Get default size for layer type
 * @param {import('../types').LayerType} type
 * @returns {{width: number, height: number}}
 */
function getDefaultSize(type) {
  switch (type) {
    case 'image':
      return { width: 200, height: 150 };
    case 'text':
      return { width: 150, height: 40 };
    case 'speech-bubble':
      return { width: 180, height: 100 };
    default:
      return { width: 100, height: 100 };
  }
}

/**
 * Update a layer in panel content
 * @param {import('../types').PanelContent} content
 * @param {string} layerId
 * @param {Partial<import('../types').Layer>} updates
 * @returns {import('../types').PanelContent}
 */
export function updateLayer(content, layerId, updates) {
  return {
    ...content,
    layers: content.layers.map(layer =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    )
  };
}

/**
 * Remove a layer from panel content
 * @param {import('../types').PanelContent} content
 * @param {string} layerId
 * @returns {import('../types').PanelContent}
 */
export function removeLayer(content, layerId) {
  return {
    ...content,
    layers: content.layers.filter(layer => layer.id !== layerId)
  };
}

/**
 * Reorder layers (move layer to new index)
 * @param {import('../types').PanelContent} content
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {import('../types').PanelContent}
 */
export function reorderLayers(content, fromIndex, toIndex) {
  const layers = [...content.layers];
  const [movedLayer] = layers.splice(fromIndex, 1);
  layers.splice(toIndex, 0, movedLayer);

  return {
    ...content,
    layers
  };
}

/**
 * Constrain position to panel boundaries
 * @param {{x: number, y: number}} position
 * @param {{width: number, height: number}} layerSize
 * @param {{width: number, height: number}} panelSize
 * @returns {{x: number, y: number}}
 */
export function constrainPosition(position, layerSize, panelSize) {
  const maxX = Math.max(0, panelSize.width - layerSize.width);
  const maxY = Math.max(0, panelSize.height - layerSize.height);

  return {
    x: Math.max(0, Math.min(position.x, maxX)),
    y: Math.max(0, Math.min(position.y, maxY))
  };
}

/**
 * Update layer data
 * @param {import('../types').PanelContent} content
 * @param {string} layerId
 * @param {Partial<import('../types').ImageLayerData | import('../types').TextLayerData | import('../types').SpeechBubbleData>} dataUpdates
 * @returns {import('../types').PanelContent}
 */
export function updateLayerData(content, layerId, dataUpdates) {
  return {
    ...content,
    layers: content.layers.map(layer =>
      layer.id === layerId 
        ? { ...layer, data: { ...layer.data, ...dataUpdates } }
        : layer
    )
  };
}
