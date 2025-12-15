'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { saveProject } from '../lib/storage';

const AUTO_SAVE_DELAY = 5000; // 5 seconds

/**
 * @typedef {'idle' | 'saving' | 'saved' | 'error'} SaveStatus
 */

/**
 * Hook for auto-saving project changes
 * @param {import('../types').Project | null} project
 * @returns {{saveStatus: SaveStatus, triggerSave: () => void}}
 */
export function useAutoSave(project) {
  const [saveStatus, setSaveStatus] = useState(/** @type {SaveStatus} */ ('idle'));
  const timeoutRef = useRef(/** @type {NodeJS.Timeout | null} */ (null));
  const projectRef = useRef(project);

  // Keep project ref updated
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const performSave = useCallback(async () => {
    if (!projectRef.current) return;

    setSaveStatus('saving');
    try {
      await saveProject(projectRef.current);
      setSaveStatus('saved');
      
      // Reset to idle after showing saved status
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('error');
    }
  }, []);

  const triggerSave = useCallback(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, AUTO_SAVE_DELAY);
  }, [performSave]);

  // Auto-save when project changes
  useEffect(() => {
    if (project) {
      triggerSave();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [project, triggerSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { saveStatus, triggerSave };
}
