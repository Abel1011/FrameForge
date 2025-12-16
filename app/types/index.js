/**
 * @typedef {'comic' | 'manga' | 'storyboard' | 'graphic-novel'} ProjectType
 */

/**
 * @typedef {Object} Character
 * @property {string} id
 * @property {string} name
 * @property {string} description - Visual description for AI consistency
 * @property {string} [referenceImage] - Base64 reference image
 * @property {string} [color] - Accent color for UI identification
 * @property {number} [fiboSeed] - FIBO seed for visual consistency
 * @property {Object} [fiboStructuredPrompt] - FIBO structured_prompt for consistent regeneration
 */

/**
 * @typedef {Object} Location
 * @property {string} id
 * @property {string} name
 * @property {string} description - Visual description for AI consistency
 * @property {string} [referenceImage] - Base64 reference image
 * @property {number} [fiboSeed] - FIBO seed for visual consistency
 * @property {Object} [fiboStructuredPrompt] - FIBO structured_prompt for consistent regeneration
 */

/**
 * @typedef {Object} ArtStyle
 * @property {string} id - Style identifier
 * @property {string} name - Display name
 * @property {string} [customPrompt] - Custom style description for AI (maps to FIBO artistic_style)
 */

/**
 * @typedef {Object} StyleMedium
 * @property {string} id - Medium identifier
 * @property {string} name - Display name
 * @property {string} prompt - FIBO style_medium value
 */

/**
 * @typedef {Object} LightingPreset
 * @property {string} id - Preset identifier
 * @property {string} name - Display name
 * @property {string} conditions - FIBO lighting.conditions
 * @property {string} shadows - FIBO lighting.shadows
 */

/**
 * @typedef {Object} StoryContext
 * @property {string} title - Suggested/working title for the story
 * @property {string} genre - Genre(s) of the story
 * @property {string} synopsis - Brief synopsis of the story
 * @property {string[]} themes - Key themes explored
 */

/**
 * @typedef {Object} ProjectSettings
 * @property {Character[]} characters - Maps to FIBO objects[]
 * @property {Location[]} locations - Maps to FIBO background_setting
 * @property {ArtStyle} artStyle - Maps to FIBO artistic_style
 * @property {string} styleMedium - Maps to FIBO style_medium
 * @property {string} mood - Maps to FIBO aesthetics.mood_atmosphere
 * @property {string[]} colorPalette - Maps to FIBO aesthetics.color_scheme
 * @property {string} defaultLighting - Maps to FIBO lighting preset
 * @property {string} projectContext - Maps to FIBO context (e.g., "Comic book panel", "Storyboard frame")
 * @property {StoryContext} [storyContext] - Narrative context and story information
 * @property {boolean} setupComplete - Whether the user has completed initial setup
 */

/**
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} name
 * @property {ProjectType} type
 * @property {number} width
 * @property {number} height
 * @property {Page[]} pages
 * @property {ProjectSettings} [settings] - AI generation settings
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {'portrait' | 'landscape'} PageOrientation
 */

/**
 * @typedef {Object} Page
 * @property {string} id
 * @property {string} projectId
 * @property {number} order
 * @property {PageOrientation} [orientation] - Page orientation, defaults to 'portrait'
 * @property {GridLayout} grid
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} GridLayout
 * @property {GridRow[]} rows
 * @property {number} gutterWidth
 */

/**
 * @typedef {Object} GridRow
 * @property {string} id
 * @property {number} height - Percentage (0-100)
 * @property {Panel[]} panels
 */

/**
 * @typedef {Object} Panel
 * @property {string} id
 * @property {string} rowId
 * @property {number} width - Percentage within row (0-100)
 * @property {PanelContent} [content] - Leaf panel content (mutually exclusive with children)
 * @property {PanelChildren} [children] - Nested sub-panels (mutually exclusive with content)
 */

/**
 * @typedef {Object} PanelChildren
 * @property {'horizontal' | 'vertical'} direction - Split direction for children
 * @property {ChildPanel[]} panels - Array of child panels
 */

