/**
 * API Route: Get Job Status
 * 
 * Polling endpoint for frontend to check job progress.
 * Returns current progress, any generated items, and final result when complete.
 */

import { getJob } from '../../lib/jobStore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');
    
    if (!jobId) {
      return Response.json({ 
        error: 'Missing job ID' 
      }, { status: 400 });
    }
    
    const job = await getJob(jobId);
    
    if (!job) {
      return Response.json({ 
        error: 'Job not found',
        jobId 
      }, { status: 404 });
    }
    
    // Return job status with generated items for incremental updates
    return Response.json({
      id: job.id,
      type: job.type,
      status: job.status,
      progress: job.progress,
      generatedItems: job.generatedItems,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
    
  } catch (error) {
    console.error('❌ Get Job Status Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to get job status' 
    }, { status: 500 });
  }
}
