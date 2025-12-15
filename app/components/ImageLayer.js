'use client';

import { useState, useRef } from 'react';

export default function ImageLayer({ layer, isSelected, isPanelSelected, onSelect, onUpdate, onDelete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragPosition, setDragPosition] = useState(null);
  const [dragSize, setDragSize] = useState(null);
  const [dragObjectPosition, setDragObjectPosition] = useState(null);
  const layerRef = useRef(null);
  const imgRef = useRef(null);

  // Check if this layer should fill the panel
  const isFillPanel = layer.size?.fillPanel;

  const handleMouseDown = (e) => {
    e.stopPropagation();
    
    // If this layer isn't selected, select it (panel will be selected too via onSelect)
    if (!isSelected) {
      onSelect?.();
      return;
    }
    
    // Only drag if this layer is selected
    e.preventDefault();
    
    const parent = layerRef.current?.parentElement;
    if (!parent) return;
    
    // Handle fillPanel mode with object-position
    if (isFillPanel) {
      const startX = e.clientX;
      const startY = e.clientY;
      const currentObjPos = layer.data.objectPosition || { x: 50, y: 50 };
      
      setIsDragging(true);
      let lastObjPos = { ...currentObjPos };
      
      const handleGlobalMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        
        // Convert pixel movement to percentage (sensitivity factor)
        const sensitivity = 0.2;
        const newX = Math.max(0, Math.min(100, currentObjPos.x - deltaX * sensitivity));
        const newY = Math.max(0, Math.min(100, currentObjPos.y - deltaY * sensitivity));
        
        lastObjPos = { x: newX, y: newY };
        setDragObjectPosition(lastObjPos);
      };
      
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setDragObjectPosition(null);
        onUpdate({ 
          data: { 
            ...layer.data, 
            objectPosition: lastObjPos 
          } 
        });
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return;
    }
    
    const parentRect = parent.getBoundingClientRect();
    const layerRect = layerRef.current.getBoundingClientRect();
    
    const offsetX = e.clientX - layerRect.left;
    const offsetY = e.clientY - layerRect.top;
    const layerWidth = layerRect.width;
    const layerHeight = layerRect.height;
    
    setIsDragging(true);
    
    let lastPosition = { x: layer.position.x, y: layer.position.y };
    
    const handleGlobalMouseMove = (moveEvent) => {
      const newParentRect = parent.getBoundingClientRect();
      const newX = moveEvent.clientX - newParentRect.left - offsetX;
      const newY = moveEvent.clientY - newParentRect.top - offsetY;
      
      // If image is smaller than panel, constrain to panel bounds
      // If image is larger than panel, allow panning (negative positions)
      let constrainedX, constrainedY;
      
      if (layerWidth <= newParentRect.width) {
        // Image fits horizontally - keep within bounds
        const maxX = newParentRect.width - layerWidth;
        constrainedX = Math.max(0, Math.min(newX, maxX));
      } else {
        // Image is wider - allow panning but keep edges visible
        const minX = newParentRect.width - layerWidth; // negative value
        constrainedX = Math.max(minX, Math.min(newX, 0));
      }
      
      if (layerHeight <= newParentRect.height) {
        // Image fits vertically - keep within bounds
        const maxY = newParentRect.height - layerHeight;
        constrainedY = Math.max(0, Math.min(newY, maxY));
      } else {
        // Image is taller - allow panning but keep edges visible
        const minY = newParentRect.height - layerHeight; // negative value
        constrainedY = Math.max(minY, Math.min(newY, 0));
      }
      
      lastPosition = {
        x: constrainedX,
        y: constrainedY
      };
      
      setDragPosition(lastPosition);
    };
    
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setDragPosition(null);
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

  // Handle resize from corners
  const handleResizeStart = (e, corner) => {
    e.stopPropagation();
    e.preventDefault();
    
    const parent = layerRef.current?.parentElement;
    if (!parent) return;
    
    const parentRect = parent.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = layer.size.width;
    const startHeight = layer.size.height;
    const startPosX = layer.position.x;
    const startPosY = layer.position.y;
    const aspectRatio = startWidth / startHeight;
    
    setIsResizing(true);
    
    let lastSize = { width: startWidth, height: startHeight };
    let lastPosition = { x: startPosX, y: startPosY };
    
    const handleResizeMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startPosX;
      let newY = startPosY;
      
      // Calculate new size based on which corner is being dragged
      if (corner === 'se') {
        newWidth = Math.max(50, startWidth + deltaX);
        newHeight = Math.max(50, startHeight + deltaY);
      } else if (corner === 'sw') {
        newWidth = Math.max(50, startWidth - deltaX);
        newHeight = Math.max(50, startHeight + deltaY);
        newX = startPosX + (startWidth - newWidth);
      } else if (corner === 'ne') {
        newWidth = Math.max(50, startWidth + deltaX);
        newHeight = Math.max(50, startHeight - deltaY);
        newY = startPosY + (startHeight - newHeight);
      } else if (corner === 'nw') {
        newWidth = Math.max(50, startWidth - deltaX);
        newHeight = Math.max(50, startHeight - deltaY);
        newX = startPosX + (startWidth - newWidth);
        newY = startPosY + (startHeight - newHeight);
      }
      
      // Hold Shift to maintain aspect ratio
      if (moveEvent.shiftKey) {
        const avgDelta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2;
        if (corner === 'se') {
          newWidth = Math.max(50, startWidth + avgDelta * Math.sign(deltaX + deltaY));
          newHeight = newWidth / aspectRatio;
        } else if (corner === 'nw') {
          newWidth = Math.max(50, startWidth - avgDelta * Math.sign(deltaX + deltaY));
          newHeight = newWidth / aspectRatio;
          newX = startPosX + (startWidth - newWidth);
          newY = startPosY + (startHeight - newHeight);
        }
      }
      
      // Constrain to parent bounds
      newX = Math.max(0, newX);
      newY = Math.max(0, newY);
      newWidth = Math.min(newWidth, parentRect.width - newX);
      newHeight = Math.min(newHeight, parentRect.height - newY);
      
      lastSize = { width: newWidth, height: newHeight };
      lastPosition = { x: newX, y: newY };
      
      setDragSize(lastSize);
      setDragPosition(lastPosition);
    };
    
    const handleResizeEnd = () => {
      setIsResizing(false);
      setDragSize(null);
      setDragPosition(null);
      onUpdate({ 
        size: lastSize,
        position: lastPosition
      });
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
    
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const currentPosition = dragPosition || layer.position;
  const currentSize = dragSize || layer.size;

  // Calculate object-position for fillPanel mode
  const getObjectPosition = () => {
    if (dragObjectPosition) {
      return `${dragObjectPosition.x}% ${dragObjectPosition.y}%`;
    }
    const objPos = layer.data.objectPosition || { x: 50, y: 50 };
    return `${objPos.x}% ${objPos.y}%`;
  };

  return (
    <div
      ref={layerRef}
      className={`absolute cursor-move ${isSelected ? 'ring-2 ring-[var(--accent-primary)]' : 'hover:ring-2 hover:ring-[var(--accent-primary)]/50 cursor-pointer'} ${isDragging || isResizing ? 'opacity-90 z-50' : ''} select-none`}
      style={{
        left: isFillPanel ? 0 : currentPosition.x,
        top: isFillPanel ? 0 : currentPosition.y,
        width: isFillPanel ? '100%' : currentSize.width,
        height: isFillPanel ? '100%' : currentSize.height,
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
    >
      <img
        ref={imgRef}
        src={layer.data.src}
        alt=""
        className="w-full h-full pointer-events-none"
        style={{ 
          objectFit: isFillPanel ? 'cover' : layer.data.fit,
          objectPosition: isFillPanel ? getObjectPosition() : undefined
        }}
        draggable={false}
      />

      {/* Resize handles - only show when selected */}
      {isSelected && (
        <>
          {/* Corner resize handles */}
          <div
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[var(--accent-primary)] rounded-sm cursor-nw-resize hover:bg-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            title="Resize (Shift to maintain aspect ratio)"
          />
          <div
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[var(--accent-primary)] rounded-sm cursor-ne-resize hover:bg-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            title="Resize (Shift to maintain aspect ratio)"
          />
          <div
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-[var(--accent-primary)] rounded-sm cursor-sw-resize hover:bg-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            title="Resize (Shift to maintain aspect ratio)"
          />
          <div
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-[var(--accent-primary)] rounded-sm cursor-se-resize hover:bg-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            title="Resize (Shift to maintain aspect ratio)"
          />
        </>
      )}
    </div>
  );
}