/**
 * @typedef {Object} ChildPanel
 * @property {string} id
 * @property {number} size - Percentage (0-100)
 * @property {PanelContent} [content] - Leaf panel content (mutually exclusive with children)
 * @property {PanelChildren} [children] - Nested sub-panels (mutually exclusive with content)
 */

/**
 * @typedef {Object} PanelContent
 * @property {Layer[]} layers
 * @property {string} backgroundColor
 */

/**
 * @typedef {'image' | 'text' | 'speech-bubble'} LayerType
 */

/**
 * @typedef {Object} Layer
 * @property {string} id
 * @property {LayerType} type
 * @property {{x: number, y: number}} position
 * @property {{width: number, height: number}} size
 * @property {ImageLayerData | TextLayerData | SpeechBubbleData} data
 */

/**
 * @typedef {Object} AIGenerationSettings
 * @property {string} cameraHeight - 'auto', 'low', 'eye', 'high', 'aerial'
 * @property {string} cameraAngle - 'auto', 'front', 'quarter', 'profile', 'back', 'ots', 'dutch'
 * @property {string} shotDistance - 'auto', 'extreme-wide', 'wide', 'medium', 'close', 'extreme-close'
 * @property {number} depthOfField - 0-100 slider
 * @property {string} composition - 'auto', 'center', 'rule-of-thirds', 'golden', 'symmetry', 'leading-lines'
 * @property {string} timeOfDay - 'auto', 'dawn', 'morning', 'noon', 'afternoon', 'sunset', 'dusk', 'night'
 * @property {string} lightDirection - 'auto', 'front', 'side', 'back', 'top', 'bottom'
 * @property {number} shadowIntensity - 0-100 slider
 * @property {string} colorPalette - 'auto', 'warm', 'cool', 'neutral', 'vibrant', etc.
 * @property {number} colorIntensity - 0-100 slider
 * @property {number} contrast - 0-100 slider
 * @property {string} mood - 'auto', 'dramatic', 'peaceful', 'energetic', etc.
 */

/**
 * @typedef {Object} AIGenerationData
 * @property {string} prompt - The text prompt used for generation
 * @property {AIGenerationSettings} settings - Shot/camera/lighting settings
 * @property {number} [seed] - FIBO seed for regeneration consistency
 * @property {Object} [structuredPrompt] - FIBO structured_prompt used
 * @property {string} generatedAt - ISO timestamp of generation
 */

/**
 * @typedef {Object} ImageLayerData
 * @property {string} src - Base64 or blob URL
 * @property {'contain' | 'cover' | 'fill'} fit
 * @property {AIGenerationData} [aiGeneration] - AI generation metadata (only for AI-generated images)
 */

/**
 * @typedef {Object} TextLayerData
 * @property {string} content
 * @property {string} fontFamily
 * @property {number} fontSize
 * @property {string} fontColor
 * @property {'normal' | 'bold'} fontWeight
 */

/**
 * @typedef {'speech' | 'thought' | 'shout'} BubbleStyle
 */

/**
 * @typedef {'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'} TailPosition
 */

/**
 * @typedef {Object} SpeechBubbleData
 * @property {string} text
 * @property {BubbleStyle} bubbleStyle
 * @property {TailPosition} tailPosition
 * @property {string} backgroundColor
 * @property {string} borderColor
 */

/** @type {Record<ProjectType, {width: number, height: number}>} */
export const DEFAULT_PAGE_DIMENSIONS = {
  'comic': { width: 1700, height: 2600 },
  'manga': { width: 1500, height: 2100 },
  'storyboard': { width: 1920, height: 1080 },
  'graphic-novel': { width: 1600, height: 2400 }
};

export const DEFAULT_GUTTER_WIDTH = 8;

