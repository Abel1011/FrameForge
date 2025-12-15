import { AzureOpenAI } from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

// Character schema - IMPORTANT: Each character must be a SINGLE individual person
const CharacterSchema = z.object({
  name: z.string().describe('Character name (single individual only, NOT a group). Example: "John Doe", "Princess Luna", "Detective Smith"'),
  description: z.string().describe('Detailed visual description of this SINGLE individual for AI portrait generation: physical appearance (face, hair, skin, body type), clothing, distinctive features. Describe ONE person only, never groups or multiple people.')
});

// Location schema
const LocationSchema = z.object({
  name: z.string().describe('Location name'),
  description: z.string().describe('Detailed visual description for AI image generation: environment details, atmosphere, key visual elements')
});

// Define the schema for structured output that matches our available options exactly
const ProjectSettingsSchema = z.object({
  artStyle: z.enum([
    'manga', 
    'comic-american', 
    'comic-european', 
    'graphic-novel', 
    'watercolor', 
    'digital-art', 
    'vintage', 
    'minimalist'
  ]).describe('The art style that best fits the story'),
  
  styleMedium: z.enum([
    'digital-art', 
    'oil-painting', 
    'watercolor', 
    'pencil-sketch', 
    'ink-drawing', 
    '3d-render', 
    'photograph', 
    'cel-shading'
  ]).describe('The artistic medium to render the images'),
  
  mood: z.enum([
    'bright', 
    'dark', 
    'pastel', 
    'vibrant', 
    'noir', 
    'warm', 
    'cold', 
    'nature'
  ]).describe('The overall mood and atmosphere of the story'),
  
  lighting: z.enum([
    'natural', 
    'golden-hour', 
    'dramatic', 
    'neon', 
    'studio', 
    'moonlight', 
    'overcast', 
    'backlit'
  ]).describe('The default lighting style for scenes'),
  
  characters: z.array(CharacterSchema).min(1).max(4).describe('Main characters mentioned or implied in the story (extract 1-4 characters maximum)'),
  
  locations: z.array(LocationSchema).min(1).max(3).describe('Key locations/settings mentioned or implied in the story (extract 1-3 locations maximum)'),
  
  storyContext: z.object({
    title: z.string().describe('A suggested title for the story (creative and fitting)'),
    genre: z.string().describe('The genre(s) of the story (e.g., "Sci-Fi Action", "Romantic Comedy")'),
    synopsis: z.string().describe('A brief synopsis of the story in 2-3 sentences'),
    themes: z.array(z.string()).describe('Key themes explored in the story (2-4 themes)')
  }).describe('Narrative context and story information'),
  
  reasoning: z.string().describe('Brief explanation of why these visual choices fit the story (2-3 sentences)')
});

export async function POST(request) {
  try {
    const { storyIdea } = await request.json();

    if (!storyIdea) {
      return Response.json({ error: 'Story idea is required' }, { status: 400 });
    }

    // Azure OpenAI configuration
    const client = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-04-01-preview',
    });

    const deploymentName = "gpt-5.1";

    const systemPrompt = `You are an expert visual storytelling consultant. Based on the user's story description, recommend the best visual settings for their comic/manga/graphic novel project.

Consider:
- The genre and tone of the story
- The target audience
- Visual traditions for similar stories
- How colors, lighting, and style can enhance the narrative

For characters: Extract up to 4 main characters mentioned or implied. IMPORTANT: Each character MUST be a SINGLE individual person - never create entries for groups, crowds, or multiple people (e.g., "The Guards", "Citizens", "The Team"). Provide detailed visual descriptions that would help an AI generate consistent portrait images of ONE person (physical features: face, hair color/style, eye color, skin tone, body type, clothing, distinctive traits). Focus on the most important individual characters only. All descriptions must be in English.

For locations: Extract up to 3 key settings/environments. Describe them visually with enough detail for AI image generation (architecture, atmosphere, lighting, key elements). Focus on the most important locations only.

Choose the options that will create the most compelling and cohesive visual experience for this specific story.`;

    const response = await client.chat.completions.parse({
      model: deploymentName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Story idea: ${storyIdea}` }
      ],
      response_format: zodResponseFormat(ProjectSettingsSchema, 'project_settings'),
    });

    const settings = response.choices[0].message.parsed;

    return Response.json({ 
      success: true,
      settings 
    });

  } catch (error) {
    return Response.json({ 
      error: error.message || 'Failed to generate settings' 
    }, { status: 500 });
  }
}
