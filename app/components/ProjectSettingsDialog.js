'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  X, Users, MapPin, Palette, Sun, Check, Brush, Lightbulb,
  Plus, Trash2, Upload, Sparkles, Save, FolderOpen, Star, Pencil,
  Wand2, Loader2, RefreshCw, BookOpen, Image, ChevronLeft, ChevronRight
} from 'lucide-react';
import { ART_STYLES, CHARACTER_COLORS, MOOD_PRESETS, STYLE_MEDIUMS, LIGHTING_PRESETS } from '../types';
import { generateId, getCustomPresets, saveCustomPreset, deleteCustomPreset, createCustomPreset, updateCustomPreset, getTimestamp } from '../lib/storage';

const TABS = [
  { id: 'ai-generate', label: 'AI Generate', icon: Wand2 },
  { id: 'story', label: 'Story', icon: BookOpen },
  { id: 'style', label: 'Art Style', icon: Palette },
  { id: 'medium', label: 'Medium', icon: Brush },
  { id: 'mood', label: 'Mood & Colors', icon: Sun },
  { id: 'lighting', label: 'Lighting', icon: Lightbulb },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'locations', label: 'Locations', icon: MapPin },
];

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
 */
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
 * Build a character portrait prompt with full style context (for FIRST generation)
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
 * Build a simple character prompt WITHOUT styles (for SUBSEQUENT regeneration)
 * The structured_prompt already contains all style information
 */
function buildSimpleCharacterPrompt(character) {
  return `Portrait of ${character.name}, ${character.description}. Character portrait, centered composition, detailed face, expressive features.`;
}

/**
 * Build a location scene prompt with full style context (for FIRST generation)
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
  
  return `${styleEmphasis}${location.name}, ${location.description}. ${artStyleName} art style, ${medium} medium${moodName ? `, ${moodName} atmosphere` : ''}${lightingName ? `, ${lightingName} lighting` : ''}${colors ? `, color palette: ${colors}` : ''}. Establishing shot, detailed environment, scenic composition, professional illustration. No people, no humans, no figures, empty scene.${artStylePrompt ? ` Style reference: ${artStylePrompt}` : ''}`;
}

/**
 * Build a simple location prompt WITHOUT styles (for SUBSEQUENT regeneration)
 * The structured_prompt already contains all style information
 */
function buildSimpleLocationPrompt(location) {
  return `${location.name}, ${location.description}. Establishing shot, detailed environment, scenic composition. No people, no humans, no figures, empty scene.`;
}

/**
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {import('../types').ProjectSettings} props.settings
 * @param {(settings: import('../types').ProjectSettings) => void} props.onSave
 */
export default function ProjectSettingsDialog({ isOpen, onClose, settings, onSave }) {
  const [activeTab, setActiveTab] = useState('style');
  const [localSettings, setLocalSettings] = useState(settings || {
    characters: [],
    locations: [],
    artStyle: ART_STYLES[0],
    styleMedium: 'digital-art',
    mood: 'bright',
    colorPalette: MOOD_PRESETS[0].colors,
    defaultLighting: 'natural',
    projectContext: 'comic-panel',
    setupComplete: true
  });

  // AI Generate tab state (persisted across tab changes)
  const [aiState, setAiState] = useState({
    storyIdea: '',
    isGenerating: false,
    generated: null,
    error: '',
    imageGenerationStatus: {},
    isGeneratingImages: false
  });

  /**
   * Generate images for characters and locations
   * The FIRST character establishes the master style (seed + structured_prompt)
   * All subsequent characters and locations use the master style for consistency
   * Each entity stores its OWN structured_prompt and seed from its generation result
   */
  const generateImagesForEntities = useCallback(async (generatedData, newSettings) => {
    if (!generatedData) return;
    
    setAiState(prev => ({ ...prev, isGeneratingImages: true }));
    const newStatus = {};
    
    // Initialize status for all entities
    generatedData.characters.forEach(char => {
      newStatus[`char-${char.id}`] = { status: 'pending', type: 'character' };
    });
    generatedData.locations.forEach(loc => {
      newStatus[`loc-${loc.id}`] = { status: 'pending', type: 'location' };
    });
    setAiState(prev => ({ ...prev, imageGenerationStatus: newStatus }));

    // Master style from the first character (will be set after first generation)
    // Used to maintain visual consistency across all generations
    let masterSeed = null;
    let masterStructuredPrompt = null;

    // Generate character images
    const characters = generatedData.characters;
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      const statusKey = `char-${char.id}`;
      
      try {
        setAiState(prev => ({
          ...prev,
          imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'generating', type: 'character' } }
        }));
        
        let result;
        
        if (i === 0) {
          // FIRST CHARACTER: Full prompt with all styles → establishes master style
          const prompt = buildCharacterPrompt(char, newSettings);
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
        
        // Update character with image - store its OWN structured_prompt and seed
        // This is important for later comic panel generation with this specific character
        setLocalSettings(prev => ({
          ...prev,
          characters: prev.characters.map(c => 
            c.id === char.id ? { 
              ...c, 
              referenceImage: result.imageUrl,
              fiboSeed: result.seed,
              fiboStructuredPrompt: result.structured_prompt
            } : c
          )
        }));
        
        setAiState(prev => ({
          ...prev,
          imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'done', type: 'character' } }
        }));
      } catch (err) {
        console.error(`Failed to generate image for character ${char.name}:`, err);
        setAiState(prev => ({
          ...prev,
          imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'error', type: 'character', error: err.message } }
        }));
      }
    }

    // Generate location images using master style from first character
    for (const loc of generatedData.locations) {
      const statusKey = `loc-${loc.id}`;
      
      try {
        setAiState(prev => ({
          ...prev,
          imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'generating', type: 'location' } }
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
          const prompt = buildLocationPrompt(loc, newSettings);
          result = await generateFiboImage({ prompt, aspectRatio: '16:9' });
        }
        
        // Update location with image - store its OWN structured_prompt and seed
        // This is important for later comic panel generation with this specific location
        setLocalSettings(prev => ({
          ...prev,
          locations: prev.locations.map(l => 
            l.id === loc.id ? { 
              ...l, 
              referenceImage: result.imageUrl,
              fiboSeed: result.seed,
              fiboStructuredPrompt: result.structured_prompt
            } : l
          )
        }));
        
        setAiState(prev => ({
          ...prev,
          imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'done', type: 'location' } }
        }));
      } catch (err) {
        console.error(`Failed to generate image for location ${loc.name}:`, err);
        setAiState(prev => ({
          ...prev,
          imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'error', type: 'location', error: err.message } }
        }));
      }
    }

    setAiState(prev => ({ ...prev, isGeneratingImages: false }));
  }, []);

  /**
   * Regenerate a single character's image
   * Always uses full prompt with styles to create a NEW different image
   */
  const regenerateCharacterImage = useCallback(async (characterId) => {
    const char = localSettings.characters.find(c => c.id === characterId);
    if (!char) return;

    const statusKey = `char-${characterId}`;
    
    setAiState(prev => ({
      ...prev,
      imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'generating', type: 'character' } }
    }));

    try {
      // Always use full prompt with styles for regeneration (creates NEW image)
      const prompt = buildCharacterPrompt(char, localSettings);
      const result = await generateFiboImage({ prompt, aspectRatio: '1:1' });

      setLocalSettings(prev => ({
        ...prev,
        characters: prev.characters.map(c => 
          c.id === characterId ? { 
            ...c, 
            referenceImage: result.imageUrl,
            fiboSeed: result.seed,
            fiboStructuredPrompt: result.structured_prompt
          } : c
        )
      }));

      setAiState(prev => ({
        ...prev,
        imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'done', type: 'character' } }
      }));
    } catch (err) {
      console.error(`Failed to regenerate image for character:`, err);
      setAiState(prev => ({
        ...prev,
        imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'error', type: 'character', error: err.message } }
      }));
    }
  }, [localSettings]);

  /**
   * Regenerate a single location's image
   * Always uses full prompt with styles to create a NEW different image
   */
  const regenerateLocationImage = useCallback(async (locationId) => {
    const loc = localSettings.locations.find(l => l.id === locationId);
    if (!loc) return;

    const statusKey = `loc-${locationId}`;
    
    setAiState(prev => ({
      ...prev,
      imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'generating', type: 'location' } }
    }));

    try {
      // Always use full prompt with styles for regeneration (creates NEW image)
      const prompt = buildLocationPrompt(loc, localSettings);
      const result = await generateFiboImage({ prompt, aspectRatio: '16:9' });

      setLocalSettings(prev => ({
        ...prev,
        locations: prev.locations.map(l => 
          l.id === locationId ? { 
            ...l, 
            referenceImage: result.imageUrl,
            fiboSeed: result.seed,
            fiboStructuredPrompt: result.structured_prompt
          } : l
        )
      }));

      setAiState(prev => ({
        ...prev,
        imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'done', type: 'location' } }
      }));
    } catch (err) {
      console.error(`Failed to regenerate image for location:`, err);
      setAiState(prev => ({
        ...prev,
        imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'error', type: 'location', error: err.message } }
      }));
    }
  }, [localSettings]);

  /**
   * Generate a single character's image (first time or when no image)
   * Uses stored seed/structured_prompt if available for consistency
   */
  const generateCharacterImage = useCallback(async (characterId) => {
    const char = localSettings.characters.find(c => c.id === characterId);
    if (!char) return;

    const statusKey = `char-${characterId}`;
    
    setAiState(prev => ({
      ...prev,
      imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'generating', type: 'character' } }
    }));

    try {
      const prompt = buildCharacterPrompt(char, localSettings);
      let result;
      
      // Use stored seed/structured_prompt if available for consistency
      if (char.fiboSeed && char.fiboStructuredPrompt) {
        const simplePrompt = buildSimpleCharacterPrompt(char);
        result = await generateFiboImage({
          prompt: simplePrompt,
          structured_prompt: char.fiboStructuredPrompt,
          seed: char.fiboSeed,
          aspectRatio: '1:1'
        });
      } else {
        // No stored style - use full prompt
        result = await generateFiboImage({ prompt, aspectRatio: '1:1' });
      }

      setLocalSettings(prev => ({
        ...prev,
        characters: prev.characters.map(c => 
          c.id === characterId ? { 
            ...c, 
            referenceImage: result.imageUrl,
            fiboSeed: result.seed,
            fiboStructuredPrompt: result.structured_prompt
          } : c
        )
      }));

      setAiState(prev => ({
        ...prev,
        imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'done', type: 'character' } }
      }));
    } catch (err) {
      console.error(`Failed to generate image for character:`, err);
      setAiState(prev => ({
        ...prev,
        imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'error', type: 'character', error: err.message } }
      }));
    }
  }, [localSettings]);

  /**
   * Generate a single location's image (first time or when no image)
   * Uses stored seed/structured_prompt if available for consistency
   */
  const generateLocationImage = useCallback(async (locationId) => {
    const loc = localSettings.locations.find(l => l.id === locationId);
    if (!loc) return;

    const statusKey = `loc-${locationId}`;
    
    setAiState(prev => ({
      ...prev,
      imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'generating', type: 'location' } }
    }));

    try {
      const prompt = buildLocationPrompt(loc, localSettings);
      let result;
      
      // Use stored seed/structured_prompt if available for consistency
      if (loc.fiboSeed && loc.fiboStructuredPrompt) {
        const simplePrompt = buildSimpleLocationPrompt(loc);
        result = await generateFiboImage({
          prompt: simplePrompt,
          structured_prompt: loc.fiboStructuredPrompt,
          seed: loc.fiboSeed,
          aspectRatio: '16:9'
        });
      } else {
        // No stored style - use full prompt
        result = await generateFiboImage({ prompt, aspectRatio: '16:9' });
      }

      setLocalSettings(prev => ({
        ...prev,
        locations: prev.locations.map(l => 
          l.id === locationId ? { 
            ...l, 
            referenceImage: result.imageUrl,
            fiboSeed: result.seed,
            fiboStructuredPrompt: result.structured_prompt
          } : l
        )
      }));

      setAiState(prev => ({
        ...prev,
        imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'done', type: 'location' } }
      }));
    } catch (err) {
      console.error(`Failed to generate image for location:`, err);
      setAiState(prev => ({
        ...prev,
        imageGenerationStatus: { ...prev.imageGenerationStatus, [statusKey]: { status: 'error', type: 'location', error: err.message } }
      }));
    }
  }, [localSettings]);

  if (!isOpen) return null;

  // Style-related keys that should clear stored FIBO data when changed
  const STYLE_KEYS = ['artStyle', 'styleMedium', 'colorPalette', 'defaultLighting'];

  const updateSettings = (key, value) => {
    setLocalSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      // If a style-related setting changed, clear fiboSeed and fiboStructuredPrompt from all entities
      if (STYLE_KEYS.includes(key)) {
        // Clear from all characters
        if (newSettings.characters?.length > 0) {
          newSettings.characters = newSettings.characters.map(char => ({
            ...char,
            fiboSeed: undefined,
            fiboStructuredPrompt: undefined
          }));
        }
        // Clear from all locations
        if (newSettings.locations?.length > 0) {
          newSettings.locations = newSettings.locations.map(loc => ({
            ...loc,
            fiboSeed: undefined,
            fiboStructuredPrompt: undefined
          }));
        }
      }
      
      return newSettings;
    });
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ai-generate':
        return (
          <AIGenerateTab 
            settings={localSettings} 
            updateSettings={updateSettings} 
            setLocalSettings={setLocalSettings}
            aiState={aiState}
            setAiState={setAiState}
            generateImagesForEntities={generateImagesForEntities}
            onGenerateCharacter={generateCharacterImage}
            onRegenerateCharacter={regenerateCharacterImage}
            onGenerateLocation={generateLocationImage}
            onRegenerateLocation={regenerateLocationImage}
          />
        );
      case 'story':
        return <StoryTab settings={localSettings} updateSettings={updateSettings} />;
      case 'style':
        return <StyleTab settings={localSettings} updateSettings={updateSettings} />;
      case 'medium':
        return <MediumTab settings={localSettings} updateSettings={updateSettings} />;
      case 'mood':
        return <MoodTab settings={localSettings} updateSettings={updateSettings} />;
      case 'lighting':
        return <LightingTab settings={localSettings} updateSettings={updateSettings} />;
      case 'characters':
        return <CharactersTab settings={localSettings} updateSettings={updateSettings} imageStatus={aiState.imageGenerationStatus} onGenerateImage={generateCharacterImage} onRegenerateImage={regenerateCharacterImage} />;
      case 'locations':
        return <LocationsTab settings={localSettings} updateSettings={updateSettings} imageStatus={aiState.imageGenerationStatus} onGenerateImage={generateLocationImage} onRegenerateImage={regenerateLocationImage} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with subtle gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      <div className="relative bg-[var(--paper-white)] rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden"
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255,255,255,0.1)' }}>
        
        {/* Header with gradient accent line */}
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--accent-primary-gradient)' }} />
          <div className="flex items-center justify-between px-8 py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white/80" 
                style={{ background: 'var(--accent-primary-gradient)' }}>
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>
                  Project Settings
                </h2>
                <p className="text-sm text-[var(--ink-400)] mt-0.5">Configure your AI generation preferences</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--ink-100)] rounded-xl transition-all duration-200 hover:scale-105"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar with refined styling */}
          <div className="w-56 bg-gradient-to-b from-[var(--paper-soft)] to-[var(--paper-warm)] border-r border-[var(--ink-100)] p-4 flex flex-col">
            <div className="space-y-1.5 flex-1">
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isAI = tab.id === 'ai-generate';
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                      isActive
                        ? isAI 
                          ? 'text-white shadow-lg scale-[1.02]'
                          : 'bg-white text-[var(--ink-900)] shadow-md ring-1 ring-[var(--ink-100)]'
                        : 'text-[var(--ink-600)] hover:bg-white/60 hover:text-[var(--ink-800)]'
                    }`}
                    style={isActive && isAI ? { 
                      background: 'var(--accent-primary-gradient)',
                      boxShadow: '0 4px 14px rgba(232, 93, 76, 0.4)'
                    } : undefined}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 ${
                      isActive
                        ? isAI 
                          ? 'bg-white/20'
                          : 'bg-[var(--accent-primary-subtle)]'
                        : 'bg-[var(--ink-100)] group-hover:bg-[var(--ink-200)]'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        isActive 
                          ? isAI ? 'text-white' : 'text-[var(--accent-primary)]'
                          : 'text-[var(--ink-500)]'
                      }`} />
                    </div>
                    <span className="text-sm font-medium">{tab.label}</span>
                    {isActive && !isAI && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Sidebar footer hint */}
            <div className="mt-4 pt-4 border-t border-[var(--ink-100)]">
              <p className="text-xs text-[var(--ink-400)] text-center">
                Use AI Generate for quick setup
              </p>
            </div>
          </div>

          {/* Tab Content with subtle background pattern */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-white via-white to-[var(--paper-cream)]">
            <div className="p-8">
              {renderTabContent()}
            </div>
          </div>
        </div>

        {/* Footer with refined styling */}
        <div className="flex items-center justify-between px-8 py-5 border-t border-[var(--ink-100)] bg-gradient-to-r from-[var(--paper-soft)] via-white to-[var(--paper-soft)]">
          <p className="text-xs text-[var(--ink-400)]">
            Changes will be applied to new generations
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-[var(--ink-600)] hover:text-[var(--ink-800)] hover:bg-[var(--ink-100)] rounded-xl transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
              style={{ boxShadow: '0 4px 14px rgba(232, 93, 76, 0.35)' }}
            >
              <Check className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AI-powered settings generator (mock implementation)
 */
async function generateSettingsFromIdea(idea) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const ideaLower = idea.toLowerCase();
  
  let artStyle = ART_STYLES.find(s => s.id === 'manga');
  if (ideaLower.includes('superhero') || ideaLower.includes('action')) {
    artStyle = ART_STYLES.find(s => s.id === 'comic-book');
  } else if (ideaLower.includes('fantasy') || ideaLower.includes('medieval')) {
    artStyle = ART_STYLES.find(s => s.id === 'fantasy-art');
  } else if (ideaLower.includes('noir') || ideaLower.includes('detective')) {
    artStyle = ART_STYLES.find(s => s.id === 'noir');
  } else if (ideaLower.includes('cyber') || ideaLower.includes('future') || ideaLower.includes('sci-fi')) {
    artStyle = ART_STYLES.find(s => s.id === 'cyberpunk');
  } else if (ideaLower.includes('horror') || ideaLower.includes('dark') || ideaLower.includes('scary')) {
    artStyle = ART_STYLES.find(s => s.id === 'horror');
  } else if (ideaLower.includes('watercolor') || ideaLower.includes('soft') || ideaLower.includes('gentle')) {
    artStyle = ART_STYLES.find(s => s.id === 'watercolor');
  }
  
  let mood = 'bright';
  let colorPalette = MOOD_PRESETS.find(m => m.id === 'bright')?.colors || ['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b'];
  if (ideaLower.includes('dark') || ideaLower.includes('horror') || ideaLower.includes('mystery')) {
    mood = 'dark';
    colorPalette = MOOD_PRESETS.find(m => m.id === 'dark')?.colors || colorPalette;
  } else if (ideaLower.includes('romantic') || ideaLower.includes('love')) {
    mood = 'romantic';
    colorPalette = MOOD_PRESETS.find(m => m.id === 'romantic')?.colors || colorPalette;
  } else if (ideaLower.includes('action') || ideaLower.includes('intense') || ideaLower.includes('battle')) {
    mood = 'dramatic';
    colorPalette = MOOD_PRESETS.find(m => m.id === 'dramatic')?.colors || colorPalette;
  } else if (ideaLower.includes('peaceful') || ideaLower.includes('calm') || ideaLower.includes('nature')) {
    mood = 'serene';
    colorPalette = MOOD_PRESETS.find(m => m.id === 'serene')?.colors || colorPalette;
  }
  
  let lighting = 'natural';
  if (ideaLower.includes('night') || ideaLower.includes('dark')) {
    lighting = 'moonlight';
  } else if (ideaLower.includes('sunset') || ideaLower.includes('dawn')) {
    lighting = 'golden-hour';
  } else if (ideaLower.includes('neon') || ideaLower.includes('cyber') || ideaLower.includes('club')) {
    lighting = 'neon';
  } else if (ideaLower.includes('dramatic') || ideaLower.includes('shadow')) {
    lighting = 'dramatic';
  }
  
  let styleMedium = 'digital-art';
  if (ideaLower.includes('watercolor')) {
    styleMedium = 'watercolor';
  } else if (ideaLower.includes('ink') || ideaLower.includes('traditional')) {
    styleMedium = 'ink-wash';
  } else if (ideaLower.includes('3d') || ideaLower.includes('render')) {
    styleMedium = '3d-render';
  }
  
  const characters = [];
  if (ideaLower.includes('hero') || ideaLower.includes('protagonist')) {
    characters.push({
      id: generateId(),
      name: 'Main Character',
      description: 'The protagonist of the story',
      appearance: 'To be defined based on your story',
      personality: 'Determined and brave',
      color: '#6366f1'
    });
  }
  if (ideaLower.includes('villain') || ideaLower.includes('antagonist')) {
    characters.push({
      id: generateId(),
      name: 'Antagonist',
      description: 'The main opposing force',
      appearance: 'Mysterious and imposing',
      personality: 'Complex motivations',
      color: '#ef4444'
    });
  }
  
  const locations = [];
  if (ideaLower.includes('city') || ideaLower.includes('urban')) {
    locations.push({
      id: generateId(),
      name: 'City',
      description: 'Urban environment',
      atmosphere: 'Bustling and dynamic',
      timeOfDay: 'varies',
      weather: 'clear'
    });
  }
  if (ideaLower.includes('forest') || ideaLower.includes('woods')) {
    locations.push({
      id: generateId(),
      name: 'Forest',
      description: 'Dense woodland area',
      atmosphere: 'Mysterious and ancient',
      timeOfDay: 'day',
      weather: 'misty'
    });
  }
  
  return {
    artStyle: artStyle || ART_STYLES[0],
    styleMedium,
    mood,
    colorPalette,
    defaultLighting: lighting,
    characters,
    locations
  };
}