/** @type {ArtStyle[]} */
export const ART_STYLES = [
  { id: 'manga', name: 'Manga/Anime', customPrompt: 'Japanese manga style with clean lines, expressive eyes, dynamic poses, screen tones, and dramatic speed lines', previewImage: '/previews/Manga  Anime.png' },
  { id: 'comic-american', name: 'American Comic', customPrompt: 'Bold American comic book style with strong outlines, vibrant colors, dramatic shading, and heroic proportions', previewImage: '/previews/American Comic.png' },
  { id: 'comic-european', name: 'European BD', customPrompt: 'European bande dessinée style with detailed linework, realistic proportions, rich colors, and atmospheric backgrounds', previewImage: '/previews/European Bande Dessinée (BD).png' },
  { id: 'graphic-novel', name: 'Graphic Novel', customPrompt: 'Graphic novel style with mature themes, detailed crosshatching, noir influences, and cinematic compositions', previewImage: '/previews/Graphic Novel.png' },
  { id: 'watercolor', name: 'Watercolor', customPrompt: 'Soft watercolor illustration style with flowing colors, gentle gradients, visible paper texture, and organic edges', previewImage: '/previews/Watercolor.png' },
  { id: 'digital-art', name: 'Digital Art', customPrompt: 'Modern digital illustration with smooth gradients, vibrant colors, detailed rendering, and polished finish', previewImage: '/previews/Digital Art.png' },
  { id: 'vintage', name: 'Vintage/Retro', customPrompt: 'Vintage illustration style with muted colors, halftone dots, retro typography influences, and nostalgic aesthetics', previewImage: '/previews/Vintage  Retro.png' },
  { id: 'minimalist', name: 'Minimalist', customPrompt: 'Clean minimalist style with simple geometric shapes, limited color palette, lots of white space, and elegant simplicity', previewImage: '/previews/Minimalist.png' },
];

/** @type {string[]} */
export const CHARACTER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', 
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#78716c'
];

/** @type {StyleMedium[]} */
export const STYLE_MEDIUMS = [
  { id: 'digital-art', name: 'Digital Art', prompt: 'Digital illustration, clean digital art', previewImage: '/previews/Digital Art.png' },
  { id: 'oil-painting', name: 'Oil Painting', prompt: 'Oil painting on canvas, visible brushstrokes', previewImage: '/previews/Oil Painting.png' },
  { id: 'watercolor', name: 'Watercolor', prompt: 'Watercolor painting, soft washes, paper texture', previewImage: '/previews/Watercolor.png' },
  { id: 'pencil-sketch', name: 'Pencil Sketch', prompt: 'Pencil sketch, graphite drawing, hand-drawn', previewImage: '/previews/Pencil Sketch.png' },
  { id: 'ink-drawing', name: 'Ink Drawing', prompt: 'Ink drawing, pen and ink illustration', previewImage: '/previews/Ink Drawing.png' },
  { id: '3d-render', name: '3D Render', prompt: '3D render, CGI, computer generated imagery', previewImage: '/previews/3D Render.png' },
  { id: 'photograph', name: 'Photograph', prompt: 'Photograph, photographic image', previewImage: '/previews/Photograph.png' },
  { id: 'cel-shading', name: 'Cel Shading', prompt: 'Cel-shaded, flat colors with bold outlines', previewImage: '/previews/Cel Shading.png' },
];

/** @type {LightingPreset[]} */
export const LIGHTING_PRESETS = [
  { id: 'natural', name: 'Natural Daylight', conditions: 'Natural daylight, soft sunlight', shadows: 'Soft', previewImage: '/previews/Natural Daylight.png' },
  { id: 'golden-hour', name: 'Golden Hour', conditions: 'Golden hour, warm sunset light', shadows: 'Long, soft', previewImage: '/previews/Golden Hour.png' },
  { id: 'dramatic', name: 'Dramatic', conditions: 'Dramatic side lighting', shadows: 'Harsh, high contrast', previewImage: '/previews/Dramatic.png' },
  { id: 'neon', name: 'Neon/Cyberpunk', conditions: 'Neon lights, colorful artificial lighting', shadows: 'Multiple colored', previewImage: '/previews/Neon  Cyberpunk.png' },
  { id: 'studio', name: 'Studio Lighting', conditions: 'Professional studio lighting, even illumination', shadows: 'Controlled, soft', previewImage: '/previews/Studio Lighting.png' },
  { id: 'moonlight', name: 'Moonlight', conditions: 'Moonlight, night scene, blue tones', shadows: 'Deep, mysterious', previewImage: '/previews/Moonlight.png' },
  { id: 'overcast', name: 'Overcast/Cloudy', conditions: 'Overcast sky, diffused light', shadows: 'Minimal, soft', previewImage: '/previews/Overcast  Cloudy.png' },
  { id: 'backlit', name: 'Backlit/Silhouette', conditions: 'Backlit, rim lighting', shadows: 'Strong silhouette', previewImage: '/previews/Backlit.png' }
];

