/**
 * Job Store - In-Memory with Redis-ready interface
 * 
 * Stores job progress and results for background processing.
 * Currently uses in-memory Map, but interface is ready for Redis.
 * 
 * Job lifecycle:
 * 1. pending → Job created, waiting to start
 * 2. planning → Comic/Page structure being planned
 * 3. generating → Images being generated
 * 4. complete → All done, results available
 * 5. error → Something went wrong
 */

// Use globalThis to persist store across Next.js hot reloads in development
// In production, this is still just in-memory for this single server instance
const globalStore = globalThis;
if (!globalStore.__jobStore) {
  globalStore.__jobStore = new Map();
  console.log('📦 Job store initialized');
}
const memoryStore = globalStore.__jobStore;

// Job TTL in milliseconds (1 hour)
const JOB_TTL = 60 * 60 * 1000;

// Cleanup old jobs periodically
setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of memoryStore.entries()) {
    if (now - job.createdAt > JOB_TTL) {
      memoryStore.delete(jobId);
      console.log(`🧹 Cleaned up expired job: ${jobId}`);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

/**
 * @typedef {Object} JobProgress
 * @property {string} stage - Current stage: pending, planning, generating, processing, complete, error
 * @property {string} message - Human-readable status message
 * @property {number} currentPage - Current page being processed
 * @property {number} totalPages - Total pages to process
 * @property {number} currentPanel - Current panel being processed
 * @property {number} totalPanels - Total panels in current page
 * @property {number} percent - Overall progress percentage (0-100)
 */

/**
 * @typedef {Object} Job
 * @property {string} id - Unique job identifier
 * @property {string} type - Job type: 'comic' | 'page' | 'image'
 * @property {string} status - Current status
 * @property {JobProgress} progress - Detailed progress info
 * @property {Object} input - Original input parameters
 * @property {Object|null} result - Final result when complete
 * @property {string|null} error - Error message if failed
 * @property {number} createdAt - Timestamp when job was created
 * @property {number} updatedAt - Timestamp of last update
 * @property {Array} generatedItems - Items generated so far (for incremental updates)
 */

/**
 * Generate a unique job ID
 * @returns {string}
 */
function generateJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new job
 * @param {string} type - Job type
 * @param {Object} input - Input parameters
 * @returns {Promise<Job>}
 */
export async function createJob(type, input) {
  const jobId = generateJobId();
  const now = Date.now();
  
  const job = {
    id: jobId,
    type,
    status: 'pending',
    progress: {
      stage: 'pending',
      message: 'Job created, waiting to start...',
      currentPage: 0,
      totalPages: input.pageCount || 1,
      currentPanel: 0,
      totalPanels: 0,
      percent: 0,
    },
    input,
    result: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    generatedItems: [], // Stores pages/panels as they're generated
  };
  
  memoryStore.set(jobId, job);
  console.log(`📋 Job created: ${jobId} (type: ${type})`);
  
  return job;
}

/**
 * Get a job by ID
 * @param {string} jobId
 * @returns {Promise<Job|null>}
 */
export async function getJob(jobId) {
  return memoryStore.get(jobId) || null;
}

/**
 * Update job progress
 * @param {string} jobId
 * @param {Partial<JobProgress>} progress
 * @returns {Promise<Job|null>}
 */
export async function updateJobProgress(jobId, progress) {
  const job = memoryStore.get(jobId);
  if (!job) return null;
  
  // Calculate percent based on progress
  let percent = 0;
  if (progress.totalPages > 0) {
    const pageProgress = ((progress.currentPage || 0) - 1) / progress.totalPages;
    const panelProgress = progress.totalPanels > 0 
      ? (progress.currentPanel || 0) / progress.totalPanels / progress.totalPages
      : 0;
    percent = Math.min(Math.round((pageProgress + panelProgress) * 100), 99);
  }
  
  job.progress = {
    ...job.progress,
    ...progress,
    percent,
  };
  job.status = progress.stage || job.status;
  job.updatedAt = Date.now();
  
  memoryStore.set(jobId, job);
  return job;
}

/**
 * Add a generated item (page/panel) to the job
 * Allows frontend to get partial results as they're generated
 * @param {string} jobId
 * @param {Object} item - Generated item (page with panels)
 * @returns {Promise<Job|null>}
 */
export async function addGeneratedItem(jobId, item) {
  const job = memoryStore.get(jobId);
  if (!job) return null;
  
  job.generatedItems.push(item);
  job.updatedAt = Date.now();
  
  memoryStore.set(jobId, job);
  console.log(`📦 Added item to job ${jobId}: page ${item.pageNumber}`);
  return job;
}

/**
 * Complete a job with final result
 * @param {string} jobId
 * @param {Object} result
 * @returns {Promise<Job|null>}
 */
export async function completeJob(jobId, result) {
  const job = memoryStore.get(jobId);
  if (!job) return null;
  
  job.status = 'complete';
  job.progress = {
    ...job.progress,
    stage: 'complete',
    message: 'Generation complete!',
    percent: 100,
  };
  job.result = result;
  job.updatedAt = Date.now();
  
  memoryStore.set(jobId, job);
  console.log(`✅ Job completed: ${jobId}`);
  return job;
}

/**
 * Mark a job as failed
 * @param {string} jobId
 * @param {string} errorMessage
 * @returns {Promise<Job|null>}
 */
export async function failJob(jobId, errorMessage) {
  const job = memoryStore.get(jobId);
  if (!job) return null;
  
  job.status = 'error';
  job.progress = {
    ...job.progress,
    stage: 'error',
    message: errorMessage,
  };
  job.error = errorMessage;
  job.updatedAt = Date.now();
  
  memoryStore.set(jobId, job);
  console.log(`❌ Job failed: ${jobId} - ${errorMessage}`);
  return job;
}

/**
 * Delete a job
 * @param {string} jobId
 * @returns {Promise<boolean>}
 */
export async function deleteJob(jobId) {
  const deleted = memoryStore.delete(jobId);
  if (deleted) {
    console.log(`🗑️ Job deleted: ${jobId}`);
  }
  return deleted;
}

/**
 * Get all jobs (for debugging)
 * @returns {Promise<Job[]>}
 */
export async function getAllJobs() {
  return Array.from(memoryStore.values());
}

// ============================================================================
// Redis Integration (Future)
// ============================================================================
// To switch to Redis, implement these same functions using Redis client:
//
// import { createClient } from 'redis';
// const redis = createClient({ url: process.env.REDIS_URL });
//
// export async function createJob(type, input) {
//   const jobId = generateJobId();
//   const job = { ... };
//   await redis.setEx(`job:${jobId}`, JOB_TTL / 1000, JSON.stringify(job));
//   return job;
// }
//
// export async function getJob(jobId) {
//   const data = await redis.get(`job:${jobId}`);
//   return data ? JSON.parse(data) : null;
// }
// ============================================================================

export default {
  createJob,
  getJob,
  updateJobProgress,
  addGeneratedItem,
  completeJob,
  failJob,
  deleteJob,
  getAllJobs,
};
