'use client';

import { useState, useRef, useEffect } from 'react';

export default function SpeechBubbleLayer({ layer, isSelected, isPanelSelected, onSelect, onUpdate, onDelete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dragPosition, setDragPosition] = useState(null);
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
      
      const maxX = newParentRect.width - layerWidth;
      const maxY = newParentRect.height - layerHeight;
      
      lastPosition = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
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

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTextChange = (e) => {
    onUpdate({
      data: { ...layer.data, text: e.target.value }
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

  const getBubbleStyle = () => {
    const base = {
      backgroundColor: layer.data.backgroundColor,
      borderColor: layer.data.borderColor,
      borderWidth: '2px',
      borderStyle: 'solid'
    };

    switch (layer.data.bubbleStyle) {
      case 'thought':
        return { ...base, borderRadius: '50%' };
      case 'shout':
        return { ...base, borderRadius: '4px' };
      default:
        return { ...base, borderRadius: '16px' };
    }
  };

  const getTailPath = () => {
    const { tailPosition, bubbleStyle } = layer.data;
    
    // Parse position
    const isBottom = tailPosition.startsWith('bottom');
    const isTop = tailPosition.startsWith('top');
    const isLeft = tailPosition === 'left' || tailPosition.endsWith('left');
    const isRight = tailPosition === 'right' || tailPosition.endsWith('right');
    const isCenter = tailPosition.endsWith('center');
    const isSideOnly = tailPosition === 'left' || tailPosition === 'right';

    // Thought bubbles have small circles instead of a triangle tail
    if (bubbleStyle === 'thought') {
      const getThoughtPosition = () => {
        if (isSideOnly) {
          return {
            [isLeft ? 'left' : 'right']: '-18px',
            top: '50%',
            transform: 'translateY(-50%)',
            flexDirection: isLeft ? 'row' : 'row-reverse',
          };
        }
        return {
          [isBottom ? 'bottom' : 'top']: '-18px',
          ...(isCenter ? { left: '50%', transform: 'translateX(-50%)' } : { [isLeft ? 'left' : 'right']: '15px' }),
          flexDirection: isBottom ? 'column' : 'column-reverse',
        };
      };

      const thoughtPos = getThoughtPosition();
      const isHorizontal = isSideOnly;

      return (
        <div
          className="absolute"
          style={{
            ...thoughtPos,
            display: 'flex',
            alignItems: isHorizontal ? 'center' : (isLeft || isCenter ? 'flex-start' : 'flex-end'),
            gap: '2px'
          }}
        >
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%',
              backgroundColor: layer.data.backgroundColor,
              border: `2px solid ${layer.data.borderColor}`
            }} 
          />
          <div 
            style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              backgroundColor: layer.data.backgroundColor,
              border: `2px solid ${layer.data.borderColor}`,
              ...(isHorizontal ? {} : { marginLeft: isLeft || isCenter ? '8px' : '0', marginRight: isRight && !isCenter ? '8px' : '0' })
            }} 
          />
          <div 
            style={{ 
              width: '5px', 
              height: '5px', 
              borderRadius: '50%',
              backgroundColor: layer.data.backgroundColor,
              border: `1.5px solid ${layer.data.borderColor}`,
              ...(isHorizontal ? {} : { marginLeft: isLeft || isCenter ? '14px' : '0', marginRight: isRight && !isCenter ? '14px' : '0' })
            }} 
          />
        </div>
      );
    }

    // Calculate SVG position and rotation for speech tail
    const getSvgStyle = () => {
      if (isSideOnly) {
        // Left or right side tails
        return {
          [isLeft ? 'left' : 'right']: '-12px',
          top: '50%',
          transform: `translateY(-50%) rotate(${isLeft ? '90deg' : '-90deg'})`
        };
      }
      // Top or bottom tails
      return {
        [isBottom ? 'bottom' : 'top']: '-12px',
        ...(isCenter ? { left: '50%', transform: `translateX(-50%) ${isTop ? 'rotate(180deg)' : ''}` } : { [isLeft ? 'left' : 'right']: '20px', transform: `${isTop ? 'rotate(180deg)' : ''} ${isRight ? 'scaleX(-1)' : ''}` })
      };
    };

    // Regular speech bubble with triangle tail
    return (
      <svg
        className="absolute"
        style={getSvgStyle()}
        width="20"
        height="14"
        viewBox="0 0 20 14"
      >
        <path
          d="M0 0 L10 14 L20 0"
          fill={layer.data.backgroundColor}
          stroke={layer.data.borderColor}
          strokeWidth="2"
        />
        <rect
          x="0"
          y="0"
          width="20"
          height="3"
          fill={layer.data.backgroundColor}
        />
      </svg>
    );
  };

  const currentPosition = dragPosition || layer.position;

  return (
    <div
      ref={layerRef}
      className={`absolute ${isEditing ? '' : 'cursor-move'} ${isSelected ? 'ring-2 ring-[var(--accent-primary)] ring-offset-2' : 'hover:ring-2 hover:ring-[var(--accent-primary)]/50 cursor-pointer'} ${isDragging ? 'opacity-80 z-50' : ''} select-none`}
      style={{
        left: currentPosition.x,
        top: currentPosition.y,
        width: layer.size.width,
        minHeight: layer.size.height,
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
      <div
        className="relative p-3 flex items-center justify-center"
        style={getBubbleStyle()}
      >
        {isEditing ? (
          <textarea
            ref={inputRef}
            value={layer.data.text}
            onChange={handleTextChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[40px] p-1 bg-transparent text-center resize-none outline-none"
          />
        ) : (
          <div className="text-center whitespace-pre-wrap">
            {layer.data.text}
          </div>
        )}
        {getTailPath()}
      </div>
    </div>
  );
}
