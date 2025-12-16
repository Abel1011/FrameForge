'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for polling job status from the backend
 * 
 * @param {Object} options
 * @param {number} options.pollInterval - Interval between polls in ms (default: 2000)
 * @param {boolean} options.stopOnComplete - Stop polling when job completes (default: true)
 * @returns {Object} Job state and control functions
 */
export function useJobPolling({ pollInterval = 2000, stopOnComplete = true } = {}) {
  const [jobId, setJobId] = useState(null);
  const [job, setJob] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Fetch job status
  const fetchJobStatus = useCallback(async (id) => {
    if (!id) return null;

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();
      
      const response = await fetch(`/api/jobs?id=${id}`, {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch job status');
      }
      
      const jobData = await response.json();
      return jobData;
    } catch (err) {
      if (err.name === 'AbortError') {
        return null; // Ignore abort errors
      }
      throw err;
    }
  }, []);

  // Start polling for a job
  const startPolling = useCallback((id) => {
    if (!id) return;
    
    setJobId(id);
    setJob(null);
    setError(null);
    setIsPolling(true);
    
    // Fetch immediately
    fetchJobStatus(id)
      .then(setJob)
      .catch((err) => setError(err.message));
  }, [fetchJobStatus]);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    stopPolling();
    setJobId(null);
    setJob(null);
    setError(null);
  }, [stopPolling]);

  // Set up polling interval
  useEffect(() => {
    if (!isPolling || !jobId) return;

    intervalRef.current = setInterval(async () => {
      try {
        const jobData = await fetchJobStatus(jobId);
        if (jobData) {
          setJob(jobData);
          
          // Stop polling if job is complete or errored
          if (stopOnComplete && (jobData.status === 'complete' || jobData.status === 'error')) {
            stopPolling();
          }
        }
      } catch (err) {
        setError(err.message);
        // Don't stop polling on transient errors
      }
    }, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPolling, jobId, pollInterval, stopOnComplete, fetchJobStatus, stopPolling]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    jobId,
    job,
    isPolling,
    error,
    startPolling,
    stopPolling,
    reset,
    // Convenience accessors
    isComplete: job?.status === 'complete',
    isError: job?.status === 'error',
    isPending: job?.status === 'pending',
    isGenerating: job?.status === 'generating' || job?.status === 'planning',
    progress: job?.progress || null,
    result: job?.result || null,
    generatedItems: job?.generatedItems || [],
  };
}

export default useJobPolling;
