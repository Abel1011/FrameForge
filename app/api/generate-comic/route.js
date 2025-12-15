/**
 * API Route: Generate Full Comic
 * Creates multiple pages with AI-generated content based on a story description
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { generateFullComic } from '../../lib/agents/orchestrator';

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

    // Run the agent pipeline
    console.log('🚀 Starting comic generation with agents...');
    
    const result = await generateFullComic({
      storyDescription: body.storyDescription,
      pageCount: body.pageCount,
      projectSettings: body.projectSettings,
      projectType: body.projectType,
      aspectRatio,
      onProgress: (progress) => {
        console.log(`[${progress.stage}] ${progress.message}`);
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
      return Response.json({
        success: true,
        title: result.title,
        summary: result.summary,
        pages: result.pages,
      });
    } else {
      return Response.json({
        success: false,
        error: result.error,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Generate Comic Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate comic' 
    }, { status: 500 });
  }
}

// Helper for GCD calculation
Math.gcd = Math.gcd || function(a, b) {
  return b ? Math.gcd(b, a % b) : Math.abs(a);
};