/** @type {{id: string, name: string, colors: string[], moodPrompt: string}[]} */
export const MOOD_PRESETS = [
  { id: 'bright', name: 'Bright & Cheerful', colors: ['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b'], moodPrompt: 'Cheerful, optimistic, bright atmosphere' },
  { id: 'dark', name: 'Dark & Gritty', colors: ['#1f2937', '#374151', '#4b5563', '#6b7280'], moodPrompt: 'Dark, gritty, intense atmosphere' },
  { id: 'pastel', name: 'Soft & Pastel', colors: ['#fce7f3', '#ddd6fe', '#c7d2fe', '#a5f3fc'], moodPrompt: 'Soft, dreamy, gentle atmosphere' },
  { id: 'vibrant', name: 'Vibrant & Bold', colors: ['#ef4444', '#f97316', '#eab308', '#22c55e'], moodPrompt: 'Vibrant, energetic, bold atmosphere' },
  { id: 'noir', name: 'Noir/Monochrome', colors: ['#000000', '#3f3f46', '#71717a', '#ffffff'], moodPrompt: 'Film noir, mysterious, high contrast black and white' },
  { id: 'warm', name: 'Warm & Cozy', colors: ['#fef3c7', '#fed7aa', '#fdba74', '#fb923c'], moodPrompt: 'Warm, cozy, inviting atmosphere' },
  { id: 'cold', name: 'Cold & Mysterious', colors: ['#1e3a5f', '#3b82f6', '#60a5fa', '#93c5fd'], moodPrompt: 'Cold, mysterious, ethereal atmosphere' },
  { id: 'nature', name: 'Natural & Earthy', colors: ['#365314', '#4d7c0f', '#84cc16', '#a3e635'], moodPrompt: 'Natural, organic, earthy atmosphere' },
];

/** @type {{id: string, name: string, contextPrompt: string}[]} */
export const PROJECT_CONTEXTS = [
  { id: 'comic-panel', name: 'Comic Book Panel', contextPrompt: 'Comic book panel, sequential art' },
  { id: 'manga-panel', name: 'Manga Panel', contextPrompt: 'Manga panel, Japanese comic style' },
  { id: 'storyboard', name: 'Storyboard Frame', contextPrompt: 'Storyboard frame, cinematic composition' },
  { id: 'graphic-novel', name: 'Graphic Novel', contextPrompt: 'Graphic novel illustration, literary comic' },
  { id: 'webtoon', name: 'Webtoon', contextPrompt: 'Webtoon panel, vertical scroll comic' },
  { id: 'childrens-book', name: "Children's Book", contextPrompt: "Children's book illustration, friendly and colorful" },
  { id: 'concept-art', name: 'Concept Art', contextPrompt: 'Concept art, production design' }
];

/**
 * @typedef {'art-style' | 'medium' | 'lighting' | 'mood' | 'character' | 'location'} CustomPresetType
 */

/**
 * @typedef {Object} CustomPreset
 * @property {string} id
 * @property {CustomPresetType} type
 * @property {string} name
 * @property {Object} data - Type-specific data
 * @property {string} createdAt
 */

/**
 * @typedef {Object} CustomArtStyleData
 * @property {string} customPrompt
 */

/**
 * @typedef {Object} CustomMediumData
 * @property {string} prompt - FIBO style_medium value
 */

/**
 * @typedef {Object} CustomLightingData
 * @property {string} conditions
 * @property {string} shadows
 */

/**
 * @typedef {Object} CustomMoodData
 * @property {string[]} colors
 * @property {string} moodPrompt
 */

export {};
