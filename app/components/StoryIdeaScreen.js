'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, Settings, ArrowRight, Loader2, BookOpen, 
  Users, MapPin, Palette, Brush, Sun, Lightbulb, Check, X, RefreshCw, Wand2, Image
} from 'lucide-react';
import { ART_STYLES, MOOD_PRESETS, STYLE_MEDIUMS, LIGHTING_PRESETS, CHARACTER_COLORS } from '../types';
import { generateId } from '../lib/storage';

/**
 * Generate an image using FIBO API
 * @param {string} prompt - The prompt for image generation
 * @param {'1:1'|'16:9'|'9:16'|'4:3'|'3:4'} [aspectRatio='1:1'] - Aspect ratio
 * @returns {Promise<string>} - Generated image URL
 */
/**
 * Wait for an image URL to be available on CDN with retry logic
 */
async function waitForImageAvailable(imageUrl, maxRetries = 10, initialDelay = 2000) {
  let delay = initialDelay;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Use fetch with no-cors to check if image is accessible
      // We can't read the response due to CORS, but we can try to load it as an image
      const loadPromise = new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(true);
        img.onerror = () => reject(new Error('Image not ready'));
        // Add cache-busting query param to avoid cached 403
        img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
      });
      
      // Give it a timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      await Promise.race([loadPromise, timeoutPromise]);
      return true; // Image loaded successfully
    } catch (err) {
      console.log(`Image not ready yet (attempt ${attempt + 1}/${maxRetries}), waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 1.5, 5000); // Exponential backoff, max 5s
    }
  }
  
  // If all retries failed, return anyway - the image might load on subsequent renders
  console.warn('Image may not be immediately available:', imageUrl);
  return false;
}

/**
 * Generate an image using FIBO API
 * 
 * For FIRST image: pass only `prompt` (with full style context) → returns seed + structured_prompt
 * For SUBSEQUENT images: pass `prompt` (simple, no styles) + `structured_prompt` + `seed` → maintains consistency
 * 
 * @param {Object} options - Generation options
 * @param {string} [options.prompt] - Text prompt (with styles for first gen, without for subsequent)
 * @param {Object} [options.structured_prompt] - Structured prompt from first generation (for consistency)
 * @param {number} [options.seed] - Seed from first generation (for consistency)
 * @param {string} [options.aspectRatio] - Aspect ratio (default '1:1')
 * @returns {Promise<{imageUrl: string, seed: number, structured_prompt: Object}>}
 */
async function generateFiboImage({ prompt, structured_prompt, seed, aspectRatio = '1:1' }) {
  const body = {
    action: 'generate',
    aspect_ratio: aspectRatio,
    num_results: 1
  };
  
  // If we have structured_prompt + seed from a previous generation, use them for consistency
  // The prompt can still be passed to refine/modify the result
  if (structured_prompt) {
    body.structured_prompt = structured_prompt;
  }
  if (seed !== undefined) {
    body.seed = seed;
  }
  if (prompt) {
    body.prompt = prompt;
  }
  
  // Must have at least prompt or structured_prompt
  if (!body.prompt && !body.structured_prompt) {
    throw new Error('Must provide either prompt or structured_prompt');
  }

  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to generate image');
  }

  // API returns: { images: [{ urls: ["..."] }], seed, structured_prompt }
  const imageUrl = data.images?.[0]?.urls?.[0];
  if (!imageUrl) {
    throw new Error('No image URL in response');
  }
  
  // Wait for CloudFront CDN to have the image available
  // FIBO images go through CloudFront and may return 403 for a few seconds
  await waitForImageAvailable(imageUrl);
  
  return {
    imageUrl,
    seed: data.seed || data.images?.[0]?.seed,
    structured_prompt: data.structured_prompt
  };
}

/**
 * Build a character portrait prompt with full style context
 */
function buildCharacterPrompt(character, settings) {
  const artStyleObj = typeof settings.artStyle === 'object' ? settings.artStyle : ART_STYLES.find(s => s.id === settings.artStyle);
  const artStyleName = artStyleObj?.name || 'digital art';
  const artStylePrompt = artStyleObj?.customPrompt || '';
  const medium = STYLE_MEDIUMS.find(m => m.id === settings.styleMedium)?.name || 'digital art';
  const moodObj = MOOD_PRESETS.find(m => m.id === settings.mood);
  const moodName = moodObj?.name || '';
  const colors = settings.colorPalette?.slice(0, 3).join(', ') || '';
  
  // Build style emphasis based on art style
  let styleEmphasis = '';
  if (settings.artStyle === 'manga' || artStyleName?.toLowerCase().includes('manga')) {
    styleEmphasis = 'Japanese manga style, anime-inspired, stylized features, expressive anime eyes, clean linework, ';
  } else if (settings.artStyle === 'comic-american' || artStyleName?.toLowerCase().includes('american')) {
    styleEmphasis = 'American comic book style, bold lines, dynamic shading, heroic proportions, ';
  } else if (settings.artStyle === 'comic-european' || artStyleName?.toLowerCase().includes('european')) {
    styleEmphasis = 'European bande dessinée style, detailed linework, realistic proportions, ';
  } else if (settings.artStyle === 'watercolor') {
    styleEmphasis = 'Soft watercolor painting, flowing colors, gentle brushstrokes, ';
  }
  
  return `${styleEmphasis}Portrait of ${character.name}, ${character.description}. ${artStyleName} art style, ${medium} medium${moodName ? `, ${moodName} mood` : ''}${colors ? `, color palette: ${colors}` : ''}. Character portrait, centered composition, detailed face, expressive features, professional illustration.${artStylePrompt ? ` Style reference: ${artStylePrompt}` : ''}`;
}

/**
 * Build a simple character prompt WITHOUT styles (for regeneration with existing structured_prompt)
 * The structured_prompt already contains all style information
 */
function buildSimpleCharacterPrompt(character) {
  return `Portrait of ${character.name}, ${character.description}. Character portrait, centered composition, detailed face, expressive features.`;
}

/**
 * Build a location scene prompt with full style context
 */
function buildLocationPrompt(location, settings) {
  const artStyleObj = typeof settings.artStyle === 'object' ? settings.artStyle : ART_STYLES.find(s => s.id === settings.artStyle);
  const artStyleName = artStyleObj?.name || 'digital art';
  const artStylePrompt = artStyleObj?.customPrompt || '';
  const medium = STYLE_MEDIUMS.find(m => m.id === settings.styleMedium)?.name || 'digital art';
  const moodObj = MOOD_PRESETS.find(m => m.id === settings.mood);
  const moodName = moodObj?.name || '';
  const lightingObj = LIGHTING_PRESETS.find(l => l.id === settings.defaultLighting);
  const lightingName = lightingObj?.name || '';
  const colors = settings.colorPalette?.slice(0, 3).join(', ') || '';
  
  // Build style emphasis based on art style
  let styleEmphasis = '';
  if (settings.artStyle === 'manga' || artStyleName?.toLowerCase().includes('manga')) {
    styleEmphasis = 'Japanese manga background style, anime-inspired environment, clean detailed linework, ';
  } else if (settings.artStyle === 'comic-american' || artStyleName?.toLowerCase().includes('american')) {
    styleEmphasis = 'American comic book background style, bold colors, dynamic perspective, ';
  } else if (settings.artStyle === 'comic-european' || artStyleName?.toLowerCase().includes('european')) {
    styleEmphasis = 'European bande dessinée background style, detailed architecture, realistic environment, ';
  } else if (settings.artStyle === 'watercolor') {
    styleEmphasis = 'Soft watercolor landscape, flowing colors, atmospheric washes, ';
  }
  
  return `${styleEmphasis}${location.name}, ${location.description}. ${artStyleName} art style, ${medium} medium${moodName ? `, ${moodName} atmosphere` : ''}${lightingName ? `, ${lightingName} lighting` : ''}${colors ? `, color palette: ${colors}` : ''}. Establishing shot, detailed environment, scenic composition, professional illustration.${artStylePrompt ? ` Style reference: ${artStylePrompt}` : ''}`;
}

/**
 * Build a simple location prompt WITHOUT styles (for regeneration with existing structured_prompt)
 * The structured_prompt already contains all style information
 */
function buildSimpleLocationPrompt(location) {
  return `${location.name}, ${location.description}. Establishing shot, detailed environment, scenic composition.`;
}

/**
 * AI-powered story settings generator using Azure OpenAI API
 */
async function generateSettingsFromIdea(idea, projectType) {
  const response = await fetch('/api/generate-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyIdea: idea })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate settings');
  }
  
  const aiSettings = data.settings;
  
  // Map characters with IDs and colors
  const characters = (aiSettings.characters || []).map((char, index) => ({
    id: generateId(),
    name: char.name,
    description: char.description,
    color: CHARACTER_COLORS[index % CHARACTER_COLORS.length]
  }));
  
  // Map locations with IDs
  const locations = (aiSettings.locations || []).map(loc => ({
    id: generateId(),
    name: loc.name,
    description: loc.description
  }));
  
  // Get the full art style object
  const artStyle = ART_STYLES.find(s => s.id === aiSettings.artStyle) || ART_STYLES[0];
  
  // Get the color palette for the mood
  const colorPalette = MOOD_PRESETS.find(m => m.id === aiSettings.mood)?.colors || MOOD_PRESETS[0].colors;
  
  // Determine project context based on project type
  const contextMap = {
    'comic': 'comic-panel',
    'manga': 'manga-panel',
    'storyboard': 'storyboard',
    'graphic-novel': 'graphic-novel'
  };
  
  return {
    artStyle,
    styleMedium: aiSettings.styleMedium || 'digital-art',
    mood: aiSettings.mood || 'bright',
    colorPalette,
    defaultLighting: aiSettings.lighting || 'natural',
    characters,
    locations,
    storyContext: aiSettings.storyContext || null,
    projectContext: contextMap[projectType] || 'comic-panel'
  };
}

/**
 * Screen shown after project creation to choose setup path
 * @param {string} [initialMode] - Optional initial mode ('choose' | 'ai-input')
 * @param {() => void} [onSkip] - Skip setup and go directly to editor
 */
export default function StoryIdeaScreen({ project, onUseAI, onManualSetup, onSkip, initialMode = 'choose' }) {
  const [mode, setMode] = useState(initialMode); // 'choose' | 'ai-input' | 'ai-generating' | 'ai-preview'
  const [storyIdea, setStoryIdea] = useState('');
  const [generatedSettings, setGeneratedSettings] = useState(null);
  const [error, setError] = useState('');
  
  // Image generation states
  const [imageGenerationStatus, setImageGenerationStatus] = useState({});
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  /**
   * Generate images for all characters and locations
   * The FIRST character establishes the master style (seed + structured_prompt)
   * All subsequent characters and locations use the master style for consistency
   */
  const generateImagesForEntities = useCallback(async (settings) => {
    if (!settings) return;
    
    setIsGeneratingImages(true);
    const newStatus = {};
    
    // Initialize status for all entities
    settings.characters.forEach(char => {
      newStatus[`char-${char.id}`] = { status: 'pending', type: 'character' };
    });
    settings.locations.forEach(loc => {
      newStatus[`loc-${loc.id}`] = { status: 'pending', type: 'location' };
    });
    setImageGenerationStatus(newStatus);

    // Master style from the first character (will be set after first generation)
    let masterSeed = null;
    let masterStructuredPrompt = null;

    // Generate character images
    const updatedCharacters = [...settings.characters];
    for (let i = 0; i < updatedCharacters.length; i++) {
      const char = updatedCharacters[i];
      const statusKey = `char-${char.id}`;
      
      try {
        setImageGenerationStatus(prev => ({
          ...prev,
          [statusKey]: { status: 'generating', type: 'character' }
        }));
        
        let result;
        
        if (i === 0) {
          // FIRST CHARACTER: Full prompt with all styles → establishes master style
          const prompt = buildCharacterPrompt(char, settings);
          result = await generateFiboImage({ prompt, aspectRatio: '1:1' });
          
          // Save as master style for all subsequent generations
          masterSeed = result.seed;
          masterStructuredPrompt = result.structured_prompt;
        } else {
          // SUBSEQUENT CHARACTERS: Simple prompt + master style (seed + structured_prompt)
          const simplePrompt = buildSimpleCharacterPrompt(char);
          result = await generateFiboImage({
            prompt: simplePrompt,
            structured_prompt: masterStructuredPrompt,
            seed: masterSeed,
            aspectRatio: '1:1'
          });
        }
        
        // Save image URL (all characters share the master style reference)
        updatedCharacters[i] = { 
          ...char, 
          referenceImage: result.imageUrl,
          fiboSeed: masterSeed,
          fiboStructuredPrompt: masterStructuredPrompt
        };
        
        setImageGenerationStatus(prev => ({
          ...prev,
          [statusKey]: { status: 'done', type: 'character' }
        }));
        
        // Update settings with new image
        setGeneratedSettings(prev => ({
          ...prev,
          characters: updatedCharacters.map((c, idx) => 
            idx <= i ? updatedCharacters[idx] : c
          )
        }));
      } catch (err) {
        console.error(`Failed to generate image for character ${char.name}:`, err);
        setImageGenerationStatus(prev => ({
          ...prev,
          [statusKey]: { status: 'error', type: 'character', error: err.message }
        }));
      }
    }

    // Generate location images using master style from first character
    const updatedLocations = [...settings.locations];
    for (let i = 0; i < updatedLocations.length; i++) {
      const loc = updatedLocations[i];
      const statusKey = `loc-${loc.id}`;
      
      try {
        setImageGenerationStatus(prev => ({
          ...prev,
          [statusKey]: { status: 'generating', type: 'location' }
        }));
        
        let result;
        
        if (masterSeed !== null && masterStructuredPrompt !== null) {
          // Use master style from first character for consistency
          const simplePrompt = buildSimpleLocationPrompt(loc);
          result = await generateFiboImage({
            prompt: simplePrompt,
            structured_prompt: masterStructuredPrompt,
            seed: masterSeed,
            aspectRatio: '16:9'
          });
        } else {
          // Fallback: No master style available, use full prompt
          const prompt = buildLocationPrompt(loc, settings);
          result = await generateFiboImage({ prompt, aspectRatio: '16:9' });
        }
        
        // Save image URL (locations share the master style reference)
        updatedLocations[i] = { 
          ...loc, 
          referenceImage: result.imageUrl,
          fiboSeed: masterSeed,
          fiboStructuredPrompt: masterStructuredPrompt
        };
        
        setImageGenerationStatus(prev => ({
          ...prev,
          [statusKey]: { status: 'done', type: 'location' }
        }));
        
        // Update settings with new image
        setGeneratedSettings(prev => ({
          ...prev,
          locations: updatedLocations.map((l, idx) => 
            idx <= i ? updatedLocations[idx] : l
          )
        }));
      } catch (err) {
        console.error(`Failed to generate image for location ${loc.name}:`, err);
        setImageGenerationStatus(prev => ({
          ...prev,
          [statusKey]: { status: 'error', type: 'location', error: err.message }
        }));
      }
    }

    setIsGeneratingImages(false);
  }, []);

  const handleGenerateSettings = async () => {
    if (!storyIdea.trim()) {
      setError('Please describe your story idea');
      return;
    }
    
    setError('');
    setMode('ai-generating');
    setImageGenerationStatus({});
    
    try {
      const settings = await generateSettingsFromIdea(storyIdea, project.type);
      setGeneratedSettings(settings);
      setMode('ai-preview');
      
      // Start generating images in the background
      generateImagesForEntities(settings);
    } catch (err) {
      setError('Failed to generate settings. Please try again.');
      setMode('ai-input');
    }
  };

  const handleAcceptSettings = () => {
    onUseAI(generatedSettings);
  };

  const handleRegenerateSettings = async () => {
    setMode('ai-generating');
    setImageGenerationStatus({});
    try {
      const settings = await generateSettingsFromIdea(storyIdea, project.type);
      setGeneratedSettings(settings);
      setMode('ai-preview');
      
      // Start generating images in the background
      generateImagesForEntities(settings);
    } catch (err) {
      setError('Failed to regenerate settings. Please try again.');
      setMode('ai-preview');
    }
  };

  // Choose path screen
  if (mode === 'choose') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--paper-white)] flex items-center justify-center p-4">
        <div className="max-w-3xl w-full">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'var(--accent-primary-gradient)' }}>
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--ink-900)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              How would you like to set up your project?
            </h1>
            <p className="text-[var(--ink-500)]">
              Choose the path that works best for you
            </p>
          </div>

          {/* Options */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* AI Option */}
            <button
              onClick={() => setMode('ai-input')}
              className="group relative p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-2xl text-left hover:border-purple-400 hover:shadow-lg transition-all duration-200"
            >
              <div className="absolute top-3 right-3 px-2 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Recommended
              </div>
              
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform">
                <Wand2 className="w-7 h-7 text-white" />
              </div>
              
              <h2 className="text-xl font-bold text-[var(--ink-900)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                Describe Your Story
              </h2>
              <p className="text-[var(--ink-600)] text-sm mb-4">
                Tell us about your story idea and AI will suggest the perfect art style, mood, characters, and locations.
              </p>
              
              <div className="flex items-center gap-2 text-purple-600 font-medium text-sm">
                Get started <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Manual Option */}
            <button
              onClick={onManualSetup}
              className="group relative p-6 bg-[var(--ink-50)] border-2 border-[var(--ink-200)] rounded-2xl text-left hover:border-[var(--ink-400)] hover:shadow-lg transition-all duration-200"
            >
              <div className="w-14 h-14 rounded-xl bg-[var(--ink-200)] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Settings className="w-7 h-7 text-[var(--ink-600)]" />
              </div>
              
              <h2 className="text-xl font-bold text-[var(--ink-900)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                Configure Manually
              </h2>
              <p className="text-[var(--ink-600)] text-sm mb-4">
                Step through each setting yourself. Perfect if you already know exactly what style and mood you want.
              </p>
              
              <div className="flex items-center gap-2 text-[var(--ink-600)] font-medium text-sm">
                Open wizard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          {/* Skip option */}
          <div className="text-center mt-8">
            <button
              onClick={onSkip}
              className="text-sm text-[var(--ink-400)] hover:text-[var(--ink-600)] transition-colors"
            >
              Skip and start creating →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AI input screen
  if (mode === 'ai-input') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--paper-white)] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Back button */}
          <button
            onClick={() => setMode('choose')}
            className="flex items-center gap-2 text-[var(--ink-500)] hover:text-[var(--ink-700)] mb-6 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--ink-900)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Describe Your Story Idea
            </h1>
            <p className="text-[var(--ink-500)]">
              The more detail you provide, the better suggestions you'll get
            </p>
          </div>

          {/* Input */}
          <div className="space-y-4">
            <textarea
              value={storyIdea}
              onChange={(e) => setStoryIdea(e.target.value)}
              placeholder="Example: A cyberpunk detective story set in a neon-lit city. The main character is a retired cop who gets pulled back into investigating a series of android murders. Dark, moody atmosphere with rain-soaked streets and holographic advertisements..."
              className="w-full h-48 p-4 bg-[var(--ink-50)] border-2 border-[var(--ink-200)] rounded-xl text-[var(--ink-900)] placeholder:text-[var(--ink-400)] focus:outline-none focus:border-purple-400 resize-none"
            />
            
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            {/* Tips */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm font-medium text-purple-700 mb-2">💡 Tips for better results:</p>
              <ul className="text-sm text-purple-600 space-y-1">
                <li>• Describe the genre and tone (action, romance, horror, comedy)</li>
                <li>• Mention key characters and their traits</li>
                <li>• Include setting details (time period, location type)</li>
                <li>• Describe the visual style you imagine (colorful, dark, realistic)</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => setMode('choose')}
              className="flex-1 px-6 py-3 text-[var(--ink-600)] hover:bg-[var(--ink-100)] rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateSettings}
              disabled={!storyIdea.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Generate Settings
            </button>
          </div>

          {/* Switch to manual */}
          <div className="text-center mt-6 pt-6 border-t border-[var(--ink-100)]">
            <p className="text-sm text-[var(--ink-400)]">
              Prefer to configure everything yourself?{' '}
              <button
                onClick={() => onManualSetup(null)}
                className="text-[var(--accent-primary)] hover:underline font-medium"
              >
                Go to manual setup
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Generating screen
  if (mode === 'ai-generating') {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--paper-white)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg bg-gradient-to-br from-purple-500 to-indigo-600 animate-pulse">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--ink-900)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Creating Your Settings...
          </h2>
          <p className="text-[var(--ink-500)] mb-6">
            AI is analyzing your story idea
          </p>
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Preview screen
  if (mode === 'ai-preview' && generatedSettings) {
    const artStyleObj = typeof generatedSettings.artStyle === 'object' 
      ? generatedSettings.artStyle 
      : ART_STYLES.find(s => s.id === generatedSettings.artStyle);
    const moodObj = MOOD_PRESETS.find(m => m.id === generatedSettings.mood);
    const lightingObj = LIGHTING_PRESETS.find(l => l.id === generatedSettings.defaultLighting);
    const mediumObj = STYLE_MEDIUMS.find(m => m.id === generatedSettings.styleMedium);

    return (
      <div className="fixed inset-0 z-50 bg-[var(--paper-white)] overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md bg-gradient-to-br from-green-500 to-emerald-600">
              <Check className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--ink-900)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Here's What We Suggest
            </h1>
            <p className="text-[var(--ink-500)]">
              Based on your story idea, we've generated these settings
            </p>
          </div>

          {/* Story Idea Summary */}
          <div className="bg-[var(--ink-50)] rounded-xl p-4 mb-6">
            <p className="text-sm text-[var(--ink-500)] mb-1">Your story idea:</p>
            <p className="text-[var(--ink-700)] italic">"{storyIdea}"</p>
          </div>

          {/* Story Context - Generated by AI */}
          {generatedSettings.storyContext && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-amber-700 font-medium mb-3">
                <BookOpen className="w-4 h-4" />
                Story Context
              </div>
              <div className="space-y-3">
                {generatedSettings.storyContext.title && (
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Title</p>
                    <p className="text-amber-900 font-medium">{generatedSettings.storyContext.title}</p>
                  </div>
                )}
                {generatedSettings.storyContext.genre && (
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Genre</p>
                    <p className="text-amber-900">{generatedSettings.storyContext.genre}</p>
                  </div>
                )}
                {generatedSettings.storyContext.synopsis && (
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Synopsis</p>
                    <p className="text-amber-800 text-sm">{generatedSettings.storyContext.synopsis}</p>
                  </div>
                )}
                {generatedSettings.storyContext.themes?.length > 0 && (
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Themes</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {generatedSettings.storyContext.themes.map((theme, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generated Settings */}
          <div className="space-y-4 mb-8">
            {/* Art Style & Medium */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white border border-[var(--ink-200)] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--ink-500)] text-sm mb-2">
                  <Palette className="w-4 h-4" />
                  Art Style
                </div>
                <p className="font-medium text-[var(--ink-900)]">{artStyleObj?.name || 'Not set'}</p>
                {artStyleObj?.customPrompt && (
                  <p className="text-xs text-[var(--ink-400)] mt-1 line-clamp-2">{artStyleObj.customPrompt}</p>
                )}
              </div>
              
              <div className="bg-white border border-[var(--ink-200)] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--ink-500)] text-sm mb-2">
                  <Brush className="w-4 h-4" />
                  Medium
                </div>
                <p className="font-medium text-[var(--ink-900)]">{mediumObj?.name || 'Digital Art'}</p>
              </div>
            </div>

            {/* Mood & Lighting */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white border border-[var(--ink-200)] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--ink-500)] text-sm mb-2">
                  <Sun className="w-4 h-4" />
                  Mood
                </div>
                <p className="font-medium text-[var(--ink-900)] mb-2">{moodObj?.name || generatedSettings.mood}</p>
                {generatedSettings.colorPalette && (
                  <div className="flex gap-1">
                    {generatedSettings.colorPalette.map((color, i) => (
                      <div 
                        key={i} 
                        className="w-6 h-6 rounded-md shadow-sm" 
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="bg-white border border-[var(--ink-200)] rounded-xl p-4">
                <div className="flex items-center gap-2 text-[var(--ink-500)] text-sm mb-2">
                  <Lightbulb className="w-4 h-4" />
                  Lighting
                </div>
                <p className="font-medium text-[var(--ink-900)]">{lightingObj?.name || generatedSettings.defaultLighting}</p>
              </div>
            </div>

            {/* Characters */}
            {generatedSettings.characters.length > 0 && (
              <div className="bg-white border border-[var(--ink-200)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[var(--ink-500)] text-sm">
                    <Users className="w-4 h-4" />
                    Suggested Characters ({generatedSettings.characters.length})
                  </div>
                  {isGeneratingImages && (
                    <div className="flex items-center gap-1.5 text-xs text-purple-600">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating portraits...
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {generatedSettings.characters.map((char) => {
                    const status = imageGenerationStatus[`char-${char.id}`];
                    return (
                      <div key={char.id} className="bg-[var(--ink-50)] rounded-xl overflow-hidden">
                        {/* Character Image */}
                        <div className="aspect-square relative bg-gradient-to-br from-[var(--ink-100)] to-[var(--ink-200)] flex items-center justify-center">
                          {char.referenceImage ? (
                            <img 
                              src={char.referenceImage} 
                              alt={char.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : status?.status === 'generating' ? (
                            <div className="flex flex-col items-center gap-2 text-purple-500">
                              <Loader2 className="w-8 h-8 animate-spin" />
                              <span className="text-xs">Generating...</span>
                            </div>
                          ) : status?.status === 'error' ? (
                            <div className="flex flex-col items-center gap-2 text-red-400">
                              <X className="w-8 h-8" />
                              <span className="text-xs">Failed</span>
                            </div>
                          ) : status?.status === 'pending' ? (
                            <div className="flex flex-col items-center gap-2 text-[var(--ink-300)]">
                              <Image className="w-8 h-8" />
                              <span className="text-xs">Waiting...</span>
                            </div>
                          ) : (
                            <div 
                              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                              style={{ backgroundColor: char.color }}
                            >
                              {char.name[0]}
                            </div>
                          )}
                        </div>
                        {/* Character Info */}
                        <div className="p-3">
                          <p className="font-medium text-[var(--ink-900)] text-sm truncate">{char.name}</p>
                          <p className="text-xs text-[var(--ink-500)] line-clamp-2 mt-1">{char.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Locations */}
            {generatedSettings.locations.length > 0 && (
              <div className="bg-white border border-[var(--ink-200)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[var(--ink-500)] text-sm">
                    <MapPin className="w-4 h-4" />
                    Suggested Locations ({generatedSettings.locations.length})
                  </div>
                  {isGeneratingImages && (
                    <div className="flex items-center gap-1.5 text-xs text-purple-600">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating scenes...
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {generatedSettings.locations.map((loc) => {
                    const status = imageGenerationStatus[`loc-${loc.id}`];
                    return (
                      <div key={loc.id} className="bg-[var(--ink-50)] rounded-xl overflow-hidden">
                        {/* Location Image */}
                        <div className="aspect-video relative bg-gradient-to-br from-[var(--ink-100)] to-[var(--ink-200)] flex items-center justify-center">
                          {loc.referenceImage ? (
                            <img 
                              src={loc.referenceImage} 
                              alt={loc.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : status?.status === 'generating' ? (
                            <div className="flex flex-col items-center gap-2 text-purple-500">
                              <Loader2 className="w-8 h-8 animate-spin" />
                              <span className="text-xs">Generating...</span>
                            </div>
                          ) : status?.status === 'error' ? (
                            <div className="flex flex-col items-center gap-2 text-red-400">
                              <X className="w-8 h-8" />
                              <span className="text-xs">Failed</span>
                            </div>
                          ) : status?.status === 'pending' ? (
                            <div className="flex flex-col items-center gap-2 text-[var(--ink-300)]">
                              <Image className="w-8 h-8" />
                              <span className="text-xs">Waiting...</span>
                            </div>
                          ) : (
                            <MapPin className="w-12 h-12 text-[var(--ink-300)]" />
                          )}
                        </div>
                        {/* Location Info */}
                        <div className="p-3">
                          <p className="font-medium text-[var(--ink-900)] text-sm">{loc.name}</p>
                          <p className="text-xs text-[var(--ink-500)] line-clamp-2 mt-1">{loc.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setMode('ai-input')}
              className="px-5 py-3 border-2 border-[var(--ink-200)] text-[var(--ink-700)] hover:bg-[var(--ink-50)] rounded-xl transition-colors font-medium flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Wand2 className="w-4 h-4 shrink-0" />
              Edit Idea
            </button>
            <button
              onClick={handleRegenerateSettings}
              className="px-5 py-3 border-2 border-[var(--ink-200)] text-[var(--ink-700)] hover:bg-[var(--ink-50)] rounded-xl transition-colors font-medium flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              Regenerate
            </button>
            <button
              onClick={() => onManualSetup(generatedSettings)}
              className="px-5 py-3 border-2 border-[var(--ink-200)] text-[var(--ink-700)] hover:bg-[var(--ink-50)] rounded-xl transition-colors font-medium flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Settings className="w-4 h-4 shrink-0" />
              Review & Adjust
            </button>
            <button
              onClick={handleAcceptSettings}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Check className="w-5 h-5 shrink-0" />
              Start Creating
            </button>
          </div>

          {/* Note */}
          <p className="text-center text-sm text-[var(--ink-400)] mt-4">
            You can always adjust these settings later from Project Settings
          </p>
        </div>
      </div>
    );
  }

  return null;
}
