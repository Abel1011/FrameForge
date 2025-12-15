'use client';

/**
 * Recursively render panel thumbnail (handles nested panels)
 */
function PanelThumbnail({ panel, gutterWidth }) {
  // If panel has children (nested), render them recursively
  if (panel.children) {
    const { direction, panels: childPanels } = panel.children;
    const isHorizontal = direction === 'horizontal';
    
    return (
      <div 
        className={`h-full w-full flex ${isHorizontal ? 'flex-row' : 'flex-col'}`}
        style={{ gap: `${Math.max(gutterWidth / 4, 1)}px` }}
      >
        {childPanels.map((child) => (
          <div
            key={child.id}
            style={isHorizontal ? { width: `${child.size}%` } : { height: `${child.size}%` }}
            className="overflow-hidden"
          >
            <PanelThumbnail panel={child} gutterWidth={gutterWidth} />
          </div>
        ))}
      </div>
    );
  }

  // Leaf panel - render content
  const content = panel.content || { layers: [], backgroundColor: '#ffffff' };
  
  return (
    <div 
      className="w-full h-full bg-[var(--ink-50)] rounded overflow-hidden"
      style={{ backgroundColor: content.backgroundColor }}
    >
      {content.layers?.length > 0 && (
        <div className="w-full h-full relative">
          {content.layers.slice(0, 1).map((layer) => {
            if (layer.type === 'image' && layer.data.src) {
              return (
                <img
                  key={layer.id}
                  src={layer.data.src}
                  alt=""
                  className="w-full h-full object-cover"
                />
              );
            }
            if (layer.type === 'text' || layer.type === 'speech-bubble') {
              return (
                <div
                  key={layer.id}
                  className="w-full h-full flex items-center justify-center"
                >
                  <div className="w-2 h-1 bg-[var(--ink-300)] rounded-full" />
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

export default function PageThumbnail({ page, pageNumber, isSelected }) {
  const { grid, orientation = 'portrait' } = page;
  const isLandscape = orientation === 'landscape';

  return (
    <div className="p-3">
      {/* Mini grid preview */}
      <div 
        className={`bg-[var(--paper-white)] rounded-xl overflow-hidden transition-all mx-auto ${
          isSelected ? 'shadow-md' : 'shadow-sm border border-[var(--ink-100)]'
        }`}
        style={{
          aspectRatio: isLandscape ? '4/3' : '3/4',
          width: isLandscape ? '100%' : '75%',
        }}
      >
        <div className="h-full flex flex-col p-1" style={{ gap: `${Math.max(grid.gutterWidth / 4, 1)}px` }}>
          {grid.rows.map((row) => (
            <div
              key={row.id}
              className="flex"
              style={{ 
                height: `${row.height}%`,
                gap: `${Math.max(grid.gutterWidth / 4, 1)}px`
              }}
            >
              {row.panels.map((panel) => (
                <div
                  key={panel.id}
                  style={{ width: `${panel.width}%` }}
                  className="overflow-hidden rounded"
                >
                  <PanelThumbnail panel={panel} gutterWidth={grid.gutterWidth} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* Page number */}
      <div className="text-center mt-2.5">
        <span className={`text-xs font-bold transition-colors ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--ink-400)]'}`} style={{ fontFamily: 'var(--font-display)' }}>
          Page {pageNumber}
        </span>
      </div>
    </div>
  );
}
