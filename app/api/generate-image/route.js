import { generateImage, generatePanelImage, buildStructuredPrompt } from '../../lib/fibo';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'generate': {
        // Direct generation with prompt or structured_prompt
        const { prompt, structured_prompt, aspect_ratio, seed, num_results } = params;
        
        const result = await generateImage({
          prompt,
          structured_prompt,
          aspect_ratio,
          seed,
          num_results,
          model_version: 'FIBO'
        });

        return Response.json({ success: true, ...result });
      }

      case 'generate-panel': {
        // Generate using project settings
        const { description, settings, characters, location, aspectRatio, seed } = params;
        
        const result = await generatePanelImage({
          description,
          settings,
          characters,
          location,
          aspectRatio,
          seed,
        });

        return Response.json({ success: true, ...result });
      }

      case 'build-prompt': {
        // Just build a structured prompt without generating
        const { description, settings, characters, location } = params;
        
        const structuredPrompt = buildStructuredPrompt({
          description,
          settings,
          characters,
          location,
        });

        return Response.json({ success: true, structuredPrompt });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ 
      error: error.message || 'Failed to generate image' 
    }, { status: 500 });
  }
}
