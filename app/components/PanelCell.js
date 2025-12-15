'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SplitSquareHorizontal, SplitSquareVertical, Merge, Image, Type, MessageCircle, Hash, Sparkles, X, Loader2, ChevronDown, Camera, Sun, Palette, RotateCcw, Aperture, Focus, Move, Zap, Check, Trash2 } from 'lucide-react';

// ============================================
// FIBO ADVANCED CONTROLS - VISUAL CONFIGURATION
// ============================================

// Camera angle vertical positions (for 2D picker Y axis)
const CAMERA_HEIGHT_OPTIONS = [
  { id: 'birds-eye', label: "Bird's Eye", y: 0, desc: 'Overhead, god-like view', icon: '⬇️' },
  { id: 'high-angle', label: 'High', y: 1, desc: 'Looking down', icon: '↘️' },
  { id: 'eye-level', label: 'Eye Level', y: 2, desc: 'Natural perspective', icon: '➡️' },
  { id: 'low-angle', label: 'Low', y: 3, desc: 'Heroic, powerful', icon: '↗️' },
  { id: 'worms-eye', label: "Worm's Eye", y: 4, desc: 'Extreme low, dramatic', icon: '⬆️' },
];

// Camera horizontal angle options - visual representations
const CAMERA_ANGLE_OPTIONS = [
  { id: 'auto', label: 'Auto', desc: 'AI decides best angle', visual: 'auto' },
  { id: 'front', label: 'Front', desc: 'Face-on view', visual: 'front' },
  { id: 'three-quarter', label: '3/4', desc: 'Classic angle', visual: 'three-quarter' },
  { id: 'profile', label: 'Side', desc: 'Profile view', visual: 'profile' },
  { id: 'back', label: 'Back', desc: 'From behind', visual: 'back' },
  { id: 'over-shoulder', label: 'OTS', desc: 'Over shoulder', visual: 'ots' },
  { id: 'dutch', label: 'Dutch', desc: 'Tilted frame', visual: 'dutch' },
];

// Camera shot distance (for lens selection visual)
const SHOT_DISTANCE = [
  { id: 'extreme-wide', label: 'Extreme Wide', focal: '14mm', icon: '🏔️', desc: 'Epic landscapes' },
  { id: 'wide', label: 'Wide', focal: '24mm', icon: '🏠', desc: 'Full scene' },
  { id: 'medium', label: 'Medium', focal: '50mm', icon: '👤', desc: 'Natural view' },
  { id: 'close-up', label: 'Close-up', focal: '85mm', icon: '😊', desc: 'Face/detail' },
  { id: 'extreme-close', label: 'Macro', focal: '100mm', icon: '👁️', desc: 'Extreme detail' },
];

// Light direction positions for circular picker (clock positions)
const LIGHT_POSITIONS = [
  { id: 'top', angle: 0, label: 'Top', desc: 'Overhead light' },
  { id: 'top-right', angle: 45, label: 'Top Right', desc: 'Classic 3/4' },
  { id: 'right', angle: 90, label: 'Right', desc: 'Side light' },
  { id: 'bottom-right', angle: 135, label: 'Bottom Right', desc: 'Low dramatic' },
  { id: 'bottom', angle: 180, label: 'Bottom', desc: 'Horror/eerie' },
  { id: 'bottom-left', angle: 225, label: 'Bottom Left', desc: 'Low dramatic' },
  { id: 'left', angle: 270, label: 'Left', desc: 'Side light' },
  { id: 'top-left', angle: 315, label: 'Top Left', desc: 'Rembrandt' },
  { id: 'back', angle: -1, label: 'Backlit', desc: 'Silhouette' },
];

// Time of day / Lighting conditions (visual timeline)
const TIME_OF_DAY = [
  { id: 'auto', label: 'Auto', time: '', color: '#888', desc: 'AI decides' },
  { id: 'golden-hour', label: 'Golden Hour', time: '6AM/6PM', color: '#ff9500', desc: 'Warm, soft' },
  { id: 'daylight', label: 'Midday', time: '12PM', color: '#fff4e0', desc: 'Bright, clear' },
  { id: 'blue-hour', label: 'Blue Hour', time: '5AM/7PM', color: '#4a90d9', desc: 'Cool, magical' },
  { id: 'sunset', label: 'Sunset', time: '7PM', color: '#ff6b35', desc: 'Dramatic orange' },
  { id: 'night', label: 'Night', time: '10PM', color: '#1a1a3e', desc: 'Dark, moody' },
  { id: 'neon', label: 'Neon', time: 'Night+', color: '#ff00ff', desc: 'Cyberpunk' },
  { id: 'studio', label: 'Studio', time: 'Controlled', color: '#f0f0f0', desc: 'Professional' },
];

// Color palettes - visual swatches with gradients
const COLOR_PALETTES = [
  { id: 'auto', label: 'Auto', colors: ['#888', '#aaa', '#666'], gradient: 'linear-gradient(135deg, #888, #aaa)', desc: 'AI decides' },
  { id: 'cinematic', label: 'Cinematic', colors: ['#008080', '#ff8c00'], gradient: 'linear-gradient(135deg, #008080, #ff8c00)', desc: 'Teal & Orange' },
  { id: 'vibrant-hdr', label: 'HDR Vibrant', colors: ['#ff0080', '#00ff80', '#8000ff'], gradient: 'linear-gradient(135deg, #ff0080, #00ff80, #8000ff)', desc: 'Hyper-saturated', isHDR: true },
  { id: 'pastel', label: 'Pastel', colors: ['#ffb6c1', '#b6e3ff'], gradient: 'linear-gradient(135deg, #ffb6c1, #b6e3ff)', desc: 'Soft, dreamy' },
  { id: 'noir', label: 'Noir', colors: ['#000', '#444'], gradient: 'linear-gradient(135deg, #1a1a1a, #4a4a4a)', desc: 'B&W contrast' },
  { id: 'warm', label: 'Warm', colors: ['#ff6b35', '#efa00b'], gradient: 'linear-gradient(135deg, #ff6b35, #efa00b)', desc: 'Golden tones' },
  { id: 'cool', label: 'Cool', colors: ['#a8dadc', '#1d3557'], gradient: 'linear-gradient(135deg, #a8dadc, #1d3557)', desc: 'Cold blues' },
  { id: 'neon-cyber', label: 'Neon', colors: ['#ff00ff', '#00ffff'], gradient: 'linear-gradient(135deg, #ff00ff, #00ffff)', desc: 'Cyberpunk' },
  { id: 'earthy', label: 'Earthy', colors: ['#8b7355', '#556b2f'], gradient: 'linear-gradient(135deg, #8b7355, #556b2f)', desc: 'Natural' },
  { id: 'sepia', label: 'Sepia', colors: ['#704214', '#e6ccb2'], gradient: 'linear-gradient(135deg, #704214, #e6ccb2)', desc: 'Vintage' },
];

