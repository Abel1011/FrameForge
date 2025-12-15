'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Book, Film, FileText, Sparkles, ArrowRight, Check } from 'lucide-react';
import { createProject, saveProject } from '../lib/storage';
import { DEFAULT_PAGE_DIMENSIONS } from '../types';

const PROJECT_TYPES = [
  { value: 'comic', label: 'Comic', icon: Book, description: 'US Comic format', dimensions: '1700×2600', gradient: 'gradient-comic' },
  { value: 'manga', label: 'Manga', icon: Book, description: 'B5 format', dimensions: '1500×2100', gradient: 'gradient-manga' },
  { value: 'storyboard', label: 'Storyboard', icon: Film, description: '16:9 format', dimensions: '1920×1080', gradient: 'gradient-storyboard' },
  { value: 'graphic-novel', label: 'Graphic Novel', icon: FileText, description: 'Standard format', dimensions: '1600×2400', gradient: 'gradient-webtoon' }
];

export default function CreateProjectDialog({ isOpen, onClose }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('comic');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setType('comic');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Project name is required');
      return;
    }

    const project = createProject(trimmedName, type);
    await saveProject(project);
    onClose();
    router.push(`/project/${project.id}`);
  };

  if (!isOpen) return null;

  const selectedType = PROJECT_TYPES.find(t => t.value === type);
  const dimensions = DEFAULT_PAGE_DIMENSIONS[type];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="absolute inset-0 dialog-overlay" 
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-dialog-title"
        className="relative bg-[var(--paper-white)] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in"
      >
        {/* Header with gradient */}
        <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 relative">
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--accent-primary-gradient)' }} />
          
          <button
            onClick={onClose}
            className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 sm:p-2.5 text-[var(--ink-300)] hover:text-[var(--ink-600)] hover:bg-[var(--ink-50)] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'var(--accent-primary-gradient)' }}>
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h2 id="create-dialog-title" className="text-xl sm:text-2xl font-bold text-[var(--ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>
                New Project
              </h2>
              <p className="text-xs sm:text-sm text-[var(--ink-400)]">Create your visual narrative</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-5 sm:px-8 pb-6 sm:pb-8">
          <div className="mb-6">
            <label htmlFor="project-name" className="block text-sm font-semibold text-[var(--ink-700)] mb-2.5" style={{ fontFamily: 'var(--font-display)' }}>
              Project Name
            </label>
            <input
              ref={inputRef}
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="My Awesome Comic"
              className={`input-field ${error ? 'border-red-400 focus:border-red-500' : ''}`}
            />
            {error && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-500"></span>
                {error}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-[var(--ink-700)] mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Project Type
            </label>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
              {PROJECT_TYPES.map((projectType) => {
                const Icon = projectType.icon;
                const isSelected = type === projectType.value;
                
                return (
                  <button
                    key={projectType.value}
                    type="button"
                    onClick={() => setType(projectType.value)}
                    className={`group relative flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 border-2 rounded-xl sm:rounded-2xl text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)] shadow-md'
                        : 'border-[var(--ink-100)] hover:border-[var(--ink-200)] hover:shadow-sm bg-[var(--paper-white)]'
                    }`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${projectType.gradient} flex items-center justify-center shadow-md transition-transform duration-200 ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm sm:text-base text-[var(--ink-800)]" style={{ fontFamily: 'var(--font-display)' }}>
                        {projectType.label}
                      </div>
                      <div className="text-xs text-[var(--ink-400)]">{projectType.dimensions}</div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 sm:top-3 right-2 sm:right-3 w-5 h-5 rounded-full bg-[var(--accent-primary)] flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-[var(--paper-soft)] rounded-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-[var(--ink-500)]">Canvas Size</span>
              <span className="text-xs sm:text-sm font-bold text-[var(--ink-700)]" style={{ fontFamily: 'var(--font-display)' }}>
                {dimensions.width} × {dimensions.height} px
              </span>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              Create Project
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
