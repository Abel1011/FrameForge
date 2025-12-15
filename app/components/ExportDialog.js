'use client';

import { useState, useEffect } from 'react';
import { X, Download, FileImage, FileText, Loader2, Sparkles } from 'lucide-react';
import { getExportPreview } from '../lib/export';

const FORMATS = [
  { value: 'png', label: 'PNG', icon: FileImage, description: 'Lossless, best for web' },
  { value: 'jpeg', label: 'JPEG', icon: FileImage, description: 'Smaller file size' },
  { value: 'pdf', label: 'PDF', icon: FileText, description: 'Multi-page document' }
];

const DPI_OPTIONS = [
  { value: 72, label: '72 DPI', description: 'Screen/Web' },
  { value: 150, label: '150 DPI', description: 'Standard print' },
  { value: 300, label: '300 DPI', description: 'High quality print' }
];

export default function ExportDialog({ 
  isOpen, 
  onClose, 
  project,
  currentPageId,
  onExportPage,
  onExportProject
}) {
  const [exportType, setExportType] = useState('page'); // 'page' or 'project'
  const [format, setFormat] = useState('png');
  const [dpi, setDpi] = useState(150);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setExportType('page');
      setFormat('png');
      setDpi(150);
      setIsExporting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isExporting) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isExporting, onClose]);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      if (exportType === 'page') {
        await onExportPage(format, dpi);
      } else {
        await onExportProject(dpi);
      }
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen || !project) return null;

  const preview = getExportPreview(project.width, project.height, dpi);
  const currentPage = project.pages.find(p => p.id === currentPageId);
  const currentPageNumber = currentPage ? currentPage.order + 1 : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="absolute inset-0 dialog-overlay" 
        onClick={isExporting ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        className="relative bg-[var(--paper-white)] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-scale-in"
      >
        {/* Header gradient */}
        <div className="h-1 gradient-manga" />
        
        <div className="p-5 sm:p-8">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 sm:p-2.5 text-[var(--ink-300)] hover:text-[var(--ink-600)] hover:bg-[var(--ink-50)] rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 gradient-manga rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
              <Download className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h2 id="export-dialog-title" className="text-xl sm:text-2xl font-bold text-[var(--ink-900)]" style={{ fontFamily: 'var(--font-display)' }}>
                Export
              </h2>
              <p className="text-xs sm:text-sm text-[var(--ink-400)]">Download your project</p>
            </div>
          </div>

          {/* Export Type */}
          <div className="mb-5 sm:mb-6">
            <label className="block text-sm font-semibold text-[var(--ink-700)] mb-2 sm:mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Export
            </label>
            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setExportType('page');
                  if (format === 'pdf') setFormat('png');
                }}
                className={`flex-1 p-3 sm:p-4 border-2 rounded-xl sm:rounded-2xl text-left transition-all ${
                  exportType === 'page'
                    ? 'border-[var(--accent-secondary)] bg-[var(--accent-secondary-subtle)] shadow-md'
                    : 'border-[var(--ink-100)] hover:border-[var(--ink-200)] hover:shadow-sm'
                }`}
              >
                <div className="font-semibold text-sm text-[var(--ink-800)]" style={{ fontFamily: 'var(--font-display)' }}>Current Page</div>
                <div className="text-xs text-[var(--ink-400)]">Page {currentPageNumber}</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportType('project');
                  setFormat('pdf');
                }}
              className={`flex-1 p-3 sm:p-4 border-2 rounded-xl sm:rounded-2xl text-left transition-all ${
                exportType === 'project'
                  ? 'border-[var(--accent-secondary)] bg-[var(--accent-secondary-subtle)] shadow-md'
                  : 'border-[var(--ink-100)] hover:border-[var(--ink-200)] hover:shadow-sm'
              }`}
            >
              <div className="font-semibold text-sm text-[var(--ink-800)]" style={{ fontFamily: 'var(--font-display)' }}>Entire Project</div>
              <div className="text-xs text-[var(--ink-400)]">{project.pages.length} pages</div>
            </button>
          </div>
        </div>

          {/* Format */}
          <div className="mb-5 sm:mb-6">
            <label className="block text-sm font-semibold text-[var(--ink-700)] mb-2 sm:mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Format
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {FORMATS.filter(f => exportType === 'project' ? f.value === 'pdf' : f.value !== 'pdf').map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = format === fmt.value;
                
                return (
                  <button
                    key={fmt.value}
                    type="button"
                    onClick={() => setFormat(fmt.value)}
                    className={`p-2.5 sm:p-3 border-2 rounded-lg sm:rounded-xl text-center transition-all ${
                      isSelected
                        ? 'border-[var(--accent-secondary)] bg-[var(--accent-secondary-subtle)] shadow-sm'
                        : 'border-[var(--ink-100)] hover:border-[var(--ink-200)]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 sm:mb-1.5 ${isSelected ? 'text-[var(--accent-secondary)]' : 'text-[var(--ink-300)]'}`} />
                    <div className="font-semibold text-xs sm:text-sm text-[var(--ink-700)]" style={{ fontFamily: 'var(--font-display)' }}>{fmt.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality/DPI */}
          <div className="mb-5 sm:mb-6">
            <label className="block text-sm font-semibold text-[var(--ink-700)] mb-2 sm:mb-3" style={{ fontFamily: 'var(--font-display)' }}>
              Quality
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {DPI_OPTIONS.map((option) => {
                const isSelected = dpi === option.value;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDpi(option.value)}
                    className={`p-2.5 sm:p-3 border-2 rounded-lg sm:rounded-xl text-center transition-all ${
                      isSelected
                        ? 'border-[var(--accent-secondary)] bg-[var(--accent-secondary-subtle)] shadow-sm'
                        : 'border-[var(--ink-100)] hover:border-[var(--ink-200)]'
                    }`}
                  >
                    <div className="font-semibold text-xs sm:text-sm text-[var(--ink-700)]" style={{ fontFamily: 'var(--font-display)' }}>{option.label}</div>
                    <div className="text-[10px] sm:text-xs text-[var(--ink-400)]">{option.description}</div>
                </button>
              );
            })}
          </div>
        </div>

          {/* Preview Info */}
          <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-[var(--paper-soft)] rounded-xl sm:rounded-2xl">
            <div className="text-xs sm:text-sm text-[var(--ink-600)] space-y-1.5 sm:space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--ink-500)]">Output size</span>
                <span className="font-bold text-[var(--ink-700)]">{preview.width} × {preview.height} px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-500)]">Estimated size</span>
                <span className="font-bold text-[var(--ink-700)]">~{preview.fileSize}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="btn-secondary disabled:opacity-50 w-full xs:w-auto"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="btn-teal flex items-center justify-center gap-2 disabled:opacity-50 w-full xs:w-auto"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
