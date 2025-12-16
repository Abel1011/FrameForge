/**
 * API Route: Generate Full Comic (Background Job)
 * 
 * Creates a background job for comic generation and returns immediately.
 * Frontend polls /api/jobs?id=<jobId> for progress and results.
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { generateFullComic } from '../../lib/agents/orchestrator';
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
    
    // Log request for debugging
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFilename = `generate-comic-${timestamp}.txt`;
    const logPath = join(process.cwd(), 'logs', logFilename);
    
    await mkdir(join(process.cwd(), 'logs'), { recursive: true });
    await writeFile(logPath, JSON.stringify(body, null, 2), 'utf-8');
    console.log(`📝 Request logged to: logs/${logFilename}`);

    // Calculate default aspect ratio based on project dimensions
    const aspectRatio = body.width && body.height 
      ? `${Math.round(body.width / Math.gcd(body.width, body.height))}:${Math.round(body.height / Math.gcd(body.width, body.height))}`
      : '3:4';

    // Create a job for background processing
    const job = await createJob('comic', {
      storyDescription: body.storyDescription,
      pageCount: body.pageCount,
      projectSettings: body.projectSettings,
      projectType: body.projectType,
      projectId: body.projectId,
      keepLayouts: body.keepLayouts,
      aspectRatio,
    });

    // Return job ID immediately - processing happens in background
    const response = Response.json({
      success: true,
      jobId: job.id,
      message: 'Comic generation started in background',
    });

    // Start background processing (don't await - runs after response)
    processComicGeneration(job.id, body, aspectRatio, timestamp);

    return response;

  } catch (error) {
    console.error('❌ Generate Comic Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to start comic generation' 
    }, { status: 500 });
  }
}

/**
 * Process comic generation in background
 * Updates job progress as it goes, allowing frontend to poll for updates
 */
async function processComicGeneration(jobId, body, aspectRatio, timestamp) {
  console.log(`🚀 Starting background comic generation for job: ${jobId}`);
  
  try {
    const result = await generateFullComic({
      storyDescription: body.storyDescription,
      pageCount: body.pageCount,
      projectSettings: body.projectSettings,
      projectType: body.projectType,
      aspectRatio,
      onProgress: async (progress) => {
        console.log(`[${progress.stage}] ${progress.message}`);
        
        // Update job progress for polling
        await updateJobProgress(jobId, {
          stage: progress.stage,
          message: progress.message,
          currentPage: progress.currentPage || 0,
          totalPages: progress.totalPages || body.pageCount,
          currentPanel: progress.currentPanel || 0,
          totalPanels: progress.totalPanels || 0,
        });
      },
      onPageComplete: async (pageData) => {
        // Add completed page for incremental updates
        await addGeneratedItem(jobId, pageData);
        console.log(`📄 Page ${pageData.pageNumber} added to job ${jobId}`);
      },
    });

    // Save result to file for debugging
    const resultFilename = `generate-comic-result-${timestamp}.txt`;
    await writeFile(
      join(process.cwd(), 'logs', resultFilename),
      JSON.stringify(result, null, 2),
      'utf-8'
    );
    console.log(`📝 Result saved to: logs/${resultFilename}`);

    if (result.success) {
      await completeJob(jobId, {
        title: result.title,
        summary: result.summary,
        pages: result.pages,
        comicPlan: result.comicPlan,
      });
    } else {
      await failJob(jobId, result.error || 'Generation failed');
    }

  } catch (error) {
    console.error(`❌ Background generation failed for job ${jobId}:`, error);
    await failJob(jobId, error.message || 'Unexpected error during generation');
  }
}

// Helper for GCD calculation
Math.gcd = Math.gcd || function(a, b) {
  return b ? Math.gcd(b, a % b) : Math.abs(a);
};
