'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Users, MapPin, Palette, ArrowRight, ArrowLeft, Check, Plus, X, 
  Upload, Trash2, Sparkles, ChevronRight, Sun, Brush, Lightbulb, Save, Star, Pencil, BookOpen
} from 'lucide-react';
import { ART_STYLES, CHARACTER_COLORS, MOOD_PRESETS, STYLE_MEDIUMS, LIGHTING_PRESETS, PROJECT_CONTEXTS } from '../types';
import { generateId, getCustomPresets, saveCustomPreset, deleteCustomPreset, createCustomPreset, updateCustomPreset } from '../lib/storage';

/**
 * Reusable editable preset item for the wizard
 */
function EditablePresetItem({ preset, onLoad, onDelete, onRename, preview, renderPreview }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(preset.name);

  const handleSave = () => {
    if (editName.trim() && editName !== preset.name) {
      onRename(editName);
    }
    setEditing(false);
  };

  return (
    <div className="group flex items-center gap-2 p-2.5 bg-[var(--ink-50)] hover:bg-[var(--ink-100)] rounded-xl transition-colors">
      {renderPreview && renderPreview(preset)}
      
      {editing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 text-sm px-2 py-1 rounded border border-[var(--ink-200)] focus:outline-none focus:border-[var(--accent-primary)]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <button onClick={handleSave} className="text-xs text-[var(--accent-primary)]">Save</button>
          <button onClick={() => setEditing(false)} className="text-xs text-[var(--ink-400)]">Cancel</button>
        </div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => onLoad(preset)}
              className="text-sm font-medium text-[var(--ink-700)] hover:text-[var(--accent-primary)] text-left block truncate w-full"
            >
              {preset.name}
            </button>
            {preview && (
              <p className="text-xs text-[var(--ink-400)] truncate mt-0.5">{preview}</p>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] rounded-lg"
              title="Rename"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(preset.id)}
              className="p-1.5 text-[var(--ink-400)] hover:text-red-500 rounded-lg"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const STEPS = [
  { id: 'story', label: 'Story', icon: BookOpen, description: 'Define your narrative' },
  { id: 'style', label: 'Style', icon: Palette, description: 'Define the visual style' },
  { id: 'medium', label: 'Medium', icon: Brush, description: 'Choose artistic medium' },
  { id: 'mood', label: 'Mood', icon: Sun, description: 'Set the atmosphere' },
  { id: 'lighting', label: 'Lighting', icon: Lightbulb, description: 'Default lighting style' },
  { id: 'characters', label: 'Characters', icon: Users, description: 'Create your cast' },
  { id: 'locations', label: 'Locations', icon: MapPin, description: 'Set your scenes' },
];

/**
 * @param {Object} props
 * @param {import('../types').Project} props.project
 * @param {(settings: import('../types').ProjectSettings) => void} props.onComplete
 * @param {() => void} props.onSkip
 * @param {import('../types').ProjectSettings} [props.initialSettings] - Pre-populated settings from AI
 * @param {() => void} [props.onSwitchToAI] - Callback to switch to AI story idea screen
 * @param {() => void} [props.onBackToChoose] - Callback to go back to choose path screen
 */
export default function ProjectSetupWizard({ project, onComplete, onSkip, initialSettings, onSwitchToAI, onBackToChoose }) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Determine project context based on project type
  const getDefaultContext = () => {
    const contextMap = {
      'comic': 'comic-panel',
      'manga': 'manga-panel',
      'storyboard': 'storyboard',
      'graphic-novel': 'graphic-novel'
    };
    return contextMap[project.type] || 'comic-panel';
  };

  const [settings, setSettings] = useState(() => {
    // If we have AI-generated settings, use them as initial values
    if (initialSettings) {
      return {
        characters: initialSettings.characters || [],
        locations: initialSettings.locations || [],
        artStyle: initialSettings.artStyle || null,
        styleMedium: initialSettings.styleMedium || null,
        mood: initialSettings.mood || null,
        colorPalette: initialSettings.colorPalette || null,
        defaultLighting: initialSettings.defaultLighting || null,
        projectContext: initialSettings.projectContext || getDefaultContext(),
        storyContext: initialSettings.storyContext || { title: '', genre: '', synopsis: '', themes: [] },
        setupComplete: false
      };
    }
    // Default empty state
    return {
      characters: [],
      locations: [],
      artStyle: null,
      styleMedium: null,
      mood: null,
      colorPalette: null,
      defaultLighting: null,
      projectContext: getDefaultContext(),
      storyContext: { title: '', genre: '', synopsis: '', themes: [] },
      setupComplete: false
    };
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete({ ...settings, setupComplete: true });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateSettings = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'story':
        return (
          <StoryStep
            storyContext={settings.storyContext}
            onChange={(ctx) => updateSettings('storyContext', ctx)}
          />
        );
      case 'style':
        return (
          <StyleStep 
            artStyle={settings.artStyle} 
            onChange={(style) => updateSettings('artStyle', style)} 
          />
        );
      case 'medium':
        return (
          <MediumStep 
            styleMedium={settings.styleMedium}
            onChange={(medium) => updateSettings('styleMedium', medium)}
          />
        );
      case 'mood':
        return (
          <MoodStep 
            mood={settings.mood}
            colorPalette={settings.colorPalette}
            onMoodChange={(mood) => updateSettings('mood', mood)}
            onColorsChange={(colors) => updateSettings('colorPalette', colors)}
          />
        );
      case 'lighting':
        return (
          <LightingStep 
            defaultLighting={settings.defaultLighting}
            onChange={(lighting) => updateSettings('defaultLighting', lighting)}
          />
        );
      case 'characters':
        return (
          <CharactersStep 
            characters={settings.characters} 
            onChange={(chars) => updateSettings('characters', chars)} 
          />
        );
      case 'locations':
        return (
          <LocationsStep 
            locations={settings.locations} 
            onChange={(locs) => updateSettings('locations', locs)} 
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const CurrentIcon = STEPS[currentStep].icon;

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] bg-pattern">
      {/* Header */}
      <header className="bg-[var(--paper-white)]/80 backdrop-blur-md border-b border-[var(--ink-100)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>
                {project.name}
              </h1>
              <p className="text-sm text-[var(--ink-400)]">Project Setup</p>
            </div>
            <button
              onClick={onSkip}
              className="text-sm text-[var(--ink-400)] hover:text-[var(--ink-600)] transition-colors"
            >
              Skip and start creating →
            </button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-center gap-1 mb-8 flex-wrap lg:flex-nowrap">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(index)}
                  className={`group flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'text-white shadow-lg scale-105' 
                      : isCompleted
                        ? 'bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20'
                        : 'bg-[var(--ink-50)] text-[var(--ink-400)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-600)]'
                  }`}
                  style={isActive ? { 
                    background: 'var(--accent-primary-gradient)',
                    boxShadow: '0 4px 14px rgba(232, 93, 76, 0.35)'
                  } : undefined}
                >
                  <div className={`flex items-center justify-center w-5 h-5 rounded-md transition-all ${
                    isActive 
                      ? 'bg-white/20' 
                      : isCompleted 
                        ? 'bg-[var(--accent-primary)]/10' 
                        : 'bg-transparent group-hover:bg-[var(--ink-200)]/50'
                  }`}>
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <StepIcon className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="text-xs sm:text-sm font-medium hidden sm:inline whitespace-nowrap">{step.label}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--ink-200)] mx-0.5 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg" style={{ background: 'var(--accent-primary-gradient)' }}>
            <CurrentIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--ink-900)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {STEPS[currentStep].label}
          </h2>
          <p className="text-[var(--ink-500)]">{STEPS[currentStep].description}</p>
        </div>

        {/* Step Content */}
        <div className="bg-[var(--paper-white)] rounded-2xl shadow-lg border border-[var(--ink-100)] p-6 mb-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={currentStep === 0 ? onBackToChoose : handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-[var(--ink-600)] hover:bg-[var(--ink-50)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <button
            onClick={handleNext}
            className="btn-primary flex items-center gap-2"
          >
            {isLastStep ? (
              <>
                <Sparkles className="w-4 h-4" />
                Start Creating
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Switch to AI route */}
        {onSwitchToAI && (
          <div className="text-center mt-6 pt-6 border-t border-[var(--ink-100)]">
            <p className="text-sm text-[var(--ink-400)]">
              Want AI to help you configure?{' '}
              <button
                onClick={onSwitchToAI}
                className="text-purple-600 hover:underline font-medium"
              >
                Describe your story idea instead
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StoryStep({ storyContext, onChange }) {
  const updateField = (field, value) => {
    onChange({
      ...storyContext,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-[var(--ink-700)] mb-2">
          Working Title
        </label>
        <input
          type="text"
          value={storyContext?.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
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
          value={storyContext?.genre || ''}
          onChange={(e) => updateField('genre', e.target.value)}
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
          value={storyContext?.synopsis || ''}
          onChange={(e) => updateField('synopsis', e.target.value)}
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
          value={(storyContext?.themes || []).join(', ')}
          onChange={(e) => updateField('themes', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
          placeholder="e.g., Redemption, Love, Survival, Identity..."
          className="w-full px-4 py-3 bg-[var(--ink-50)] border-2 border-[var(--ink-200)] rounded-xl text-[var(--ink-900)] placeholder:text-[var(--ink-400)] focus:outline-none focus:border-[var(--accent-primary)]"
        />
        <p className="text-xs text-[var(--ink-400)] mt-1">Separate themes with commas</p>
      </div>

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-medium text-amber-700 mb-2">💡 Why define your story?</p>
        <ul className="text-sm text-amber-600 space-y-1">
          <li>• Helps AI maintain narrative consistency across panels</li>
          <li>• Guides visual style decisions for each scene</li>
          <li>• Serves as a quick reference while creating</li>
        </ul>
      </div>
    </div>
  );
}

function StyleStep({ artStyle, onChange }) {
  const [customPrompt, setCustomPrompt] = useState(artStyle?.customPrompt || '');
  const [customImage, setCustomImage] = useState(artStyle?.referenceImage || null);
  const [savedPresets, setSavedPresets] = useState([]);
  const [customName, setCustomName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [activePresetId, setActivePresetId] = useState(null);
  const [editingPreset, setEditingPreset] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    getCustomPresets('art-style').then(presets => {
      setSavedPresets(presets);
      if (artStyle?.id === 'custom' && artStyle?.customPrompt) {
        const matchingPreset = presets.find(p => p.data?.customPrompt === artStyle.customPrompt);
        if (matchingPreset) {
          setActivePresetId(matchingPreset.id);
          setCustomImage(matchingPreset.data?.referenceImage || null);
        }
      }
    });
  }, []);

  const isUsingCustomPreset = activePresetId !== null;
  const activePreset = savedPresets.find(p => p.id === activePresetId);

  const handleStyleSelect = (style) => {
    setActivePresetId(null);
    setEditingPreset(null);
    setShowEditor(false);
    onChange(style);
  };

  const handleClearSelection = () => {
    setActivePresetId(null);
    setEditingPreset(null);
    setShowEditor(false);
    setCustomPrompt('');
    setCustomImage(null);
    onChange(null);
  };

  const handleCreateNew = () => {
    setActivePresetId(null);
    setEditingPreset(null);
    setCustomPrompt('');
    setCustomImage(null);
    setShowEditor(true);
  };

  const handleCustomPromptChange = (value) => {
    setCustomPrompt(value);
    if (activePresetId) setActivePresetId(null);
    onChange({ id: 'custom', name: 'Custom', customPrompt: value, referenceImage: customImage });
  };

  const handleSaveCustom = async () => {
    if (!customName.trim() || !customPrompt.trim()) return;
    const preset = createCustomPreset('art-style', customName, { customPrompt, referenceImage: customImage });
    await saveCustomPreset(preset);
    const newPresets = [...savedPresets, preset];
    setSavedPresets(newPresets);
    setActivePresetId(preset.id);
    setShowSaveDialog(false);
    setCustomName('');
  };

  const handleLoadPreset = (preset) => {
    setCustomPrompt(preset.data?.customPrompt || '');
    setCustomImage(preset.data?.referenceImage || null);
    setActivePresetId(preset.id);
    setEditingPreset(null);
    setShowEditor(false);
    onChange({ id: 'custom', name: preset.name, customPrompt: preset.data?.customPrompt || '', referenceImage: preset.data?.referenceImage });
  };

  const handleDeletePreset = async (id) => {
    await deleteCustomPreset(id);
    setSavedPresets(savedPresets.filter(p => p.id !== id));
    if (activePresetId === id) setActivePresetId(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target.result;
        setCustomImage(imageData);
        if (artStyle?.id === 'custom') {
          onChange({ ...artStyle, referenceImage: imageData });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setCustomImage(null);
    if (artStyle?.id === 'custom') {
      onChange({ ...artStyle, referenceImage: null });
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--ink-500)] text-center">
        Choose an art style that will be applied consistently across all AI-generated images in your project.
        <span className="block text-xs text-[var(--ink-400)] mt-1">(Optional - you can skip this step)</span>
      </p>

      {/* Current Selection Indicator */}
      {artStyle ? (
        <div className="flex items-center justify-center gap-2 p-2 bg-[var(--accent-primary-subtle)] rounded-lg">
          <Check className="w-4 h-4 text-[var(--accent-primary)]" />
          <span className="text-xs text-[var(--ink-600)]">Selected:</span>
          <span className="text-xs font-semibold text-[var(--accent-primary)]">
            {isUsingCustomPreset ? `${activePreset?.name} (Custom)` : artStyle.name || 'None'}
          </span>
          <button
            onClick={handleClearSelection}
            className="ml-2 p-1 text-[var(--ink-400)] hover:text-red-500 rounded transition-colors cursor-pointer"
            title="Clear selection"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 p-2 bg-[var(--ink-50)] rounded-lg">
          <span className="text-xs text-[var(--ink-400)]">No art style selected (optional)</span>
        </div>
      )}

      {/* Built-in Styles */}
      <div>
        <p className="text-xs text-[var(--ink-400)] mb-2">Built-in Styles</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ART_STYLES.filter(s => s.id !== 'custom').map((style) => {
            const isSelected = artStyle?.id === style.id && !isUsingCustomPreset;
            return (
              <button
                key={style.id}
                onClick={() => handleStyleSelect(style)}
                className={`relative p-2 rounded-xl border-2 text-center transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30'
                    : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:shadow-md'
                }`}
              >
                {/* Style Preview Image */}
                <div className="relative w-full aspect-square rounded-lg mb-2 overflow-hidden bg-[var(--ink-100)]">
                  <img 
                    src={style.previewImage} 
                    alt={style.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/20 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-[var(--ink-700)] block truncate">{style.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Custom Styles Section */}
      <div className="border-t border-[var(--ink-100)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-[var(--ink-500)] flex items-center gap-1">
            <Star className="w-4 h-4" /> Your Custom Styles
          </h4>
          <button
            onClick={handleCreateNew}
            className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
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
                      : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)] hover:shadow-sm'
                  }`}
                  onClick={() => handleLoadPreset(preset)}
                >
                  <div className="flex items-start gap-3">
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
                        <span className={`text-sm font-medium ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-700)]'}`}>
                          {preset.name}
                        </span>
                      </div>
                      {preset.data?.customPrompt && (
                        <p className="text-xs text-[var(--ink-400)] mt-1 line-clamp-2">{preset.data.customPrompt}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingPreset(preset); setCustomPrompt(preset.data?.customPrompt || ''); setCustomImage(preset.data?.referenceImage || null); setShowEditor(true); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] rounded-lg cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-red-500 rounded-lg cursor-pointer"
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
          <p className="text-xs text-[var(--ink-400)] italic mb-4">No custom styles yet. Click "Create New" to make one.</p>
        )}
      </div>

      {/* Custom Style Editor */}
      {showEditor && (
        <div className="space-y-4 p-4 bg-[var(--ink-50)] rounded-xl border border-[var(--ink-200)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingPreset ? (
                <Pencil className="w-4 h-4 text-[var(--ink-500)]" />
              ) : (
                <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
              )}
              <span className="text-sm font-semibold text-[var(--ink-600)]">
                {editingPreset ? `Editing: ${editingPreset.name}` : 'New Custom Style'}
              </span>
            </div>
            <button
              onClick={() => { setEditingPreset(null); setShowEditor(false); }}
              className="text-xs text-[var(--ink-500)] hover:text-[var(--ink-700)] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Reference Image Upload */}
          <div>
            <label className="text-xs text-[var(--ink-500)] mb-2 block">Reference Image (optional)</label>
            <div className="flex items-start gap-3">
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--ink-200)] bg-white flex items-center justify-center overflow-hidden">
                {customImage ? (
                  <img src={customImage} alt="Reference" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-5 h-5 text-[var(--ink-300)]" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn-secondary text-sm py-2 px-3 cursor-pointer flex items-center gap-1">
                  <Upload className="w-4 h-4" />
                  {customImage ? 'Change' : 'Upload'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {customImage && (
                  <button onClick={handleRemoveImage} className="text-xs text-[var(--ink-400)] hover:text-red-500 cursor-pointer">
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--ink-500)] mb-2 block">Style Description</label>
            <textarea
              value={customPrompt}
              onChange={(e) => handleCustomPromptChange(e.target.value)}
              placeholder="E.g., 'Vibrant cel-shaded style with thick outlines, inspired by Studio Ghibli...'"
              className="input-field min-h-[100px] resize-none"
            />
          </div>

          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!customPrompt.trim()}
            className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save as Preset
          </button>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="p-4 bg-[var(--accent-primary-subtle)] rounded-xl space-y-3 border border-[var(--accent-primary)]">
          <p className="text-sm font-medium text-[var(--ink-600)]">Name your custom style:</p>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g., My Ghibli Style"
            className="input-field"
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
    </div>
  );
}

function MoodStep({ mood, colorPalette, onMoodChange, onColorsChange }) {
  const [customColors, setCustomColors] = useState(colorPalette && colorPalette.length > 0 ? colorPalette : ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316']);
  const [customMoodPrompt, setCustomMoodPrompt] = useState('');
  const [savedPresets, setSavedPresets] = useState([]);
  const [customName, setCustomName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
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
    onMoodChange(preset.id);
    onColorsChange(preset.colors);
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
    if (!customName.trim()) return;
    const preset = createCustomPreset('mood', customName, { colors: customColors, moodPrompt: customMoodPrompt });
    await saveCustomPreset(preset);
    setSavedPresets([...savedPresets, preset]);
    setShowSaveDialog(false);
    setShowEditor(false);
    setCustomName('');
    setActivePresetId(preset.id);
    onMoodChange('custom');
    onColorsChange(customColors);
  };

  const handleLoadPreset = (preset) => {
    setActivePresetId(preset.id);
    setEditingPreset(null);
    setShowEditor(false);
    setCustomColors(preset.data.colors);
    setCustomMoodPrompt(preset.data.moodPrompt || '');
    onMoodChange('custom');
    onColorsChange(preset.data.colors);
  };

  const handleDeletePreset = async (id) => {
    await deleteCustomPreset(id);
    setSavedPresets(savedPresets.filter(p => p.id !== id));
    if (activePresetId === id) setActivePresetId(null);
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
      onColorsChange(customColors);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--ink-500)] text-center">
        Set the mood and color palette. This helps maintain visual consistency across all panels.
        <span className="block text-xs text-[var(--ink-400)] mt-1">(Optional - you can skip this step)</span>
      </p>

      {/* Current Selection Indicator */}
      <div className={`flex items-center justify-center gap-2 p-2 rounded-lg ${mood ? 'bg-[var(--accent-primary-subtle)]' : 'bg-[var(--ink-50)]'}`}>
        {mood ? (
          <>
            <Check className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-xs text-[var(--ink-600)]">Selected:</span>
            <span className="text-xs font-semibold text-[var(--accent-primary)]">
              {isUsingCustomPreset 
                ? `${activePreset?.name} (Custom)` 
                : MOOD_PRESETS.find(m => m.id === mood)?.name || 'Custom'}
            </span>
            <div className="flex gap-0.5 ml-2">
              {(colorPalette || []).slice(0, 4).map((c, i) => (
                <div key={i} className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
              ))}
            </div>
            <button
              onClick={() => { onMoodChange(null); onColorsChange(null); setActivePresetId(null); }}
              className="ml-2 p-1 text-[var(--ink-400)] hover:text-red-500 rounded transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <span className="text-xs text-[var(--ink-400)]">No mood selected (optional)</span>
        )}
      </div>

      {/* Built-in Moods */}
      <div>
        <p className="text-xs text-[var(--ink-400)] mb-2">Built-in Moods</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MOOD_PRESETS.map((preset) => {
            const isSelected = mood === preset.id && !isUsingCustomPreset;
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
                <div className="relative w-full aspect-square rounded-lg mb-2 overflow-hidden flex flex-wrap">
                  {preset.colors.map((color, i) => (
                    <div key={i} className="w-1/2 h-1/2" style={{ backgroundColor: color }} />
                  ))}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/20 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-[var(--ink-700)] block truncate">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Custom Moods Section */}
      <div className="border-t border-[var(--ink-100)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-[var(--ink-500)] flex items-center gap-1">
            <Star className="w-4 h-4" /> Your Custom Moods
          </h4>
          <button
            onClick={handleCreateNew}
            className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
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
                      : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)] hover:shadow-sm'
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
                        <span className={`text-sm font-medium ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-700)]'}`}>
                          {preset.name}
                        </span>
                      </div>
                      {preset.data?.moodPrompt && (
                        <p className="text-xs text-[var(--ink-400)] mt-0.5 truncate">{preset.data.moodPrompt}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditPresetContent(preset); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] rounded-lg cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-red-500 rounded-lg cursor-pointer"
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
          <p className="text-xs text-[var(--ink-400)] italic mb-4">No custom moods yet. Click "Create New" to make one.</p>
        )}
      </div>

      {/* Custom Mood Editor */}
      {showEditor && (
        <div className="space-y-4 p-4 bg-[var(--ink-50)] rounded-xl border border-[var(--ink-200)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingPreset ? (
                <Pencil className="w-4 h-4 text-[var(--ink-500)]" />
              ) : (
                <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
              )}
              <span className="text-sm font-semibold text-[var(--ink-600)]">
                {editingPreset ? `Editing: ${editingPreset.name}` : 'New Custom Mood'}
              </span>
            </div>
            <button
              onClick={() => { setEditingPreset(null); setShowEditor(false); }}
              className="text-xs text-[var(--ink-500)] hover:text-[var(--ink-700)] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Color Palette Editor */}
          <div>
            <label className="text-xs text-[var(--ink-500)] mb-2 block">Color Palette</label>
            <div className="flex flex-wrap gap-2 items-center">
              {customColors.map((color, index) => (
                <div key={index} className="relative group">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-2 border-[var(--ink-200)]"
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
                  className="w-10 h-10 rounded-lg border-2 border-dashed border-[var(--ink-200)] flex items-center justify-center text-[var(--ink-400)] hover:border-[var(--ink-300)] hover:text-[var(--ink-500)] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--ink-500)] mb-2 block">Mood Description (optional)</label>
            <input
              type="text"
              value={customMoodPrompt}
              onChange={(e) => setCustomMoodPrompt(e.target.value)}
              placeholder="e.g., 'Nostalgic, bittersweet atmosphere'"
              className="input-field"
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
                disabled={customColors.length < 2}
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
          <p className="text-sm font-medium text-[var(--ink-600)]">Name your custom mood:</p>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g., Sunset Vibes"
            className="input-field"
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

      {/* Current Palette Preview */}
      {colorPalette && colorPalette.length > 0 && (
        <div className="p-4 bg-[var(--ink-50)] rounded-xl">
          <p className="text-xs text-[var(--ink-400)] mb-2">Current palette:</p>
          <div className="flex gap-2">
            {colorPalette.map((color, i) => (
              <div
                key={i}
                className="flex-1 h-8 rounded-lg shadow-sm first:rounded-l-xl last:rounded-r-xl"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MediumStep({ styleMedium, onChange }) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [customImage, setCustomImage] = useState(null);
  const [savedPresets, setSavedPresets] = useState([]);
  const [customName, setCustomName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [activePresetId, setActivePresetId] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);

  useEffect(() => {
    getCustomPresets('medium').then(presets => {
      setSavedPresets(presets);
    });
  }, []);

  const isUsingCustomPreset = activePresetId !== null;
  const activePreset = savedPresets.find(p => p.id === activePresetId);

  const handleMediumSelect = (medium) => {
    setActivePresetId(null);
    setEditingPreset(null);
    setShowEditor(false);
    onChange(medium.id);
  };

  const handleClearSelection = () => {
    setActivePresetId(null);
    setEditingPreset(null);
    setShowEditor(false);
    setCustomPrompt('');
    setCustomImage(null);
    onChange(null);
  };

  const handleCreateNew = () => {
    setActivePresetId(null);
    setEditingPreset(null);
    setCustomPrompt('');
    setCustomImage(null);
    setShowEditor(true);
  };

  const handleCustomPromptChange = (value) => {
    setCustomPrompt(value);
    if (activePresetId) setActivePresetId(null);
  };

  const handleSaveCustom = async () => {
    if (!customName.trim() || !customPrompt.trim()) return;
    const preset = createCustomPreset('medium', customName, { prompt: customPrompt, referenceImage: customImage });
    await saveCustomPreset(preset);
    const newPresets = [...savedPresets, preset];
    setSavedPresets(newPresets);
    setActivePresetId(preset.id);
    setShowSaveDialog(false);
    setCustomName('');
  };

  const handleLoadPreset = (preset) => {
    setCustomPrompt(preset.data?.prompt || '');
    setCustomImage(preset.data?.referenceImage || null);
    setActivePresetId(preset.id);
    setEditingPreset(null);
    setShowEditor(false);
    onChange('custom');
  };

  const handleDeletePreset = async (id) => {
    await deleteCustomPreset(id);
    setSavedPresets(savedPresets.filter(p => p.id !== id));
    if (activePresetId === id) setActivePresetId(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setCustomImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => setCustomImage(null);

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--ink-500)] text-center">
        What artistic medium should your images look like? This affects texture and rendering style.
        <span className="block text-xs text-[var(--ink-400)] mt-1">(Optional - you can skip this step)</span>
      </p>

      {/* Current Selection Indicator */}
      {styleMedium ? (
        <div className="flex items-center justify-center gap-2 p-2 bg-[var(--accent-primary-subtle)] rounded-lg">
          <Check className="w-4 h-4 text-[var(--accent-primary)]" />
          <span className="text-xs text-[var(--ink-600)]">Selected:</span>
          <span className="text-xs font-semibold text-[var(--accent-primary)]">
            {isUsingCustomPreset 
              ? `${activePreset?.name} (Custom)` 
              : styleMedium === 'custom'
                ? 'Custom Medium'
                : STYLE_MEDIUMS.find(m => m.id === styleMedium)?.name || 'None'}
          </span>
          <button
            onClick={handleClearSelection}
            className="ml-2 p-1 text-[var(--ink-400)] hover:text-red-500 rounded transition-colors cursor-pointer"
            title="Clear selection"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 p-2 bg-[var(--ink-50)] rounded-lg">
          <span className="text-xs text-[var(--ink-400)]">No medium selected (optional)</span>
        </div>
      )}

      {/* Built-in Mediums */}
      <div>
        <p className="text-xs text-[var(--ink-400)] mb-2">Built-in Mediums</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STYLE_MEDIUMS.map((medium) => {
            const isSelected = styleMedium === medium.id && !isUsingCustomPreset;
            return (
              <button
                key={medium.id}
                onClick={() => handleMediumSelect(medium)}
                className={`relative p-2 rounded-xl border-2 text-center transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30'
                    : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:shadow-md'
                }`}
              >
                {/* Medium Preview Image */}
                <div className="relative w-full aspect-square rounded-lg mb-2 overflow-hidden bg-[var(--ink-100)]">
                  <img 
                    src={medium.previewImage} 
                    alt={medium.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/20 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-[var(--ink-700)] block truncate">{medium.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Custom Mediums Section */}
      <div className="border-t border-[var(--ink-100)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-[var(--ink-500)] flex items-center gap-1">
            <Star className="w-4 h-4" /> Your Custom Mediums
          </h4>
          <button
            onClick={handleCreateNew}
            className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
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
                      : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)] hover:shadow-sm'
                  }`}
                  onClick={() => handleLoadPreset(preset)}
                >
                  <div className="flex items-start gap-3">
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
                        <span className={`text-sm font-medium ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-700)]'}`}>
                          {preset.name}
                        </span>
                      </div>
                      {preset.data?.prompt && (
                        <p className="text-xs text-[var(--ink-400)] mt-1 line-clamp-2">{preset.data.prompt}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingPreset(preset); setCustomPrompt(preset.data?.prompt || ''); setCustomImage(preset.data?.referenceImage || null); setShowEditor(true); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] rounded-lg cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-red-500 rounded-lg cursor-pointer"
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
          <p className="text-xs text-[var(--ink-400)] italic mb-4">No custom mediums yet. Click "Create New" to make one.</p>
        )}
      </div>

      {/* Custom Medium Editor */}
      {showEditor && (
        <div className="space-y-4 p-4 bg-[var(--ink-50)] rounded-xl border border-[var(--ink-200)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editingPreset ? (
                <Pencil className="w-4 h-4 text-[var(--ink-500)]" />
              ) : (
                <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
              )}
              <span className="text-sm font-semibold text-[var(--ink-600)]">
                {editingPreset ? `Editing: ${editingPreset.name}` : 'New Custom Medium'}
              </span>
            </div>
            <button
              onClick={() => { setEditingPreset(null); setShowEditor(false); }}
              className="text-xs text-[var(--ink-500)] hover:text-[var(--ink-700)] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {/* Reference Image Upload */}
          <div>
            <label className="text-xs text-[var(--ink-500)] mb-2 block">Reference Image (optional)</label>
            <div className="flex items-start gap-3">
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--ink-200)] bg-white flex items-center justify-center overflow-hidden">
                {customImage ? (
                  <img src={customImage} alt="Reference" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-5 h-5 text-[var(--ink-300)]" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn-secondary text-sm py-2 px-3 cursor-pointer flex items-center gap-1">
                  <Upload className="w-4 h-4" />
                  {customImage ? 'Change' : 'Upload'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {customImage && (
                  <button onClick={handleRemoveImage} className="text-xs text-[var(--ink-400)] hover:text-red-500 cursor-pointer">
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--ink-500)] mb-2 block">Medium Description</label>
            <textarea
              value={customPrompt}
              onChange={(e) => handleCustomPromptChange(e.target.value)}
              placeholder="Describe your custom medium (e.g., 'Gouache painting with visible brush strokes')"
              className="input-field min-h-[80px] resize-none"
            />
          </div>

          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!customPrompt.trim()}
            className="btn-secondary text-sm py-2 px-4 flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save as Preset
          </button>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="p-4 bg-[var(--accent-primary-subtle)] rounded-xl space-y-3 border border-[var(--accent-primary)]">
          <p className="text-sm font-medium text-[var(--ink-600)]">Name your custom medium:</p>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g., My Gouache Style"
            className="input-field"
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
    </div>
  );
}

function LightingStep({ defaultLighting, onChange }) {
  const [customConditions, setCustomConditions] = useState('');
  const [customShadows, setCustomShadows] = useState('');
  const [savedPresets, setSavedPresets] = useState([]);
  const [customName, setCustomName] = useState('');
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
    onChange(preset.id);
  };

  const handleCreateNew = () => {
    setActivePresetId(null);
    setEditingPreset(null);
    setCustomConditions('');
    setCustomShadows('');
    setShowEditor(true);
  };

  const handleSaveCustom = async () => {
    if (!customName.trim() || !customConditions.trim()) return;
    const preset = createCustomPreset('lighting', customName, { conditions: customConditions, shadows: customShadows });
    await saveCustomPreset(preset);
    setSavedPresets([...savedPresets, preset]);
    setShowSaveDialog(false);
    setShowEditor(false);
    setCustomName('');
    setActivePresetId(preset.id);
    onChange('custom');
  };

  const handleLoadPreset = (preset) => {
    setActivePresetId(preset.id);
    setEditingPreset(null);
    setShowEditor(false);
    setCustomConditions(preset.data?.conditions || '');
    setCustomShadows(preset.data?.shadows || '');
    onChange('custom');
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
  };

  const handleClearSelection = () => {
    setActivePresetId(null);
    onChange(null);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--ink-500)] text-center">
        Set the default lighting style. You can override this per panel when generating images.
        <span className="block text-xs text-[var(--ink-400)] mt-1">(Optional - you can skip this step)</span>
      </p>

      {/* Current Selection Indicator */}
      <div className={`flex items-center justify-center gap-2 p-2 rounded-lg ${defaultLighting ? 'bg-[var(--accent-primary-subtle)]' : 'bg-[var(--ink-50)]'}`}>
        {defaultLighting ? (
          <>
            <Check className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-xs text-[var(--ink-600)]">Selected:</span>
            <span className="text-xs font-semibold text-[var(--accent-primary)]">
              {isUsingCustomPreset 
                ? `${activePreset?.name} (Custom)` 
                : LIGHTING_PRESETS.find(l => l.id === defaultLighting)?.name || 'Custom'}
            </span>
            <button
              onClick={handleClearSelection}
              className="ml-2 p-1 text-[var(--ink-400)] hover:text-red-500 rounded transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <span className="text-xs text-[var(--ink-400)]">No lighting selected (optional)</span>
        )}
      </div>

      {/* Built-in Lightings */}
      <div>
        <p className="text-xs text-[var(--ink-400)] mb-2">Built-in Lightings</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LIGHTING_PRESETS.map((preset) => {
            const isSelected = defaultLighting === preset.id && !isUsingCustomPreset;
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
                <div className="relative w-full aspect-square rounded-lg mb-2 overflow-hidden bg-[var(--ink-100)]">
                  {preset.previewImage ? (
                    <img src={preset.previewImage} alt={preset.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Lightbulb className="w-8 h-8 text-[var(--ink-300)]" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/20 flex items-center justify-center">
                      <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-[var(--ink-700)] block truncate">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Custom Lightings Section */}
      <div className="border-t border-[var(--ink-100)] pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-[var(--ink-500)] flex items-center gap-1">
            <Star className="w-4 h-4" /> Your Custom Lightings
          </h4>
          <button
            onClick={handleCreateNew}
            className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1 cursor-pointer"
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
                      : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)] hover:shadow-sm'
                  }`}
                  onClick={() => handleLoadPreset(preset)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-200 to-orange-300 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <div className="w-4 h-4 rounded-full bg-[var(--accent-primary)] flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        <span className={`text-sm font-medium ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-700)]'}`}>
                          {preset.name}
                        </span>
                      </div>
                      {preset.data?.conditions && (
                        <p className="text-xs text-[var(--ink-400)] mt-0.5 truncate">{preset.data.conditions}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditPresetContent(preset); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] rounded-lg cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id); }}
                        className="p-1.5 text-[var(--ink-400)] hover:text-red-500 rounded-lg cursor-pointer"
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
        <div className="space-y-4 p-4 bg-[var(--ink-50)] rounded-xl border border-[var(--ink-200)]">
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
            <label className="text-xs text-[var(--ink-500)] mb-2 block">Lighting Conditions</label>
            <input
              type="text"
              value={customConditions}
              onChange={(e) => setCustomConditions(e.target.value)}
              placeholder="e.g., 'Candlelight, warm flickering light'"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--ink-500)] mb-2 block">Shadow Style</label>
            <input
              type="text"
              value={customShadows}
              onChange={(e) => setCustomShadows(e.target.value)}
              placeholder="e.g., 'Soft, dancing shadows'"
              className="input-field"
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
                disabled={!customConditions.trim()}
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
            className="input-field"
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
      {defaultLighting && defaultLighting !== 'custom' && !isUsingCustomPreset && (
        <div className="p-4 bg-[var(--ink-50)] rounded-xl">
          <p className="text-xs text-[var(--ink-400)] mb-1">Lighting settings:</p>
          <p className="text-sm text-[var(--ink-600)]">
            <strong>Conditions:</strong> {LIGHTING_PRESETS.find(l => l.id === defaultLighting)?.conditions}
          </p>
          <p className="text-sm text-[var(--ink-600)]">
            <strong>Shadows:</strong> {LIGHTING_PRESETS.find(l => l.id === defaultLighting)?.shadows}
          </p>
        </div>
      )}
    </div>
  );
}

function CharactersStep({ characters, onChange }) {
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [savedPresets, setSavedPresets] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(null);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    getCustomPresets('character').then(setSavedPresets);
  }, []);

  const addCharacter = () => {
    const newCharacter = {
      id: generateId(),
      name: '',
      description: '',
      referenceImage: null
    };
    onChange([...characters, newCharacter]);
    setSelectedCharacter(newCharacter.id);
  };

  const updateCharacter = (id, updates) => {
    onChange(characters.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCharacter = (id) => {
    onChange(characters.filter(c => c.id !== id));
    if (selectedCharacter === id) setSelectedCharacter(null);
  };

  const handleImageUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateCharacter(id, { referenceImage: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCharacter = async (char) => {
    if (!presetName.trim()) return;
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
    onChange([...characters, newChar]);
    setSelectedCharacter(newChar.id);
  };

  const handleDeletePreset = async (id) => {
    await deleteCustomPreset(id);
    setSavedPresets(savedPresets.filter(p => p.id !== id));
  };

  const currentChar = characters.find(c => c.id === selectedCharacter);

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--ink-500)] text-center">
        Define your characters with descriptions to maintain visual consistency. Add reference images for better results.
        <span className="block text-xs text-[var(--ink-400)] mt-1">(Optional - you can skip this step)</span>
      </p>

      {/* Character Cards Grid */}
      {characters.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {characters.map((char) => {
            const isSelected = selectedCharacter === char.id;
            return (
              <div
                key={char.id}
                onClick={() => setSelectedCharacter(char.id)}
                className={`relative group cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
                  isSelected
                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30'
                    : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:shadow-md'
                }`}
              >
                {/* Character Image */}
                <div className="aspect-square bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex items-center justify-center overflow-hidden">
                  {char.referenceImage ? (
                    <img src={char.referenceImage} alt={char.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-10 h-10 text-[var(--ink-200)]" />
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/10" />
                  )}
                </div>
                
                {/* Character Name */}
                <div className="p-2 bg-white">
                  <p className="text-sm font-medium text-[var(--ink-700)] truncate text-center">
                    {char.name || 'Unnamed'}
                  </p>
                </div>

                {/* Quick Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeCharacter(char.id); }}
                  className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[var(--ink-400)] hover:text-red-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          
          {/* Add Character Card */}
          <div
            onClick={addCharacter}
            className="rounded-xl border-2 border-dashed border-[var(--ink-200)] overflow-hidden hover:border-[var(--accent-primary)] hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="aspect-square bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex flex-col items-center justify-center gap-2 text-[var(--ink-400)] group-hover:text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary-subtle)] transition-colors">
              <Plus className="w-10 h-10" />
            </div>
            <div className="p-2 bg-white">
              <p className="text-sm font-medium text-[var(--ink-400)] group-hover:text-[var(--accent-primary)] text-center transition-colors">Add</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {characters.length === 0 && (
        <div className="text-center py-10">
          <Users className="w-16 h-16 text-[var(--ink-200)] mx-auto mb-4" />
          <p className="text-[var(--ink-500)] mb-4">No characters yet</p>
          <button onClick={addCharacter} className="btn-primary inline-flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" />
            Add Your First Character
          </button>
        </div>
      )}

      {/* Character Editor Panel */}
      {currentChar && (
        <div className="border border-[var(--ink-200)] rounded-xl overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--ink-50)] border-b border-[var(--ink-100)]">
            <span className="text-sm font-semibold text-[var(--ink-600)]">Edit Character</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSaveDialog(currentChar.id)}
                className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] rounded-lg cursor-pointer"
                title="Save as preset"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeCharacter(currentChar.id)}
                className="p-1.5 text-[var(--ink-400)] hover:text-red-500 rounded-lg cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            {/* Large Image Preview */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative w-40 h-40 rounded-xl bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex items-center justify-center overflow-hidden border-2 border-dashed border-[var(--ink-200)]">
                {currentChar.referenceImage ? (
                  <>
                    <img src={currentChar.referenceImage} alt={currentChar.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => updateCharacter(currentChar.id, { referenceImage: null })}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-[var(--ink-400)] hover:text-red-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 text-[var(--ink-400)] hover:text-[var(--ink-600)]">
                    <Upload className="w-8 h-8" />
                    <span className="text-xs">Add Reference Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(currentChar.id, e)} />
                  </label>
                )}
              </div>
              {currentChar.referenceImage && (
                <label className="mt-3 text-xs text-[var(--accent-primary)] hover:underline cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Change Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(currentChar.id, e)} />
                </label>
              )}
            </div>

            {/* Character Details */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-xs text-[var(--ink-500)] mb-1.5 block">Character Name</label>
                <input
                  type="text"
                  value={currentChar.name}
                  onChange={(e) => updateCharacter(currentChar.id, { name: e.target.value })}
                  placeholder="e.g., Captain Sarah"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--ink-500)] mb-1.5 block">Visual Description</label>
                <textarea
                  value={currentChar.description}
                  onChange={(e) => updateCharacter(currentChar.id, { description: e.target.value })}
                  placeholder="Describe the character's appearance: hair color and style, eye color, skin tone, clothing, distinctive features, accessories..."
                  className="input-field resize-none"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Character Presets */}
      {savedPresets.length > 0 && (
        <div className="border-t border-[var(--ink-100)] pt-4">
          <h4 className="text-sm font-semibold text-[var(--ink-500)] mb-3 flex items-center gap-1">
            <Star className="w-4 h-4" /> Your Saved Characters
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                    <Users className="w-6 h-6 text-[var(--ink-200)]" />
                  )}
                </div>
                <div className="p-1.5 bg-white">
                  <p className="text-xs font-medium text-[var(--ink-700)] truncate text-center">{preset.name}</p>
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

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="p-4 bg-[var(--accent-primary-subtle)] rounded-xl space-y-3 border border-[var(--accent-primary)]">
          <p className="text-sm font-medium text-[var(--ink-600)]">Save "{characters.find(c => c.id === showSaveDialog)?.name || 'character'}" for reuse</p>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name..."
            className="input-field"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCharacter(characters.find(c => c.id === showSaveDialog));
              if (e.key === 'Escape') setShowSaveDialog(null);
            }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowSaveDialog(null)} className="text-sm text-[var(--ink-500)] cursor-pointer">Cancel</button>
            <button 
              onClick={() => handleSaveCharacter(characters.find(c => c.id === showSaveDialog))} 
              className="btn-primary text-sm py-2 px-4 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationsStep({ locations, onChange }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [savedPresets, setSavedPresets] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(null);
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    getCustomPresets('location').then(setSavedPresets);
  }, []);

  const addLocation = () => {
    const newLocation = {
      id: generateId(),
      name: '',
      description: '',
      referenceImage: null
    };
    onChange([...locations, newLocation]);
    setSelectedLocation(newLocation.id);
  };

  const updateLocation = (id, updates) => {
    onChange(locations.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const removeLocation = (id) => {
    onChange(locations.filter(l => l.id !== id));
    if (selectedLocation === id) setSelectedLocation(null);
  };

  const handleImageUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        updateLocation(id, { referenceImage: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLocation = async (loc) => {
    if (!presetName.trim()) return;
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
    onChange([...locations, newLoc]);
    setSelectedLocation(newLoc.id);
  };

  const handleDeletePreset = async (id) => {
    await deleteCustomPreset(id);
    setSavedPresets(savedPresets.filter(p => p.id !== id));
  };

  const currentLoc = locations.find(l => l.id === selectedLocation);

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--ink-500)] text-center">
        Define your locations and scenes. Consistent location descriptions help maintain visual continuity.
        <span className="block text-xs text-[var(--ink-400)] mt-1">(Optional - you can skip this step)</span>
      </p>

      {/* Location Cards Grid */}
      {locations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {locations.map((loc) => {
            const isSelected = selectedLocation === loc.id;
            return (
              <div
                key={loc.id}
                onClick={() => setSelectedLocation(loc.id)}
                className={`relative group cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
                  isSelected
                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30'
                    : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:shadow-md'
                }`}
              >
                {/* Location Image */}
                <div className="aspect-square bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex items-center justify-center overflow-hidden">
                  {loc.referenceImage ? (
                    <img src={loc.referenceImage} alt={loc.name} className="w-full h-full object-cover" />
                  ) : (
                    <MapPin className="w-10 h-10 text-[var(--ink-200)]" />
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-[var(--accent-primary)]/10" />
                  )}
                </div>
                
                {/* Location Name */}
                <div className="p-2 bg-white">
                  <p className="text-sm font-medium text-[var(--ink-700)] truncate text-center">
                    {loc.name || 'Unnamed'}
                  </p>
                </div>

                {/* Quick Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeLocation(loc.id); }}
                  className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[var(--ink-400)] hover:text-red-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          
          {/* Add Location Card */}
          <div
            onClick={addLocation}
            className="rounded-xl border-2 border-dashed border-[var(--ink-200)] overflow-hidden hover:border-[var(--accent-primary)] hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="aspect-square bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex flex-col items-center justify-center gap-2 text-[var(--ink-400)] group-hover:text-[var(--accent-primary)] group-hover:bg-[var(--accent-primary-subtle)] transition-colors">
              <Plus className="w-10 h-10" />
            </div>
            <div className="p-2 bg-white">
              <p className="text-sm font-medium text-[var(--ink-400)] group-hover:text-[var(--accent-primary)] text-center transition-colors">Add</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {locations.length === 0 && (
        <div className="text-center py-10">
          <MapPin className="w-16 h-16 text-[var(--ink-200)] mx-auto mb-4" />
          <p className="text-[var(--ink-500)] mb-4">No locations yet</p>
          <button onClick={addLocation} className="btn-primary inline-flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" />
            Add Your First Location
          </button>
        </div>
      )}

      {/* Location Editor Panel */}
      {currentLoc && (
        <div className="border border-[var(--ink-200)] rounded-xl overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--ink-50)] border-b border-[var(--ink-100)]">
            <span className="text-sm font-semibold text-[var(--ink-600)]">Edit Location</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSaveDialog(currentLoc.id)}
                className="p-1.5 text-[var(--ink-400)] hover:text-[var(--accent-primary)] rounded-lg cursor-pointer"
                title="Save as preset"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeLocation(currentLoc.id)}
                className="p-1.5 text-[var(--ink-400)] hover:text-red-500 rounded-lg cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            {/* Large Image Preview */}
            <div className="shrink-0 flex flex-col items-center">
              <div className="relative w-40 h-40 rounded-xl bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-100)] flex items-center justify-center overflow-hidden border-2 border-dashed border-[var(--ink-200)]">
                {currentLoc.referenceImage ? (
                  <>
                    <img src={currentLoc.referenceImage} alt={currentLoc.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => updateLocation(currentLoc.id, { referenceImage: null })}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-[var(--ink-400)] hover:text-red-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 text-[var(--ink-400)] hover:text-[var(--ink-600)]">
                    <Upload className="w-8 h-8" />
                    <span className="text-xs">Add Reference Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(currentLoc.id, e)} />
                  </label>
                )}
              </div>
              {currentLoc.referenceImage && (
                <label className="mt-3 text-xs text-[var(--accent-primary)] hover:underline cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" /> Change Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(currentLoc.id, e)} />
                </label>
              )}
            </div>

            {/* Location Details */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-xs text-[var(--ink-500)] mb-1.5 block">Location Name</label>
                <input
                  type="text"
                  value={currentLoc.name}
                  onChange={(e) => updateLocation(currentLoc.id, { name: e.target.value })}
                  placeholder="e.g., Cozy Coffee Shop"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--ink-500)] mb-1.5 block">Visual Description</label>
                <textarea
                  value={currentLoc.description}
                  onChange={(e) => updateLocation(currentLoc.id, { description: e.target.value })}
                  placeholder="Describe the location: environment, lighting, atmosphere, key elements, colors, time of day..."
                  className="input-field resize-none"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Location Presets */}
      {savedPresets.length > 0 && (
        <div className="border-t border-[var(--ink-100)] pt-4">
          <h4 className="text-sm font-semibold text-[var(--ink-500)] mb-3 flex items-center gap-1">
            <Star className="w-4 h-4" /> Your Saved Locations
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                    <MapPin className="w-6 h-6 text-[var(--ink-200)]" />
                  )}
                </div>
                <div className="p-1.5 bg-white">
                  <p className="text-xs font-medium text-[var(--ink-700)] truncate text-center">{preset.name}</p>
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

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="p-4 bg-[var(--accent-primary-subtle)] rounded-xl space-y-3 border border-[var(--accent-primary)]">
          <p className="text-sm font-medium text-[var(--ink-600)]">Save "{locations.find(l => l.id === showSaveDialog)?.name || 'location'}" for reuse</p>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name..."
            className="input-field"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveLocation(locations.find(l => l.id === showSaveDialog));
              if (e.key === 'Escape') setShowSaveDialog(null);
            }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowSaveDialog(null)} className="text-sm text-[var(--ink-500)] cursor-pointer">Cancel</button>
            <button 
              onClick={() => handleSaveLocation(locations.find(l => l.id === showSaveDialog))} 
              className="btn-primary text-sm py-2 px-4 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
