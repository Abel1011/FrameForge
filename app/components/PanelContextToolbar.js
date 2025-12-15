'use client';

import { SplitSquareHorizontal, SplitSquareVertical, Merge, Image, Type, MessageCircle, Sparkles, Hash, X, MousePointer2, Trash2, Maximize, Square, RectangleHorizontal, Fullscreen, MoveHorizontal, MoveVertical, Bold, MessageSquare, Cloud, Zap, Wand2 } from 'lucide-react';
import { splitPanelHorizontal, splitPanelVertical, mergePanels, canSplitHorizontal, canSplitVertical, getPanelById, MAX_NESTING_DEPTH } from '../lib/grid';

// Bubble style options for speech bubbles
const BUBBLE_STYLES = [
  { value: 'speech', icon: MessageSquare, title: 'Speech' },
  { value: 'thought', icon: Cloud, title: 'Thought' },
  { value: 'shout', icon: Zap, title: 'Shout' },
];

// Tail positions - arrows show where the tail points TO (away from bubble)
const TAIL_POSITIONS = [
  { value: 'bottom-left', label: '↙' },
  { value: 'bottom-center', label: '↓' },
  { value: 'bottom-right', label: '↘' },
  { value: 'left', label: '←' },
  { value: 'right', label: '→' },
  { value: 'top-left', label: '↖' },
  { value: 'top-center', label: '↑' },
  { value: 'top-right', label: '↗' },
];

// Fit options for images
const FIT_OPTIONS = [
  { value: 'contain', icon: Square, title: 'Contain' },
  { value: 'cover', icon: Maximize, title: 'Cover' },
  { value: 'fill', icon: RectangleHorizontal, title: 'Fill' },
];

