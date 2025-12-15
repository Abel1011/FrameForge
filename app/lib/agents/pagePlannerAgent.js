/**
 * Page Planner Agent
 * 
 * Level 2 Agent: Takes a page description and creates detailed panel plans.
 * 
 * This agent:
 * - Receives a page description from Comic Planner
 * - Creates detailed scene descriptions for each panel
 * - References characters/locations by ID + NAME
 * - Specifies camera angles, shot types, etc.
 * 
 * Output is passed to Image Generator Agent for each panel.
 */

import { Agent, run } from '@openai/agents';
import { getModelName } from './azureConfig';
import { PagePanelsPlanSchema } from './schemas';

// Export for logging
export { buildPagePlannerInstructions };

/**
 * Build the system instructions for the Page Planner
 * @param {Object} context - Page context
 * @returns {string} System prompt
 */
function buildPagePlannerInstructions(context) {
  const { 
    pageNumber, 
    pageDescription, 
    panelCount, 
    mood,
    characters, // Now includes id + name pairs
    locations,  // Now includes id + name pairs
    artStyle,
    projectType 
  } = context;

  // Format characters with ID and name
  const characterList = characters.length > 0 
    ? characters.map((c, i) => `${i + 1}. ID: "${c.id}" | Name: "${c.name}"`).join('\n')
    : 'No pre-defined characters - you may create generic descriptions (use id: "generic")';

  // Format locations with ID and name
  const locationList = locations.length > 0
    ? locations.map((l, i) => `${i + 1}. ID: "${l.id}" | Name: "${l.name}"`).join('\n')
    : 'No pre-defined locations - describe settings as needed (use id: "new")';

  return `You are a professional comic panel planner. Your job is to take a page description and create detailed plans for each panel.

PROJECT TYPE: ${projectType || 'comic'}
ART STYLE: ${artStyle || 'Not specified'}
PAGE NUMBER: ${pageNumber}
PAGE MOOD: ${mood || 'neutral'}
TARGET PANEL COUNT: ${panelCount}

PAGE DESCRIPTION:
${pageDescription}

AVAILABLE CHARACTERS (use the ID and name when adding characters to panels):
${characterList}

AVAILABLE LOCATIONS (use the ID and name when specifying locations):
${locationList}

YOUR TASK:
For each panel, provide:
1. sceneDescription: Detailed visual description of what to show (be specific!)
2. characters: Array of characters in the panel with:
   - id: The character's ID from the list above (REQUIRED - use "generic" for unnamed characters)
   - name: The character's name
   - action: What they are doing
   - expression: Their facial expression
3. location: The setting/background with:
   - id: The location's ID from the list above (REQUIRED - use "new" for custom locations)
   - name: The location name
   - timeOfDay: dawn, day, dusk, night, or unspecified
   - weather: clear, cloudy, rainy, etc. or unspecified
4. cameraAngle: How the "camera" is positioned (close-up, medium, wide, bird-eye, low-angle, dutch-angle)
5. shotType: Purpose of the shot (establishing, action, reaction, detail, transition)
6. dialogueHint: Optional brief dialogue hint (just for context)

PANEL COMPOSITION GUIDELINES:
- Panel 1 is often establishing (wide shot, show setting)
- Action sequences: use dynamic angles (low-angle, dutch-angle)
- Emotional moments: use close-ups for reactions
- Dialogue: medium shots work best
- Vary shot types to keep it visually interesting
- Consider visual flow from panel to panel

SCENE DESCRIPTION TIPS:
- Be specific about poses, positions, and actions
- Describe lighting if important to the mood
- Mention key props or objects
- Focus on what's visually interesting

OUTPUT: Return a structured JSON with panel plans.`;
}

/**
 * Create the Page Planner Agent
 * @param {Object} context - Page context
 * @returns {Agent} Configured agent
 */
export function createPagePlannerAgent(context) {
  return new Agent({
    name: 'Page Planner',
    instructions: buildPagePlannerInstructions(context),
    model: getModelName(),
    outputType: PagePanelsPlanSchema,
  });
}

/**
 * Run the Page Planner Agent
 * 
 * @param {Object} options
 * @param {number} options.pageNumber - Which page we're planning
 * @param {string} options.pageDescription - Description from Comic Planner
 * @param {number} options.panelCount - Target number of panels
 * @param {string} options.mood - Page mood from Comic Planner
 * @param {Object} options.projectSettings - Project settings (we extract names only)
 * @param {string} options.projectType - Type of project
 * @returns {Promise<import('./schemas').PagePanelsPlan>} The page plan with all panels
 * 
 * @example
 * const pagePlan = await runPagePlanner({
 *   pageNumber: 1,
 *   pageDescription: "The hero wakes up to discover strange powers",
 *   panelCount: 4,
 *   mood: "mysterious",
 *   projectSettings: project.settings,
 *   projectType: 'comic'
 * });
 */
export async function runPagePlanner({ 
  pageNumber, 
  pageDescription, 
  panelCount, 
  mood,
  projectSettings, 
  projectType 
}) {
  // Extract ID + name pairs (not just names) for character/location lookup
  const characters = (projectSettings?.characters || []).map(c => ({ 
    id: c.id, 
    name: c.name 
  }));
  const locations = (projectSettings?.locations || []).map(l => ({ 
    id: l.id, 
    name: l.name 
  }));
  const artStyle = projectSettings?.artStyle?.name || projectSettings?.artStyle?.customPrompt;

  const context = {
    pageNumber,
    pageDescription,
    panelCount,
    mood,
    characters,  // Now id+name pairs
    locations,   // Now id+name pairs
    artStyle,
    projectType,
  };

  const agent = createPagePlannerAgent(context);

  const prompt = `Create ${panelCount} detailed panel plans for page ${pageNumber}.

Page description: ${pageDescription}
Mood: ${mood}

Make sure each panel flows naturally into the next and tells the story visually.`;

  const result = await run(agent, prompt, {
    model: getModelName(),
  });

  return result.finalOutput;
}

export default {
  createPagePlannerAgent,
  runPagePlanner,
};
