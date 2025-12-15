'use client';

import { useState, useRef, useEffect } from 'react';

export default function TextLayer({ layer, isSelected, isPanelSelected, onSelect, onUpdate, onDelete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dragPosition, setDragPosition] = useState(null); // Local position during drag
  const layerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Initialize centered position on first render
  useEffect(() => {
    if (layer.position.centered && layerRef.current) {
      const parent = layerRef.current.parentElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        const layerRect = layerRef.current.getBoundingClientRect();
        const centeredX = (parentRect.width - layerRect.width) / 2;
        const centeredY = (parentRect.height - layerRect.height) / 2;
        onUpdate({
          position: { x: Math.max(0, centeredX), y: Math.max(0, centeredY) }
        });
      }
    }
  }, []);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    
    // If this layer isn't selected, select it (panel will be selected too via onSelect)
    if (!isSelected) {
      onSelect?.();
      return;
    }
    
    // Only drag if this layer is selected and not editing
    if (isEditing) return;
    e.preventDefault();
    
    const parent = layerRef.current?.parentElement;
    if (!parent) return;
    
    const parentRect = parent.getBoundingClientRect();
    const layerRect = layerRef.current.getBoundingClientRect();
    
    // Calculate offset at the moment of click
    const offsetX = e.clientX - layerRect.left;
    const offsetY = e.clientY - layerRect.top;
    
    // Store parent and layer dimensions for the drag session
    const layerWidth = layerRect.width;
    const layerHeight = layerRect.height;
    
    setIsDragging(true);
    
    let lastPosition = { x: layer.position.x, y: layer.position.y };
    
    // Add global mouse listeners for smoother dragging
    const handleGlobalMouseMove = (moveEvent) => {
      const newParentRect = parent.getBoundingClientRect();
      const newX = moveEvent.clientX - newParentRect.left - offsetX;
      const newY = moveEvent.clientY - newParentRect.top - offsetY;
      
      // Constrain to parent bounds
      const maxX = newParentRect.width - layerWidth;
      const maxY = newParentRect.height - layerHeight;
      
      lastPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      };
      
      // Update local state only (fast)
      setDragPosition(lastPosition);
    };
    
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragPosition(null);
      // Update global state only on mouse up
      onUpdate({ position: lastPosition });
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTextChange = (e) => {
    onUpdate({
      data: { ...layer.data, content: e.target.value }
    });
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      setIsEditing(false);
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  // Use drag position during drag, otherwise use layer position
  const currentPosition = dragPosition || layer.position;

  return (
    <div
      ref={layerRef}
      className={`absolute ${isEditing ? '' : 'cursor-move'} ${isSelected ? 'ring-2 ring-[var(--accent-primary)] ring-offset-1' : 'hover:ring-2 hover:ring-[var(--accent-primary)]/50 cursor-pointer'} ${isDragging ? 'opacity-80 z-50' : ''} select-none`}
      style={{
        left: currentPosition.x,
        top: currentPosition.y,
        minWidth: layer.size.width,
        touchAction: 'none'
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isSelected) {
          onSelect?.();
        }
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={layer.data.content}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full min-h-[40px] p-1.5 border-2 border-[var(--accent-primary)] rounded-lg resize-none outline-none bg-white/90"
          style={{
            fontFamily: layer.data.fontFamily,
            fontSize: layer.data.fontSize,
            color: layer.data.fontColor,
            fontWeight: layer.data.fontWeight
          }}
        />
      ) : (
        <div
          className="p-1 whitespace-pre-wrap"
          style={{
            fontFamily: layer.data.fontFamily,
            fontSize: layer.data.fontSize,
            color: layer.data.fontColor,
            fontWeight: layer.data.fontWeight
          }}
        >
          {layer.data.content}
        </div>
      )}
    </div>
  );
}
