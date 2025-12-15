/**
 * Image Generator Agent
 * 
 * Level 3 Agent: Takes a panel plan and generates the actual image using FIBO.
 * 
 * This agent:
 * - Receives a panel plan from Page Planner
 * - Gets FULL character/location data (filtered by what's needed)
 * - Creates a complete FIBO structured prompt with ALL required fields
 * - Calls FIBO to generate the image
 * - Returns the image URL and metadata
 */

import { Agent, tool, run } from '@openai/agents';
import { z } from 'zod';
import { getModelName } from './azureConfig';
import { generateImage } from '../fibo';
import { getClosestAspectRatio } from '../aspectRatio';

// Zod schema for FIBO structured prompt - matching FIBO's actual API
// Note: All fields required for Azure OpenAI strict mode
const FiboObjectSchema = z.object({
  description: z.string().describe('What the object/character is with key visual details'),
  location: z.string().describe('Position in frame (e.g., "center", "upper-right to mid-left", "foreground left")'),
  relationship: z.string().describe('How it relates to other elements in the scene'),
  relative_size: z.string().describe('Size within frame (e.g., "large", "medium", "small")'),
  shape_and_color: z.string().describe('Shape and color characteristics'),
  texture: z.string().describe('Surface texture and material quality'),
  appearance_details: z.string().describe('Additional visual details about appearance'),
  action: z.string().describe('What the object/character is doing'),
  orientation: z.string().describe('Direction facing or orientation in space'),
});

const FiboLightingSchema = z.object({
  conditions: z.string().describe('Lighting conditions (e.g., "Natural light, golden hour", "Dramatic studio lighting")'),
  direction: z.string().describe('Where light comes from (e.g., "From upper left", "Backlighting")'),
  shadows: z.string().describe('Shadow characteristics (e.g., "Soft diffused shadows", "Sharp dramatic shadows")'),
});

const FiboPhotographicSchema = z.object({
  depth_of_field: z.string().describe('Focus depth (e.g., "Deep, everything in focus", "Shallow, background blurred")'),
  focus: z.string().describe('What is in focus (e.g., "Sharp focus on the main character", "Soft focus overall")'),
  camera_angle: z.string().describe('Camera angle (e.g., "Eye-level", "Low angle looking up", "High angle")'),
  lens_focal_length: z.string().describe('Lens type (e.g., "Wide angle 24mm", "Portrait 85mm", "Telephoto")'),
});

const FiboAestheticsSchema = z.object({
  composition: z.string().describe('Composition style (e.g., "Rule of thirds", "Central focus", "Dynamic diagonal")'),
  color_scheme: z.string().describe('Color palette description (e.g., "Warm earth tones", "Cool blues and purples")'),
  mood_atmosphere: z.string().describe('Emotional feeling (e.g., "Tense and dramatic", "Peaceful and serene")'),
});

const FiboStructuredPromptSchema = z.object({
  short_description: z.string().describe('Complete scene description in 2-4 sentences capturing all key visual elements'),
  objects: z.array(FiboObjectSchema).describe('Array of characters/objects in the scene'),
  background_setting: z.string().describe('Detailed background and environment description'),
  lighting: FiboLightingSchema.describe('Scene lighting setup'),
  aesthetics: FiboAestheticsSchema.describe('Visual aesthetics and mood'),
  photographic_characteristics: FiboPhotographicSchema.describe('Camera and photography settings'),
  style_medium: z.string().describe('Art medium (e.g., "digital illustration", "photograph", "oil painting")'),
  context: z.string().describe('Purpose/context of the image'),
  artistic_style: z.string().describe('Art style (e.g., "manga", "realistic", "comic book")'),
});

/**
 * Create the FIBO generation tool that accepts a complete structured prompt
 * @param {Object} context - Context with aspect ratio info and logger
 * @returns {Tool} The FIBO tool
 */
