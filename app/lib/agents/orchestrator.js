/**
 * Agents Orchestrator
 * 
 * Coordinates the three-tier agent system:
 * 1. Comic Planner → Creates page-level plans
 * 2. Page Planner → Creates panel-level plans for each page
 * 3. Image Generator → Generates images for each panel
 * 
 * Also handles progress callbacks for UI updates.
 */

import { runComicPlanner } from './comicPlannerAgent';
import { runPagePlanner, buildPagePlannerInstructions } from './pagePlannerAgent';
import { runImageGenerator } from './imageGeneratorAgent';
import { initializeAzureOpenAI } from './azureConfig';
import { createLogger } from './logger';

// Initialize Azure OpenAI client as default for the SDK
initializeAzureOpenAI();

/**
 * Extract FIBO structured prompts for characters and location in a panel
 * Uses IDs from panelPlan to look up original fiboStructuredPrompt data
 * 
 * @param {Object} panelPlan - The panel plan with character/location refs
 * @param {Object} projectSettings - Project settings with character/location definitions
 * @returns {{characterPrompts: Array, locationPrompt: Object|null}}
 */
function getOriginalStructuredPrompts(panelPlan, projectSettings) {
  const characters = projectSettings?.characters || [];
  const locations = projectSettings?.locations || [];

  // Get character structured prompts by ID
  const characterPrompts = (panelPlan.characters || []).map(charRef => {
    const character = characters.find(c => c.id === charRef.id);
    return {
      id: charRef.id,
      name: charRef.name,
      action: charRef.action,
      expression: charRef.expression,
      originalCharacter: character || null,
      // The FIBO structured prompt used to generate their reference image
      fiboStructuredPrompt: character?.fiboStructuredPrompt || null,
      fiboSeed: character?.fiboSeed || null,
    };
  });

  // Get location structured prompt by ID
  let locationPrompt = null;
  if (panelPlan.location?.id && panelPlan.location.id !== 'new') {
    const location = locations.find(l => l.id === panelPlan.location.id);
    locationPrompt = {
      id: panelPlan.location.id,
      name: panelPlan.location.name,
      timeOfDay: panelPlan.location.timeOfDay,
      weather: panelPlan.location.weather,
      originalLocation: location || null,
      fiboStructuredPrompt: location?.fiboStructuredPrompt || null,
      fiboSeed: location?.fiboSeed || null,
    };
  } else if (panelPlan.location) {
    // New/custom location without pre-existing data
    locationPrompt = {
      id: 'new',
      name: panelPlan.location.name,
      timeOfDay: panelPlan.location.timeOfDay,
      weather: panelPlan.location.weather,
      originalLocation: null,
      fiboStructuredPrompt: null,
      fiboSeed: null,
    };
  }

  return { characterPrompts, locationPrompt };
}

/**
 * @typedef {Object} GenerationProgress
 * @property {'planning' | 'generating' | 'complete' | 'error'} stage
 * @property {number} currentPage
 * @property {number} totalPages
 * @property {number} currentPanel
 * @property {number} totalPanels
 * @property {string} message
 */

/**
 * @typedef {Object} GeneratedPanel
 * @property {number} pageNumber
 * @property {number} panelNumber
 * @property {string} imageUrl
 * @property {number} seed
 * @property {Object} structuredPrompt
 * @property {Object} panelPlan
 */

/**
 * @typedef {Object} GenerationResult
 * @property {boolean} success
 * @property {string} title
 * @property {Array<{pageNumber: number, panels: GeneratedPanel[]}>} pages
 * @property {Object} comicPlan
 * @property {string} [error]
 */

/**
 * Generate a full comic using the agent pipeline
 * 
 * @param {Object} options
 * @param {string} options.storyDescription - Story/idea to generate
 * @param {number} options.pageCount - Number of pages
 * @param {Object} options.projectSettings - Project settings
 * @param {string} options.projectType - Project type (comic, manga, etc.)
 * @param {string} options.aspectRatio - Default aspect ratio for panels
 * @param {(progress: GenerationProgress) => void} [options.onProgress] - Progress callback
 * @returns {Promise<GenerationResult>}
 */
