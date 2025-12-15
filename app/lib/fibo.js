/**
 * FIBO (Bria) Image Generation API Client
 * 
 * Documentation: https://bria-ai-api-docs.redoc.ly/
 * Base URL: https://engine.prod.bria-api.com/v2
 */

const FIBO_BASE_URL = 'https://engine.prod.bria-api.com/v2';
const POLLING_INTERVAL = 2000; // 2 seconds
const MAX_POLLING_ATTEMPTS = 60; // 2 minutes max
const RETRY_DELAYS = [10000, 15000, 20000]; // Retry delays: 10s, 15s, 20s

/**
 * Get the FIBO API key from environment
 * @returns {string}
 */
function getApiKey() {
  const apiKey = process.env.FIBO_API_KEY;
  if (!apiKey) {
    throw new Error('FIBO_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Sleep helper function
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make a request to the FIBO API with retry logic
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>}
 */
async function fiboRequest(endpoint, options = {}) {
  const url = `${FIBO_BASE_URL}${endpoint}`;
  const apiKey = getApiKey();
  
  let lastError;
  
  // Initial attempt + 3 retries
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'api_token': apiKey,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`FIBO API error response (attempt ${attempt + 1}):`, JSON.stringify(error, null, 2));
        throw new Error(error.message || `FIBO API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;
      
      // If we have more retries, wait and try again
      if (attempt < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[attempt];
        console.log(`FIBO API request failed. Retrying in ${delay / 1000}s... (attempt ${attempt + 2}/${RETRY_DELAYS.length + 1})`);
        await sleep(delay);
      }
    }
  }
  
  // All retries exhausted
  throw lastError;
}

/**
 * Parse structured_prompt from FIBO response (comes as JSON string)
 * @param {string|Object} structuredPrompt - The structured prompt (string or object)
 * @returns {Object|null} - Parsed structured prompt object
 */
function parseStructuredPrompt(structuredPrompt) {
  if (!structuredPrompt) return null;
  if (typeof structuredPrompt === 'object') return structuredPrompt;
  try {
    return JSON.parse(structuredPrompt);
  } catch (e) {
    console.error('Failed to parse structured_prompt:', e);
    return null;
  }
}

/**
 * Poll for async operation result
 * @param {string} statusUrl - URL to poll for status
 * @returns {Promise<Object>} - Final result when ready
 */
async function pollForResult(statusUrl) {
  const apiKey = getApiKey();
  
  for (let attempt = 0; attempt < MAX_POLLING_ATTEMPTS; attempt++) {
    const response = await fetch(statusUrl, {
      headers: {
        'api_token': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Polling failed: ${response.status}`);
    }

    const result = await response.json();

    // FIBO returns status in uppercase: 'COMPLETED', 'FAILED', 'IN_PROGRESS'
    const status = result.status?.toUpperCase();
    
    if (status === 'COMPLETED' || result.result?.image_url) {
      return result;
    }

    if (status === 'FAILED') {
      throw new Error(result.error || 'Image generation failed');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
  }

  throw new Error('Image generation timed out');
}

/**
 * @typedef {Object} FiboObject
 * @property {string} description - What the object is
 * @property {string} [location] - Position in scene
 * @property {string} [shape_and_color] - Physical characteristics
 * @property {string} [pose] - Posture/action
 * @property {string} [texture] - Materials
 * @property {string} [relative_size] - Visual size
 * @property {string} [expression] - Facial expression
 * @property {string} [clothing] - Clothes and accessories
 * @property {string} [relationship] - Interaction with other objects
 */

/**
 * @typedef {Object} FiboLighting
 * @property {string} [conditions] - Light type
 * @property {string} [direction] - Light source direction
 * @property {string} [shadows] - Shadow quality
 * @property {string} [color] - Main light color
 */

/**
 * @typedef {Object} FiboPhotographic
 * @property {string} [camera_angle] - Camera angle
 * @property {string} [lens_focal_length] - Focal length
 * @property {string} [depth_of_field] - Focus depth
 * @property {string} [shutter_speed] - Motion effect
 */

/**
 * @typedef {Object} FiboAesthetics
 * @property {string} [mood_atmosphere] - Emotion/mood
 * @property {string} [color_scheme] - Color palette
 * @property {string} [composition] - Composition rules
 */

/**
 * @typedef {Object} FiboStructuredPrompt
 * @property {string} short_description - Brief scene summary (max 50 words)
 * @property {FiboObject[]} objects - Main elements in the scene
 * @property {string} background_setting - Environment details
 * @property {string} artistic_style - Visual style
 * @property {string} style_medium - Artistic medium
 * @property {FiboLighting} [lighting] - Lighting settings
 * @property {FiboPhotographic} [photographic_characteristics] - Camera settings
 * @property {FiboAesthetics} [aesthetics] - Mood and composition
 * @property {string} [context] - Intended use
 */

