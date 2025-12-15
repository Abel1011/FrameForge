'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { BookOpen, Film, FileText, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import NestedPanelRenderer from './NestedPanelRenderer';
import { resizePanelsInRow, resizeRows, resizeNestedPanels, getAllLeafPanelIds } from '../lib/grid';

// Zoom configuration
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;
const ZOOM_SCROLL_SENSITIVITY = 0.001;

// Project type specific configurations
const PROJECT_TYPE_CONFIG = {
  'comic': {
    icon: BookOpen,
    label: 'Comic',
    canvasClass: 'canvas-comic',
    panelBorderRadius: '4px',
    showPrintMarks: true,
    paperTexture: true,
    accentColor: 'var(--accent-primary)',
    bgPattern: 'radial-gradient(circle at 20% 80%, rgba(232, 93, 76, 0.03) 0%, transparent 50%)',
  },
  'manga': {
    icon: BookOpen,
    label: 'Manga',
    canvasClass: 'canvas-manga',
    panelBorderRadius: '2px',
    showPrintMarks: true,
    paperTexture: true,
    accentColor: 'var(--accent-secondary)',
    bgPattern: 'linear-gradient(180deg, rgba(13, 148, 136, 0.02) 0%, transparent 100%)',
    readingDirection: 'rtl',
  },
  'storyboard': {
    icon: Film,
    label: 'Storyboard',
    canvasClass: 'canvas-storyboard',
    panelBorderRadius: '0px',
    showPrintMarks: false,
    paperTexture: false,
    accentColor: 'var(--accent-tertiary)',
    bgPattern: 'none',
    showFrameNumbers: true,
  },
  'graphic-novel': {
    icon: FileText,
    label: 'Graphic Novel',
    canvasClass: 'canvas-graphic-novel',
    panelBorderRadius: '6px',
    showPrintMarks: true,
    paperTexture: true,
    accentColor: '#ec4899',
    bgPattern: 'radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.03) 0%, transparent 50%)',
  },
};