// Mood options with visual backgrounds
const MOOD_OPTIONS = [
  { id: 'auto', label: 'Auto', emoji: '✨', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'epic', label: 'Epic', emoji: '⚔️', bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', desc: 'Grand, heroic' },
  { id: 'mysterious', label: 'Mystery', emoji: '🌙', bg: 'linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%)', desc: 'Enigmatic' },
  { id: 'romantic', label: 'Romantic', emoji: '💕', bg: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)', desc: 'Soft, intimate' },
  { id: 'tense', label: 'Tense', emoji: '😰', bg: 'linear-gradient(135deg, #434343 0%, #000000 100%)', desc: 'Suspenseful' },
  { id: 'peaceful', label: 'Peaceful', emoji: '🕊️', bg: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', desc: 'Calm, serene' },
  { id: 'energetic', label: 'Action', emoji: '⚡', bg: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', desc: 'Dynamic' },
  { id: 'horror', label: 'Horror', emoji: '👻', bg: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', desc: 'Scary' },
];

// Composition rules with visual icons
const COMPOSITION_OPTIONS = [
  { id: 'auto', label: 'Auto', icon: '✨' },
  { id: 'rule-of-thirds', label: 'Rule of Thirds', icon: '▦' },
  { id: 'center', label: 'Center', icon: '◎' },
  { id: 'golden-ratio', label: 'Golden Ratio', icon: '🐚' },
  { id: 'symmetry', label: 'Symmetry', icon: '⚖️' },
  { id: 'diagonal', label: 'Diagonal', icon: '╱' },
];

// Helper to build a text description of shot settings to append to prompt
function buildPromptSuffix(settings) {
  const parts = [];
  const {
    cameraHeight, cameraAngle, shotDistance, depthOfField, lightDirection, timeOfDay, 
    shadowIntensity, colorPalette, mood, composition, colorIntensity, contrast
  } = settings;
  
  // Camera settings
  const cameraDetails = [];
  if (cameraHeight && cameraHeight !== 'auto') {
    const height = CAMERA_HEIGHT_OPTIONS.find(h => h.id === cameraHeight);
    cameraDetails.push(height?.desc || height?.label);
  }
  if (cameraAngle && cameraAngle !== 'auto') {
    const angle = CAMERA_ANGLE_OPTIONS.find(a => a.id === cameraAngle);
    cameraDetails.push(`${angle?.label} angle (${angle?.desc})`);
  }
  if (shotDistance && shotDistance !== 'auto') {
    const shot = SHOT_DISTANCE.find(s => s.id === shotDistance);
    cameraDetails.push(`${shot?.label} shot (${shot?.focal})`);
  }
  if (depthOfField !== undefined && depthOfField !== 50) {
    if (depthOfField < 25) cameraDetails.push('ultra shallow depth of field, dreamy bokeh');
    else if (depthOfField < 50) cameraDetails.push('shallow depth of field, blurred background');
    else if (depthOfField > 75) cameraDetails.push('deep focus, everything sharp');
    else if (depthOfField > 50) cameraDetails.push('moderate depth of field');
  }
  if (composition && composition !== 'auto') {
    const comp = COMPOSITION_OPTIONS.find(c => c.id === composition);
    cameraDetails.push(`${comp?.label} composition`);
  }
  if (cameraDetails.length > 0) {
    parts.push(`Camera: ${cameraDetails.join(', ')}`);
  }
  
  // Lighting settings
  const lightingDetails = [];
  if (timeOfDay && timeOfDay !== 'auto') {
    const time = TIME_OF_DAY.find(t => t.id === timeOfDay);
    lightingDetails.push(`${time?.label} lighting`);
  }
  if (lightDirection && lightDirection !== 'auto') {
    const dir = LIGHT_POSITIONS.find(d => d.id === lightDirection);
    lightingDetails.push(dir?.desc || `light from ${dir?.label}`);
  }
  if (shadowIntensity !== undefined && shadowIntensity !== 50) {
    if (shadowIntensity < 25) lightingDetails.push('minimal soft shadows');
    else if (shadowIntensity < 50) lightingDetails.push('soft shadows');
    else if (shadowIntensity > 75) lightingDetails.push('hard dramatic shadows, high contrast lighting');
    else if (shadowIntensity > 50) lightingDetails.push('defined shadows');
  }
  if (lightingDetails.length > 0) {
    parts.push(`Lighting: ${lightingDetails.join(', ')}`);
  }
  
  // Color & Style settings
  const styleDetails = [];
  if (colorPalette && colorPalette !== 'auto') {
    const palette = COLOR_PALETTES.find(p => p.id === colorPalette);
    styleDetails.push(`${palette?.label} color palette (${palette?.desc})`);
  }
  if (colorIntensity !== undefined && colorIntensity !== 50) {
    if (colorIntensity > 80) styleDetails.push('ultra HDR, hyper-saturated vibrant colors');
    else if (colorIntensity > 60) styleDetails.push('HDR, vivid saturated colors');
    else if (colorIntensity < 20) styleDetails.push('highly muted, near monochrome');
    else if (colorIntensity < 40) styleDetails.push('muted, desaturated colors');
  }
  if (contrast !== undefined && contrast !== 50) {
    if (contrast > 75) styleDetails.push('extreme high contrast');
    else if (contrast > 50) styleDetails.push('high contrast');
    else if (contrast < 25) styleDetails.push('very low contrast, flat look');
    else if (contrast < 50) styleDetails.push('low contrast, soft');
  }
  if (mood && mood !== 'auto') {
    const moodOpt = MOOD_OPTIONS.find(m => m.id === mood);
    styleDetails.push(`${moodOpt?.label} mood (${moodOpt?.desc})`);
  }
  if (styleDetails.length > 0) {
    parts.push(`Style: ${styleDetails.join(', ')}`);
  }
  
  return parts.length > 0 ? '\n\n' + parts.join('. ') + '.' : '';
}

// Helper to build comprehensive shot settings for FIBO structured prompt
function buildShotSettings(settings) {
  const result = {};
  const {
    cameraHeight, cameraAngle, shotDistance, depthOfField, lightDirection, timeOfDay, 
    shadowIntensity, colorPalette, mood, composition, colorIntensity, contrast
  } = settings;
  
  // Photographic characteristics
  const photoChars = {};
  if (cameraHeight && cameraHeight !== 'auto') {
    const height = CAMERA_HEIGHT_OPTIONS.find(h => h.id === cameraHeight);
    photoChars.camera_angle = height?.label || cameraHeight.replace(/-/g, ' ');
  }
  if (cameraAngle && cameraAngle !== 'auto') {
    const angle = CAMERA_ANGLE_OPTIONS.find(a => a.id === cameraAngle);
    // Append horizontal angle to camera_angle or set it
    if (photoChars.camera_angle) {
      photoChars.camera_angle += `, ${angle?.label} view`;
    } else {
      photoChars.camera_angle = `${angle?.label} view`;
    }
  }
  if (shotDistance && shotDistance !== 'auto') {
    const shot = SHOT_DISTANCE.find(s => s.id === shotDistance);
    if (shot?.focal) photoChars.lens_focal_length = shot.focal;
  }
  if (depthOfField !== undefined && depthOfField !== 50) {
    // Convert 0-100 slider to DOF description
    if (depthOfField < 20) {
      photoChars.depth_of_field = 'Ultra shallow, dreamy bokeh, f/1.4';
    } else if (depthOfField < 40) {
      photoChars.depth_of_field = 'Shallow depth, subject isolation, f/2.8';
    } else if (depthOfField < 60) {
      photoChars.depth_of_field = 'Moderate depth, balanced focus, f/5.6';
    } else if (depthOfField < 80) {
      photoChars.depth_of_field = 'Deep focus, most in focus, f/11';
    } else {
      photoChars.depth_of_field = 'Infinite depth, everything sharp, f/16';
    }
  }
  if (Object.keys(photoChars).length > 0) {
    result.photographic_characteristics = photoChars;
  }
  
  // Lighting
  const lighting = {};
  if (timeOfDay && timeOfDay !== 'auto') {
    const time = TIME_OF_DAY.find(t => t.id === timeOfDay);
    lighting.conditions = time?.label + (time?.desc ? ` - ${time.desc}` : '');
  }
  if (lightDirection && lightDirection !== 'auto') {
    const dir = LIGHT_POSITIONS.find(d => d.id === lightDirection);
    lighting.direction = dir?.desc || `Light from ${dir?.label || lightDirection}`;
  }
  if (shadowIntensity !== undefined && shadowIntensity !== 50) {
    // Convert 0-100 slider to shadow description
    if (shadowIntensity < 20) {
      lighting.shadows = 'Minimal shadows, flat lighting';
    } else if (shadowIntensity < 40) {
      lighting.shadows = 'Soft, gentle shadows';
    } else if (shadowIntensity < 60) {
      lighting.shadows = 'Balanced, natural shadows';
    } else if (shadowIntensity < 80) {
      lighting.shadows = 'Hard, defined shadows';
    } else {
      lighting.shadows = 'Extreme contrast, noir-like deep shadows';
    }
  }
  if (Object.keys(lighting).length > 0) {
    result.lighting = lighting;
  }
  
  // Aesthetics
  const aesthetics = {};
  if (colorPalette && colorPalette !== 'auto') {
    const palette = COLOR_PALETTES.find(p => p.id === colorPalette);
    let colorDesc = palette?.desc || colorPalette;
    // Add HDR intensity modifier
    if (colorIntensity !== undefined && colorIntensity > 60) {
      if (colorIntensity > 80) {
        colorDesc = `Ultra HDR, hyper-saturated - ${colorDesc}`;
      } else {
        colorDesc = `HDR, vivid colors - ${colorDesc}`;
      }
    } else if (colorIntensity !== undefined && colorIntensity < 40) {
      colorDesc = `Muted, desaturated - ${colorDesc}`;
    }
    aesthetics.color_scheme = colorDesc;
  } else if (colorIntensity !== undefined && colorIntensity !== 50) {
    if (colorIntensity > 80) {
      aesthetics.color_scheme = 'Ultra HDR, maximum saturation and color pop';
    } else if (colorIntensity > 60) {
      aesthetics.color_scheme = 'HDR, vivid enhanced saturation';
    } else if (colorIntensity < 20) {
      aesthetics.color_scheme = 'Highly muted, near monochrome';
    } else if (colorIntensity < 40) {
      aesthetics.color_scheme = 'Muted, desaturated, subtle colors';
    }
  }
  if (contrast !== undefined && contrast !== 50) {
    if (contrast > 80) {
      aesthetics.contrast = 'Extreme contrast, bold blacks and whites';
    } else if (contrast > 60) {
      aesthetics.contrast = 'High contrast, punchy and defined';
    } else if (contrast < 20) {
      aesthetics.contrast = 'Very flat, low contrast film look';
    } else if (contrast < 40) {
      aesthetics.contrast = 'Low contrast, soft and gentle';
    }
  }
  if (mood && mood !== 'auto') {
    const moodOpt = MOOD_OPTIONS.find(m => m.id === mood);
    aesthetics.mood_atmosphere = moodOpt?.desc || mood;
  }
  if (composition && composition !== 'auto') {
    const comp = COMPOSITION_OPTIONS.find(c => c.id === composition);
    aesthetics.composition = comp?.label || composition;
  }
  if (Object.keys(aesthetics).length > 0) {
    result.aesthetics = aesthetics;
  }
  
  return result;
}

// Check if any advanced setting is non-auto/non-default
function hasAdvancedSettings(settings) {
  return Object.entries(settings).some(([key, value]) => {
    if (key === 'depthOfField' || key === 'shadowIntensity' || key === 'colorIntensity' || key === 'contrast') {
      return value !== 50; // Sliders default to 50
    }
    return value && value !== 'auto';
  });
}

// ============================================
// VISUAL CONTROL COMPONENTS
// ============================================

// Circular Light Direction Picker
function LightDirectionDial({ value, onChange }) {
  const positions = LIGHT_POSITIONS.filter(p => p.angle >= 0);
  const isBacklit = value === 'back';
  
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        {/* Outer ring - bigger with space for buttons inside */}
        <div className="absolute inset-0 rounded-full border-2 border-[var(--ink-200)] bg-gradient-to-b from-[var(--ink-50)] to-[var(--ink-100)]" />
        
        {/* Inner area highlight */}
        <div className="absolute inset-4 rounded-full bg-white/50" />
        
        {/* Center subject indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[var(--ink-300)] flex items-center justify-center text-base text-white font-medium shadow-inner">
            👤
          </div>
        </div>
        
        {/* Light position buttons - placed inside the circle */}
        {positions.map((pos) => {
          const angleRad = (pos.angle - 90) * (Math.PI / 180);
          const radius = 48; // Smaller radius to keep buttons inside
          const x = 72 + radius * Math.cos(angleRad);
          const y = 72 + radius * Math.sin(angleRad);
          const isSelected = value === pos.id;
          
          return (
            <button
              key={pos.id}
              type="button"
              onClick={() => onChange(pos.id)}
              className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full transition-all flex items-center justify-center ${
                isSelected
                  ? 'bg-amber-400 shadow-lg shadow-amber-400/50 scale-110 z-10'
                  : 'bg-white border-2 border-[var(--ink-200)] hover:bg-amber-100 hover:border-amber-300'
              }`}
              style={{ left: x, top: y }}
              title={pos.desc}
            >
              {isSelected && <Sun className="w-4 h-4 text-amber-800" />}
            </button>
          );
        })}
        
        {/* Auto indicator in center when auto */}
        {value === 'auto' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-xs text-[var(--ink-400)] mt-14 font-medium">Auto</span>
          </div>
        )}
      </div>
      
      {/* Backlit toggle */}
      <button
        type="button"
        onClick={() => onChange(isBacklit ? 'auto' : 'back')}
        className={`px-4 py-1.5 text-sm rounded-full border-2 transition-all ${
          isBacklit
            ? 'bg-amber-100 border-amber-300 text-amber-700 font-medium'
            : 'bg-white border-[var(--ink-200)] text-[var(--ink-500)] hover:border-amber-200'
        }`}
      >
        {isBacklit ? '✓ Backlit' : 'Backlit / Silhouette'}
      </button>
    </div>
  );
}

// Visual Camera Angle Picker - Simple tab/button style
function CameraAnglePicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {CAMERA_ANGLE_OPTIONS.map((angle) => {
        const isSelected = value === angle.id || (!value && angle.id === 'auto');
        return (
          <button
            key={angle.id}
            type="button"
            onClick={() => onChange(angle.id)}
            className={`px-3 py-2 rounded-lg border-2 transition-all text-xs font-medium ${
              isSelected
                ? 'border-purple-400 bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                : 'border-[var(--ink-100)] bg-white text-[var(--ink-600)] hover:border-[var(--ink-300)] hover:shadow-sm'
            }`}
            title={angle.desc}
          >
            {angle.label}
          </button>
        );
      })}
    </div>
  );
}

// Visual Shot Distance Picker (Lens Selector)
function ShotDistancePicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {SHOT_DISTANCE.map((shot, index) => {
        const isSelected = value === shot.id;
        
        return (
          <button
            key={shot.id}
            type="button"
            onClick={() => onChange(shot.id)}
            className={`flex-1 py-2 px-1.5 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
              isSelected
                ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-200'
                : 'border-[var(--ink-100)] bg-white hover:border-[var(--ink-300)] hover:shadow-sm'
            }`}
            title={shot.desc}
          >
            <span className="text-lg">{shot.icon}</span>
            <span className={`text-[10px] font-medium ${isSelected ? 'text-purple-700' : 'text-[var(--ink-600)]'}`}>
              {shot.label}
            </span>
            <span className="text-[9px] text-[var(--ink-400)]">{shot.focal}</span>
          </button>
        );
      })}
    </div>
  );
}

// Camera Height Vertical Slider
function CameraHeightPicker({ value, onChange }) {
  return (
    <div className="flex items-stretch gap-3 h-36">
      {/* Visual indicator */}
      <div className="w-16 bg-gradient-to-b from-sky-100 via-[var(--ink-50)] to-amber-100 rounded-lg flex flex-col items-center justify-between py-2 relative overflow-hidden">
        {/* Camera position indicator */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-7 h-7 bg-purple-500 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 z-10"
          style={{
            top: value === 'birds-eye' ? '8%' 
              : value === 'high-angle' ? '25%'
              : value === 'eye-level' ? '42%'
              : value === 'low-angle' ? '58%'
              : value === 'worms-eye' ? '75%'
              : '42%'
          }}
        >
          <Camera className="w-3.5 h-3.5 text-white" />
        </div>
        
        {/* Subject indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xl">
          👤
        </div>
      </div>
      
      {/* Buttons */}
      <div className="flex flex-col gap-1 flex-1">
        {CAMERA_HEIGHT_OPTIONS.map((opt) => {
          const isSelected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`flex-1 px-2.5 rounded-lg border-2 text-xs font-medium transition-all flex items-center gap-2 ${
                isSelected
                  ? 'border-purple-400 bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                  : 'border-[var(--ink-100)] bg-white text-[var(--ink-600)] hover:border-[var(--ink-300)] hover:shadow-sm'
              }`}
              title={opt.desc}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Gradient Slider Component - Improved design
function GradientSlider({ value, onChange, label, leftLabel, rightLabel, gradient, leftIcon, rightIcon, showHDRBadge }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[var(--ink-700)]">{label}</label>
        {showHDRBadge && value > 60 && (
          <span className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full font-semibold">
            HDR Active
          </span>
        )}
      </div>
      <div className="relative pt-1">
        {/* Track background */}
        <div 
          className="h-3 rounded-full overflow-hidden shadow-inner"
          style={{ background: gradient }}
        />
        {/* Native range input - styled properly */}
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute top-1 left-0 w-full h-3 opacity-0 cursor-pointer z-10"
          style={{ margin: 0 }}
        />
        {/* Custom thumb */}
        <div 
          className="absolute top-0 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-[var(--ink-300)] pointer-events-none transition-all"
          style={{ 
            left: `calc(${value}% - 10px)`,
            transform: 'translateX(0)'
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--ink-500)] font-medium">
        <span className="flex items-center gap-1">{leftIcon} {leftLabel}</span>
        <span className="flex items-center gap-1">{rightLabel} {rightIcon}</span>
      </div>
    </div>
  );
}

// Time of Day Selector
function TimeOfDayPicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {TIME_OF_DAY.map((time) => {
        const isSelected = value === time.id;
        return (
          <button
            key={time.id}
            type="button"
            onClick={() => onChange(time.id)}
            className={`flex-1 py-2 px-1 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
              isSelected
                ? 'border-purple-400 ring-1 ring-purple-200'
                : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:shadow-sm'
            }`}
            style={{ 
              background: isSelected ? `linear-gradient(to bottom, ${time.color}22, ${time.color}44)` : 'white'
            }}
            title={time.desc}
          >
            <div 
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: time.color, boxShadow: isSelected ? `0 0 8px ${time.color}` : 'none' }}
            />
            <span className={`text-[10px] font-medium ${isSelected ? 'text-[var(--ink-800)]' : 'text-[var(--ink-500)]'}`}>
              {time.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Mood Grid Selector
function MoodGridPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {MOOD_OPTIONS.map((mood) => {
        const isSelected = value === mood.id;
        return (
          <button
            key={mood.id}
            type="button"
            onClick={() => onChange(mood.id)}
            className={`relative py-3 px-2 rounded-lg overflow-hidden transition-all border-2 ${
              isSelected 
                ? 'border-purple-400 ring-1 ring-purple-200' 
                : 'border-transparent hover:border-[var(--ink-200)]'
            }`}
            style={{ background: mood.bg }}
            title={mood.desc}
          >
            <div className="text-center">
              <span className="text-lg">{mood.emoji}</span>
              <p className="text-[10px] font-medium text-white mt-1 drop-shadow-md">{mood.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Color Palette Picker with gradients
function ColorPalettePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {COLOR_PALETTES.map((palette) => {
        const isSelected = value === palette.id;
        return (
          <button
            key={palette.id}
            type="button"
            onClick={() => onChange(palette.id)}
            className={`group relative p-2 rounded-lg border-2 transition-all ${
              isSelected 
                ? 'border-purple-400 ring-1 ring-purple-200' 
                : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:shadow-sm'
            }`}
            title={palette.desc}
          >
            <div 
              className="h-6 rounded-md mb-1.5"
              style={{ background: palette.gradient }}
            />
            <span className="text-[10px] text-[var(--ink-600)] block truncate font-medium">{palette.label}</span>
            {palette.isHDR && (
              <span className="absolute -top-1 -right-1 text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded font-bold">
                HDR
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
import { splitPanelHorizontal, splitPanelVertical, mergePanels, updatePanelContent, getPanelById, canSplitHorizontal, canSplitVertical, MAX_NESTING_DEPTH } from '../lib/grid';
import { addLayer } from '../lib/layers';
import LayerRenderer from './LayerRenderer';

// Project type specific panel styles
const PANEL_STYLES = {
  'comic': {
    borderWidth: '2px',
    selectedBorderWidth: '3px',
    emptyBg: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
  },
  'manga': {
    borderWidth: '1.5px',
    selectedBorderWidth: '2px',
    emptyBg: 'linear-gradient(180deg, #fefefe 0%, #fafafa 100%)',
  },
  'storyboard': {
    borderWidth: '1px',
    selectedBorderWidth: '2px',
    emptyBg: '#f8f8f8',
  },
  'graphic-novel': {
    borderWidth: '2px',
    selectedBorderWidth: '3px',
    emptyBg: 'linear-gradient(135deg, #fffffe 0%, #faf9f7 100%)',
  },
};

export default function PanelCell({ 
  panel, 
  isSelected, 
  onSelect, 
  selectedLayerId,
  onLayerSelect,
  grid, 
  onGridChange,
  projectType = 'comic',
  frameNumber = null,
  panelBorderRadius = '4px',
  projectSettings = {},
  panelActionTrigger = null,
  onPanelActionProcessed = null
}) {
  const [showMergeHint, setShowMergeHint] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [useConsistency, setUseConsistency] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]); // Gallery of generated images
  const [selectedImageIndex, setSelectedImageIndex] = useState(null); // Currently selected image in gallery
  const [showGallery, setShowGallery] = useState(true); // Collapsible gallery section
  // Advanced shot controls - visual FIBO settings with sliders
  const [showShotSettings, setShowShotSettings] = useState(false);
  const [advancedSettingsTab, setAdvancedSettingsTab] = useState('camera'); // 'camera', 'lighting', 'color'
  const [advancedSettings, setAdvancedSettings] = useState({
    // Camera settings
    cameraHeight: 'auto',
    cameraAngle: 'auto', // Horizontal angle (front, profile, dutch, etc.)
    shotDistance: 'auto',
    depthOfField: 50, // 0-100 slider (0=ultra shallow, 100=infinite)
    composition: 'auto',
    // Lighting settings  
    timeOfDay: 'auto',
    lightDirection: 'auto',
    shadowIntensity: 50, // 0-100 slider (0=none, 100=extreme)
    // Color & Style settings
    colorPalette: 'auto',
    colorIntensity: 50, // 0-100 slider (0=muted, 100=ultra HDR)
    contrast: 50, // 0-100 slider (0=flat, 100=extreme)
    mood: 'auto',
  });
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef(null);
  const panelRef = useRef(null);
  
  // For portal mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate the closest aspect ratio from available options
  const getClosestAspectRatio = () => {
    if (!panelRef.current) return '1:1';
    
    const rect = panelRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    if (width === 0 || height === 0) return '1:1';
    
    const panelRatio = width / height;
    
    // Available aspect ratios from FIBO API
    const availableRatios = [
      { label: '1:1', value: 1 },
      { label: '2:3', value: 2/3 },
      { label: '3:2', value: 3/2 },
      { label: '3:4', value: 3/4 },
      { label: '4:3', value: 4/3 },
      { label: '4:5', value: 4/5 },
      { label: '5:4', value: 5/4 },
      { label: '9:16', value: 9/16 },
      { label: '16:9', value: 16/9 },
    ];
    
    // Find the closest ratio
    let closest = availableRatios[0];
    let minDiff = Math.abs(panelRatio - closest.value);
    
    for (const ratio of availableRatios) {
      const diff = Math.abs(panelRatio - ratio.value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = ratio;
      }
    }
    
    return closest.label;
  };
  
  const panelStyle = PANEL_STYLES[projectType] || PANEL_STYLES['comic'];
  
  // Get panel content with fallback (for nested panels that might not have content yet)
  const panelContent = panel.content || { layers: [], backgroundColor: '#ffffff' };
  const hasContent = panelContent.layers?.length > 0;

  // Check split limits
  const canSplitH = canSplitHorizontal(grid, panel.id);
  const canSplitV = canSplitVertical(grid, panel.id);

  // Check if this panel can be merged (only top-level panels in rows)
  const panelInfo = getPanelById(grid, panel.id);
  const canMerge = panelInfo && panelInfo.row.panels.length > 1;

  const handleClick = (e) => {
    e.stopPropagation();
    onLayerSelect?.(null); // Deselect any layer when clicking panel background
    onSelect();
  };

  const handleSplitHorizontal = (e) => {
    e.stopPropagation();
    const newGrid = splitPanelHorizontal(grid, panel.id);
    onGridChange(newGrid);
  };

  const handleSplitVertical = (e) => {
    e.stopPropagation();
    const newGrid = splitPanelVertical(grid, panel.id);
    onGridChange(newGrid);
  };

  const handleMerge = (e) => {
    e.stopPropagation();
    const panelInfo = getPanelById(grid, panel.id);
    if (!panelInfo) return;

    const { row, panelIndex } = panelInfo;
    
    if (panelIndex < row.panels.length - 1) {
      const rightPanel = row.panels[panelIndex + 1];
      const newGrid = mergePanels(grid, panel.id, rightPanel.id);
      onGridChange(newGrid);
    } else if (panelIndex > 0) {
      const leftPanel = row.panels[panelIndex - 1];
      const newGrid = mergePanels(grid, leftPanel.id, panel.id);
      onGridChange(newGrid);
    }
  };

  const handleAddImage = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newContent = addLayer(panelContent, 'image', {
        src: event.target.result,
        fit: 'contain'
      });
      const newGrid = updatePanelContent(grid, panel.id, newContent);
      onGridChange(newGrid);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddText = (e) => {
    e?.stopPropagation();
    const newContent = addLayer(panelContent, 'text', {
      content: 'Double-click to edit',
      fontFamily: 'Arial',
      fontSize: 16,
      fontColor: '#000000',
      fontWeight: 'normal'
    });
    const newGrid = updatePanelContent(grid, panel.id, newContent);
    onGridChange(newGrid);
  };

  const handleAddSpeechBubble = (e) => {
    e?.stopPropagation();
    const newContent = addLayer(panelContent, 'speech-bubble', {
      text: 'Hello!',
      bubbleStyle: 'speech',
      tailPosition: 'bottom-left',
      backgroundColor: '#ffffff',
      borderColor: '#000000'
    });
    const newGrid = updatePanelContent(grid, panel.id, newContent);
    onGridChange(newGrid);
  };

  const handleOpenAIDialog = (e) => {
    e?.stopPropagation();
    setShowAIDialog(true);
    setAiPrompt('');
    setAiError('');
    // Reset advanced controls to defaults
    setShowShotSettings(false);
    setAdvancedSettings({
      cameraHeight: 'auto',
      cameraAngle: 'auto',
      shotDistance: 'auto',
      depthOfField: 50,
      composition: 'auto',
      timeOfDay: 'auto',
      lightDirection: 'auto',
      shadowIntensity: 50,
      colorPalette: 'auto',
      colorIntensity: 50,
      contrast: 50,
      mood: 'auto',
    });
  };

  // Open AI dialog with pre-populated settings from an existing AI-generated image
  const handleEditAIImage = () => {
    // Find the selected layer
    const selectedLayer = panelContent.layers?.find(l => l.id === selectedLayerId);
    if (!selectedLayer || selectedLayer.type !== 'image' || !selectedLayer.data?.aiGeneration) {
      // Fallback to regular open
      handleOpenAIDialog();
      return;
    }

    const aiGen = selectedLayer.data.aiGeneration;
    
    setShowAIDialog(true);
    setAiPrompt(aiGen.prompt || '');
    setAiError('');
    setShowShotSettings(true); // Open shot settings to show pre-populated values
    
    // Pre-populate advanced settings from saved generation data
    setAdvancedSettings({
      cameraHeight: aiGen.settings?.cameraHeight || 'auto',
      cameraAngle: aiGen.settings?.cameraAngle || 'auto',
      shotDistance: aiGen.settings?.shotDistance || 'auto',
      depthOfField: aiGen.settings?.depthOfField ?? 50,
      composition: aiGen.settings?.composition || 'auto',
      timeOfDay: aiGen.settings?.timeOfDay || 'auto',
      lightDirection: aiGen.settings?.lightDirection || 'auto',
      shadowIntensity: aiGen.settings?.shadowIntensity ?? 50,
      colorPalette: aiGen.settings?.colorPalette || 'auto',
      colorIntensity: aiGen.settings?.colorIntensity ?? 50,
      contrast: aiGen.settings?.contrast ?? 50,
      mood: aiGen.settings?.mood || 'auto',
    });
    
    // Add the current image to the gallery so user can compare
    setGeneratedImages([{
      id: Date.now(),
      url: selectedLayer.data.src,
      prompt: aiGen.prompt,
      settings: aiGen.settings,
      seed: aiGen.seed,
      structuredPrompt: aiGen.structuredPrompt,
      timestamp: aiGen.generatedAt,
      isOriginal: true // Mark as the original image being edited
    }]);
    setSelectedImageIndex(0);
  };

  const handleCloseAIDialog = () => {
    setShowAIDialog(false);
    setAiPrompt('');
    setAiError('');
    setGeneratedImages([]);
    setSelectedImageIndex(null);
  };

  // Add selected image to panel
  const handleSelectImage = () => {
    if (selectedImageIndex === null || !generatedImages[selectedImageIndex]) return;
    
    const selectedImage = generatedImages[selectedImageIndex];
    const newContent = addLayer(panelContent, 'image', {
      src: selectedImage.url,
      fit: 'cover',
      // Save AI generation metadata for future editing/regeneration
      aiGeneration: {
        prompt: selectedImage.prompt,
        settings: selectedImage.settings,
        seed: selectedImage.seed,
        structuredPrompt: selectedImage.structuredPrompt,
        generatedAt: selectedImage.timestamp
      }
    }, { fillPanel: true });
    const newGrid = updatePanelContent(grid, panel.id, newContent);
    onGridChange(newGrid);
    handleCloseAIDialog();
  };

  const handleGenerateAIImage = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGeneratingAI(true);
    setAiError('');
    
    try {
      // Get the first character's structured_prompt and seed for consistency
      const firstCharacter = projectSettings.characters?.[0];
      const masterStructuredPrompt = firstCharacter?.fiboStructuredPrompt;
      const masterSeed = firstCharacter?.fiboSeed;
      
      // Calculate aspect ratio based on panel dimensions
      const aspectRatio = getClosestAspectRatio();
      
      // Build shot settings from advanced controls
      const shotSettings = buildShotSettings(advancedSettings);
      const hasCustomSettings = hasAdvancedSettings(advancedSettings);
      
      // Build enhanced prompt with shot settings as text suffix
      const promptSuffix = hasCustomSettings ? buildPromptSuffix(advancedSettings) : '';
      const enhancedPrompt = aiPrompt + promptSuffix;
      
      const requestBody = {
        action: 'generate',
        prompt: enhancedPrompt,
        aspect_ratio: aspectRatio
      };
      
      // Only include structured_prompt if consistency is enabled AND we have master style
      if (useConsistency && masterStructuredPrompt && masterSeed) {
        // Merge shot settings with master structured prompt
        const mergedPrompt = { ...masterStructuredPrompt };
        if (hasCustomSettings) {
          if (shotSettings.photographic_characteristics) {
            mergedPrompt.photographic_characteristics = {
              ...mergedPrompt.photographic_characteristics,
              ...shotSettings.photographic_characteristics
            };
          }
          if (shotSettings.lighting) {
            mergedPrompt.lighting = { ...mergedPrompt.lighting, ...shotSettings.lighting };
          }
          if (shotSettings.aesthetics) {
            mergedPrompt.aesthetics = { ...mergedPrompt.aesthetics, ...shotSettings.aesthetics };
          }
        }
        requestBody.structured_prompt = mergedPrompt;
        requestBody.seed = masterSeed;
      }
      // When consistency is OFF, only send the text prompt (no structured_prompt)
      
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }
      
      // Extract image URL from response (images[0].urls[0])
      const imageUrl = data.images?.[0]?.urls?.[0];
      if (!imageUrl) {
        throw new Error('No image URL in response');
      }
      
      // Add to gallery with full AI generation metadata
      const newImage = {
        id: Date.now(),
        url: imageUrl,
        prompt: aiPrompt,
        settings: { ...advancedSettings },
        seed: data.seed, // FIBO seed for consistency
        structuredPrompt: data.structured_prompt, // Full structured prompt used
        timestamp: new Date().toISOString()
      };
      setGeneratedImages(prev => [...prev, newImage]);
      setSelectedImageIndex(generatedImages.length); // Select the new image
      
    } catch (err) {
      console.error('Failed to generate AI image:', err);
      setAiError(err.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleLayerUpdate = (layerId, updates) => {
    const newLayers = panelContent.layers.map(layer =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    );
    const newContent = { ...panelContent, layers: newLayers };
    const newGrid = updatePanelContent(grid, panel.id, newContent);
    onGridChange(newGrid);
  };

  const handleLayerDelete = (layerId) => {
    const newLayers = panelContent.layers.filter(layer => layer.id !== layerId);
    const newContent = { ...panelContent, layers: newLayers };
    const newGrid = updatePanelContent(grid, panel.id, newContent);
    onGridChange(newGrid);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newContent = addLayer(panelContent, 'image', {
          src: event.target.result,
          fit: 'contain'
        });
        const newGrid = updatePanelContent(grid, panel.id, newContent);
        onGridChange(newGrid);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  // Handle panel actions triggered from context toolbar
  useEffect(() => {
    if (!isSelected || !panelActionTrigger) return;
    
    const { action } = panelActionTrigger;
    
    switch (action) {
      case 'addImage':
        fileInputRef.current?.click();
        break;
      case 'addText':
        handleAddText();
        break;
      case 'addSpeechBubble':
        handleAddSpeechBubble();
        break;
      case 'openAIDialog':
        handleOpenAIDialog();
        break;
      case 'editAIImage':
        handleEditAIImage();
        break;
    }
    
    // Clear the trigger after processing
    onPanelActionProcessed?.();
  }, [panelActionTrigger, isSelected, selectedLayerId, panelContent.layers]);

  return (
    <div
      ref={panelRef}
      className={`panel-cell relative h-full w-full transition-all duration-200 overflow-hidden ${
        isSelected 
          ? 'panel-selected z-10' 
          : 'panel-idle hover:panel-hover'
      } ${isDragOver ? 'panel-drag-over' : ''}`}
      style={{ 
        backgroundColor: panelContent.backgroundColor || '#ffffff',
        borderRadius: panelBorderRadius,
        borderWidth: isSelected ? panelStyle.selectedBorderWidth : panelStyle.borderWidth,
        borderStyle: 'solid',
        borderColor: isSelected ? 'var(--accent-primary)' : 'var(--ink-200)',
        boxShadow: isSelected 
          ? '0 0 0 4px rgba(232, 93, 76, 0.15), inset 0 0 0 1px rgba(232, 93, 76, 0.1)' 
          : 'inset 0 1px 2px rgba(0,0,0,0.02)',
        background: !hasContent && !panelContent.backgroundColor 
          ? panelStyle.emptyBg 
          : panelContent.backgroundColor || '#ffffff',
      }}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Frame number for storyboards */}
      {frameNumber && (
        <div 
          className="absolute top-1 left-1 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-[var(--ink-800)]/80 backdrop-blur-sm rounded text-[10px] font-bold text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <Hash className="w-2.5 h-2.5" />
          {frameNumber}
        </div>
      )}

      {/* Empty state hint */}
      {!hasContent && !isSelected && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center opacity-30 hover:opacity-50 transition-opacity">
            <Image className="w-6 h-6 mx-auto mb-1 text-[var(--ink-300)]" />
            <p className="text-[10px] text-[var(--ink-400)]" style={{ fontFamily: 'var(--font-body)' }}>
              Drop image
            </p>
          </div>
        </div>
      )}

      {/* Drag over indicator */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--accent-primary-subtle)] border-2 border-dashed border-[var(--accent-primary)] rounded-lg">
          <div className="text-center">
            <Image className="w-8 h-8 mx-auto mb-2 text-[var(--accent-primary)]" />
            <p className="text-sm font-medium text-[var(--accent-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
              Drop to add
            </p>
          </div>
        </div>
      )}

      {/* Layers */}
      <div className="absolute inset-0">
        {panelContent.layers.map((layer) => (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            isSelected={isSelected && selectedLayerId === layer.id}
            isPanelSelected={isSelected}
            onSelect={() => {
              // If panel is not selected, select it first
              if (!isSelected) {
                onSelect();
              }
              onLayerSelect?.(layer.id);
            }}
            onUpdate={(updates) => handleLayerUpdate(layer.id, updates)}
            onDelete={() => handleLayerDelete(layer.id)}
          />
        ))}
      </div>

      {/* AI Image Generation Dialog - Portal to body */}
      {showAIDialog && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); handleCloseAIDialog(); }}
        >
          {/* Backdrop with gradient like ProjectSettingsDialog */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md" />
          
          {/* Dialog - wider for visual controls */}
          <div 
            className="relative bg-[var(--paper-white)] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-scale-in overflow-hidden"
            style={{ boxShadow: '0 25px 50px -12px rgba(139, 92, 246, 0.25), 0 0 0 1px rgba(255,255,255,0.1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with purple accent line */}
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600" />
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-white/80 bg-gradient-to-br from-purple-500 to-indigo-600">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>
                      Generate with AI
                    </h2>
                    <p className="text-sm text-[var(--ink-400)]">Create an image for this panel</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseAIDialog}
                  className="p-2.5 text-[var(--ink-400)] hover:text-[var(--ink-700)] hover:bg-[var(--ink-100)] rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Prompt Input */}
              <div>
                <label className="text-sm font-semibold text-[var(--ink-700)] mb-2 block">Describe your image</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="A heroic warrior standing on a cliff at sunset, looking over a vast kingdom..."
                  className="w-full h-24 p-4 bg-[var(--ink-50)] border border-[var(--ink-200)] rounded-2xl text-sm resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  disabled={isGeneratingAI}
                  autoFocus
                />
              </div>
              
              {/* Consistency Toggle */}
              <div 
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  useConsistency && projectSettings.characters?.[0]?.fiboStructuredPrompt
                    ? 'bg-purple-50/50 border-purple-200' 
                    : 'bg-[var(--ink-50)] border-[var(--ink-100)]'
                } ${!projectSettings.characters?.[0]?.fiboStructuredPrompt ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (projectSettings.characters?.[0]?.fiboStructuredPrompt) {
                    setUseConsistency(!useConsistency);
                  }
                }}
              >
                <div 
                  className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
                    useConsistency && projectSettings.characters?.[0]?.fiboStructuredPrompt
                      ? 'bg-purple-500' 
                      : 'bg-[var(--ink-200)]'
                  }`}
                >
                  <div 
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      useConsistency && projectSettings.characters?.[0]?.fiboStructuredPrompt
                        ? 'translate-x-6' 
                        : 'translate-x-1'
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--ink-800)]">Keep Style Consistency</p>
                  <p className="text-xs text-[var(--ink-400)]">
                    {projectSettings.characters?.[0]?.fiboStructuredPrompt 
                      ? 'Match your project\'s visual style' 
                      : 'Generate characters first to enable'}
                  </p>
                </div>
              </div>
              
              {/* Generated Images Gallery - Collapsible, above shot controls */}
              {generatedImages.length > 0 && (
                <div className="rounded-xl border-2 border-purple-400 bg-white shadow-sm">
                  <div className="flex items-center justify-between p-3 hover:bg-[var(--ink-50)] transition-colors rounded-t-xl">
                    <button
                      type="button"
                      onClick={() => setShowGallery(!showGallery)}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Image className="w-4.5 h-4.5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-semibold text-[var(--ink-900)] block">
                          🖼️ Generated Images ({generatedImages.length})
                        </span>
                        <span className="text-xs text-[var(--ink-500)]">
                          {selectedImageIndex !== null ? `#${selectedImageIndex + 1} selected` : 'Click to select one'}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setGeneratedImages([]); setSelectedImageIndex(null); }}
                        className="text-xs text-[var(--ink-400)] hover:text-red-500 hover:bg-red-50 flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowGallery(!showGallery)}
                        className="p-1 hover:bg-[var(--ink-100)] rounded-md transition-colors"
                      >
                        <ChevronDown className={`w-5 h-5 text-[var(--ink-400)] transition-transform duration-200 ${showGallery ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>
                  
                  {showGallery && (
                    <div className="border-t border-[var(--ink-100)] p-3 bg-[var(--ink-50)] rounded-b-xl">
                      <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                        {generatedImages.map((img, index) => (
                          <button
                            key={img.id}
                            type="button"
                            onClick={() => setSelectedImageIndex(index)}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                              selectedImageIndex === index
                                ? 'border-purple-500 ring-2 ring-purple-200 scale-[1.02]'
                                : 'border-[var(--ink-100)] hover:border-[var(--ink-300)] hover:shadow-md'
                            }`}
                          >
                            <img 
                              src={img.url} 
                              alt={`Generated ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {selectedImageIndex === index && (
                              <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                                  <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                              <span className="text-[10px] text-white font-medium">
                                {img.isOriginal ? 'Original' : `#${index + 1}`}
                              </span>
                            </div>
                            {img.isOriginal && (
                              <div className="absolute top-1 left-1">
                                <span className="text-[9px] px-1.5 py-0.5 bg-amber-500 text-white rounded font-bold">
                                  Current
                                </span>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Advanced Shot Controls - Collapsible */}
              <div className="rounded-xl border border-[var(--ink-100)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowShotSettings(!showShotSettings)}
                  className="w-full flex items-center justify-between p-3 hover:bg-[var(--ink-50)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--ink-100)] flex items-center justify-center">
                      <Aperture className="w-4.5 h-4.5 text-[var(--ink-500)]" />
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-semibold text-[var(--ink-900)] block">🎬 Shot Controls</span>
                      <span className="text-xs text-[var(--ink-400)]">Camera, lighting, color & style</span>
                    </div>
                    {hasAdvancedSettings(advancedSettings) && (
                      <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                        Customized
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-[var(--ink-400)] transition-transform duration-200 ${showShotSettings ? 'rotate-180' : ''}`} />
                </button>
                
                {showShotSettings && (
                  <div className="border-t border-[var(--ink-100)]">
                    
                    {/* Tabs Navigation */}
                    <div className="flex gap-1 p-2 bg-[var(--ink-50)]">
                      {[
                        { id: 'camera', label: '📷 Camera', icon: Camera },
                        { id: 'lighting', label: '💡 Light', icon: Sun },
                        { id: 'color', label: '🎨 Style', icon: Palette, badge: 'HDR' },
                      ].map((tab) => {
                        const isActive = (advancedSettingsTab || 'camera') === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setAdvancedSettingsTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                              isActive 
                                ? 'bg-white text-[var(--ink-900)] shadow-sm ring-1 ring-[var(--ink-100)]' 
                                : 'text-[var(--ink-500)] hover:bg-white/60 hover:text-[var(--ink-700)]'
                            }`}
                          >
                            <span>{tab.label}</span>
                            {tab.badge && (
                              <span className="text-[8px] px-1.5 py-0.5 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full font-bold">
                                {tab.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Tab Content */}
                    <div className="p-4">
                      
                      {/* ===== CAMERA TAB ===== */}
                      {(advancedSettingsTab || 'camera') === 'camera' && (
                        <div className="space-y-5">
                          {/* Camera Height - Full width */}
                          <div>
                            <label className="text-xs font-medium text-[var(--ink-500)] mb-2 block">Camera Height</label>
                            <CameraHeightPicker 
                              value={advancedSettings.cameraHeight}
                              onChange={(v) => setAdvancedSettings(s => ({ ...s, cameraHeight: v }))}
                            />
                          </div>
                          
                          {/* Camera Angle - Visual card selector */}
                          <div>
                            <label className="text-xs font-medium text-[var(--ink-500)] mb-2 block">Camera Angle</label>
                            <CameraAnglePicker
                              value={advancedSettings.cameraAngle}
                              onChange={(v) => setAdvancedSettings(s => ({ ...s, cameraAngle: v }))}
                            />
                          </div>
                          
                          {/* Shot Distance - Full width */}
                          <div>
                            <label className="text-xs font-medium text-[var(--ink-500)] mb-2 block">Shot Distance</label>
                            <ShotDistancePicker
                              value={advancedSettings.shotDistance}
                              onChange={(v) => setAdvancedSettings(s => ({ ...s, shotDistance: v }))}
                            />
                          </div>
                          
                          {/* Depth of Field */}
                          <GradientSlider
                            label="Depth of Field"
                            value={advancedSettings.depthOfField}
                            onChange={(v) => setAdvancedSettings(s => ({ ...s, depthOfField: v }))}
                            gradient="linear-gradient(to right, #a855f7, #6366f1, #3b82f6)"
                            leftLabel="Blurry BG"
                            rightLabel="All Sharp"
                            leftIcon="🔮"
                            rightIcon="🎯"
                          />
                          
                          {/* Composition - Full width, horizontal layout */}
                          <div>
                            <label className="text-xs font-medium text-[var(--ink-500)] mb-2 block">Composition</label>
                            <div className="grid grid-cols-6 gap-2">
                              {COMPOSITION_OPTIONS.map((comp) => (
                                <button
                                  key={comp.id}
                                  type="button"
                                  onClick={() => setAdvancedSettings(s => ({ ...s, composition: comp.id }))}
                                  className={`py-2.5 px-2 rounded-lg border-2 text-center transition-all ${
                                    advancedSettings.composition === comp.id
                                      ? 'border-purple-400 bg-purple-50 text-purple-700 ring-1 ring-purple-200'
                                      : 'border-[var(--ink-100)] bg-white text-[var(--ink-500)] hover:border-[var(--ink-300)] hover:shadow-sm'
                                  }`}
                                  title={comp.label}
                                >
                                  <span className="text-lg block">{comp.icon}</span>
                                  <span className="text-[10px] font-medium block mt-1">{comp.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* ===== LIGHTING TAB ===== */}
                      {(advancedSettingsTab || 'camera') === 'lighting' && (
                        <div className="space-y-4">
                          {/* Row 1: Light Direction + Shadow Slider */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-[var(--ink-500)] mb-2 block text-center">Light Direction</label>
                              <LightDirectionDial
                                value={advancedSettings.lightDirection}
                                onChange={(v) => setAdvancedSettings(s => ({ ...s, lightDirection: v }))}
                              />
                            </div>
                            <div className="flex flex-col justify-center">
                              <GradientSlider
                                label="Shadow Intensity"
                                value={advancedSettings.shadowIntensity}
                                onChange={(v) => setAdvancedSettings(s => ({ ...s, shadowIntensity: v }))}
                                gradient="linear-gradient(to right, #fef3c7, #f59e0b, #78350f)"
                                leftLabel="Soft"
                                rightLabel="Hard"
                                leftIcon="☁️"
                                rightIcon="🌑"
                              />
                            </div>
                          </div>
                          
                          {/* Time of Day - Full width horizontal */}
                          <div>
                            <label className="text-xs font-medium text-[var(--ink-500)] mb-2 block">Time of Day</label>
                            <div className="grid grid-cols-8 gap-2">
                              {TIME_OF_DAY.map((time) => {
                                const isSelected = advancedSettings.timeOfDay === time.id;
                                return (
                                  <button
                                    key={time.id}
                                    type="button"
                                    onClick={() => setAdvancedSettings(s => ({ ...s, timeOfDay: time.id }))}
                                    className={`py-2.5 px-1 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${
                                      isSelected
                                        ? 'border-purple-400 ring-1 ring-purple-200'
                                        : 'border-[var(--ink-100)] bg-white hover:border-[var(--ink-300)] hover:shadow-sm'
                                    }`}
                                    style={{ 
                                      background: isSelected ? `linear-gradient(to bottom, ${time.color}22, ${time.color}44)` : undefined
                                    }}
                                    title={time.desc}
                                  >
                                    <div 
                                      className="w-6 h-6 rounded-full"
                                      style={{ backgroundColor: time.color, boxShadow: isSelected ? `0 0 8px ${time.color}` : 'none' }}
                                    />
                                    <span className={`text-[10px] font-medium ${isSelected ? 'text-[var(--ink-800)]' : 'text-[var(--ink-500)]'}`}>
                                      {time.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* ===== COLOR & STYLE TAB ===== */}
                      {(advancedSettingsTab || 'camera') === 'color' && (
                        <div className="space-y-4">
                          {/* Color Palette */}
                          <div>
                            <label className="text-xs font-medium text-[var(--ink-500)] mb-2 block">Color Palette</label>
                            <ColorPalettePicker
                              value={advancedSettings.colorPalette}
                              onChange={(v) => setAdvancedSettings(s => ({ ...s, colorPalette: v }))}
                            />
                          </div>
                          
                          {/* Row: HDR + Contrast */}
                          <div className="grid grid-cols-2 gap-4">
                            <GradientSlider
                              label="Color Intensity / HDR"
                              value={advancedSettings.colorIntensity}
                              onChange={(v) => setAdvancedSettings(s => ({ ...s, colorIntensity: v }))}
                              gradient="linear-gradient(to right, #9ca3af, #a855f7, #ec4899, #f97316)"
                              leftLabel="Muted"
                              rightLabel="Ultra HDR"
                              leftIcon="🌫️"
                              rightIcon="🌈"
                              showHDRBadge
                            />
                            <GradientSlider
                              label="Contrast"
                              value={advancedSettings.contrast}
                              onChange={(v) => setAdvancedSettings(s => ({ ...s, contrast: v }))}
                              gradient="linear-gradient(to right, #e5e7eb, #6b7280, #111827)"
                              leftLabel="Flat"
                              rightLabel="Extreme"
                              leftIcon="🌁"
                              rightIcon="⬛"
                            />
                          </div>
                          
                          {/* Mood Grid */}
                          <div>
                            <label className="text-xs font-medium text-[var(--ink-500)] mb-2 block">Mood / Atmosphere</label>
                            <MoodGridPicker
                              value={advancedSettings.mood}
                              onChange={(v) => setAdvancedSettings(s => ({ ...s, mood: v }))}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Reset Button - Always visible at bottom */}
                      {hasAdvancedSettings(advancedSettings) && (
                        <button
                          type="button"
                          onClick={() => setAdvancedSettings({
                            cameraHeight: 'auto',
                            cameraAngle: 'auto',
                            shotDistance: 'auto',
                            depthOfField: 50,
                            composition: 'auto',
                            timeOfDay: 'auto',
                            lightDirection: 'auto',
                            shadowIntensity: 50,
                            colorPalette: 'auto',
                            colorIntensity: 50,
                            contrast: 50,
                            mood: 'auto',
                          })}
                          className="w-full mt-4 py-2 text-xs text-[var(--ink-500)] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-1 border border-transparent hover:border-red-200"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset all to defaults
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {aiError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-sm text-red-600">{aiError}</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-[var(--ink-100)] bg-gradient-to-t from-[var(--ink-50)]/80 to-transparent">
              <div className="flex gap-3">
                {/* Generate Button */}
                <button
                  onClick={handleGenerateAIImage}
                  disabled={!aiPrompt.trim() || isGeneratingAI}
                  className={`flex-1 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] ${
                    generatedImages.length > 0 ? '' : 'w-full'
                  }`}
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>{generatedImages.length > 0 ? 'Generate Another' : 'Generate Image'}</span>
                    </>
                  )}
                </button>
                
                {/* Use Selected Button - Only show when images exist */}
                {generatedImages.length > 0 && (
                  <button
                    onClick={handleSelectImage}
                    disabled={selectedImageIndex === null}
                    className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Check className="w-5 h-5" />
                    <span>Use Selected</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
