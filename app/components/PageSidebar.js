'use client';

import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Copy, Trash2, GripVertical, Layers, RotateCcw } from 'lucide-react';
import PageThumbnail from './PageThumbnail';
import ConfirmDialog from './ConfirmDialog';

function SortablePageItem({ page, isSelected, onSelect, onDuplicate, onDelete, onToggleOrientation, canDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const isLandscape = page.orientation === 'landscape';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
        isSelected 
          ? 'border-[var(--accent-primary)] shadow-lg ring-2 ring-[var(--accent-primary)]/20' 
          : 'border-[var(--ink-100)] hover:border-[var(--ink-200)] hover:shadow-md bg-[var(--paper-white)]'
      }`}
    >
      <div 
        className="cursor-pointer"
        onClick={() => onSelect(page.id)}
      >
        <PageThumbnail page={page} pageNumber={page.order + 1} isSelected={isSelected} />
      </div>
      
      {/* Orientation indicator */}
      {isLandscape && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[var(--accent-secondary)]/90 text-white text-[9px] font-bold rounded-md">
          Landscape
        </div>
      )}
      
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1.5 cursor-grab opacity-0 group-hover:opacity-100 transition-all bg-[var(--paper-white)] backdrop-blur-sm rounded-lg shadow-md border border-[var(--ink-100)]"
      >
        <GripVertical className="w-3 h-3 text-[var(--ink-400)]" />
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleOrientation(page.id);
          }}
          className="p-1.5 bg-[var(--paper-white)] backdrop-blur-sm hover:bg-[var(--accent-tertiary-subtle)] rounded-lg shadow-md border border-[var(--ink-100)] text-[var(--ink-500)] hover:text-[var(--accent-tertiary)] transition-all"
          title={isLandscape ? "Switch to Portrait" : "Switch to Landscape"}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(page.id);
          }}
          className="p-1.5 bg-[var(--paper-white)] backdrop-blur-sm hover:bg-[var(--accent-secondary-subtle)] rounded-lg shadow-md border border-[var(--ink-100)] text-[var(--ink-500)] hover:text-[var(--accent-secondary)] transition-all"
          title="Duplicate page"
        >
          <Copy className="w-3 h-3" />
        </button>
        {canDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(page.id);
            }}
            className="p-1.5 bg-[var(--paper-white)] backdrop-blur-sm hover:bg-red-50 rounded-lg shadow-md border border-[var(--ink-100)] text-[var(--ink-500)] hover:text-red-500 transition-all"
            title="Delete page"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function PageSidebar({ 
  pages, 
  currentPageId, 
  onPageSelect, 
  onPageAdd, 
  onPageDelete, 
  onPageDuplicate, 
  onPageReorder,
  onToggleOrientation,
  isMobile = false
}) {
  const [deletePageId, setDeletePageId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = pages.findIndex(p => p.id === active.id);
      const newIndex = pages.findIndex(p => p.id === over.id);
      onPageReorder(oldIndex, newIndex);
    }
  };

  const handleDeleteClick = (pageId) => {
    setDeletePageId(pageId);
  };

  const confirmDelete = () => {
    if (deletePageId) {
      onPageDelete(deletePageId);
      setDeletePageId(null);
    }
  };

  const sortedPages = [...pages].sort((a, b) => a.order - b.order);

  // Mobile version renders without header (header is in parent)
  if (isMobile) {
    return (
      <>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedPages.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedPages.map((page) => (
                <SortablePageItem
                  key={page.id}
                  page={page}
                  isSelected={currentPageId === page.id}
                  onSelect={onPageSelect}
                  onDuplicate={onPageDuplicate}
                  onDelete={handleDeleteClick}
                  onToggleOrientation={onToggleOrientation}
                  canDelete={pages.length > 1}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Add page button for mobile */}
        <div className="p-3 border-t border-[var(--ink-100)] bg-[var(--paper-white)]">
          <button
            onClick={onPageAdd}
            className="w-full py-2.5 bg-[var(--accent-primary-subtle)] hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white rounded-xl transition-all hover:shadow-md flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Page
          </button>
        </div>

        <ConfirmDialog
          isOpen={!!deletePageId}
          onClose={() => setDeletePageId(null)}
          onConfirm={confirmDelete}
          title="Delete Page"
          message="Are you sure you want to delete this page? This action cannot be undone."
          confirmText="Delete"
          confirmVariant="danger"
        />
      </>
    );
  }

  return (
    <div className="w-56 bg-[var(--paper-soft)] border-l border-[var(--ink-100)] flex flex-col h-full">
      <div className="p-4 border-b border-[var(--ink-100)] flex items-center justify-between bg-[var(--paper-white)]">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
          <span className="text-sm font-bold text-[var(--ink-700)]" style={{ fontFamily: 'var(--font-display)' }}>Pages</span>
          <span className="text-xs font-medium text-[var(--ink-400)] bg-[var(--ink-50)] px-1.5 py-0.5 rounded-md">{pages.length}</span>
        </div>
        <button
          onClick={onPageAdd}
          className="p-2 bg-[var(--accent-primary-subtle)] hover:bg-[var(--accent-primary)] text-[var(--accent-primary)] hover:text-white rounded-xl transition-all hover:shadow-md"
          title="Add page"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedPages.map(p => p.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedPages.map((page) => (
              <SortablePageItem
                key={page.id}
                page={page}
                isSelected={currentPageId === page.id}
                onSelect={onPageSelect}
                onDuplicate={onPageDuplicate}
                onDelete={handleDeleteClick}
                onToggleOrientation={onToggleOrientation}
                canDelete={pages.length > 1}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <ConfirmDialog
        isOpen={!!deletePageId}
        onClose={() => setDeletePageId(null)}
        onConfirm={confirmDelete}
        title="Delete Page"
        message="Are you sure you want to delete this page? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
