'use client';

import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import PanelCell from './PanelCell';

/**
 * Recursive component to render nested panels
 */
export default function NestedPanelRenderer({
  panel,
  selectedPanelId,
  onPanelSelect,
  selectedLayerId,
  onLayerSelect,
  grid,
  onGridChange,
  onNestedResize,
  projectType,
  panelBorderRadius,
  gutterWidth,
  frameNumberMap,
  accentColor,
  projectSettings = {},
  panelActionTrigger = null,
  onPanelActionProcessed = null,
}) {
  // If panel has children, render nested PanelGroup
  if (panel.children) {
    const { direction, panels: childPanels } = panel.children;
    
    const handleNestedResize = (sizes) => {
      onNestedResize(panel.id, sizes);
    };

    return (
      <PanelGroup
        direction={direction}
        onLayout={handleNestedResize}
        className="h-full w-full"
      >
        {childPanels.map((childPanel, index) => (
          <div key={childPanel.id} className="contents">
            <Panel
              defaultSize={childPanel.size}
              minSize={10}
            >
              <NestedPanelRenderer
                panel={childPanel}
                selectedPanelId={selectedPanelId}
                onPanelSelect={onPanelSelect}
                selectedLayerId={selectedLayerId}
                onLayerSelect={onLayerSelect}
                grid={grid}
                onGridChange={onGridChange}
                onNestedResize={onNestedResize}
                projectType={projectType}
                panelBorderRadius={panelBorderRadius}
                gutterWidth={gutterWidth}
                frameNumberMap={frameNumberMap}
                accentColor={accentColor}
                projectSettings={projectSettings}
                panelActionTrigger={panelActionTrigger}
                onPanelActionProcessed={onPanelActionProcessed}
              />
            </Panel>
            {index < childPanels.length - 1 && (
              <PanelResizeHandle
                className={`panel-resize-handle-${direction === 'horizontal' ? 'h' : 'v'} group`}
                style={direction === 'horizontal' ? {
                  width: Math.max(gutterWidth, 4),
                  margin: `0 ${Math.max(gutterWidth / 4, 1)}px`,
                } : {
                  height: Math.max(gutterWidth, 4),
                  margin: `${Math.max(gutterWidth / 4, 1)}px 0`,
                }}
              >
                <div className={`resize-handle-inner ${direction === 'horizontal' ? 'h-full w-full' : 'w-full h-full'} flex items-center justify-center`}>
                  <div
                    className={`${direction === 'horizontal' 
                      ? 'w-0.5 h-8 group-hover:h-12' 
                      : 'h-0.5 w-8 group-hover:w-12'
                    } rounded-full bg-[var(--ink-200)] group-hover:bg-[var(--accent-primary)] transition-all duration-200`}
                    style={{ '--handle-color': accentColor }}
                  />
                </div>
              </PanelResizeHandle>
            )}
          </div>
        ))}
      </PanelGroup>
    );
  }

  // Leaf panel - render PanelCell
  const frameNumber = frameNumberMap?.get(panel.id);
  
  return (
    <PanelCell
      panel={panel}
      isSelected={selectedPanelId === panel.id}
      onSelect={() => onPanelSelect(panel.id)}
      selectedLayerId={selectedLayerId}
      onLayerSelect={onLayerSelect}
      grid={grid}
      onGridChange={onGridChange}
      projectType={projectType}
      frameNumber={frameNumber}
      panelBorderRadius={panelBorderRadius}
      projectSettings={projectSettings}
      panelActionTrigger={panelActionTrigger}
      onPanelActionProcessed={onPanelActionProcessed}
    />
  );
}