export default function PanelContextToolbar({ 
  panel, 
  grid, 
  onGridChange,
  onAddImage,
  onAddText,
  onAddSpeechBubble,
  onOpenAIDialog,
  onEditAIImage,
  onDeselect,
  frameNumber,
  // Layer props
  selectedLayer,
  onLayerUpdate,
  onLayerDelete,
}) {
  // Check if selected layer is an AI-generated image
  const isAIGeneratedImage = selectedLayer?.type === 'image' && selectedLayer?.data?.aiGeneration;

  // Check split limits (only if panel exists)
  const canSplitH = panel ? canSplitHorizontal(grid, panel.id) : false;
  const canSplitV = panel ? canSplitVertical(grid, panel.id) : false;

  // Check if this panel can be merged
  const panelInfo = panel ? getPanelById(grid, panel.id) : null;
  const canMerge = panelInfo && panelInfo.row.panels.length > 1;

  const handleSplitHorizontal = () => {
    if (!panel) return;
    const newGrid = splitPanelHorizontal(grid, panel.id);
    onGridChange(newGrid);
  };

  const handleSplitVertical = () => {
    if (!panel) return;
    const newGrid = splitPanelVertical(grid, panel.id);
    onGridChange(newGrid);
  };

  const handleMerge = () => {
    if (!panel) return;
    const newGrid = mergePanels(grid, panel.id);
    onGridChange(newGrid);
  };

  // Image layer handlers
  const handleFitChange = (fit) => {
    if (!selectedLayer || selectedLayer.type !== 'image') return;
    onLayerUpdate?.({ data: { ...selectedLayer.data, fit } });
  };

  const handleFitHorizontal = () => {
    if (!selectedLayer) return;
    onLayerUpdate?.({
      position: { x: 0, y: selectedLayer.position.y },
      size: { width: '100%', height: selectedLayer.size.height }
    });
  };

  const handleFitVertical = () => {
    if (!selectedLayer) return;
    onLayerUpdate?.({
      position: { x: selectedLayer.position.x, y: 0 },
      size: { width: selectedLayer.size.width, height: '100%' }
    });
  };

  const handleFillPanel = () => {
    if (!selectedLayer) return;
    onLayerUpdate?.({
      position: { x: 0, y: 0 },
      size: { width: '100%', height: '100%', fillPanel: true },
      data: { ...selectedLayer.data, fit: 'cover' }
    });
  };

  // Text layer handlers
  const handleFontSizeChange = (e) => {
    if (!selectedLayer || selectedLayer.type !== 'text') return;
    onLayerUpdate?.({ data: { ...selectedLayer.data, fontSize: parseInt(e.target.value) || 16 } });
  };

  const handleColorChange = (e) => {
    if (!selectedLayer || selectedLayer.type !== 'text') return;
    onLayerUpdate?.({ data: { ...selectedLayer.data, fontColor: e.target.value } });
  };

  const toggleBold = () => {
    if (!selectedLayer || selectedLayer.type !== 'text') return;
    onLayerUpdate?.({ 
      data: { 
        ...selectedLayer.data, 
        fontWeight: selectedLayer.data.fontWeight === 'bold' ? 'normal' : 'bold' 
      } 
    });
  };

  // Speech bubble handlers
  const handleBubbleStyleChange = (style) => {
    if (!selectedLayer || selectedLayer.type !== 'speech-bubble') return;
    onLayerUpdate?.({ data: { ...selectedLayer.data, bubbleStyle: style } });
  };

  const handleTailChange = (position) => {
    if (!selectedLayer || selectedLayer.type !== 'speech-bubble') return;
    onLayerUpdate?.({ data: { ...selectedLayer.data, tailPosition: position } });
  };

  // Empty state - no selection
  if (!panel) {
    return (
      <div className="bg-[var(--paper-white)]/95 backdrop-blur-md border-b border-[var(--ink-100)] px-3 sm:px-5 py-2 h-[44px] flex items-center">
        <div className="flex items-center gap-2 text-[var(--ink-400)]">
          <MousePointer2 className="w-4 h-4" />
          <span className="text-sm">Select a panel to edit</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--paper-white)]/95 backdrop-blur-md border-b border-[var(--ink-100)] px-3 sm:px-5 py-2 h-[44px] flex items-center gap-2 sm:gap-3 overflow-x-auto">
      {/* Panel indicator */}
      <div className="flex items-center gap-2 pr-3 border-r border-[var(--ink-200)] flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--accent-primary-subtle)] rounded-lg">
          <Hash className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span className="text-xs font-bold text-[var(--accent-primary)]">
            Panel {frameNumber || '?'}
          </span>
        </div>
        <button
          onClick={onDeselect}
          className="p-1 hover:bg-[var(--ink-100)] rounded-md text-[var(--ink-400)] hover:text-[var(--ink-600)] transition-colors"
          title="Deselect panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Layout actions */}
      <div className="flex items-center gap-1 pr-3 border-r border-[var(--ink-200)] flex-shrink-0">
        <span className="text-[10px] text-[var(--ink-400)] uppercase tracking-wider mr-1 hidden sm:inline">Layout</span>
        <button
          onClick={handleSplitHorizontal}
          disabled={!canSplitH}
          className={`p-2 rounded-lg transition-all ${
            canSplitH 
              ? 'hover:bg-[var(--ink-100)] text-[var(--ink-600)] hover:text-[var(--ink-800)]' 
              : 'opacity-30 cursor-not-allowed text-[var(--ink-400)]'
          }`}
          title={canSplitH ? 'Split Horizontal' : `Max nesting depth: ${MAX_NESTING_DEPTH}`}
        >
          <SplitSquareHorizontal className="w-4 h-4" />
        </button>
        <button
          onClick={handleSplitVertical}
          disabled={!canSplitV}
          className={`p-2 rounded-lg transition-all ${
            canSplitV 
              ? 'hover:bg-[var(--ink-100)] text-[var(--ink-600)] hover:text-[var(--ink-800)]' 
              : 'opacity-30 cursor-not-allowed text-[var(--ink-400)]'
          }`}
          title={canSplitV ? 'Split Vertical' : `Max nesting depth: ${MAX_NESTING_DEPTH}`}
        >
          <SplitSquareVertical className="w-4 h-4" />
        </button>
        {canMerge && (
          <button
            onClick={handleMerge}
            className="p-2 rounded-lg hover:bg-[var(--ink-100)] text-[var(--ink-600)] hover:text-[var(--ink-800)] transition-all"
            title="Merge with adjacent panel"
          >
            <Merge className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content actions */}
      <div className="flex items-center gap-1 pr-3 border-r border-[var(--ink-200)] flex-shrink-0">
        <span className="text-[10px] text-[var(--ink-400)] uppercase tracking-wider mr-1 hidden sm:inline">Add</span>
        <button
          onClick={onAddImage}
          className="p-2 rounded-lg hover:bg-teal-50 text-[var(--ink-600)] hover:text-teal-600 transition-all"
          title="Add Image"
        >
          <Image className="w-4 h-4" />
        </button>
        <button
          onClick={onAddText}
          className="p-2 rounded-lg hover:bg-orange-50 text-[var(--ink-600)] hover:text-orange-600 transition-all"
          title="Add Text"
        >
          <Type className="w-4 h-4" />
        </button>
        <button
          onClick={onAddSpeechBubble}
          className="p-2 rounded-lg hover:bg-violet-50 text-[var(--ink-600)] hover:text-violet-500 transition-all"
          title="Add Speech Bubble"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      </div>

      {/* AI Generation */}
      <div className="flex items-center gap-1 pr-3 border-r border-[var(--ink-200)] flex-shrink-0">
        <button
          onClick={onOpenAIDialog}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-sm hover:shadow-md transition-all"
          title="Generate AI Image"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-xs font-medium hidden sm:inline">AI Generate</span>
        </button>
      </div>

      {/* Layer-specific controls */}
      {selectedLayer && (
        <>
          {/* Image layer controls */}
          {selectedLayer.type === 'image' && (
            <div className="flex items-center gap-1 pr-3 border-r border-[var(--ink-200)] flex-shrink-0">
              <span className="text-[10px] text-teal-500 uppercase tracking-wider mr-1 hidden sm:inline">Image</span>
              {FIT_OPTIONS.map(({ value, icon: Icon, title }) => (
                <button
                  key={value}
                  onClick={() => handleFitChange(value)}
                  className={`p-2 rounded-lg transition-all ${
                    selectedLayer.data.fit === value 
                      ? 'bg-teal-100 text-teal-600' 
                      : 'hover:bg-[var(--ink-100)] text-[var(--ink-600)]'
                  }`}
                  title={title}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
              <div className="w-px h-4 bg-[var(--ink-200)] mx-1" />
              <button
                onClick={handleFitHorizontal}
                className="p-2 rounded-lg hover:bg-[var(--ink-100)] text-[var(--ink-600)] transition-all"
                title="Fit width"
              >
                <MoveHorizontal className="w-4 h-4" />
              </button>
              <button
                onClick={handleFitVertical}
                className="p-2 rounded-lg hover:bg-[var(--ink-100)] text-[var(--ink-600)] transition-all"
                title="Fit height"
              >
                <MoveVertical className="w-4 h-4" />
              </button>
              <button
                onClick={handleFillPanel}
                className="p-2 rounded-lg hover:bg-[var(--ink-100)] text-[var(--ink-600)] transition-all"
                title="Fill panel"
              >
                <Fullscreen className="w-4 h-4" />
              </button>
              {/* Edit AI button for AI-generated images */}
              {isAIGeneratedImage && (
                <>
                  <div className="w-px h-4 bg-[var(--ink-200)] mx-1" />
                  <button
                    onClick={onEditAIImage}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white transition-all"
                    title="Edit AI generation settings"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium hidden sm:inline">Edit AI</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Text layer controls */}
          {selectedLayer.type === 'text' && (
            <div className="flex items-center gap-1 pr-3 border-r border-[var(--ink-200)] flex-shrink-0">
              <span className="text-[10px] text-orange-500 uppercase tracking-wider mr-1 hidden sm:inline">Text</span>
              <input
                type="number"
                value={selectedLayer.data.fontSize}
                onChange={handleFontSizeChange}
                className="w-14 px-2 py-1 text-xs border border-[var(--ink-200)] rounded-lg bg-white focus:border-orange-400 outline-none"
                min="8"
                max="72"
              />
              <input
                type="color"
                value={selectedLayer.data.fontColor}
                onChange={handleColorChange}
                className="w-8 h-8 p-0.5 border border-[var(--ink-200)] cursor-pointer rounded-lg"
              />
              <button
                onClick={toggleBold}
                className={`p-2 rounded-lg transition-all ${
                  selectedLayer.data.fontWeight === 'bold' 
                    ? 'bg-orange-100 text-orange-600' 
                    : 'hover:bg-[var(--ink-100)] text-[var(--ink-600)]'
                }`}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Speech bubble controls */}
          {selectedLayer.type === 'speech-bubble' && (
            <div className="flex items-center gap-1 pr-3 border-r border-[var(--ink-200)] flex-shrink-0">
              <span className="text-[10px] text-violet-500 uppercase tracking-wider mr-1 hidden sm:inline">Bubble</span>
              {BUBBLE_STYLES.map(({ value, icon: Icon, title }) => (
                <button
                  key={value}
                  onClick={() => handleBubbleStyleChange(value)}
                  className={`p-2 rounded-lg transition-all ${
                    selectedLayer.data.bubbleStyle === value 
                      ? 'bg-violet-100 text-violet-600' 
                      : 'hover:bg-[var(--ink-100)] text-[var(--ink-600)]'
                  }`}
                  title={title}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
              <select
                value={selectedLayer.data.tailPosition}
                onChange={(e) => handleTailChange(e.target.value)}
                className="text-xs px-2 py-1.5 border border-[var(--ink-200)] rounded-lg bg-white focus:border-violet-400 outline-none cursor-pointer"
                title="Tail position"
              >
                {TAIL_POSITIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Delete layer */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onLayerDelete}
              className="p-2 rounded-lg hover:bg-red-50 text-[var(--ink-600)] hover:text-red-500 transition-all"
              title="Delete element"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
