/**
 * Comic Planner Agent
 * 
 * Level 1 Agent: Takes a story description and creates a plan for all pages.
 * 
 * This agent:
 * - Receives a story/idea description
 * - Analyzes available characters and locations (names only, not full data)
 * - Creates a structured plan for each page
 * - Does NOT generate images or detailed panel descriptions
 * 
 * Output is passed to Page Planner Agent for each page.
 */

import { Agent, run } from '@openai/agents';
import { getModelName } from './azureConfig';
import { ComicPlanSchema } from './schemas';

/**
 * Build the system instructions for the Comic Planner
 * @param {Object} context - Project context
 * @returns {string} System prompt
 */
function buildComicPlannerInstructions(context) {
  const { projectType, characterNames, locationNames, artStyle } = context;

  return `You are a professional comic/storyboard planner. Your job is to take a story idea and break it down into individual pages.

PROJECT TYPE: ${projectType || 'comic'}
ART STYLE: ${artStyle || 'Not specified'}

AVAILABLE CHARACTERS:
${characterNames.length > 0 ? characterNames.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'No pre-defined characters'}

AVAILABLE LOCATIONS:
${locationNames.length > 0 ? locationNames.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'No pre-defined locations'}

YOUR TASK:
1. Read the story/idea provided by the user
2. Break it down into ${context.pageCount || 3} pages
3. For each page, describe:
   - What happens on that page (keep it brief but clear)
   - The mood/tone of the page
   - How many panels it should have (1-9, based on action density)

GUIDELINES:
- Use the available characters when possible
- Use the available locations when possible
- Each page should have a clear purpose in the narrative
- Action scenes = more panels (6-9)
- Dialogue/emotional scenes = fewer panels (2-4)
- Establishing shots = 1-3 panels
- Keep descriptions concise to save tokens

OUTPUT: Return a structured JSON with the comic plan.`;
}

/**
 * Create the Comic Planner Agent
 * @param {Object} context - Project context with character/location names
 * @returns {Agent} Configured agent
 */
export function createComicPlannerAgent(context) {
  return new Agent({
    name: 'Comic Planner',
    instructions: buildComicPlannerInstructions(context),
    model: getModelName(),
    outputType: ComicPlanSchema,
  });
}

/**
 * Run the Comic Planner Agent
 * 
 * @param {Object} options
 * @param {string} options.storyDescription - The story/idea to plan
 * @param {number} options.pageCount - Number of pages to plan
 * @param {Object} options.projectSettings - Project settings (we extract names only)
 * @param {string} options.projectType - Type of project (comic, manga, storyboard)
 * @returns {Promise<import('./schemas').ComicPlan>} The comic plan
 * 
 * @example
 * const plan = await runComicPlanner({
 *   storyDescription: "A hero discovers they have powers and must save the city",
 *   pageCount: 5,
 *   projectSettings: project.settings,
 *   projectType: 'comic'
 * });
 */
export async function runComicPlanner({ storyDescription, pageCount, projectSettings, projectType }) {
  // Extract only names to save tokens (not full character/location data)
  const characterNames = (projectSettings?.characters || []).map(c => c.name);
  const locationNames = (projectSettings?.locations || []).map(l => l.name);
  const artStyle = projectSettings?.artStyle?.name || projectSettings?.artStyle?.customPrompt;

  const context = {
    projectType,
    pageCount,
    characterNames,
    locationNames,
    artStyle,
  };

  const agent = createComicPlannerAgent(context);

  const result = await run(agent, `Plan a ${pageCount}-page ${projectType || 'comic'} based on this story:\n\n${storyDescription}`, {
    model: getModelName(),
  });

  return result.finalOutput;
}

export default {
  createComicPlannerAgent,
  runComicPlanner,
};