export default function GridEditor({ 
  grid, 
  onGridChange, 
  selectedPanelId, 
  onPanelSelect,
  selectedLayerId,
  onLayerSelect,
  pageWidth,
  pageHeight,
  projectType = 'comic',
  pageOrientation = 'portrait',
  projectSettings = {},
  panelActionTrigger = null,
  onPanelActionProcessed = null
}) {
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef(null);
  const config = PROJECT_TYPE_CONFIG[projectType] || PROJECT_TYPE_CONFIG['comic'];
  const TypeIcon = config.icon;

  // Calculate effective dimensions based on orientation
  const effectiveWidth = pageOrientation === 'landscape' ? pageHeight : pageWidth;
  const effectiveHeight = pageOrientation === 'landscape' ? pageWidth : pageHeight;

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(ZOOM_MAX, prev + ZOOM_STEP));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(ZOOM_MIN, prev - ZOOM_STEP));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  // Handle scroll zoom (Ctrl + scroll or just scroll)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      // Only zoom if Ctrl is pressed or if it's a pinch gesture (ctrlKey is true for pinch on trackpad)
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * ZOOM_SCROLL_SENSITIVITY;
        setZoom(prev => {
          const newZoom = prev + delta * prev; // Proportional zoom
          return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomReset]);

  const handleRowResize = useCallback((sizes) => {
    const newGrid = resizeRows(grid, sizes);
    onGridChange(newGrid);
  }, [grid, onGridChange]);

  const handlePanelResize = useCallback((rowId, sizes) => {
    const newGrid = resizePanelsInRow(grid, rowId, sizes);
    onGridChange(newGrid);
  }, [grid, onGridChange]);

  const handleNestedResize = useCallback((parentPanelId, sizes) => {
    const newGrid = resizeNestedPanels(grid, parentPanelId, sizes);
    onGridChange(newGrid);
  }, [grid, onGridChange]);

  const aspectRatio = effectiveWidth / effectiveHeight;

  // Create frame number map for storyboards
  const frameNumberMap = useMemo(() => {
    if (!config.showFrameNumbers) return null;
    const leafIds = getAllLeafPanelIds(grid);
    const map = new Map();
    leafIds.forEach((id, index) => map.set(id, index + 1));
    return map;
  }, [grid, config.showFrameNumbers]);

  // Calculate optimal canvas size based on orientation
  const isPortraitCanvas = effectiveHeight > effectiveWidth;
  
  // Calculate canvas dimensions to fit viewport nicely
  const canvasStyle = useMemo(() => {
    // Base size that looks good at 100% zoom
    const maxViewportHeight = 'calc(100vh - 180px)';
    const maxViewportWidth = isPortraitCanvas ? '600px' : '85vw';
    
    if (isPortraitCanvas) {
      return {
        width: 'auto',
        height: maxViewportHeight,
        maxWidth: maxViewportWidth,
        maxHeight: maxViewportHeight,
        minHeight: '400px',
        minWidth: '300px',
      };
    } else {
      // Landscape - prioritize width
      return {
        width: maxViewportWidth,
        height: 'auto',
        maxWidth: '1000px',
        maxHeight: maxViewportHeight,
        minHeight: '350px',
        minWidth: '500px',
      };
    }
  }, [isPortraitCanvas]);
  
  // Format zoom percentage
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div 
      ref={containerRef}
      className={`canvas-container flex items-center justify-center p-4 sm:p-6 md:p-8 h-full w-full overflow-auto ${config.canvasClass}`}
      onClick={() => onPanelSelect(null)}
      style={{ background: config.bgPattern }}
    >
      {/* Zoom controls - floating */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 bg-[var(--paper-card)] rounded-lg shadow-lg border border-[var(--ink-100)] p-1">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= ZOOM_MIN}
          className="p-2 rounded-md hover:bg-[var(--ink-50)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Alejar (Ctrl + -)"
        >
          <ZoomOut className="w-4 h-4 text-[var(--ink-600)]" />
        </button>
        
        <button
          onClick={handleZoomReset}
          className="px-2 py-1 min-w-[4rem] text-xs font-medium text-[var(--ink-600)] hover:bg-[var(--ink-50)] rounded-md transition-colors"
          title="Restablecer zoom (Ctrl + 0)"
        >
          {zoomPercent}%
        </button>
        
        <button
          onClick={handleZoomIn}
          disabled={zoom >= ZOOM_MAX}
          className="p-2 rounded-md hover:bg-[var(--ink-50)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Acercar (Ctrl + +)"
        >
          <ZoomIn className="w-4 h-4 text-[var(--ink-600)]" />
        </button>

        <div className="w-px h-6 bg-[var(--ink-200)] mx-1" />

        <button
          onClick={handleZoomReset}
          className="p-2 rounded-md hover:bg-[var(--ink-50)] transition-colors"
          title="Ajustar a ventana"
        >
          <Maximize2 className="w-4 h-4 text-[var(--ink-600)]" />
        </button>
      </div>

      {/* Canvas wrapper with effects */}
      <div 
        className="relative flex flex-col items-center justify-center transition-transform duration-150 ease-out origin-center"
        style={{ 
          minHeight: '60vh', 
          width: '100%', 
          maxWidth: isPortraitCanvas ? '700px' : '1100px',
          transform: `scale(${zoom})`,
        }}
      >
        {/* Project type indicator */}
        <div 
          className="w-full flex items-center justify-between mb-3 px-1"
        >
          <div 
            className="flex items-center gap-2 text-xs font-medium opacity-70"
            style={{ color: config.accentColor, fontFamily: 'var(--font-display)' }}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            <span>{config.label}</span>
            {projectType === 'manga' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-secondary-subtle)] text-[var(--accent-secondary)]">
                ← RTL
              </span>
            )}
          </div>
          <div 
            className="text-xs text-[var(--ink-400)] opacity-70"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {effectiveWidth} × {effectiveHeight}
          </div>
        </div>

        {/* Main canvas with print marks */}
        <div className="relative">
          {/* Print/bleed marks for print-ready types */}
          {config.showPrintMarks && (
            <>
              {/* Corner marks */}
              <div className="absolute -top-3 -left-3 w-6 h-6 border-l-2 border-t-2 border-[var(--ink-300)] opacity-40" />
              <div className="absolute -top-3 -right-3 w-6 h-6 border-r-2 border-t-2 border-[var(--ink-300)] opacity-40" />
              <div className="absolute -bottom-3 -left-3 w-6 h-6 border-l-2 border-b-2 border-[var(--ink-300)] opacity-40" />
              <div className="absolute -bottom-3 -right-3 w-6 h-6 border-r-2 border-b-2 border-[var(--ink-300)] opacity-40" />
              {/* Center marks */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-[var(--ink-300)] opacity-40" />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-px h-3 bg-[var(--ink-300)] opacity-40" />
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-px bg-[var(--ink-300)] opacity-40" />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-px bg-[var(--ink-300)] opacity-40" />
            </>
          )}

          {/* Main canvas */}
          <div 
            className={`canvas-page relative overflow-hidden transition-shadow duration-300 ${
              config.paperTexture ? 'paper-texture' : ''
            }`}
            style={{
              ...canvasStyle,
              aspectRatio: aspectRatio,
              borderRadius: config.panelBorderRadius,
              boxShadow: `
                0 1px 3px rgba(0,0,0,0.08),
                0 8px 24px rgba(0,0,0,0.12),
                0 24px 48px rgba(0,0,0,0.08)
              `,
              border: '1px solid var(--ink-100)',
            }}
        >
          {/* Paper texture overlay */}
          {config.paperTexture && (
            <div className="absolute inset-0 pointer-events-none paper-grain opacity-30 z-10" />
          )}

          <PanelGroup 
            direction="vertical" 
            onLayout={handleRowResize}
            className="h-full"
          >
            {grid.rows.map((row, rowIndex) => (
              <div key={row.id} className="contents">
                <Panel 
                  defaultSize={row.height}
                  minSize={10}
                >
                  <PanelGroup 
                    direction="horizontal"
                    onLayout={(sizes) => handlePanelResize(row.id, sizes)}
                    className="h-full"
                  >
                    {row.panels.map((panel, panelIndex) => (
                      <div key={panel.id} className="contents">
                        <Panel 
                          defaultSize={panel.width}
                          minSize={10}
                        >
                          <NestedPanelRenderer
                            panel={panel}
                            selectedPanelId={selectedPanelId}
                            onPanelSelect={onPanelSelect}
                            selectedLayerId={selectedLayerId}
                            onLayerSelect={onLayerSelect}
                            grid={grid}
                            onGridChange={onGridChange}
                            onNestedResize={handleNestedResize}
                            projectType={projectType}
                            panelBorderRadius={config.panelBorderRadius}
                            gutterWidth={grid.gutterWidth}
                            frameNumberMap={frameNumberMap}
                            accentColor={config.accentColor}
                            projectSettings={projectSettings}
                            panelActionTrigger={panelActionTrigger}
                            onPanelActionProcessed={onPanelActionProcessed}
                          />
                        </Panel>
                        {panelIndex < row.panels.length - 1 && (
                          <PanelResizeHandle 
                            className="panel-resize-handle-h group"
                            style={{ 
                              width: Math.max(grid.gutterWidth, 4),
                              margin: `0 ${Math.max(grid.gutterWidth / 4, 1)}px`,
                            }}
                          >
                            <div className="resize-handle-inner h-full w-full flex items-center justify-center">
                              <div 
                                className="w-0.5 h-8 rounded-full bg-[var(--ink-200)] group-hover:bg-[var(--accent-primary)] group-hover:h-12 transition-all duration-200"
                                style={{ '--handle-color': config.accentColor }}
                              />
                            </div>
                          </PanelResizeHandle>
                        )}
                      </div>
                    ))}
                  </PanelGroup>
                </Panel>
                {rowIndex < grid.rows.length - 1 && (
                  <PanelResizeHandle 
                    className="panel-resize-handle-v group"
                    style={{ 
                      height: Math.max(grid.gutterWidth, 4),
                      margin: `${Math.max(grid.gutterWidth / 4, 1)}px 0`,
                    }}
                  >
                    <div className="resize-handle-inner w-full h-full flex items-center justify-center">
                      <div 
                        className="h-0.5 w-8 rounded-full bg-[var(--ink-200)] group-hover:bg-[var(--accent-primary)] group-hover:w-12 transition-all duration-200"
                        style={{ '--handle-color': config.accentColor }}
                      />
                    </div>
                  </PanelResizeHandle>
                )}
              </div>
            ))}
          </PanelGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