function createFiboTool(context) {
  const { aspectRatio, logger } = context;
  const validAspectRatio = getClosestAspectRatio(aspectRatio || '3:4');

  return tool({
    name: 'generate_panel_image',
    description: 'Generate an image using FIBO AI. You MUST provide a complete structured_prompt with ALL required fields filled.',
    parameters: z.object({
      structured_prompt: FiboStructuredPromptSchema.describe('Complete FIBO structured prompt - ALL fields are required'),
    }),
    async execute({ structured_prompt }) {
      try {
        // Log the FIBO request
        if (logger) {
          logger.logFiboRequest(structured_prompt, validAspectRatio);
        }
        
        console.log('Generating image with structured prompt:', JSON.stringify(structured_prompt, null, 2));
        
        const result = await generateImage({
          structured_prompt,
          aspect_ratio: validAspectRatio,
          num_results: 1,
          model_version: 'FIBO',
        });

        const imageUrl = result.images[0]?.urls?.[0] || result.images[0];
        
        return {
          success: true,
          imageUrl,
          seed: result.seed,
          structuredPrompt: result.structured_prompt || structured_prompt,
        };
      } catch (error) {
        console.error('FIBO generation error:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  });
}

/**
 * Build the system instructions for the Image Generator
 * @param {Object} context - Panel context with all available data
 * @returns {string} System prompt
 */
function buildImageGeneratorInstructions(context) {
  const { panelPlan, characterPrompts, locationPrompt, artStyle, projectSettings } = context;

  // Build DETAILED character info with their ORIGINAL structured prompts
  const charInfo = characterPrompts?.length > 0 
    ? characterPrompts.map(cp => {
        const parts = [`## CHARACTER: ${cp.name} (ID: ${cp.id})`];
        parts.push(`**Action in this panel**: ${cp.action}`);
        parts.push(`**Expression**: ${cp.expression}`);
        
        // If we have original character data
        if (cp.originalCharacter) {
          const c = cp.originalCharacter;
          if (c.description) parts.push(`**Visual Description**: ${c.description}`);
          if (c.visualTraits) parts.push(`**Visual Traits**: ${c.visualTraits}`);
          if (c.clothing) parts.push(`**Default Clothing**: ${c.clothing}`);
          if (c.hairColor) parts.push(`**Hair**: ${c.hairColor}`);
          if (c.eyeColor) parts.push(`**Eyes**: ${c.eyeColor}`);
          if (c.skinTone) parts.push(`**Skin Tone**: ${c.skinTone}`);
          if (c.bodyType) parts.push(`**Body Type**: ${c.bodyType}`);
          if (c.age) parts.push(`**Age**: ${c.age}`);
        }
        
        // THE KEY: Include original FIBO structured prompt
        if (cp.fiboStructuredPrompt) {
          parts.push(`\n### 🎯 ORIGINAL FIBO STRUCTURED PROMPT (USE THIS FOR CONSISTENCY):`);
          parts.push('```json');
          parts.push(JSON.stringify(cp.fiboStructuredPrompt, null, 2));
          parts.push('```');
          if (cp.fiboSeed) {
            parts.push(`**Original Seed**: ${cp.fiboSeed} (reference only)`);
          }
        }
        
        return parts.join('\n');
      }).join('\n\n---\n\n')
    : 'No character data available - create appropriate character descriptions for the scene';

  // Build location info with ORIGINAL structured prompt
  let locInfo = 'No location data available - create appropriate setting for the scene';
  if (locationPrompt) {
    const parts = [`## LOCATION: ${locationPrompt.name} (ID: ${locationPrompt.id})`];
    parts.push(`**Time of Day**: ${locationPrompt.timeOfDay || 'unspecified'}`);
    parts.push(`**Weather**: ${locationPrompt.weather || 'unspecified'}`);
    
    if (locationPrompt.originalLocation) {
      const l = locationPrompt.originalLocation;
      if (l.description) parts.push(`**Description**: ${l.description}`);
      if (l.atmosphere) parts.push(`**Atmosphere**: ${l.atmosphere}`);
      if (l.keyElements) parts.push(`**Key Elements**: ${l.keyElements}`);
    }
    
    // THE KEY: Include original FIBO structured prompt for location
    if (locationPrompt.fiboStructuredPrompt) {
      parts.push(`\n### 🎯 ORIGINAL FIBO STRUCTURED PROMPT (USE THIS FOR CONSISTENCY):`);
      parts.push('```json');
      parts.push(JSON.stringify(locationPrompt.fiboStructuredPrompt, null, 2));
      parts.push('```');
      if (locationPrompt.fiboSeed) {
        parts.push(`**Original Seed**: ${locationPrompt.fiboSeed} (reference only)`);
      }
    }
    
    locInfo = parts.join('\n');
  }

  return `You are an expert visual artist specializing in creating CONSISTENT comic/manga panels. Your task is to MERGE the original character/location structured prompts into a single scene while maintaining visual consistency.

## 🎨 PROJECT VISUAL STYLE
- **Art Style**: ${artStyle || 'Digital comic illustration'}
- **Style Medium**: ${projectSettings?.styleMedium || 'digital-art'}
- **Project Type**: ${projectSettings?.projectContext || 'Comic/Manga'}
- **Color Palette**: ${projectSettings?.colorPalette?.join(', ') || 'Not specified'}
- **Default Mood**: ${projectSettings?.mood || 'Match scene requirements'}

## 📋 PANEL SPECIFICATIONS
**Scene Description:**
${panelPlan.sceneDescription}

**Shot Information:**
- Camera Angle: ${panelPlan.cameraAngle}
- Shot Type: ${panelPlan.shotType}
- Dialogue Hint: ${panelPlan.dialogueHint || 'None'}

---

## 🧑‍🤝‍🧑 CHARACTERS WITH THEIR ORIGINAL STRUCTURED PROMPTS

${charInfo}

---

## 🏞️ LOCATION WITH ORIGINAL STRUCTURED PROMPT

${locInfo}

---

## 🔑 CRITICAL INSTRUCTIONS FOR CONSISTENCY

You MUST:
1. **PRESERVE visual details** from the original structured prompts:
   - Character: shape_and_color, texture, appearance_details (hair color, eye color, clothing style, etc.)
   - Location: background_setting details, colors, atmosphere

2. **ADAPT only the dynamic elements**:
   - Character: action, orientation, expression (adapt to scene requirements)
   - Character: location/position in frame (adapt to composition)
   - Lighting: adapt to scene mood but keep style consistent

3. **MERGE multiple characters** into the objects array:
   - Each character becomes one object entry
   - Preserve their individual visual traits
   - Position them according to the scene

4. **COMBINE the location** with character environment:
   - Use background_setting from original location prompt as base
   - Adapt time of day/weather as specified in panel

5. **The camera_angle MUST match**: ${panelPlan.cameraAngle}

6. **Match the shot type** "${panelPlan.shotType}":
   - establishing: Wide angle, shows full environment
   - action: Dynamic framing, motion focus
   - reaction: Close on faces/expressions
   - detail: Focus on specific elements
   - transition: Medium shot

---

## 📝 OUTPUT FORMAT

Call generate_panel_image with a complete structured_prompt that:
- Merges all character visual details from their original prompts
- Uses the location's original background_setting as base
- Adapts poses, expressions, and positions for this specific scene
- Maintains the project's artistic style consistently

CALL generate_panel_image NOW.`;
}

/**
 * Create the Image Generator Agent
 * @param {Object} context - Full panel context with character/location data
 * @returns {Agent} Configured agent
 */
export function createImageGeneratorAgent(context) {
  const fiboTool = createFiboTool(context);

  return new Agent({
    name: 'Image Generator',
    instructions: buildImageGeneratorInstructions(context),
    model: getModelName(),
    tools: [fiboTool],
    modelSettings: {
      toolChoice: 'required', // Force tool use
    },
    toolUseBehavior: 'stop_on_first_tool', // Stop after FIBO call
  });
}

/**
 * Run the Image Generator Agent
 * 
 * @param {Object} options
 * @param {import('./schemas').PanelPlan} options.panelPlan - The panel to generate
 * @param {Object} options.projectSettings - Full project settings
 * @param {string} options.aspectRatio - Aspect ratio for the image
 * @param {Array} [options.characterPrompts] - Character data with original fiboStructuredPrompts
 * @param {Object} [options.locationPrompt] - Location data with original fiboStructuredPrompt
 * @param {Object} [options.logger] - Logger instance for detailed logging
 * @returns {Promise<{success: boolean, imageUrl?: string, seed?: number, error?: string}>}
 * 
 * @example
 * const result = await runImageGenerator({
 *   panelPlan: {
 *     panelNumber: 1,
 *     sceneDescription: "Hero stands dramatically on rooftop",
 *     characters: [{ id: "char-1", name: "Hero", action: "standing", expression: "determined" }],
 *     location: { id: "loc-1", name: "City Rooftop" },
 *     cameraAngle: "low-angle",
 *     shotType: "establishing"
 *   },
 *   projectSettings: project.settings,
 *   aspectRatio: '3:4',
 *   characterPrompts: [{...}], // From orchestrator
 *   locationPrompt: {...},     // From orchestrator
 *   logger: loggerInstance     // Optional logger
 * });
 */
export async function runImageGenerator({ 
  panelPlan, 
  projectSettings, 
  aspectRatio,
  characterPrompts,
  locationPrompt,
  logger,  // NEW: Logger for detailed logging
}) {
  const artStyle = projectSettings?.artStyle?.customPrompt 
    || projectSettings?.artStyle?.name 
    || 'Digital comic art';

  const context = {
    panelPlan,
    projectSettings,
    characterPrompts: characterPrompts || [],
    locationPrompt: locationPrompt || null,
    artStyle,
    aspectRatio,
    logger,  // Pass to tool
  };

  const agent = createImageGeneratorAgent(context);
  
  // Build the system instructions string for logging
  const systemInstructions = buildImageGeneratorInstructions(context);

  // Build user prompt highlighting the need to merge structured prompts
  const charList = characterPrompts?.length > 0
    ? characterPrompts.map(c => {
        const hasPrompt = c.fiboStructuredPrompt ? '✅ has original prompt' : '⚠️ no original prompt';
        return `- ${c.name} (${c.id}): ${c.action}, Expression: ${c.expression} [${hasPrompt}]`;
      }).join('\n')
    : 'No characters specified';

  const locInfo = locationPrompt 
    ? `${locationPrompt.name} (${locationPrompt.id}) - Time: ${locationPrompt.timeOfDay || 'unspecified'}, Weather: ${locationPrompt.weather || 'unspecified'} [${locationPrompt.fiboStructuredPrompt ? '✅ has original prompt' : '⚠️ no original prompt'}]`
    : 'Not specified';

  const prompt = `Generate panel ${panelPlan.panelNumber} for this comic.

## SCENE
${panelPlan.sceneDescription}

## CHARACTERS IN THIS PANEL (merge their original structured prompts)
${charList}

## LOCATION (use original structured prompt as base)
${locInfo}

## CAMERA
- Angle: ${panelPlan.cameraAngle}
- Shot Type: ${panelPlan.shotType}

## DIALOGUE HINT
${panelPlan.dialogueHint || 'None'}

IMPORTANT: Merge the original character and location structured prompts to create a consistent scene.
- PRESERVE all visual details (colors, textures, appearance) from original prompts
- ADAPT poses, expressions, and positions for THIS scene
- Call generate_panel_image with the merged structured_prompt.`;

  // Log the agent prompt
  if (logger) {
    logger.logAgentPrompt('Image Generator', systemInstructions, prompt);
  }

  try {
    const startTime = Date.now();
    const result = await run(agent, prompt, {
      model: getModelName(),
    });
    const duration = Date.now() - startTime;

    // Parse finalOutput if it's a string (happens with stop_on_first_tool)
    let output = result.finalOutput;
    if (typeof output === 'string') {
      try {
        output = JSON.parse(output);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    // Log agent response
    if (logger) {
      logger.logAgentResponse('Image Generator', output, duration);
    }

    console.log('Agent result parsed:', JSON.stringify(output, null, 2));

    // The agent's tool call result should be in finalOutput
    if (output?.success) {
      return {
        success: true,
        panelNumber: panelPlan.panelNumber,
        imageUrl: output.imageUrl,
        seed: output.seed,
        structuredPrompt: output.structuredPrompt,
      };
    } else {
      const errorMsg = output?.error 
        || (typeof output === 'string' ? output : null)
        || 'Agent did not return expected output format';
      console.error('Agent output indicates failure:', output);
      return {
        success: false,
        panelNumber: panelPlan.panelNumber,
        error: errorMsg,
      };
    }
  } catch (error) {
    console.error('Image generator agent error:', error);
    if (logger) {
      logger.logError('Image Generator Agent', error);
    }
    return {
      success: false,
      panelNumber: panelPlan.panelNumber,
      error: error.message,
    };
  }
}

export default {
  createImageGeneratorAgent,
  runImageGenerator,
};
