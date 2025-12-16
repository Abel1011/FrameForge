/**
 * API Route: Generate Page Content (Background Job)
 * 
 * Creates a background job for page generation and returns immediately.
 * Frontend polls /api/jobs?id=<jobId> for progress and results.
 */

import { generateSinglePage } from '../../lib/agents/orchestrator';
import { 
  createJob, 
  updateJobProgress, 
  addGeneratedItem, 
  completeJob, 
  failJob 
} from '../../lib/jobStore';

export async function POST(request) {
  try {
    const body = await request.json();
    
    console.log('🚀 Starting page generation with agents...');
    console.log(`📋 Description: ${body.pageDescription?.substring(0, 100)}...`);
    console.log(`📊 Panel count: ${body.panelCount || body.panels?.length || 4}`);

    // Calculate default aspect ratio based on panel dimensions
    const aspectRatio = body.panels?.[0]?.aspectRatio || '3:4';
    const panelCount = body.panelCount || body.panels?.length || 4;

    // Create a job for background processing
    const job = await createJob('page', {
      pageDescription: body.pageDescription,
      panelCount,
      mood: body.mood || 'neutral',
      projectSettings: body.projectSettings,
      projectType: body.projectType,
      projectId: body.projectId,
      currentPageId: body.currentPage?.id,
      keepLayout: body.keepLayout,
      aspectRatio,
    });

    // Return job ID immediately - processing happens in background
    const response = Response.json({
      success: true,
      jobId: job.id,
      message: 'Page generation started in background',
    });

    // Start background processing (don't await - runs after response)
    processPageGeneration(job.id, body, aspectRatio, panelCount);

    return response;

  } catch (error) {
    console.error('❌ Generate Page Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to start page generation' 
    }, { status: 500 });
  }
}

/**
 * Process page generation in background
 * Updates job progress as it goes, allowing frontend to poll for updates
 */
async function processPageGeneration(jobId, body, aspectRatio, panelCount) {
  console.log(`🚀 Starting background page generation for job: ${jobId}`);
  
  try {
    const result = await generateSinglePage({
      pageDescription: body.pageDescription,
      panelCount,
      mood: body.mood || 'neutral',
      projectSettings: body.projectSettings,
      projectType: body.projectType,
      aspectRatio,
      onProgress: async (progress) => {
        console.log(`[${progress.stage}] ${progress.message}`);
        
        // Update job progress for polling
        await updateJobProgress(jobId, {
          stage: progress.stage,
          message: progress.message,
          currentPage: 1,
          totalPages: 1,
          currentPanel: progress.currentPanel || 0,
          totalPanels: progress.totalPanels || panelCount,
        });
      },
      onPanelComplete: async (panelData) => {
        // Add completed panel for incremental updates
        await addGeneratedItem(jobId, panelData);
        console.log(`🖼️ Panel ${panelData.panelNumber} added to job ${jobId}`);
      },
    });

    if (result.success) {
      await completeJob(jobId, {
        panels: result.panels,
        panelsPlan: result.panelsPlan,
      });
      console.log('✅ Page generation complete!');
    } else {
      await failJob(jobId, result.error || 'Generation failed');
      console.error('❌ Generation failed:', result.error);
    }

  } catch (error) {
    console.error(`❌ Background page generation failed for job ${jobId}:`, error);
    await failJob(jobId, error.message || 'Unexpected error during generation');
  }
}