/**
 * @typedef {Object} GenerateImageOptions
 * @property {string} [prompt] - Text prompt for generation
 * @property {string[]} [images] - Base64 or URL images for inspiration
 * @property {FiboStructuredPrompt} [structured_prompt] - Detailed prompt object
 * @property {number} [num_results] - Number of images to generate (1-4)
 * @property {string} [aspect_ratio] - Aspect ratio (e.g., "1:1", "16:9", "9:16")
 * @property {number} [seed] - Seed for reproducibility
 * @property {string} [model_version] - Model version to use
 */

/**
 * Generate an image using FIBO
 * This is the main all-in-one generation endpoint
 * 
 * @param {GenerateImageOptions} options - Generation options
 * @returns {Promise<{images: string[], seed: number}>} - Generated image URLs and seed
 * 
 * @example
 * // Text-to-image
 * const result = await generateImage({ prompt: "A cyberpunk city at night" });
 * 
 * @example
 * // With structured prompt for more control
 * const result = await generateImage({
 *   structured_prompt: {
 *     short_description: "Cyberpunk detective in neon-lit alley",
 *     objects: [{ description: "Detective", location: "Center", clothing: "Trench coat" }],
 *     background_setting: "Dark alley with neon signs",
 *     artistic_style: "Cyberpunk noir",
 *     style_medium: "Digital illustration"
 *   }
 * });
 */