function AIGenerateTab({ settings, updateSettings, setLocalSettings, aiState, setAiState, generateImagesForEntities, onGenerateCharacter, onRegenerateCharacter, onGenerateLocation, onRegenerateLocation }) {
  const { storyIdea, isGenerating, generated, error, imageGenerationStatus, isGeneratingImages } = aiState;

  const setStoryIdea = (value) => setAiState(prev => ({ ...prev, storyIdea: value }));
  const setIsGenerating = (value) => setAiState(prev => ({ ...prev, isGenerating: value }));
  const setGenerated = (value) => setAiState(prev => ({ ...prev, generated: value }));
  const setError = (value) => setAiState(prev => ({ ...prev, error: value }));

  const handleGenerate = async () => {
    if (!storyIdea.trim()) {
      setError('Please describe your story idea');
      return;
    }
    
    setError('');
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyIdea })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate settings');
      }
      
      // Map the AI response to our settings format
      const aiSettings = data.settings;
      
      // Map characters with IDs and default color
      const mappedCharacters = (aiSettings.characters || []).map((char, index) => ({
        id: generateId(),
        name: char.name,
        description: char.description,
        color: CHARACTER_COLORS[index % CHARACTER_COLORS.length]
      }));
      
      // Map locations with IDs
      const mappedLocations = (aiSettings.locations || []).map(loc => ({
        id: generateId(),
        name: loc.name,
        description: loc.description
      }));
      
      const mappedSettings = {
        artStyle: ART_STYLES.find(s => s.id === aiSettings.artStyle) || ART_STYLES[0],
        styleMedium: aiSettings.styleMedium || 'digital-art',
        mood: aiSettings.mood || 'bright',
        colorPalette: MOOD_PRESETS.find(m => m.id === aiSettings.mood)?.colors || MOOD_PRESETS[0].colors,
        defaultLighting: aiSettings.lighting || 'natural',
        characters: mappedCharacters,
        locations: mappedLocations,
        storyContext: aiSettings.storyContext || null,
        reasoning: aiSettings.reasoning
      };
      
      setGenerated(mappedSettings);
      
      // Auto-apply settings immediately
      const newSettings = {
        ...settings,
        artStyle: mappedSettings.artStyle,
        styleMedium: mappedSettings.styleMedium,
        mood: mappedSettings.mood,
        colorPalette: mappedSettings.colorPalette,
        defaultLighting: mappedSettings.defaultLighting,
        characters: [...(settings.characters || []), ...mappedSettings.characters],
        locations: [...(settings.locations || []), ...mappedSettings.locations],
        storyContext: mappedSettings.storyContext || settings.storyContext
      };
      
      setLocalSettings(newSettings);
      
      // Start generating images in background
      generateImagesForEntities(mappedSettings, newSettings);
    } catch (err) {
      setError(err.message || 'Failed to generate settings. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditIdea = () => {
    setGenerated(null);
  };

  const artStyleObj = generated?.artStyle;
  const moodObj = MOOD_PRESETS.find(m => m.id === generated?.mood);
  const lightingObj = LIGHTING_PRESETS.find(l => l.id === generated?.defaultLighting);
  const mediumObj = STYLE_MEDIUMS.find(m => m.id === generated?.styleMedium);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-md">
          <Wand2 className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-bold text-[var(--ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>
          AI Settings Generator
        </h3>
        <p className="text-sm text-[var(--ink-500)]">
          Describe your story and let AI suggest the perfect settings
        </p>
      </div>

      {!generated ? (
        <div className="space-y-4">
          <textarea
            value={storyIdea}
            onChange={(e) => setStoryIdea(e.target.value)}
            placeholder="Example: A cyberpunk detective story set in a neon-lit city. Dark, moody atmosphere with rain-soaked streets..."
            className="w-full h-32 p-4 bg-[var(--ink-50)] border-2 border-[var(--ink-200)] rounded-xl text-[var(--ink-900)] placeholder:text-[var(--ink-400)] focus:outline-none focus:border-purple-400 resize-none"
            disabled={isGenerating}
          />
          
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-sm font-medium text-purple-700 mb-2">💡 Tips:</p>
            <ul className="text-sm text-purple-600 space-y-1">
              <li>• Mention the genre (action, romance, horror)</li>
              <li>• Describe key characters</li>
              <li>• Include setting details (time, place)</li>
            </ul>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!storyIdea.trim() || isGenerating}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Settings
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Settings generated!</span>
          </div>

          {/* Story Context Preview */}
          {generated.storyContext && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Story Context</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-amber-600 font-medium">Title</p>
                  <p className="text-sm text-amber-900">{generated.storyContext.title}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-600 font-medium">Genre</p>
                  <p className="text-sm text-amber-900">{generated.storyContext.genre}</p>
                </div>
                <div>
                  <p className="text-xs text-amber-600 font-medium">Synopsis</p>
                  <p className="text-sm text-amber-900">{generated.storyContext.synopsis}</p>
                </div>
                {generated.storyContext.themes?.length > 0 && (
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Themes</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {generated.storyContext.themes.map((theme, i) => (
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

          {/* Visual Settings Preview */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--ink-50)] rounded-lg p-3">
                <p className="text-xs text-[var(--ink-500)] mb-1">Art Style</p>
                <p className="text-sm font-medium text-[var(--ink-900)]">{artStyleObj?.name || 'Default'}</p>
              </div>
              <div className="bg-[var(--ink-50)] rounded-lg p-3">
                <p className="text-xs text-[var(--ink-500)] mb-1">Medium</p>
                <p className="text-sm font-medium text-[var(--ink-900)]">{mediumObj?.name || 'Digital Art'}</p>
              </div>
              <div className="bg-[var(--ink-50)] rounded-lg p-3">
                <p className="text-xs text-[var(--ink-500)] mb-1">Mood</p>
                <p className="text-sm font-medium text-[var(--ink-900)]">{moodObj?.name || generated?.mood}</p>
                {generated?.colorPalette && (
                  <div className="flex gap-1 mt-1">
                    {generated.colorPalette.map((color, i) => (
                      <div key={i} className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-[var(--ink-50)] rounded-lg p-3">
                <p className="text-xs text-[var(--ink-500)] mb-1">Lighting</p>
                <p className="text-sm font-medium text-[var(--ink-900)]">{lightingObj?.name || generated?.defaultLighting}</p>
              </div>
            </div>

            {generated.characters.length > 0 && (
              <div className="bg-[var(--ink-50)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-[var(--ink-500)]">Characters ({generated.characters.length})</p>
                  {isGeneratingImages && (
                    <span className="text-xs text-purple-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating portraits...
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {generated.characters.map((char) => {
                    const status = imageGenerationStatus[`char-${char.id}`];
                    // Find the character in localSettings to get updated image
                    const updatedChar = settings.characters?.find(c => c.id === char.id) || char;
                    return (
                      <div key={char.id} className="bg-white rounded-lg overflow-hidden border border-[var(--ink-100)] group relative">
                        <div className="aspect-square relative bg-gradient-to-br from-[var(--ink-100)] to-[var(--ink-200)] flex items-center justify-center">
                          {updatedChar.referenceImage ? (
                            <>
                              <img 
                                src={updatedChar.referenceImage} 
                                alt={char.name} 
                                className="w-full h-full object-cover"
                              />
                              {/* Regenerate button */}
                              {status?.status !== 'generating' && (
                                <button
                                  onClick={() => onRegenerateCharacter(char.id)}
                                  className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-purple-500 hover:text-purple-700 hover:bg-purple-50 cursor-pointer shadow-sm"
                                  title="Regenerate image"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : status?.status === 'generating' ? (
                            <div className="flex flex-col items-center gap-1 text-purple-500">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <span className="text-[10px]">Generating...</span>
                            </div>
                          ) : status?.status === 'error' ? (
                            <div className="flex flex-col items-center gap-1 text-red-400">
                              <X className="w-6 h-6" />
                              <span className="text-[10px]">Failed</span>
                            </div>
                          ) : status?.status === 'pending' ? (
                            <div className="flex flex-col items-center gap-1 text-[var(--ink-300)]">
                              <Image className="w-6 h-6" />
                              <span className="text-[10px]">Waiting...</span>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: char.color }}>
                              {char.name[0]}
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <span className="text-xs font-medium text-[var(--ink-800)] truncate block">{char.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {generated.locations.length > 0 && (
              <div className="bg-[var(--ink-50)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-[var(--ink-500)]">Locations ({generated.locations.length})</p>
                  {isGeneratingImages && (
                    <span className="text-xs text-purple-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Generating scenes...
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {generated.locations.map((loc) => {
                    const status = imageGenerationStatus[`loc-${loc.id}`];
                    // Find the location in localSettings to get updated image
                    const updatedLoc = settings.locations?.find(l => l.id === loc.id) || loc;
                    return (
                      <div key={loc.id} className="bg-white rounded-lg overflow-hidden border border-[var(--ink-100)] group relative">
                        <div className="aspect-video relative bg-gradient-to-br from-[var(--ink-100)] to-[var(--ink-200)] flex items-center justify-center">
                          {updatedLoc.referenceImage ? (
                            <>
                              <img 
                                src={updatedLoc.referenceImage} 
                                alt={loc.name} 
                                className="w-full h-full object-cover"
                              />
                              {/* Regenerate button */}
                              {status?.status !== 'generating' && (
                                <button
                                  onClick={() => onRegenerateLocation(loc.id)}
                                  className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-purple-500 hover:text-purple-700 hover:bg-purple-50 cursor-pointer shadow-sm"
                                  title="Regenerate image"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : status?.status === 'generating' ? (
                            <div className="flex flex-col items-center gap-1 text-purple-500">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <span className="text-[10px]">Generating...</span>
                            </div>
                          ) : status?.status === 'error' ? (
                            <div className="flex flex-col items-center gap-1 text-red-400">
                              <X className="w-6 h-6" />
                              <span className="text-[10px]">Failed</span>
                            </div>
                          ) : status?.status === 'pending' ? (
                            <div className="flex flex-col items-center gap-1 text-[var(--ink-300)]">
                              <Image className="w-6 h-6" />
                              <span className="text-[10px]">Waiting...</span>
                            </div>
                          ) : (
                            <MapPin className="w-8 h-8 text-[var(--ink-300)]" />
                          )}
                        </div>
                        <div className="p-2">
                          <span className="text-xs font-medium text-[var(--ink-800)]">{loc.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {generated.reasoning && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                <p className="text-xs text-purple-600 mb-1 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Reasoning
                </p>
                <p className="text-sm text-purple-800 leading-relaxed">{generated.reasoning}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleEditIdea}
              className="flex-1 px-4 py-2.5 border-2 border-[var(--ink-200)] text-[var(--ink-700)] hover:bg-[var(--ink-50)] rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Edit Idea
            </button>
            <button
              onClick={() => { setGenerated(null); handleGenerate(); }}
              className="flex-1 px-4 py-2.5 border-2 border-[var(--ink-200)] text-[var(--ink-700)] hover:bg-[var(--ink-50)] rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </div>

          <p className="text-xs text-green-600 text-center font-medium flex items-center justify-center gap-1">
            <Check className="w-3 h-3" />
            Settings have been applied automatically
          </p>
          <p className="text-xs text-[var(--ink-400)] text-center">
            Characters and locations will be added to your existing ones
          </p>
        </div>
      )}
    </div>
  );
}

function StoryTab({ settings, updateSettings }) {
  const storyContext = settings.storyContext || {};
  
  const updateStoryContext = (field, value) => {
    updateSettings('storyContext', {
      ...storyContext,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-3 shadow-md">
          <BookOpen className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-bold text-[var(--ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>
          Story Context
        </h3>
        <p className="text-sm text-[var(--ink-500)]">
          Define your narrative to help AI generate consistent visuals
        </p>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-[var(--ink-700)] mb-2">
            Working Title
          </label>
          <input
            type="text"
            value={storyContext.title || ''}
            onChange={(e) => updateStoryContext('title', e.target.value)}
            placeholder="Enter your story's title..."
            className="w-full px-4 py-3 bg-[var(--ink-50)] border-2 border-[var(--ink-200)] rounded-xl text-[var(--ink-900)] placeholder:text-[var(--ink-400)] focus:outline-none focus:border-[var(--accent-primary)]"
          />
        </div>

        {/* Genre */}
        <div>
          <label className="block text-sm font-medium text-[var(--ink-700)] mb-2">
            Genre
          </label>
          <input
            type="text"
            value={storyContext.genre || ''}
            onChange={(e) => updateStoryContext('genre', e.target.value)}
            placeholder="e.g., Sci-Fi Action, Romantic Comedy, Dark Fantasy..."
            className="w-full px-4 py-3 bg-[var(--ink-50)] border-2 border-[var(--ink-200)] rounded-xl text-[var(--ink-900)] placeholder:text-[var(--ink-400)] focus:outline-none focus:border-[var(--accent-primary)]"
          />
        </div>

        {/* Synopsis */}
        <div>
          <label className="block text-sm font-medium text-[var(--ink-700)] mb-2">
            Synopsis
          </label>
          <textarea
            value={storyContext.synopsis || ''}
            onChange={(e) => updateStoryContext('synopsis', e.target.value)}
            placeholder="Briefly describe what your story is about..."
            rows={4}
            className="w-full px-4 py-3 bg-[var(--ink-50)] border-2 border-[var(--ink-200)] rounded-xl text-[var(--ink-900)] placeholder:text-[var(--ink-400)] focus:outline-none focus:border-[var(--accent-primary)] resize-y overflow-auto"
          />
        </div>

        {/* Themes */}
        <div>
          <label className="block text-sm font-medium text-[var(--ink-700)] mb-2">
            Key Themes
          </label>
          <input
            type="text"
            value={(storyContext.themes || []).join(', ')}
            onChange={(e) => updateStoryContext('themes', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            placeholder="e.g., Redemption, Love, Survival, Identity..."
            className="w-full px-4 py-3 bg-[var(--ink-50)] border-2 border-[var(--ink-200)] rounded-xl text-[var(--ink-900)] placeholder:text-[var(--ink-400)] focus:outline-none focus:border-[var(--accent-primary)]"
          />
          <p className="text-xs text-[var(--ink-400)] mt-1">Separate themes with commas</p>
        </div>

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-700 mb-2">💡 Why is this important?</p>
          <ul className="text-sm text-amber-600 space-y-1">
            <li>• Helps AI maintain narrative consistency across panels</li>
            <li>• Guides visual style decisions for each scene</li>
            <li>• Serves as a quick reference while creating</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StyleTab({ settings, updateSettings }) {
  const [customPrompt, setCustomPrompt] = useState(settings.artStyle?.customPrompt || '');
  const [customName, setCustomName] = useState('');
  const [customImage, setCustomImage] = useState(settings.artStyle?.referenceImage || null);
  const [savedPresets, setSavedPresets] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [activePresetId, setActivePresetId] = useState(settings.artStyle?.presetId || null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    getCustomPresets('art-style').then(setSavedPresets);
  }, []);

  // Check if current style is a saved preset
  const isUsingCustomPreset = activePresetId && savedPresets.some(p => p.id === activePresetId);
  const activePreset = savedPresets.find(p => p.id === activePresetId);

  const handleStyleSelect = (style) => {
    setActivePresetId(null);
    setEditingPreset(null);
    setShowEditor(false);
    updateSettings('artStyle', { ...style, presetId: null });
  };

  const handleCreateNew = () => {
    setActivePresetId(null);
    setEditingPreset(null);
    setCustomPrompt('');
    setCustomImage(null);
    setShowEditor(true);
  };

  const handleSaveCustom = async () => {
    if (!customName?.trim() || !customPrompt?.trim()) return;
    const preset = createCustomPreset('art-style', customName, { customPrompt, referenceImage: customImage });
    await saveCustomPreset(preset);
    setSavedPresets([...savedPresets, preset]);
    setShowSaveDialog(false);
    setCustomName('');
    setActivePresetId(preset.id);
    updateSettings('artStyle', { id: 'custom', name: preset.name, customPrompt, referenceImage: customImage, presetId: preset.id });
  };

  const handleLoadPreset = (preset) => {
    setActivePresetId(preset.id);
    setEditingPreset(null);
    setShowEditor(false);
    setCustomPrompt(preset.data?.customPrompt || '');
    setCustomImage(preset.data?.referenceImage || null);
    updateSettings('artStyle', { 
      id: 'custom', 
      name: preset.name, 
      customPrompt: preset.data?.customPrompt || '',
      referenceImage: preset.data?.referenceImage || null,
      presetId: preset.id 
    });
  };

  const handleDeletePreset = async (id) => {
    await deleteCustomPreset(id);
    setSavedPresets(savedPresets.filter(p => p.id !== id));
    if (activePresetId === id) {
      setActivePresetId(null);
      setCustomImage(null);
      updateSettings('artStyle', { id: 'custom', name: 'Custom', customPrompt: '', referenceImage: null, presetId: null });
    }
  };

  const handleUpdatePreset = async (id, updates) => {
    const updated = await updateCustomPreset(id, updates);
    setSavedPresets(savedPresets.map(p => p.id === id ? updated : p));
    if (activePresetId === id && updates.name) {
      updateSettings('artStyle', { ...settings.artStyle, name: updated.name });
    }
  };

  const handleEditPresetContent = (preset) => {
    setEditingPreset(preset);
    setShowEditor(true);
    setCustomPrompt(preset.data?.customPrompt || '');
    setCustomImage(preset.data?.referenceImage || null);
  };

  const handleSavePresetContent = async () => {
    if (!editingPreset) return;
    const updated = await updateCustomPreset(editingPreset.id, { data: { customPrompt, referenceImage: customImage } });
    setSavedPresets(savedPresets.map(p => p.id === editingPreset.id ? updated : p));
    setEditingPreset(null);
    setShowEditor(false);
    if (activePresetId === editingPreset.id) {
      updateSettings('artStyle', { id: 'custom', name: updated.name, customPrompt, referenceImage: customImage, presetId: updated.id });
    }
  };

  const handleCustomPromptChange = (value) => {
    setCustomPrompt(value);
    if (!editingPreset) {
      if (activePresetId) {
        setActivePresetId(null);
      }
      updateSettings('artStyle', { id: 'custom', name: 'Custom', customPrompt: value, referenceImage: customImage, presetId: null });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target.result;
        setCustomImage(imageData);
        if (!editingPreset) {
          updateSettings('artStyle', { ...settings.artStyle, referenceImage: imageData, presetId: null });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setCustomImage(null);
    if (!editingPreset) {
      updateSettings('artStyle', { ...settings.artStyle, referenceImage: null });
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Selection Card */}
      <div className={`rounded-xl border-2 p-4 transition-all ${settings.artStyle ? 'bg-white border-[var(--accent-primary)] shadow-sm' : 'bg-[var(--ink-50)] border-dashed border-[var(--ink-200)]'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${settings.artStyle ? 'bg-[var(--accent-primary-subtle)]' : 'bg-[var(--ink-100)]'}`}>
              <Palette className={`w-5 h-5 ${settings.artStyle ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-400)]'}`} />
            </div>
            <div>
              <p className="text-xs text-[var(--ink-500)] mb-0.5">Art Style</p>
              {settings.artStyle ? (
                <p className="font-semibold text-[var(--ink-900)]">
                  {isUsingCustomPreset ? `${activePreset?.name} (Custom)` : settings.artStyle?.name}
                </p>
              ) : (
                <p className="text-sm text-[var(--ink-400)] italic">Not selected (optional)</p>
              )}
            </div>
          </div>
          {settings.artStyle && (
            <button
              onClick={() => { updateSettings('artStyle', null); setActivePresetId(null); setShowEditor(false); }}
              className="text-xs text-[var(--ink-400)] hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        {settings.artStyle?.customPrompt && (
          <p className="text-xs text-[var(--ink-500)] mt-2 pl-13 line-clamp-2">{settings.artStyle.customPrompt}</p>
        )}
      </div>

      {/* Built-in Styles */}
      <div>
        <p className="text-xs text-[var(--ink-400)] mb-2">Built-in Styles</p>
        <div className="grid grid-cols-4 gap-2">
          {ART_STYLES.filter(s => s.id !== 'custom').map((style) => {
            const isSelected = settings.artStyle?.id === style.id && !isUsingCustomPreset;
            return (
              <button
                key={style.id}
                onClick={() => handleStyleSelect(style)}
                className={`relative p-1.5 rounded-xl border-2 text-center transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30'
                    : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:shadow-md'
                }`}
              >
                {/* Style Preview Image */}
                <div className="relative w-full aspect-square rounded-lg mb-1.5 overflow-hidden bg-[var(--ink-100)]">
                  <img 
                    src={style.previewImage} 
                    alt={style.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-[var(--ink-700)] block truncate">{style.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Custom Styles Section */}
      <div className="border-t border-[var(--ink-100)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-[var(--ink-500)] flex items-center gap-1">
            <Star className="w-3 h-3" /> Your Custom Styles
          </h4>
          <button
            onClick={handleCreateNew}
            className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary-dark)] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" /> Create New
          </button>
        </div>

        {/* Saved Presets Grid */}
        {savedPresets.length > 0 && (
          <div className="space-y-2 mb-4">
            {savedPresets.map((preset) => {
              const isActive = activePresetId === preset.id;
              const isBeingEdited = editingPreset?.id === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`group p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]'
                      : isBeingEdited
                        ? 'border-[var(--ink-300)] bg-[var(--ink-50)]'
                        : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)] hover:shadow-sm bg-white'
                  }`}
                  onClick={() => handleLoadPreset(preset)}
                >
                  <div className="flex items-start gap-3">
                    {/* Preview thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-[var(--ink-100)] flex items-center justify-center overflow-hidden shrink-0">
                      {preset.data?.referenceImage ? (
                        <img src={preset.data.referenceImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Palette className="w-5 h-5 text-[var(--ink-400)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <div className="w-4 h-4 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <span className={`text-sm font-medium transition-colors ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-700)] group-hover:text-[var(--ink-900)]'}`}>
                          {preset.name}
                        </span>
                      </div>
                      {preset.data?.customPrompt && (
                        <p className="text-xs text-[var(--ink-400)] mt-1 line-clamp-2">
                          {preset.data.customPrompt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditPresetContent(preset); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] hover:bg-white rounded-lg cursor-pointer transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-red-500 hover:bg-white rounded-lg cursor-pointer transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {savedPresets.length === 0 && !showEditor && (
          <p className="text-xs text-[var(--ink-400)] italic mb-4">
            No custom styles yet. Click "Create New" to make one.
          </p>
        )}
      </div>

      {/* Custom Style Editor */}
      {showEditor && (
        <div className="space-y-3 p-3 bg-[var(--ink-50)] rounded-xl border border-[var(--ink-200)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingPreset ? (
                <Pencil className="w-3.5 h-3.5 text-[var(--ink-500)]" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              )}
              <span className="text-xs font-semibold text-[var(--ink-600)]">
                {editingPreset 
                  ? `Editing: ${editingPreset.name}` 
                  : 'New Custom Style'
                }
              </span>
            </div>
            <button
              onClick={() => {
                setEditingPreset(null);
                setShowEditor(false);
                setCustomPrompt(settings.artStyle?.customPrompt || '');
                setCustomImage(settings.artStyle?.referenceImage || null);
              }}
              className="text-xs text-[var(--ink-500)] hover:text-[var(--ink-700)] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Reference Image Upload */}
          <div>
            <label className="text-xs text-[var(--ink-500)] mb-1.5 block">Reference Image (optional)</label>
            <div className="flex items-start gap-3">
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--ink-200)] bg-white flex items-center justify-center overflow-hidden">
                {customImage ? (
                  <img src={customImage} alt="Reference" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-5 h-5 text-[var(--ink-300)]" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="btn-secondary text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  {customImage ? 'Change' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {customImage && (
                  <button
                    onClick={handleRemoveImage}
                    className="text-xs text-[var(--ink-400)] hover:text-red-500 cursor-pointer transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--ink-500)] mb-1.5 block">Style Description</label>
            <textarea
              value={customPrompt}
              onChange={(e) => handleCustomPromptChange(e.target.value)}
              placeholder="Describe your custom art style in detail... (e.g., 'Watercolor painting with soft edges, muted colors, and visible paper texture')"
              className="input-field min-h-[80px] resize-none text-sm"
            />
          </div>

          <div className="flex gap-2">
            {editingPreset ? (
              <button
                onClick={handleSavePresetContent}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3" /> Save Changes
              </button>
            ) : (
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={!customPrompt?.trim()}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <Save className="w-3 h-3" /> Save as Preset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="p-3 bg-[var(--accent-primary-subtle)] rounded-xl space-y-2 border border-[var(--accent-primary)]">
          <p className="text-xs font-medium text-[var(--ink-600)]">Name your custom style:</p>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g., My Watercolor Style"
            className="input-field text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCustom();
              if (e.key === 'Escape') setShowSaveDialog(false);
            }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowSaveDialog(false)} className="text-xs text-[var(--ink-500)]">Cancel</button>
            <button onClick={handleSaveCustom} className="btn-primary text-xs py-1 px-3">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Reusable card component for displaying and editing presets
 */
function PresetCard({ preset, onLoad, onDelete, onUpdate, onEditContent, isEditing, renderPreview }) {
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(preset.name);

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    await onUpdate(preset.id, { name: editName });
    setEditingName(false);
  };

  return (
    <div className={`group flex items-center gap-2 p-2.5 rounded-xl transition-colors ${
      isEditing 
        ? 'bg-[var(--accent-primary-subtle)] border border-[var(--accent-primary)]' 
        : 'bg-[var(--ink-50)] hover:bg-[var(--ink-100)]'
    }`}>
      {renderPreview && renderPreview(preset)}
      
      {editingName ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 text-xs px-2 py-1 rounded border border-[var(--ink-200)] focus:outline-none focus:border-[var(--accent-primary)]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName();
              if (e.key === 'Escape') setEditingName(false);
            }}
          />
          <button onClick={handleSaveName} className="text-xs text-[var(--accent-primary)] hover:underline">Save</button>
          <button onClick={() => setEditingName(false)} className="text-xs text-[var(--ink-400)]">Cancel</button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => onLoad(preset)}
              className="text-xs font-medium text-[var(--ink-700)] hover:text-[var(--accent-primary)] text-left truncate block w-full"
            >
              {preset.name}
            </button>
            {preset.data?.customPrompt && (
              <p className="text-[10px] text-[var(--ink-400)] truncate mt-0.5">
                {preset.data.customPrompt}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEditContent && (
              <button
                onClick={() => onEditContent(preset)}
                className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] hover:bg-white rounded-lg"
                title="Edit content"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setEditingName(true)}
              className="p-1.5 text-[var(--ink-400)] hover:text-[var(--ink-600)] hover:bg-white rounded-lg"
              title="Rename"
            >
              <span className="text-[10px] font-medium">Aa</span>
            </button>
            <button
              onClick={() => onDelete(preset.id)}
              className="p-1.5 text-[var(--ink-400)] hover:text-red-500 hover:bg-white rounded-lg"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MoodTab({ settings, updateSettings }) {
  const [customColors, setCustomColors] = useState(settings.colorPalette || ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316']);
  const [customMoodPrompt, setCustomMoodPrompt] = useState('');
  const [customName, setCustomName] = useState('');
  const [savedPresets, setSavedPresets] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [activePresetId, setActivePresetId] = useState(null);

  useEffect(() => {
    getCustomPresets('mood').then(setSavedPresets);
  }, []);

  const isUsingCustomPreset = activePresetId !== null;
  const activePreset = savedPresets.find(p => p.id === activePresetId);

  const handleMoodSelect = (preset) => {
    setActivePresetId(null);
    setEditingPreset(null);
    setShowEditor(false);
    updateSettings('mood', preset.id);
    updateSettings('colorPalette', preset.colors);
  };

  const handleCreateNew = () => {
    setActivePresetId(null);
    setEditingPreset(null);
    setCustomColors(['#3b82f6', '#8b5cf6', '#ec4899', '#f97316']);
    setCustomMoodPrompt('');
    setShowEditor(true);
  };

  const handleColorChange = (index, color) => {
    const newColors = [...customColors];
    newColors[index] = color;
    setCustomColors(newColors);
  };

  const addColor = () => {
    if (customColors.length < 6) {
      const newColors = [...customColors, '#6b7280'];
      setCustomColors(newColors);
    }
  };

  const removeColor = (index) => {
    if (customColors.length > 2) {
      const newColors = customColors.filter((_, i) => i !== index);
      setCustomColors(newColors);
    }
  };

  const handleSaveCustom = async () => {
    if (!customName?.trim()) return;
    const preset = createCustomPreset('mood', customName, { colors: customColors, moodPrompt: customMoodPrompt });
    await saveCustomPreset(preset);
    setSavedPresets([...savedPresets, preset]);
    setShowSaveDialog(false);
    setShowEditor(false);
    setCustomName('');
    setActivePresetId(preset.id);
    updateSettings('mood', 'custom');
    updateSettings('colorPalette', customColors);
  };

  const handleLoadPreset = (preset) => {
    setActivePresetId(preset.id);
    setEditingPreset(null);
    setShowEditor(false);
    setCustomColors(preset.data.colors);
    setCustomMoodPrompt(preset.data.moodPrompt || '');
    updateSettings('mood', 'custom');
    updateSettings('colorPalette', preset.data.colors);
  };

  const handleDeletePreset = async (id) => {
    await deleteCustomPreset(id);
    setSavedPresets(savedPresets.filter(p => p.id !== id));
    if (activePresetId === id) {
      setActivePresetId(null);
    }
  };

  const handleEditPresetContent = (preset) => {
    setEditingPreset(preset);
    setShowEditor(true);
    setCustomColors(preset.data?.colors || ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316']);
    setCustomMoodPrompt(preset.data?.moodPrompt || '');
  };

  const handleSavePresetContent = async () => {
    if (!editingPreset) return;
    const updated = await updateCustomPreset(editingPreset.id, { 
      data: { colors: customColors, moodPrompt: customMoodPrompt } 
    });
    setSavedPresets(savedPresets.map(p => p.id === editingPreset.id ? updated : p));
    setEditingPreset(null);
    setShowEditor(false);
    if (activePresetId === editingPreset.id) {
      updateSettings('colorPalette', customColors);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Selection Card */}
      <div className={`rounded-xl border-2 p-4 transition-all ${settings.mood ? 'bg-white border-[var(--accent-primary)] shadow-sm' : 'bg-[var(--ink-50)] border-dashed border-[var(--ink-200)]'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${settings.mood ? 'bg-[var(--accent-primary-subtle)]' : 'bg-[var(--ink-100)]'}`}>
              <Sun className={`w-5 h-5 ${settings.mood ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-400)]'}`} />
            </div>
            <div>
              <p className="text-xs text-[var(--ink-500)] mb-0.5">Mood & Atmosphere</p>
              {settings.mood ? (
                <>
                  <p className="font-semibold text-[var(--ink-900)]">
                    {isUsingCustomPreset 
                      ? `${activePreset?.name} (Custom)` 
                      : MOOD_PRESETS.find(m => m.id === settings.mood)?.name || 'Custom'}
                  </p>
                  {(settings.colorPalette || []).length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {settings.colorPalette.slice(0, 5).map((c, i) => (
                        <div key={i} className="w-5 h-5 rounded-md shadow-sm" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--ink-400)] italic">Not selected (optional)</p>
              )}
            </div>
          </div>
          {settings.mood && (
            <button
              onClick={() => { updateSettings('mood', ''); updateSettings('colorPalette', []); setActivePresetId(null); }}
              className="text-xs text-[var(--ink-400)] hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Built-in Moods */}
      <div>
        <p className="text-xs text-[var(--ink-400)] mb-2">Built-in Moods</p>
        <div className="grid grid-cols-4 gap-2">
          {MOOD_PRESETS.map((preset) => {
            const isSelected = settings.mood === preset.id && !isUsingCustomPreset;
            return (
              <button
                key={preset.id}
                onClick={() => handleMoodSelect(preset)}
                className={`relative p-2 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30'
                    : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:shadow-md'
                }`}
              >
                {/* Color Preview with centered check */}
                <div className="relative w-full aspect-square rounded-lg mb-1.5 overflow-hidden flex flex-wrap">
                  {preset.colors.map((color, i) => (
                    <div key={i} className="w-1/2 h-1/2" style={{ backgroundColor: color }} />
                  ))}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-[var(--ink-700)] block truncate">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Custom Moods Section */}
      <div className="border-t border-[var(--ink-100)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-[var(--ink-500)] flex items-center gap-1">
            <Star className="w-3 h-3" /> Your Custom Moods
          </h4>
          <button
            onClick={handleCreateNew}
            className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary-dark)] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" /> Create New
          </button>
        </div>

        {/* Saved Presets */}
        {savedPresets.length > 0 && (
          <div className="space-y-2 mb-4">
            {savedPresets.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`group p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]'
                      : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)] hover:shadow-sm bg-white'
                  }`}
                  onClick={() => handleLoadPreset(preset)}
                >
                  <div className="flex items-center gap-3">
                    {/* Color preview */}
                    <div className="flex gap-0.5 shrink-0">
                      {preset.data.colors.slice(0, 4).map((c, i) => (
                        <div key={i} className="w-5 h-5 rounded" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <div className="w-4 h-4 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <span className={`text-sm font-medium transition-colors ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-700)] group-hover:text-[var(--ink-900)]'}`}>
                          {preset.name}
                        </span>
                      </div>
                      {preset.data?.moodPrompt && (
                        <p className="text-xs text-[var(--ink-400)] mt-0.5 truncate">
                          {preset.data.moodPrompt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditPresetContent(preset); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] hover:bg-white rounded-lg cursor-pointer transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-red-500 hover:bg-white rounded-lg cursor-pointer transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {savedPresets.length === 0 && !showEditor && (
          <p className="text-xs text-[var(--ink-400)] italic mb-4">
            No custom moods yet. Click "Create New" to make one.
          </p>
        )}
      </div>

      {/* Custom Mood Editor */}
      {showEditor && (
        <div className="space-y-3 p-3 bg-[var(--ink-50)] rounded-xl border border-[var(--ink-200)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingPreset ? (
                <Pencil className="w-3.5 h-3.5 text-[var(--ink-500)]" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              )}
              <span className="text-xs font-semibold text-[var(--ink-600)]">
                {editingPreset ? `Editing: ${editingPreset.name}` : 'New Custom Mood'}
              </span>
            </div>
            <button
              onClick={() => {
                setEditingPreset(null);
                setShowEditor(false);
                setCustomColors(settings.colorPalette || ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316']);
              }}
              className="text-xs text-[var(--ink-500)] hover:text-[var(--ink-700)] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Color Palette Editor */}
          <div>
            <label className="text-xs text-[var(--ink-500)] mb-1.5 block">Color Palette</label>
            <div className="flex gap-2 items-center flex-wrap">
              {customColors.map((color, index) => (
                <div key={index} className="relative group">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    className="w-9 h-9 rounded-lg cursor-pointer border-2 border-[var(--ink-200)]"
                  />
                  {customColors.length > 2 && (
                    <button
                      onClick={() => removeColor(index)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  )}
                </div>
              ))}
              {customColors.length < 6 && (
                <button
                  onClick={addColor}
                  className="w-9 h-9 rounded-lg border-2 border-dashed border-[var(--ink-200)] flex items-center justify-center text-[var(--ink-400)] hover:border-[var(--ink-300)] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--ink-500)] mb-1.5 block">Mood Description (optional)</label>
            <input
              type="text"
              value={customMoodPrompt}
              onChange={(e) => setCustomMoodPrompt(e.target.value)}
              placeholder="e.g., 'Nostalgic, bittersweet atmosphere'"
              className="input-field text-sm"
            />
          </div>

          <div className="flex gap-2">
            {editingPreset ? (
              <button
                onClick={handleSavePresetContent}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3" /> Save Changes
              </button>
            ) : (
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={customColors.length < 2}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <Save className="w-3 h-3" /> Save as Preset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="p-3 bg-[var(--accent-primary-subtle)] rounded-xl space-y-2 border border-[var(--accent-primary)]">
          <p className="text-xs font-medium text-[var(--ink-600)]">Name your custom mood:</p>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g., Sunset Vibes"
            className="input-field text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCustom();
              if (e.key === 'Escape') setShowSaveDialog(false);
            }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowSaveDialog(false)} className="text-xs text-[var(--ink-500)]">Cancel</button>
            <button onClick={handleSaveCustom} className="btn-primary text-xs py-1 px-3">Save</button>
          </div>
        </div>
      )}

      {/* Current Palette Preview */}
      {(settings.colorPalette || []).length > 0 && (
        <div className="p-3 bg-[var(--ink-50)] rounded-xl">
          <p className="text-xs text-[var(--ink-400)] mb-2">Current palette:</p>
          <div className="flex gap-1">
            {(settings.colorPalette || []).map((color, i) => (
              <div key={i} className="flex-1 h-6 rounded first:rounded-l-lg last:rounded-r-lg" style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MediumTab({ settings, updateSettings }) {
  const [customPrompt, setCustomPrompt] = useState(settings.customMediumPrompt || '');
  const [customName, setCustomName] = useState('');
  const [customImage, setCustomImage] = useState(null);
  const [savedPresets, setSavedPresets] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [activePresetId, setActivePresetId] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    getCustomPresets('medium').then(presets => {
      setSavedPresets(presets);
      // Check if current custom setting matches a preset
      if (settings.styleMedium === 'custom' && settings.customMediumPrompt) {
        const matchingPreset = presets.find(p => p.data?.prompt === settings.customMediumPrompt);
        if (matchingPreset) {
          setActivePresetId(matchingPreset.id);
          setCustomImage(matchingPreset.data?.referenceImage || null);
        }
      }
    });
  }, []);

  const isUsingCustomPreset = activePresetId !== null;
  const activePreset = savedPresets.find(p => p.id === activePresetId);

  const handleMediumSelect = (medium) => {
    setActivePresetId(null);
    setEditingPreset(null);
    setShowEditor(false);
    updateSettings('styleMedium', medium.id);
  };

  const handleCreateNew = () => {
    setActivePresetId(null);
    setEditingPreset(null);
    setCustomPrompt('');
    setCustomImage(null);
    setShowEditor(true);
  };

  const handleSaveCustom = async () => {
    if (!customName?.trim() || !customPrompt?.trim()) return;
    const preset = createCustomPreset('medium', customName, { prompt: customPrompt, referenceImage: customImage });
    await saveCustomPreset(preset);
    const newPresets = [...savedPresets, preset];
    setSavedPresets(newPresets);
    setActivePresetId(preset.id);
    setShowSaveDialog(false);
    setCustomName('');
  };

  const handleLoadPreset = (preset) => {
    const prompt = preset.data?.prompt || '';
    setCustomPrompt(prompt);
    setCustomImage(preset.data?.referenceImage || null);
    setActivePresetId(preset.id);
    setEditingPreset(null);
    setShowEditor(false);
    updateSettings('styleMedium', 'custom');
    updateSettings('customMediumPrompt', prompt);
  };

  const handleDeletePreset = async (id) => {
    await deleteCustomPreset(id);
    setSavedPresets(savedPresets.filter(p => p.id !== id));
    if (activePresetId === id) {
      setActivePresetId(null);
    }
  };

  const handleUpdatePreset = async (id, updates) => {
    const updated = await updateCustomPreset(id, updates);
    setSavedPresets(savedPresets.map(p => p.id === id ? updated : p));
    if (activePresetId === id && updates.name) {
      updateSettings('customMediumPrompt', updated.data?.prompt);
    }
  };

  const handleEditPresetContent = (preset) => {
    setEditingPreset(preset);
    setShowEditor(true);
    setCustomPrompt(preset.data?.prompt || '');
    setCustomImage(preset.data?.referenceImage || null);
  };

  const handleSavePresetContent = async () => {
    if (!editingPreset) return;
    const updated = await updateCustomPreset(editingPreset.id, { data: { prompt: customPrompt, referenceImage: customImage } });
    setSavedPresets(savedPresets.map(p => p.id === editingPreset.id ? updated : p));
    setEditingPreset(null);
    setShowEditor(false);
    if (activePresetId === editingPreset.id) {
      updateSettings('customMediumPrompt', customPrompt);
    }
  };

  const handleCustomPromptChange = (value) => {
    setCustomPrompt(value);
    if (!editingPreset) {
      if (activePresetId) {
        setActivePresetId(null);
      }
      updateSettings('styleMedium', 'custom');
      updateSettings('customMediumPrompt', value);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target.result;
        setCustomImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setCustomImage(null);
  };

  return (
    <div className="space-y-4">
      {/* Current Selection Card */}
      <div className={`rounded-xl border-2 p-4 transition-all ${settings.styleMedium ? 'bg-white border-[var(--accent-primary)] shadow-sm' : 'bg-[var(--ink-50)] border-dashed border-[var(--ink-200)]'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${settings.styleMedium ? 'bg-[var(--accent-primary-subtle)]' : 'bg-[var(--ink-100)]'}`}>
              <Brush className={`w-5 h-5 ${settings.styleMedium ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-400)]'}`} />
            </div>
            <div>
              <p className="text-xs text-[var(--ink-500)] mb-0.5">Artistic Medium</p>
              {settings.styleMedium ? (
                <p className="font-semibold text-[var(--ink-900)]">
                  {isUsingCustomPreset 
                    ? `${activePreset?.name} (Custom)` 
                    : settings.styleMedium === 'custom'
                      ? 'Custom Medium'
                      : STYLE_MEDIUMS.find(m => m.id === settings.styleMedium)?.name}
                </p>
              ) : (
                <p className="text-sm text-[var(--ink-400)] italic">Not selected (optional)</p>
              )}
            </div>
          </div>
          {settings.styleMedium && (
            <button
              onClick={() => { updateSettings('styleMedium', ''); updateSettings('customMediumPrompt', ''); setActivePresetId(null); setShowEditor(false); }}
              className="text-xs text-[var(--ink-400)] hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Built-in Mediums */}
      <div>
        <p className="text-xs text-[var(--ink-400)] mb-2">Built-in Mediums</p>
        <div className="grid grid-cols-4 gap-2">
          {STYLE_MEDIUMS.map((medium) => {
            const isSelected = settings.styleMedium === medium.id && !isUsingCustomPreset;
            return (
              <button
                key={medium.id}
                onClick={() => handleMediumSelect(medium)}
                className={`relative p-1.5 rounded-xl border-2 text-center transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30'
                    : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:shadow-md'
                }`}
              >
                {/* Medium Preview Image */}
                <div className="relative w-full aspect-square rounded-lg mb-1.5 overflow-hidden bg-[var(--ink-100)]">
                  <img 
                    src={medium.previewImage} 
                    alt={medium.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-[var(--ink-700)] block truncate">{medium.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Custom Mediums Section */}
      <div className="border-t border-[var(--ink-100)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-[var(--ink-500)] flex items-center gap-1">
            <Star className="w-3 h-3" /> Your Custom Mediums
          </h4>
          <button
            onClick={handleCreateNew}
            className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary-dark)] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" /> Create New
          </button>
        </div>

        {/* Saved Presets Grid */}
        {savedPresets.length > 0 && (
          <div className="space-y-2 mb-4">
            {savedPresets.map((preset) => {
              const isActive = activePresetId === preset.id;
              const isBeingEdited = editingPreset?.id === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`group p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]'
                      : isBeingEdited
                        ? 'border-[var(--ink-300)] bg-[var(--ink-50)]'
                        : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)] hover:shadow-sm bg-white'
                  }`}
                  onClick={() => handleLoadPreset(preset)}
                >
                  <div className="flex items-start gap-3">
                    {/* Preview thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-[var(--ink-100)] flex items-center justify-center overflow-hidden shrink-0">
                      {preset.data?.referenceImage ? (
                        <img src={preset.data.referenceImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Brush className="w-5 h-5 text-[var(--ink-400)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <div className="w-4 h-4 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <span className={`text-sm font-medium transition-colors ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-700)] group-hover:text-[var(--ink-900)]'}`}>
                          {preset.name}
                        </span>
                      </div>
                      {preset.data?.prompt && (
                        <p className="text-xs text-[var(--ink-400)] mt-1 line-clamp-2">
                          {preset.data.prompt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditPresetContent(preset); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] hover:bg-white rounded-lg cursor-pointer transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-red-500 hover:bg-white rounded-lg cursor-pointer transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {savedPresets.length === 0 && !showEditor && (
          <p className="text-xs text-[var(--ink-400)] italic mb-4">
            No custom mediums yet. Click "Create New" to make one.
          </p>
        )}
      </div>

      {/* Custom Medium Editor */}
      {showEditor && (
        <div className="space-y-3 p-3 bg-[var(--ink-50)] rounded-xl border border-[var(--ink-200)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingPreset ? (
                <Pencil className="w-3.5 h-3.5 text-[var(--ink-500)]" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              )}
              <span className="text-xs font-semibold text-[var(--ink-600)]">
                {editingPreset 
                  ? `Editing: ${editingPreset.name}` 
                  : 'New Custom Medium'
                }
              </span>
            </div>
            <button
              onClick={() => {
                setEditingPreset(null);
                setShowEditor(false);
                setCustomPrompt(settings.customMediumPrompt || '');
                setCustomImage(null);
              }}
              className="text-xs text-[var(--ink-500)] hover:text-[var(--ink-700)] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Reference Image Upload */}
          <div>
            <label className="text-xs text-[var(--ink-500)] mb-1.5 block">Reference Image (optional)</label>
            <div className="flex items-start gap-3">
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--ink-200)] bg-white flex items-center justify-center overflow-hidden">
                {customImage ? (
                  <img src={customImage} alt="Reference" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-5 h-5 text-[var(--ink-300)]" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="btn-secondary text-xs py-1.5 px-3 cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  {customImage ? 'Change' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {customImage && (
                  <button
                    onClick={handleRemoveImage}
                    className="text-xs text-[var(--ink-400)] hover:text-red-500 cursor-pointer transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--ink-500)] mb-1.5 block">Medium Description</label>
            <textarea
              value={customPrompt}
              onChange={(e) => handleCustomPromptChange(e.target.value)}
              placeholder="Describe your custom medium (e.g., 'Gouache painting with visible brush strokes and matte finish')"
              className="input-field min-h-[80px] resize-none text-sm"
            />
          </div>

          <div className="flex gap-2">
            {editingPreset ? (
              <button
                onClick={handleSavePresetContent}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3" /> Save Changes
              </button>
            ) : (
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={!customPrompt?.trim()}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <Save className="w-3 h-3" /> Save as Preset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="p-3 bg-[var(--accent-primary-subtle)] rounded-xl space-y-2 border border-[var(--accent-primary)]">
          <p className="text-xs font-medium text-[var(--ink-600)]">Name your custom medium:</p>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g., My Gouache Style"
            className="input-field text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCustom();
              if (e.key === 'Escape') setShowSaveDialog(false);
            }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowSaveDialog(false)} className="text-xs text-[var(--ink-500)] cursor-pointer">Cancel</button>
            <button onClick={handleSaveCustom} className="btn-primary text-xs py-1 px-3 cursor-pointer">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LightingTab({ settings, updateSettings: updateSettingsProp }) {
  const updateSettings = (key, value) => {
    updateSettingsProp(key, value);
  };

  const [customConditions, setCustomConditions] = useState(settings.customLighting?.conditions || '');
  const [customShadows, setCustomShadows] = useState(settings.customLighting?.shadows || '');
  const [customName, setCustomName] = useState('');
  const [savedPresets, setSavedPresets] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [activePresetId, setActivePresetId] = useState(null);

  useEffect(() => {
    getCustomPresets('lighting').then(setSavedPresets);
  }, []);

  const isUsingCustomPreset = activePresetId !== null;
  const activePreset = savedPresets.find(p => p.id === activePresetId);

  const handleLightingSelect = (preset) => {
    setActivePresetId(null);
    setEditingPreset(null);
    setShowEditor(false);
    updateSettings('defaultLighting', preset.id);
    updateSettings('customLighting', { conditions: preset.conditions, shadows: preset.shadows });
  };

  const handleCreateNew = () => {
    setActivePresetId(null);
    setEditingPreset(null);
    setCustomConditions('');
    setCustomShadows('');
    setShowEditor(true);
  };

  const handleSaveCustom = async () => {
    if (!customName?.trim() || !customConditions?.trim()) return;
    const preset = createCustomPreset('lighting', customName, { conditions: customConditions, shadows: customShadows });
    await saveCustomPreset(preset);
    setSavedPresets([...savedPresets, preset]);
    setShowSaveDialog(false);
    setShowEditor(false);
    setCustomName('');
    setActivePresetId(preset.id);
    updateSettings('defaultLighting', 'custom');
    updateSettings('customLighting', { conditions: customConditions, shadows: customShadows });
  };

  const handleLoadPreset = (preset) => {
    setActivePresetId(preset.id);
    setEditingPreset(null);
    setShowEditor(false);
    setCustomConditions(preset.data?.conditions || '');
    setCustomShadows(preset.data?.shadows || '');
    updateSettings('defaultLighting', 'custom');
    updateSettings('customLighting', preset.data);
  };

  const handleDeletePreset = async (id) => {
    await deleteCustomPreset(id);
    setSavedPresets(savedPresets.filter(p => p.id !== id));
    if (activePresetId === id) setActivePresetId(null);
  };

  const handleEditPresetContent = (preset) => {
    setEditingPreset(preset);
    setShowEditor(true);
    setCustomConditions(preset.data?.conditions || '');
    setCustomShadows(preset.data?.shadows || '');
  };

  const handleSavePresetContent = async () => {
    if (!editingPreset) return;
    const updated = await updateCustomPreset(editingPreset.id, { 
      data: { conditions: customConditions, shadows: customShadows } 
    });
    setSavedPresets(savedPresets.map(p => p.id === editingPreset.id ? updated : p));
    setEditingPreset(null);
    setShowEditor(false);
    if (activePresetId === editingPreset.id) {
      updateSettings('customLighting', { conditions: customConditions, shadows: customShadows });
    }
  };

  const handleClearSelection = () => {
    setActivePresetId(null);
    updateSettings('defaultLighting', '');
    updateSettings('customLighting', null);
  };

  return (
    <div className="space-y-4">
      {/* Current Selection Card */}
      <div className={`rounded-xl border-2 p-4 transition-all ${settings.defaultLighting ? 'bg-white border-[var(--accent-primary)] shadow-sm' : 'bg-[var(--ink-50)] border-dashed border-[var(--ink-200)]'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${settings.defaultLighting ? 'bg-[var(--accent-primary-subtle)]' : 'bg-[var(--ink-100)]'}`}>
              <Lightbulb className={`w-5 h-5 ${settings.defaultLighting ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-400)]'}`} />
            </div>
            <div>
              <p className="text-xs text-[var(--ink-500)] mb-0.5">Default Lighting</p>
              {settings.defaultLighting ? (
                <p className="font-semibold text-[var(--ink-900)]">
                  {isUsingCustomPreset 
                    ? `${activePreset?.name} (Custom)` 
                    : LIGHTING_PRESETS.find(l => l.id === settings.defaultLighting)?.name || 'Custom'}
                </p>
              ) : (
                <p className="text-sm text-[var(--ink-400)] italic">Not selected (optional)</p>
              )}
            </div>
          </div>
          {settings.defaultLighting && (
            <button
              onClick={handleClearSelection}
              className="text-xs text-[var(--ink-400)] hover:text-red-500 hover:bg-red-50 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Built-in Lightings */}
      <div>
        <p className="text-xs text-[var(--ink-400)] mb-2">Built-in Lightings</p>
        <div className="grid grid-cols-4 gap-2">
          {LIGHTING_PRESETS.map((preset) => {
            const isSelected = settings.defaultLighting === preset.id && !isUsingCustomPreset;
            return (
              <button
                key={preset.id}
                onClick={() => handleLightingSelect(preset)}
                className={`relative p-2 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30'
                    : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:shadow-md'
                }`}
              >
                {/* Image Preview with centered check */}
                <div className="relative w-full aspect-square rounded-lg mb-1.5 overflow-hidden bg-[var(--ink-100)]">
                  {preset.previewImage ? (
                    <img src={preset.previewImage} alt={preset.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Lightbulb className="w-6 h-6 text-[var(--ink-300)]" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-[var(--ink-700)] block truncate">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Custom Lightings Section */}
      <div className="border-t border-[var(--ink-100)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-[var(--ink-500)] flex items-center gap-1">
            <Star className="w-3 h-3" /> Your Custom Lightings
          </h4>
          <button
            onClick={handleCreateNew}
            className="text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary-dark)] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" /> Create New
          </button>
        </div>

        {/* Saved Presets */}
        {savedPresets.length > 0 && (
          <div className="space-y-2 mb-4">
            {savedPresets.map((preset) => {
              const isActive = activePresetId === preset.id;
              const isBeingEdited = editingPreset?.id === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`group p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]'
                      : isBeingEdited
                        ? 'border-[var(--ink-300)] bg-[var(--ink-50)]'
                        : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)] hover:shadow-sm bg-white'
                  }`}
                  onClick={() => handleLoadPreset(preset)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-200 to-orange-300 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <div className="w-4 h-4 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <span className={`text-sm font-medium transition-colors ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-700)] group-hover:text-[var(--ink-900)]'}`}>
                          {preset.name}
                        </span>
                      </div>
                      {preset.data?.conditions && (
                        <p className="text-xs text-[var(--ink-400)] mt-1 line-clamp-1">
                          {preset.data.conditions}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditPresetContent(preset); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] hover:bg-white rounded-lg cursor-pointer transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-red-500 hover:bg-white rounded-lg cursor-pointer transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {savedPresets.length === 0 && !showEditor && (
          <p className="text-xs text-[var(--ink-400)] italic mb-4">No custom lightings yet. Click "Create New" to make one.</p>
        )}
      </div>

      {/* Custom Lighting Editor */}
      {showEditor && (
        <div className="space-y-3 p-4 bg-[var(--ink-50)] rounded-xl border border-[var(--ink-200)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingPreset ? (
                <Pencil className="w-4 h-4 text-[var(--ink-500)]" />
              ) : (
                <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
              )}
              <span className="text-sm font-semibold text-[var(--ink-600)]">
                {editingPreset ? `Editing: ${editingPreset.name}` : 'New Custom Lighting'}
              </span>
            </div>
            <button
              onClick={() => { setEditingPreset(null); setShowEditor(false); }}
              className="text-xs text-[var(--ink-500)] hover:text-[var(--ink-700)] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="text-xs text-[var(--ink-500)] mb-1 block">Lighting Conditions</label>
            <input
              type="text"
              value={customConditions}
              onChange={(e) => setCustomConditions(e.target.value)}
              placeholder="e.g., 'Candlelight, warm flickering light'"
              className="input-field text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--ink-500)] mb-1 block">Shadow Style</label>
            <input
              type="text"
              value={customShadows}
              onChange={(e) => setCustomShadows(e.target.value)}
              placeholder="e.g., 'Soft, dancing shadows'"
              className="input-field text-sm"
            />
          </div>

          <div className="flex gap-2">
            {editingPreset ? (
              <button
                onClick={handleSavePresetContent}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Changes
              </button>
            ) : (
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={!customConditions?.trim()}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save as Preset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="p-4 bg-[var(--accent-primary-subtle)] rounded-xl space-y-3 border border-[var(--accent-primary)]">
          <p className="text-sm font-medium text-[var(--ink-600)]">Name your custom lighting:</p>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g., Candlelit Scene"
            className="input-field text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCustom();
              if (e.key === 'Escape') setShowSaveDialog(false);
            }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowSaveDialog(false)} className="text-sm text-[var(--ink-500)] cursor-pointer">Cancel</button>
            <button onClick={handleSaveCustom} className="btn-primary text-sm py-2 px-4 cursor-pointer">Save</button>
          </div>
        </div>
      )}

      {/* Current Lighting Preview */}
      {settings.defaultLighting && settings.defaultLighting !== 'custom' && !isUsingCustomPreset && (
        <div className="p-3 bg-[var(--ink-50)] rounded-xl space-y-1">
          <p className="text-xs text-[var(--ink-600)]">
            <strong>Conditions:</strong> {LIGHTING_PRESETS.find(l => l.id === settings.defaultLighting)?.conditions}
          </p>
          <p className="text-xs text-[var(--ink-600)]">
            <strong>Shadows:</strong> {LIGHTING_PRESETS.find(l => l.id === settings.defaultLighting)?.shadows}
          </p>
        </div>
      )}
    </div>
  );
}

function CharactersTab({ settings, updateSettings, imageStatus = {}, onGenerateImage, onRegenerateImage }) {
  const characters = settings.characters || [];
  const [savedPresets, setSavedPresets] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(null);
  const [presetName, setPresetName] = useState('');
  const [editingCharacter, setEditingCharacter] = useState(null); // ID of character being edited (replaces view)

  useEffect(() => {
    getCustomPresets('character').then(setSavedPresets);
  }, []);

  const addCharacter = () => {
    const newChar = {
      id: generateId(),
      name: '',
      description: '',
      referenceImage: null
    };
    updateSettings('characters', [...characters, newChar]);
    setEditingCharacter(newChar.id); // Open editor for new character
  };

  const updateCharacter = (id, updates) => {
    updateSettings('characters', characters.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCharacter = (id) => {
    updateSettings('characters', characters.filter(c => c.id !== id));
    if (editingCharacter === id) setEditingCharacter(null);
  };

  const handleImageUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => updateCharacter(id, { referenceImage: event.target.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCharacter = async (char) => {
    if (!presetName?.trim()) return;
    const preset = createCustomPreset('character', presetName, {
      name: char.name,
      description: char.description,
      referenceImage: char.referenceImage
    });
    await saveCustomPreset(preset);
    setSavedPresets([...savedPresets, preset]);
    setShowSaveDialog(null);
    setPresetName('');
  };

  const handleLoadPreset = (preset) => {
    const newChar = {
      id: generateId(),
      name: preset.data?.name || '',
      description: preset.data?.description || '',
      referenceImage: preset.data?.referenceImage || null
    };
    updateSettings('characters', [...characters, newChar]);
    setEditingCharacter(newChar.id);
  };

  const handleDeletePreset = async (id) => {
    await deleteCustomPreset(id);
    setSavedPresets(savedPresets.filter(p => p.id !== id));
  };

  const currentChar = characters.find(c => c.id === editingCharacter);
  const isAnyGenerating = Object.values(imageStatus).some(s => s.type === 'character' && s.status === 'generating');

  // Navigation helpers for editing mode
  const currentIndex = characters.findIndex(c => c.id === editingCharacter);
  const prevChar = currentIndex > 0 ? characters[currentIndex - 1] : null;
  const nextChar = currentIndex < characters.length - 1 ? characters[currentIndex + 1] : null;

  // ==================== EDITING VIEW ====================
  if (currentChar) {
    const status = imageStatus[`char-${currentChar.id}`];
    
    return (
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setEditingCharacter(null)}
            className="flex items-center gap-2 text-sm text-[var(--ink-500)] hover:text-[var(--ink-700)] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Characters</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--ink-400)]">
              {currentIndex + 1} of {characters.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => prevChar && setEditingCharacter(prevChar.id)}
                disabled={!prevChar}
                className="p-1.5 rounded-lg text-[var(--ink-400)] hover:text-[var(--ink-600)] hover:bg-[var(--ink-100)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => nextChar && setEditingCharacter(nextChar.id)}
                disabled={!nextChar}
                className="p-1.5 rounded-lg text-[var(--ink-400)] hover:text-[var(--ink-600)] hover:bg-[var(--ink-100)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main editing area - Image prominent on left */}
        <div className="flex gap-6">
          {/* Large Image Preview */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="relative w-48 h-48 rounded-2xl bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex items-center justify-center overflow-hidden border-2 border-dashed border-[var(--ink-200)] shadow-inner">
              {currentChar.referenceImage ? (
                <>
                  <img 
                    src={currentChar.referenceImage} 
                    alt={currentChar.name} 
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => updateCharacter(currentChar.id, { referenceImage: null })}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-[var(--ink-400)] hover:text-red-500 cursor-pointer shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : status?.status === 'generating' ? (
                <div className="flex flex-col items-center gap-2 text-purple-500">
                  <Loader2 className="w-12 h-12 animate-spin" />
                  <span className="text-sm font-medium">Generating...</span>
                </div>
              ) : status?.status === 'pending' ? (
                <div className="flex flex-col items-center gap-2 text-[var(--ink-300)]">
                  <Image className="w-12 h-12" />
                  <span className="text-sm">Waiting...</span>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 text-[var(--ink-400)] hover:text-[var(--accent-primary)] transition-colors">
                  <Upload className="w-10 h-10" />
                  <span className="text-sm font-medium">Upload Image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(currentChar.id, e)} />
                </label>
              )}
            </div>
            {currentChar.referenceImage && (
              <label className="mt-3 text-sm text-[var(--accent-primary)] hover:underline cursor-pointer flex items-center gap-1.5">
                <Upload className="w-4 h-4" /> Change Image
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(currentChar.id, e)} />
              </label>
            )}
            {/* Generate with AI button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (currentChar.name && currentChar.description) {
                  // Use regenerate if image exists (creates NEW different image), generate otherwise (uses stored style)
                  if (currentChar.referenceImage) {
                    onRegenerateImage(currentChar.id);
                  } else {
                    onGenerateImage(currentChar.id);
                  }
                }
              }}
              disabled={!currentChar.name || !currentChar.description || status?.status === 'generating'}
              className={`mt-3 w-full py-2 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                status?.status === 'generating'
                  ? 'bg-purple-100 text-purple-600'
                  : !currentChar.name || !currentChar.description
                  ? 'bg-[var(--ink-100)] text-[var(--ink-400)] cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-lg'
              }`}
            >
              {status?.status === 'generating' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{currentChar.referenceImage ? 'Regenerate' : 'Generate'} with AI</span>
                </>
              )}
            </button>
            {(!currentChar.name || !currentChar.description) && (
              <p className="text-[10px] text-[var(--ink-400)] text-center mt-1">
                Add name and description first
              </p>
            )}
          </div>

          {/* Character Form */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--ink-600)] mb-1.5 block">Character Name</label>
              <input
                type="text"
                value={currentChar.name}
                onChange={(e) => updateCharacter(currentChar.id, { name: e.target.value })}
                placeholder="Enter character name..."
                className="input-field text-base"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--ink-600)] mb-1.5 block">Visual Description</label>
              <textarea
                value={currentChar.description}
                onChange={(e) => updateCharacter(currentChar.id, { description: e.target.value })}
                placeholder="Describe the character's appearance: hair color and style, eye color, skin tone, body type, clothing, distinctive features, accessories..."
                className="input-field text-sm resize-none"
                rows={5}
              />
              <p className="text-xs text-[var(--ink-400)] mt-1.5">
                Be specific! The more details you provide, the more consistent your character will appear across panels.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setShowSaveDialog(currentChar.id)}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save as Preset
              </button>
              <button
                onClick={() => {
                  removeCharacter(currentChar.id);
                }}
                className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Character
              </button>
            </div>
          </div>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="p-4 bg-[var(--accent-primary-subtle)] rounded-xl space-y-3 border border-[var(--accent-primary)]">
            <p className="text-sm font-medium text-[var(--ink-600)]">Save "{currentChar.name || 'character'}" as a reusable preset</p>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className="input-field text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCharacter(currentChar);
                if (e.key === 'Escape') setShowSaveDialog(null);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveDialog(null)} className="text-sm text-[var(--ink-500)] cursor-pointer">Cancel</button>
              <button 
                onClick={() => handleSaveCharacter(currentChar)} 
                className="btn-primary text-sm py-2 px-4 cursor-pointer"
              >
                Save Preset
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--ink-700)]">Characters ({characters.length})</h3>
          {isAnyGenerating && (
            <span className="text-xs text-purple-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating...
            </span>
          )}
        </div>
        <button onClick={addCharacter} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer">
          <Plus className="w-3 h-3" /> Add Character
        </button>
      </div>

      {/* Character Cards Grid */}
      {characters.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {characters.map((char) => {
            const status = imageStatus[`char-${char.id}`];
            return (
              <div
                key={char.id}
                onClick={() => setEditingCharacter(char.id)}
                className="relative group cursor-pointer rounded-xl border-2 overflow-hidden transition-all border-[var(--ink-100)] hover:border-[var(--accent-primary)] hover:shadow-lg"
              >
                {/* Character Image */}
                <div className="aspect-square bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex items-center justify-center overflow-hidden">
                  {char.referenceImage ? (
                    <img 
                      src={char.referenceImage} 
                      alt={char.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : status?.status === 'generating' ? (
                    <div className="flex flex-col items-center gap-1 text-purple-500">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-xs">Generating...</span>
                    </div>
                  ) : status?.status === 'pending' ? (
                    <div className="flex flex-col items-center gap-1 text-[var(--ink-300)]">
                      <Image className="w-8 h-8" />
                      <span className="text-xs">Waiting...</span>
                    </div>
                  ) : (
                    <Users className="w-12 h-12 text-[var(--ink-200)]" />
                  )}
                </div>
                
                {/* Character Name & Edit Hint */}
                <div className="p-2 bg-white">
                  <p className="text-xs font-medium text-[var(--ink-700)] truncate text-center">
                    {char.name || 'Unnamed'}
                  </p>
                  <p className="text-[10px] text-[var(--ink-400)] text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to edit
                  </p>
                </div>

                {/* Quick Delete Button */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeCharacter(char.id); }}
                  className="absolute top-1.5 right-1.5 p-1 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[var(--ink-400)] hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Regenerate Button (only when has image) */}
                {char.referenceImage && status?.status !== 'generating' && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (char.name && char.description) {
                        onRegenerateImage(char.id);
                      }
                    }}
                    disabled={!char.name || !char.description}
                    className="absolute top-1.5 left-1.5 p-1.5 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-purple-500 hover:text-purple-700 hover:bg-purple-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Regenerate with AI"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {characters.length === 0 && (
        <div className="text-center py-8 text-[var(--ink-400)]">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm mb-3">No characters defined yet</p>
          <button onClick={addCharacter} className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" /> Add Your First Character
          </button>
        </div>
      )}

      {/* Saved Character Presets */}
      {savedPresets.length > 0 && (
        <div className="border-t border-[var(--ink-100)] pt-4">
          <h4 className="text-xs font-semibold text-[var(--ink-500)] mb-3 flex items-center gap-1">
            <Star className="w-3 h-3" /> Your Saved Characters
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {savedPresets.map((preset) => (
              <div
                key={preset.id}
                className="group relative rounded-xl border-2 border-[var(--ink-100)] overflow-hidden cursor-pointer hover:border-[var(--ink-300)] hover:shadow-sm transition-all"
                onClick={() => handleLoadPreset(preset)}
              >
                <div className="aspect-square bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex items-center justify-center overflow-hidden">
                  {preset.data?.referenceImage ? (
                    <img src={preset.data.referenceImage} alt={preset.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-8 h-8 text-[var(--ink-200)]" />
                  )}
                </div>
                <div className="p-1.5 bg-white">
                  <p className="text-[10px] font-medium text-[var(--ink-700)] truncate text-center">{preset.name}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                  className="absolute top-1 right-1 p-1 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[var(--ink-400)] hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LocationsTab({ settings, updateSettings, imageStatus = {}, onGenerateImage, onRegenerateImage }) {
  const locations = settings.locations || [];
  const [savedPresets, setSavedPresets] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(null);
  const [presetName, setPresetName] = useState('');
  const [editingLocation, setEditingLocation] = useState(null); // ID of location being edited

  useEffect(() => {
    getCustomPresets('location').then(setSavedPresets);
  }, []);

  const addLocation = () => {
    const newLoc = {
      id: generateId(),
      name: '',
      description: '',
      referenceImage: null
    };
    updateSettings('locations', [...locations, newLoc]);
    setEditingLocation(newLoc.id); // Open editor for new location
  };

  const updateLocation = (id, updates) => {
    updateSettings('locations', locations.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const removeLocation = (id) => {
    updateSettings('locations', locations.filter(l => l.id !== id));
    if (editingLocation === id) setEditingLocation(null);
  };

  const handleImageUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => updateLocation(id, { referenceImage: event.target.result });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLocation = async (loc) => {
    if (!presetName?.trim()) return;
    const preset = createCustomPreset('location', presetName, {
      name: loc.name,
      description: loc.description,
      referenceImage: loc.referenceImage
    });
    await saveCustomPreset(preset);
    setSavedPresets([...savedPresets, preset]);
    setShowSaveDialog(null);
    setPresetName('');
  };

  const handleLoadPreset = (preset) => {
    const newLoc = {
      id: generateId(),
      name: preset.data?.name || '',
      description: preset.data?.description || '',
      referenceImage: preset.data?.referenceImage || null
    };
    updateSettings('locations', [...locations, newLoc]);
    setEditingLocation(newLoc.id);
  };

  const handleDeletePreset = async (id) => {
    await deleteCustomPreset(id);
    setSavedPresets(savedPresets.filter(p => p.id !== id));
  };

  const currentLoc = locations.find(l => l.id === editingLocation);
  const isAnyGenerating = Object.values(imageStatus).some(s => s.type === 'location' && s.status === 'generating');

  // Navigation helpers for editing mode
  const currentIndex = locations.findIndex(l => l.id === editingLocation);
  const prevLoc = currentIndex > 0 ? locations[currentIndex - 1] : null;
  const nextLoc = currentIndex < locations.length - 1 ? locations[currentIndex + 1] : null;

  // ==================== EDITING VIEW ====================
  if (currentLoc) {
    const status = imageStatus[`loc-${currentLoc.id}`];
    
    return (
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setEditingLocation(null)}
            className="flex items-center gap-2 text-sm text-[var(--ink-500)] hover:text-[var(--ink-700)] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Locations</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--ink-400)]">
              {currentIndex + 1} of {locations.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => prevLoc && setEditingLocation(prevLoc.id)}
                disabled={!prevLoc}
                className="p-1.5 rounded-lg text-[var(--ink-400)] hover:text-[var(--ink-600)] hover:bg-[var(--ink-100)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => nextLoc && setEditingLocation(nextLoc.id)}
                disabled={!nextLoc}
                className="p-1.5 rounded-lg text-[var(--ink-400)] hover:text-[var(--ink-600)] hover:bg-[var(--ink-100)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main editing area - Image prominent on left */}
        <div className="flex gap-6">
          {/* Large Image Preview - Wider for locations (landscape) */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="relative w-64 h-40 rounded-2xl bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex items-center justify-center overflow-hidden border-2 border-dashed border-[var(--ink-200)] shadow-inner">
              {currentLoc.referenceImage ? (
                <>
                  <img 
                    src={currentLoc.referenceImage} 
                    alt={currentLoc.name} 
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => updateLocation(currentLoc.id, { referenceImage: null })}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full text-[var(--ink-400)] hover:text-red-500 cursor-pointer shadow-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : status?.status === 'generating' ? (
                <div className="flex flex-col items-center gap-2 text-purple-500">
                  <Loader2 className="w-12 h-12 animate-spin" />
                  <span className="text-sm font-medium">Generating...</span>
                </div>
              ) : status?.status === 'pending' ? (
                <div className="flex flex-col items-center gap-2 text-[var(--ink-300)]">
                  <Image className="w-12 h-12" />
                  <span className="text-sm">Waiting...</span>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 text-[var(--ink-400)] hover:text-[var(--accent-primary)] transition-colors">
                  <Upload className="w-10 h-10" />
                  <span className="text-sm font-medium">Upload Image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(currentLoc.id, e)} />
                </label>
              )}
            </div>
            {currentLoc.referenceImage && (
              <label className="mt-3 text-sm text-[var(--accent-primary)] hover:underline cursor-pointer flex items-center gap-1.5">
                <Upload className="w-4 h-4" /> Change Image
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(currentLoc.id, e)} />
              </label>
            )}
            {/* Generate with AI button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (currentLoc.name && currentLoc.description) {
                  // Use regenerate if image exists (creates NEW different image), generate otherwise (uses stored style)
                  if (currentLoc.referenceImage) {
                    onRegenerateImage(currentLoc.id);
                  } else {
                    onGenerateImage(currentLoc.id);
                  }
                }
              }}
              disabled={!currentLoc.name || !currentLoc.description || status?.status === 'generating'}
              className={`mt-3 w-full py-2 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                status?.status === 'generating'
                  ? 'bg-purple-100 text-purple-600'
                  : !currentLoc.name || !currentLoc.description
                  ? 'bg-[var(--ink-100)] text-[var(--ink-400)] cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 shadow-md hover:shadow-lg'
              }`}
            >
              {status?.status === 'generating' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{currentLoc.referenceImage ? 'Regenerate' : 'Generate'} with AI</span>
                </>
              )}
            </button>
            {(!currentLoc.name || !currentLoc.description) && (
              <p className="text-[10px] text-[var(--ink-400)] text-center mt-1">
                Add name and description first
              </p>
            )}
          </div>

          {/* Location Form */}
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-sm font-medium text-[var(--ink-600)] mb-1.5 block">Location Name</label>
              <input
                type="text"
                value={currentLoc.name}
                onChange={(e) => updateLocation(currentLoc.id, { name: e.target.value })}
                placeholder="e.g., Cozy Coffee Shop, Dark Alleyway..."
                className="input-field text-base"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--ink-600)] mb-1.5 block">Visual Description</label>
              <textarea
                value={currentLoc.description}
                onChange={(e) => updateLocation(currentLoc.id, { description: e.target.value })}
                placeholder="Describe the environment: architecture, lighting, weather, atmosphere, key elements, time of day..."
                className="input-field text-sm resize-none"
                rows={5}
              />
              <p className="text-xs text-[var(--ink-400)] mt-1.5">
                Include details about lighting, atmosphere, and notable objects in the scene.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setShowSaveDialog(currentLoc.id)}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save as Preset
              </button>
              <button
                onClick={() => {
                  removeLocation(currentLoc.id);
                }}
                className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Location
              </button>
            </div>
          </div>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="p-4 bg-[var(--accent-primary-subtle)] rounded-xl space-y-3 border border-[var(--accent-primary)]">
            <p className="text-sm font-medium text-[var(--ink-600)]">Save "{currentLoc.name || 'location'}" as a reusable preset</p>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className="input-field text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveLocation(currentLoc);
                if (e.key === 'Escape') setShowSaveDialog(null);
              }}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSaveDialog(null)} className="text-sm text-[var(--ink-500)] cursor-pointer">Cancel</button>
              <button 
                onClick={() => handleSaveLocation(currentLoc)} 
                className="btn-primary text-sm py-2 px-4 cursor-pointer"
              >
                Save Preset
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--ink-700)]">Locations ({locations.length})</h3>
          {isAnyGenerating && (
            <span className="text-xs text-purple-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Generating...
            </span>
          )}
        </div>
        {locations.length > 0 && (
          <button onClick={addLocation} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer">
            <Plus className="w-3 h-3" /> Add Location
          </button>
        )}
      </div>

      {/* Location Cards Grid */}
      {locations.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {locations.map((loc) => {
            const status = imageStatus[`loc-${loc.id}`];
            return (
              <div
                key={loc.id}
                onClick={() => setEditingLocation(loc.id)}
                className="relative group cursor-pointer rounded-xl border-2 overflow-hidden transition-all border-[var(--ink-100)] hover:border-[var(--accent-primary)] hover:shadow-lg"
              >
                {/* Location Image */}
                <div className="aspect-video bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex items-center justify-center overflow-hidden">
                  {loc.referenceImage ? (
                    <img 
                      src={loc.referenceImage} 
                      alt={loc.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : status?.status === 'generating' ? (
                    <div className="flex flex-col items-center gap-1 text-purple-500">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-xs">Generating...</span>
                    </div>
                  ) : status?.status === 'pending' ? (
                    <div className="flex flex-col items-center gap-1 text-[var(--ink-300)]">
                      <Image className="w-8 h-8" />
                      <span className="text-xs">Waiting...</span>
                    </div>
                  ) : (
                    <MapPin className="w-10 h-10 text-[var(--ink-200)]" />
                  )}
                </div>
                
                {/* Location Name & Edit Hint */}
                <div className="p-2 bg-white">
                  <p className="text-xs font-medium text-[var(--ink-700)] truncate text-center">
                    {loc.name || 'Unnamed'}
                  </p>
                  <p className="text-[10px] text-[var(--ink-400)] text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to edit
                  </p>
                </div>

                {/* Quick Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeLocation(loc.id); }}
                  className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[var(--ink-400)] hover:text-red-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Regenerate Button (only when has image) */}
                {loc.referenceImage && status?.status !== 'generating' && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (loc.name && loc.description) {
                        onRegenerateImage(loc.id);
                      }
                    }}
                    disabled={!loc.name || !loc.description}
                    className="absolute top-2 left-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-purple-500 hover:text-purple-700 hover:bg-purple-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Regenerate with AI"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
          
          {/* Add Location Card */}
          <div
            onClick={addLocation}
            className="rounded-xl border-2 border-dashed border-[var(--ink-200)] overflow-hidden hover:border-[var(--accent-primary)] hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="aspect-video bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex flex-col items-center justify-center gap-2 text-[var(--ink-400)] group-hover:text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary-subtle)] transition-colors">
              <Plus className="w-10 h-10" />
            </div>
            <div className="p-2 bg-white">
              <p className="text-xs font-medium text-[var(--ink-400)] group-hover:text-[var(--accent-primary)] text-center transition-colors">Add Location</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {locations.length === 0 && (
        <div className="text-center py-8 text-[var(--ink-400)]">
          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm mb-3">No locations defined yet</p>
          <button onClick={addLocation} className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" /> Add Your First Location
          </button>
        </div>
      )}

      {/* Saved Location Presets */}
      {savedPresets.length > 0 && (
        <div className="border-t border-[var(--ink-100)] pt-4">
          <h4 className="text-xs font-semibold text-[var(--ink-500)] mb-2 flex items-center gap-1">
            <Star className="w-3 h-3" /> Your Saved Locations
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {savedPresets.map((preset) => (
              <div
                key={preset.id}
                className="group relative rounded-xl border-2 border-[var(--ink-100)] overflow-hidden cursor-pointer hover:border-[var(--ink-300)] hover:shadow-sm transition-all"
                onClick={() => handleLoadPreset(preset)}
              >
                <div className="aspect-video bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex items-center justify-center overflow-hidden">
                  {preset.data?.referenceImage ? (
                    <img src={preset.data.referenceImage} alt={preset.name} className="w-full h-full object-cover" />
                  ) : (
                    <MapPin className="w-5 h-5 text-[var(--ink-200)]" />
                  )}
                </div>
                <div className="p-1 bg-white">
                  <p className="text-[10px] font-medium text-[var(--ink-700)] truncate text-center">{preset.name}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                  className="absolute top-1 right-1 p-1 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[var(--ink-400)] hover:text-red-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
