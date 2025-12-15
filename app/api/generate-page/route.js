/**
 * API Route: Generate Page Content
 * Fills panels of a single page with AI-generated images based on a description
 */

import { generateSinglePage } from '../../lib/agents/orchestrator';

export async function POST(request) {
  try {
    const body = await request.json();
    
    console.log('🚀 Starting page generation with agents...');
    console.log(`📋 Description: ${body.pageDescription?.substring(0, 100)}...`);
    console.log(`📊 Panel count: ${body.panelCount || body.panels?.length || 4}`);

    // Calculate default aspect ratio based on panel dimensions
    const aspectRatio = body.panels?.[0]?.aspectRatio || '3:4';

    // Run the agent pipeline (logger handles detailed logging)
    const result = await generateSinglePage({
      pageDescription: body.pageDescription,
      panelCount: body.panelCount || body.panels?.length || 4,
      mood: body.mood || 'neutral',
      projectSettings: body.projectSettings,
      projectType: body.projectType,
      aspectRatio,
      onProgress: (progress) => {
        console.log(`[${progress.stage}] ${progress.message}`);
      },
    });

    if (result.success) {
      console.log('✅ Page generation complete!');
      return Response.json({
        success: true,
        panels: result.panels,
        panelsPlan: result.panelsPlan,
      });
    } else {
      console.error('❌ Generation failed:', result.error);
      return Response.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Generate Page Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate page' 
    }, { status: 500 });
  }
}