export async function generateImage(options) {
  const {
    prompt,
    images,
    structured_prompt,
    num_results = 1,
    aspect_ratio = '1:1',
    seed,
    model_version,
  } = options;

  // Validate input combinations
  if (!prompt && !images && !structured_prompt) {
    throw new Error('Must provide either prompt, images, or structured_prompt');
  }

  const body = {
    num_results,
    aspect_ratio,
    sync: false, // Always use async for reliability
  };

  if (prompt) body.prompt = prompt;
  if (images) body.images = images;
  // API expects structured_prompt as JSON string, not object
  if (structured_prompt) {
    body.structured_prompt = typeof structured_prompt === 'string' 
      ? structured_prompt 
      : JSON.stringify(structured_prompt);
  }
  if (seed !== undefined) body.seed = seed;
  if (model_version) body.model_version = model_version;

  // Start generation - using FIBO v2 all-in-one endpoint
  const startResult = await fiboRequest('/image/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  // Poll for result
  if (startResult.status_url) {
    const finalResult = await pollForResult(startResult.status_url);
    // FIBO v2 returns: { result: { image_url, seed, structured_prompt }, status, request_id }
    const resultData = finalResult.result || {};
    return {
      images: [{ urls: [resultData.image_url] }], // Normalize to array format for compatibility
      seed: resultData.seed,
      structured_prompt: parseStructuredPrompt(resultData.structured_prompt),
    };
  }

  // Sync response (if API returns immediately)
  // FIBO v2 returns: { result: { image_url, seed, structured_prompt }, status, request_id }
  const resultData = startResult.result || {};
  return {
    images: [{ urls: [resultData.image_url] }], // Normalize to array format for compatibility
    seed: resultData.seed,
    structured_prompt: parseStructuredPrompt(resultData.structured_prompt),
  };
}

/**
 * Generate a structured prompt from text/images using VLM
 * Useful for getting more control over the generation
 * 
 * @param {Object} options
 * @param {string} [options.prompt] - Text description
 * @param {string[]} [options.images] - Reference images (base64 or URLs)
 * @returns {Promise<FiboStructuredPrompt>} - Structured prompt object
 * 
 * @example
 * const structuredPrompt = await generateStructuredPrompt({
 *   prompt: "A warrior standing on a cliff at sunset"
 * });
 * // Now you can modify the structured prompt before generating
 * structuredPrompt.artistic_style = "manga";
 * const image = await generateImage({ structured_prompt: structuredPrompt });
 */
export async function generateStructuredPrompt(options) {
  const { prompt, images } = options;

  if (!prompt && !images) {
    throw new Error('Must provide either prompt or images');
  }

  const body = {};
  if (prompt) body.prompt = prompt;
  if (images) body.images = images;

  const result = await fiboRequest('/structured_prompt/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return result.structured_prompt;
}

/**
 * Build a structured prompt from project settings and panel description
 * Helper function to convert app settings to FIBO format
 * 
 * @param {Object} options
 * @param {string} options.description - Panel/scene description
 * @param {import('../types').ProjectSettings} options.settings - Project settings
 * @param {import('../types').Character[]} [options.characters] - Characters in this panel
 * @param {import('../types').Location} [options.location] - Location for this panel
 * @returns {FiboStructuredPrompt}
 */
export function buildStructuredPrompt({ description, settings, characters = [], location }) {
  const prompt = {
    short_description: description.slice(0, 200),
    objects: [],
    background_setting: '',
    artistic_style: settings?.artStyle?.customPrompt || 'Digital illustration',
    style_medium: settings?.styleMedium || 'digital-art',
    // Always include these required fields with defaults
    lighting: {
      conditions: settings?.defaultLighting || 'Natural daylight',
      shadows: 'Soft',
    },
    aesthetics: {
      mood_atmosphere: settings?.mood || 'Neutral',
      color_scheme: settings?.colorPalette?.length > 0 
        ? settings.colorPalette.join(', ') 
        : 'Balanced colors',
    },
    photographic_characteristics: {
      camera_angle: 'Eye level',
      depth_of_field: 'Medium',
      lens_focal_length: '50mm',
    },
  };

  // Add characters as objects
  if (characters.length > 0) {
    characters.forEach((char, index) => {
      prompt.objects.push({
        description: char.name || 'Character',
        shape_and_color: char.description || 'Human figure',
        location: index === 0 ? 'Center' : 'Side',
        relative_size: 'Medium',
        pose: 'Standing',
        expression: 'Neutral',
      });
    });
  } else {
    // FIBO requires at least one object
    prompt.objects.push({
      description: 'Scene element',
      shape_and_color: 'As described in scene',
      location: 'Center',
      relative_size: 'Medium',
    });
  }

  // Add location as background
  if (location) {
    prompt.background_setting = `${location.name}: ${location.description || ''}`;
  } else if (settings?.locations?.[0]) {
    const defaultLoc = settings.locations[0];
    prompt.background_setting = `${defaultLoc.name}: ${defaultLoc.description || ''}`;
  } else {
    prompt.background_setting = 'Generic background appropriate to the scene';
  }

  // Override lighting if specified in settings
  if (settings?.defaultLighting) {
    prompt.lighting.conditions = settings.defaultLighting;
  }

  // Override aesthetics if specified
  if (settings?.mood) {
    prompt.aesthetics.mood_atmosphere = settings.mood;
  }
  if (settings?.colorPalette?.length > 0) {
    prompt.aesthetics.color_scheme = settings.colorPalette.join(', ');
  }

  // Add context based on project type
  if (settings?.projectContext) {
    prompt.context = settings.projectContext;
  }

  return prompt;
}

/**
 * Generate a panel image using project settings
 * Convenience function that combines buildStructuredPrompt and generateImage
 * 
 * @param {Object} options
 * @param {string} options.description - What should be in this panel
 * @param {import('../types').ProjectSettings} options.settings - Project settings
 * @param {import('../types').Character[]} [options.characters] - Characters to include
 * @param {import('../types').Location} [options.location] - Location/background
 * @param {string} [options.aspectRatio] - Panel aspect ratio
 * @param {number} [options.seed] - Seed for reproducibility
 * @returns {Promise<{imageUrl: string, seed: number, structuredPrompt: FiboStructuredPrompt}>}
 * 
 * @example
 * const result = await generatePanelImage({
 *   description: "The hero confronts the villain",
 *   settings: project.settings,
 *   characters: [hero, villain],
 *   location: project.settings.locations[0],
 *   aspectRatio: "3:4"
 * });
 */
export async function generatePanelImage(options) {
  const {
    description,
    settings,
    characters = [],
    location,
    aspectRatio = '1:1',
    seed,
  } = options;

  // Build the structured prompt from settings
  const structuredPrompt = buildStructuredPrompt({
    description,
    settings,
    characters,
    location,
  });

  // Generate the image
  const result = await generateImage({
    structured_prompt: structuredPrompt,
    aspect_ratio: aspectRatio,
    seed,
    num_results: 1,
  });

  return {
    imageUrl: result.images[0],
    seed: result.seed,
    structuredPrompt,
  };
}

/**
 * Generate variations of an existing image
 * 
 * @param {Object} options
 * @param {string} options.imageUrl - URL or base64 of source image
 * @param {string} [options.prompt] - Optional text to guide variations
 * @param {number} [options.numResults] - Number of variations (1-4)
 * @returns {Promise<{images: string[]}>}
 */
export async function generateVariations(options) {
  const { imageUrl, prompt, numResults = 2 } = options;

  return generateImage({
    images: [imageUrl],
    prompt,
    num_results: numResults,
  });
}

export default {
  generateImage,
  generateStructuredPrompt,
  buildStructuredPrompt,
  generatePanelImage,
  generateVariations,
};