export async function generateFullComic({
  storyDescription,
  pageCount,
  projectSettings,
  projectType,
  aspectRatio = '3:4',
  onProgress,
}) {
  const progress = (stage, message, extra = {}) => {
    if (onProgress) {
      onProgress({
        stage,
        message,
        currentPage: 0,
        totalPages: pageCount,
        currentPanel: 0,
        totalPanels: 0,
        ...extra,
      });
    }
    console.log(`[${stage}] ${message}`);
  };

  try {
    // =========================================================================
    // STAGE 1: Comic Planning
    // =========================================================================
    progress('planning', 'Creating comic structure...', { currentPage: 0 });

    const comicPlan = await runComicPlanner({
      storyDescription,
      pageCount,
      projectSettings,
      projectType,
    });

    console.log('Comic plan created:', JSON.stringify(comicPlan, null, 2));

    // =========================================================================
    // STAGE 2 & 3: Page Planning + Image Generation (per page)
    // =========================================================================
    const generatedPages = [];
    const totalPages = comicPlan.pages.length;

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const pagePlan = comicPlan.pages[pageIndex];
      const pageNumber = pagePlan.pageNumber;

      progress('planning', `Planning page ${pageNumber}...`, {
        currentPage: pageNumber,
        totalPages,
      });

      // Run Page Planner for this page
      const pagePanelsPlan = await runPagePlanner({
        pageNumber,
        pageDescription: pagePlan.pageDescription,
        panelCount: pagePlan.panelCount,
        mood: pagePlan.mood,
        projectSettings,
        projectType,
      });

      console.log(`Page ${pageNumber} panels planned:`, JSON.stringify(pagePanelsPlan, null, 2));

      // Generate images for each panel
      const totalPanels = pagePanelsPlan.panels.length;
      const generatedPanels = [];

      for (let panelIndex = 0; panelIndex < totalPanels; panelIndex++) {
        const panelPlan = pagePanelsPlan.panels[panelIndex];

        progress('generating', `Generating page ${pageNumber}, panel ${panelPlan.panelNumber}...`, {
          currentPage: pageNumber,
          totalPages,
          currentPanel: panelPlan.panelNumber,
          totalPanels,
        });

        // Get original FIBO structured prompts for characters and location
        const { characterPrompts, locationPrompt } = getOriginalStructuredPrompts(
          panelPlan, 
          projectSettings
        );

        // Run Image Generator for this panel with original structured prompts
        const imageResult = await runImageGenerator({
          panelPlan,
          projectSettings,
          aspectRatio,
          characterPrompts,  // Include original fiboStructuredPrompt data
          locationPrompt,    // Include original fiboStructuredPrompt data
        });

        if (imageResult.success) {
          generatedPanels.push({
            pageNumber,
            panelNumber: panelPlan.panelNumber,
            imageUrl: imageResult.imageUrl,
            seed: imageResult.seed,
            structuredPrompt: imageResult.structuredPrompt,
            panelPlan,
          });
        } else {
          console.error(`Failed to generate panel ${panelPlan.panelNumber}:`, imageResult.error);
          // Continue with other panels even if one fails
          generatedPanels.push({
            pageNumber,
            panelNumber: panelPlan.panelNumber,
            imageUrl: null,
            error: imageResult.error,
            panelPlan,
          });
        }
      }

      generatedPages.push({
        pageNumber,
        pagePlan,
        panelsPlan: pagePanelsPlan,
        panels: generatedPanels,
      });
    }

    // =========================================================================
    // COMPLETE
    // =========================================================================
    progress('complete', 'Comic generation complete!', {
      currentPage: totalPages,
      totalPages,
    });

    return {
      success: true,
      title: comicPlan.title,
      summary: comicPlan.summary,
      comicPlan,
      pages: generatedPages,
    };

  } catch (error) {
    console.error('Comic generation failed:', error);
    progress('error', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Generate panels for a single page
 * 
 * @param {Object} options
 * @param {string} options.pageDescription - Description of what happens on this page
 * @param {number} options.panelCount - Number of panels to generate
 * @param {string} options.mood - Mood of the page
 * @param {Object} options.projectSettings - Project settings
 * @param {string} options.projectType - Project type
 * @param {string} options.aspectRatio - Aspect ratio for panels
 * @param {(progress: GenerationProgress) => void} [options.onProgress] - Progress callback
 * @returns {Promise<{success: boolean, panels: GeneratedPanel[], error?: string}>}
 */
export async function generateSinglePage({
  pageDescription,
  panelCount,
  mood = 'neutral',
  projectSettings,
  projectType,
  aspectRatio = '3:4',
  onProgress,
}) {
  // Create a logger for this session
  const logger = createLogger();
  
  logger.logSessionStart({
    pageDescription,
    panelCount,
    mood,
    projectType,
    aspectRatio,
  });
  
  logger.logProjectSettings(projectSettings);

  const progress = (stage, message, extra = {}) => {
    if (onProgress) {
      onProgress({
        stage,
        message,
        currentPage: 1,
        totalPages: 1,
        currentPanel: 0,
        totalPanels: panelCount,
        ...extra,
      });
    }
    console.log(`[${stage}] ${message}`);
  };

  try {
    // Plan the page panels
    progress('planning', 'Planning page panels...');

    // Build Page Planner context for logging
    const characters = (projectSettings?.characters || []).map(c => ({ id: c.id, name: c.name }));
    const locations = (projectSettings?.locations || []).map(l => ({ id: l.id, name: l.name }));
    const artStyle = projectSettings?.artStyle?.name || projectSettings?.artStyle?.customPrompt;
    
    const pagePlannerContext = {
      pageNumber: 1,
      pageDescription,
      panelCount,
      mood,
      characters,
      locations,
      artStyle,
      projectType,
    };
    
    // Log the Page Planner prompt
    const pagePlannerSystemPrompt = buildPagePlannerInstructions(pagePlannerContext);
    const pagePlannerUserPrompt = `Create ${panelCount} detailed panel plans for page 1.\n\nPage description: ${pageDescription}\nMood: ${mood}\n\nMake sure each panel flows naturally into the next and tells the story visually.`;
    
    logger.logAgentPrompt('Page Planner', pagePlannerSystemPrompt, pagePlannerUserPrompt);

    const planStartTime = Date.now();
    const pagePanelsPlan = await runPagePlanner({
      pageNumber: 1,
      pageDescription,
      panelCount,
      mood,
      projectSettings,
      projectType,
    });
    const planDuration = Date.now() - planStartTime;

    logger.logAgentResponse('Page Planner', pagePanelsPlan, planDuration);

    // Generate images for each panel
    const totalPanels = pagePanelsPlan.panels.length;
    const generatedPanels = [];

    for (let panelIndex = 0; panelIndex < totalPanels; panelIndex++) {
      const panelPlan = pagePanelsPlan.panels[panelIndex];

      logger.logPanelProgress(1, panelPlan.panelNumber, totalPanels);

      progress('generating', `Generating panel ${panelPlan.panelNumber}...`, {
        currentPanel: panelPlan.panelNumber,
        totalPanels,
      });

      // Get original FIBO structured prompts for characters and location
      const { characterPrompts, locationPrompt } = getOriginalStructuredPrompts(
        panelPlan, 
        projectSettings
      );

      // Log consistency data lookup
      logger.logConsistencyData(characterPrompts, locationPrompt);

      const genStartTime = Date.now();
      const imageResult = await runImageGenerator({
        panelPlan,
        projectSettings,
        aspectRatio,
        characterPrompts,
        locationPrompt,
        logger,  // Pass logger to image generator for detailed logging
      });
      const genDuration = Date.now() - genStartTime;

      // Log FIBO result
      logger.logFiboResponse(
        imageResult.success,
        imageResult.imageUrl,
        imageResult.seed,
        imageResult.error
      );

      if (imageResult.success) {
        generatedPanels.push({
          pageNumber: 1,
          panelNumber: panelPlan.panelNumber,
          imageUrl: imageResult.imageUrl,
          seed: imageResult.seed,
          structuredPrompt: imageResult.structuredPrompt,
          panelPlan,
        });
      } else {
        logger.logError(`Panel ${panelPlan.panelNumber} generation`, imageResult.error || 'Unknown error');
        generatedPanels.push({
          pageNumber: 1,
          panelNumber: panelPlan.panelNumber,
          imageUrl: null,
          error: imageResult.error,
          panelPlan,
        });
      }
    }

    progress('complete', 'Page generation complete!', {
      currentPanel: totalPanels,
      totalPanels,
    });

    const result = {
      success: true,
      panelsPlan: pagePanelsPlan,
      panels: generatedPanels,
    };

    // Log session end and save to file
    logger.logSessionEnd(result);
    await logger.saveToFile();

    return result;

  } catch (error) {
    console.error('Page generation failed:', error);
    logger.logError('Page generation', error);
    logger.logSessionEnd({ success: false, error: error.message });
    await logger.saveToFile();
    
    progress('error', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  generateFullComic,
  generateSinglePage,
};
