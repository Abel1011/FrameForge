'use client';

import { useState, useCallback } from 'react';

/**
 * Hook for generating images using FIBO API
 * 
 * @returns {Object} - Generation functions and state
 * 
 * @example
 * const { generatePanel, isGenerating, error } = useFiboGeneration();
 * 
 * const handleGenerate = async () => {
 *   const result = await generatePanel({
 *     description: "Hero standing on rooftop",
 *     settings: project.settings,
 *     characters: [hero],
 *   });
 *   if (result) {
 *     // Use result.imageUrl
 *   }
 * };
 */
export function useFiboGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  /**
   * Generate a panel image using project settings
   */
  const generatePanel = useCallback(async ({
    description,
    settings,
    characters = [],
    location,
    aspectRatio = '1:1',
    seed,
  }) => {
    setIsGenerating(true);
    setError(null);
    setProgress('Starting generation...');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-panel',
          description,
          settings,
          characters,
          location,
          aspectRatio,
          seed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setProgress(null);
      return {
        imageUrl: data.imageUrl,
        seed: data.seed,
        structuredPrompt: data.structuredPrompt,
      };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, []);

  /**
   * Generate image with direct prompt
   */
  const generateFromPrompt = useCallback(async ({
    prompt,
    aspectRatio = '1:1',
    seed,
    numResults = 1,
  }) => {
    setIsGenerating(true);
    setError(null);
    setProgress('Generating...');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          prompt,
          aspect_ratio: aspectRatio,
          seed,
          num_results: numResults,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setProgress(null);
      return {
        images: data.images,
        seed: data.seed,
      };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, []);

  /**
   * Generate image with structured prompt for more control
   */
  const generateFromStructuredPrompt = useCallback(async ({
    structuredPrompt,
    aspectRatio = '1:1',
    seed,
    numResults = 1,
  }) => {
    setIsGenerating(true);
    setError(null);
    setProgress('Generating...');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          structured_prompt: structuredPrompt,
          aspect_ratio: aspectRatio,
          seed,
          num_results: numResults,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setProgress(null);
      return {
        images: data.images,
        seed: data.seed,
      };
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, []);

  /**
   * Build a structured prompt without generating (for preview/editing)
   */
  const buildPrompt = useCallback(async ({
    description,
    settings,
    characters = [],
    location,
  }) => {
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'build-prompt',
          description,
          settings,
          characters,
          location,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to build prompt');
      }

      return data.structuredPrompt;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  /**
   * Clear any error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Generation functions
    generatePanel,
    generateFromPrompt,
    generateFromStructuredPrompt,
    buildPrompt,
    
    // State
    isGenerating,
    error,
    progress,
    
    // Utilities
    clearError,
  };
}

export default useFiboGeneration;
