/**
 * Shared Schema Definitions for Agents
 * 
 * These Zod schemas define the output types for each agent.
 * Using a minimal schema to save tokens - only essential IDs/references.
 */

import { z } from 'zod';

// ============================================================================
// COMIC PLANNER OUTPUT SCHEMA
// ============================================================================

/**
 * A single page plan - just the description and panel count
 * The actual panels will be planned by the Page Planner Agent
 */
export const PagePlanSchema = z.object({
  pageNumber: z.number().describe('Page number (1-indexed)'),
  pageDescription: z.string().describe('Brief description of what happens on this page'),
  mood: z.string().describe('Emotional tone of this page (e.g., tense, peaceful, action)'),
  panelCount: z.number().min(1).max(9).describe('Suggested number of panels for this page'),
});

/**
 * Full comic plan output
 */
export const ComicPlanSchema = z.object({
  title: z.string().describe('Suggested title for the comic'),
  summary: z.string().describe('Brief summary of the overall story'),
  pages: z.array(PagePlanSchema).describe('Array of page plans'),
});

// ============================================================================
// PAGE PLANNER OUTPUT SCHEMA
// ============================================================================

/**
 * Character reference in a panel - includes ID for looking up full data
 */
export const CharacterRefSchema = z.object({
  id: z.string().describe('Character ID from project settings (use provided IDs)'),
  name: z.string().describe('Character name (must match a character from project settings)'),
  action: z.string().describe('What the character is doing in this panel'),
  expression: z.string().describe('Facial expression or emotional state'),
});

/**
 * Location reference in a panel - includes ID for looking up full data
 */
export const LocationRefSchema = z.object({
  id: z.string().describe('Location ID from project settings (use provided IDs, or "new" for custom locations)'),
  name: z.string().describe('Location name (should match a location from project settings, or describe new)'),
  timeOfDay: z.string().describe('Time of day (dawn, day, dusk, night, unspecified)'),
  weather: z.string().describe('Weather conditions (clear, cloudy, rainy, snowy, stormy, unspecified)'),
});

/**
 * A single panel plan with all info needed to generate the image
 */
export const PanelPlanSchema = z.object({
  panelNumber: z.number().describe('Panel number within the page (1-indexed)'),
  sceneDescription: z.string().describe('Detailed description of what to show in this panel'),
  characters: z.array(CharacterRefSchema).describe('Characters appearing in this panel'),
  location: LocationRefSchema.optional().describe('Location/background for this panel'),
  cameraAngle: z.string().describe('Camera angle (e.g., close-up, medium, wide, bird-eye, low-angle)'),
  shotType: z.string().describe('Type of shot (establishing, action, reaction, detail)'),
  dialogueHint: z.string().optional().describe('Brief hint of dialogue if any (for reference, not rendered)'),
});

/**
 * Full page plan output
 */
export const PagePanelsPlanSchema = z.object({
  pageNumber: z.number().describe('The page number this plan is for'),
  panels: z.array(PanelPlanSchema).describe('Array of panel plans for this page'),
});

// ============================================================================
// IMAGE GENERATOR OUTPUT SCHEMA
// ============================================================================

/**
 * Result from generating a single panel image
 */
export const GeneratedImageSchema = z.object({
  panelNumber: z.number().describe('Which panel this image is for'),
  imageUrl: z.string().describe('URL of the generated image'),
  seed: z.number().optional().describe('Seed used for generation (for reproducibility)'),
  success: z.boolean().describe('Whether generation succeeded'),
  error: z.string().optional().describe('Error message if generation failed'),
});

// ============================================================================
// TYPE EXPORTS (for JSDoc)
// ============================================================================

/**
 * @typedef {z.infer<typeof PagePlanSchema>} PagePlan
 * @typedef {z.infer<typeof ComicPlanSchema>} ComicPlan
 * @typedef {z.infer<typeof CharacterRefSchema>} CharacterRef
 * @typedef {z.infer<typeof LocationRefSchema>} LocationRef
 * @typedef {z.infer<typeof PanelPlanSchema>} PanelPlan
 * @typedef {z.infer<typeof PagePanelsPlanSchema>} PagePanelsPlan
 * @typedef {z.infer<typeof GeneratedImageSchema>} GeneratedImage
 */

export default {
  PagePlanSchema,
  ComicPlanSchema,
  CharacterRefSchema,
  LocationRefSchema,
  PanelPlanSchema,
  PagePanelsPlanSchema,
  GeneratedImageSchema,
};
