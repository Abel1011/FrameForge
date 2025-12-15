import { generateId } from './storage';

// Maximum limits for grid divisions
export const MAX_ROWS = 8;
export const MAX_PANELS_PER_ROW = 6;
export const MAX_NESTING_DEPTH = 4;

/**
 * Count the nesting depth of a panel
 * @param {import('../types').Panel | import('../types').ChildPanel} panel
 * @param {number} currentDepth
 * @returns {number}
 */
function getNestedDepth(panel, currentDepth = 0) {
  if (!panel.children) return currentDepth;
  const childDepths = panel.children.panels.map(p => getNestedDepth(p, currentDepth + 1));
  return Math.max(...childDepths);
}

/**
 * Check if a panel (or nested child) can be split further
 * @param {import('../types').Panel | import('../types').ChildPanel} panel
 * @returns {boolean}
 */
export function canSplitPanel(panel) {
  const depth = getNestedDepth(panel);
  return depth < MAX_NESTING_DEPTH;
}

/**
 * Validate that grid percentages sum to 100%
 * @param {import('../types').GridLayout} grid
 * @returns {boolean}
 */
export function validateGridIntegrity(grid) {
  const totalRowHeight = grid.rows.reduce((sum, row) => sum + row.height, 0);
  if (Math.abs(totalRowHeight - 100) > 0.01) {
    return false;
  }

  for (const row of grid.rows) {
    const totalPanelWidth = row.panels.reduce((sum, panel) => sum + panel.width, 0);
    if (Math.abs(totalPanelWidth - 100) > 0.01) {
      return false;
    }
  }

  return true;
}

/**
 * Find a panel by ID recursively (searches nested panels too)
 * @param {import('../types').GridLayout} grid
 * @param {string} panelId
 * @returns {{panel: any, path: string[], rowIndex?: number, panelIndex?: number} | null}
 */
export function findPanelById(grid, panelId) {
  for (let rowIndex = 0; rowIndex < grid.rows.length; rowIndex++) {
    const row = grid.rows[rowIndex];
    for (let panelIndex = 0; panelIndex < row.panels.length; panelIndex++) {
      const panel = row.panels[panelIndex];
      
      // Check if this is the panel
      if (panel.id === panelId) {
        return { panel, path: ['rows', rowIndex, 'panels', panelIndex], rowIndex, panelIndex };
      }
      
      // Search in nested children
      const nestedResult = findInChildren(panel, panelId, ['rows', rowIndex, 'panels', panelIndex]);
      if (nestedResult) return nestedResult;
    }
  }
  return null;
}

/**
 * Recursively search for panel in children
 */
function findInChildren(panel, panelId, currentPath) {
  if (!panel.children) return null;
  
  for (let i = 0; i < panel.children.panels.length; i++) {
    const child = panel.children.panels[i];
    const childPath = [...currentPath, 'children', 'panels', i];
    
    if (child.id === panelId) {
      return { panel: child, path: childPath };
    }
    
    const nestedResult = findInChildren(child, panelId, childPath);
    if (nestedResult) return nestedResult;
  }
  
  return null;
}

/**
 * Update a panel deeply using a path
 * @param {import('../types').GridLayout} grid
 * @param {string[]} path
 * @param {function} updater
 * @returns {import('../types').GridLayout}
 */
function updateAtPath(grid, path, updater) {
  const newGrid = JSON.parse(JSON.stringify(grid)); // Deep clone
  
  let current = newGrid;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]];
  }
  
  const lastKey = path[path.length - 1];
  current[lastKey] = updater(current[lastKey]);
  
  return newGrid;
}

/**
 * Split a panel horizontally (creates nested horizontal sub-panels)
 * @param {import('../types').GridLayout} grid
 * @param {string} panelId
 * @returns {import('../types').GridLayout}
 */
export function splitPanelHorizontal(grid, panelId) {
  const found = findPanelById(grid, panelId);
  if (!found) return grid;
  
  const { panel, path } = found;
  
  // Check nesting depth
  if (!canSplitPanel(panel)) return grid;
  
  // If panel is at row level (has rowId), we can either add to row or create nested
  if (panel.rowId !== undefined && found.rowIndex !== undefined) {
    const row = grid.rows[found.rowIndex];
    if (row.panels.length >= MAX_PANELS_PER_ROW) {
      // Can't add more to row, create nested instead
      return createNestedSplit(grid, path, panel, 'horizontal');
    }
    
    // Add new panel to row (original behavior)
    const newRows = grid.rows.map((r, rIdx) => {
      if (rIdx !== found.rowIndex) return r;
      
      const panelIndex = found.panelIndex;
      const halfWidth = panel.width / 2;
      
      const newPanel1 = { ...panel, width: halfWidth };
      const newPanel2 = {
        id: generateId(),
        rowId: r.id,
        width: halfWidth,
        content: { layers: [], backgroundColor: '#ffffff' }
      };
      
      return {
        ...r,
        panels: [
          ...r.panels.slice(0, panelIndex),
          newPanel1,
          newPanel2,
          ...r.panels.slice(panelIndex + 1)
        ]
      };
    });
    
    return { ...grid, rows: newRows };
  }
  
  // Panel is nested, create more nested children
  return createNestedSplit(grid, path, panel, 'horizontal');
}

/**
 * Split a panel vertically (creates nested vertical sub-panels ONLY for that panel)
 * @param {import('../types').GridLayout} grid
 * @param {string} panelId
 * @returns {import('../types').GridLayout}
 */
export function splitPanelVertical(grid, panelId) {
  const found = findPanelById(grid, panelId);
  if (!found) return grid;
  
  const { panel, path } = found;
  
  // Check nesting depth
  if (!canSplitPanel(panel)) return grid;
  
  // If panel is at row level and ALONE in its row, split the row (original behavior)
  if (panel.rowId !== undefined && found.rowIndex !== undefined) {
    const row = grid.rows[found.rowIndex];
    
    // ONLY if panel is alone in row, we split the row itself
    if (row.panels.length === 1 && grid.rows.length < MAX_ROWS) {
      const halfHeight = row.height / 2;
      const newRowId = generateId();
      
      const newRow1 = { ...row, height: halfHeight };
      const newRow2 = {
        id: newRowId,
        height: halfHeight,
        panels: [{
          id: generateId(),
          rowId: newRowId,
          width: 100,
          content: { layers: [], backgroundColor: '#ffffff' }
        }]
      };
      
      return {
        ...grid,
        rows: [
          ...grid.rows.slice(0, found.rowIndex),
          newRow1,
          newRow2,
          ...grid.rows.slice(found.rowIndex + 1)
        ]
      };
    }
    
    // Panel shares row with others - create NESTED vertical split (only this panel!)
    return createNestedSplit(grid, path, panel, 'vertical');
  }
  
  // Panel is already nested, add more nesting
  return createNestedSplit(grid, path, panel, 'vertical');
}

/**
 * Create a nested split within a panel
 * @param {import('../types').GridLayout} grid
 * @param {string[]} path
 * @param {any} panel
 * @param {'horizontal' | 'vertical'} direction
 * @returns {import('../types').GridLayout}
 */
function createNestedSplit(grid, path, panel, direction) {
  return updateAtPath(grid, path, (currentPanel) => {
    // If panel already has children in the same direction, add to them
    if (currentPanel.children && currentPanel.children.direction === direction) {
      const existingPanels = currentPanel.children.panels;
      if (existingPanels.length >= MAX_PANELS_PER_ROW) return currentPanel;
      
      // Split the last child
      const lastChild = existingPanels[existingPanels.length - 1];
      const newSize = lastChild.size / 2;
      
      return {
        ...currentPanel,
        children: {
          direction,
          panels: [
            ...existingPanels.slice(0, -1),
            { ...lastChild, size: newSize },
            {
              id: generateId(),
              size: newSize,
              content: { layers: [], backgroundColor: '#ffffff' }
            }
          ]
        }
      };
    }
    
    // Convert leaf panel to nested panel
    const existingContent = currentPanel.content || { layers: [], backgroundColor: '#ffffff' };
    
    // Keep rowId and width if they exist (for top-level panels)
    return {
      id: currentPanel.id,
      ...(currentPanel.rowId !== undefined && { rowId: currentPanel.rowId }),
      ...(currentPanel.width !== undefined && { width: currentPanel.width }),
      ...(currentPanel.size !== undefined && { size: currentPanel.size }),
      children: {
        direction,
        panels: [
          {
            id: generateId(),
            size: 50,
            content: existingContent
          },
          {
            id: generateId(),
            size: 50,
            content: { layers: [], backgroundColor: '#ffffff' }
          }
        ]
      }
    };
  });
}

/**
 * Merge two adjacent panels in the same row
 * @param {import('../types').GridLayout} grid
 * @param {string} panelId1
 * @param {string} panelId2
 * @returns {import('../types').GridLayout}
 */
export function mergePanels(grid, panelId1, panelId2) {
  const newRows = grid.rows.map(row => {
    const index1 = row.panels.findIndex(p => p.id === panelId1);
    const index2 = row.panels.findIndex(p => p.id === panelId2);

    if (index1 === -1 || index2 === -1) return row;
    if (Math.abs(index1 - index2) !== 1) return row;

    const minIndex = Math.min(index1, index2);
    const panel1 = row.panels[minIndex];
    const panel2 = row.panels[minIndex + 1];

    const mergedPanel = {
      ...panel1,
      width: panel1.width + panel2.width,
      content: panel1.content || { layers: [], backgroundColor: '#ffffff' },
      children: undefined
    };

    return {
      ...row,
      panels: [
        ...row.panels.slice(0, minIndex),
        mergedPanel,
        ...row.panels.slice(minIndex + 2)
      ]
    };
  });

  return { ...grid, rows: newRows };
}

/**
 * Resize panels by adjusting widths
 * @param {import('../types').GridLayout} grid
 * @param {string} rowId
 * @param {number[]} newWidths
 * @returns {import('../types').GridLayout}
 */
export function resizePanelsInRow(grid, rowId, newWidths) {
  const total = newWidths.reduce((sum, w) => sum + w, 0);
  const normalizedWidths = newWidths.map(w => (w / total) * 100);

  const newRows = grid.rows.map(row => {
    if (row.id !== rowId) return row;
    if (row.panels.length !== normalizedWidths.length) return row;

    return {
      ...row,
      panels: row.panels.map((panel, i) => ({
        ...panel,
        width: normalizedWidths[i]
      }))
    };
  });

  return { ...grid, rows: newRows };
}

/**
 * Resize nested panels
 * @param {import('../types').GridLayout} grid
 * @param {string} parentPanelId
 * @param {number[]} newSizes
 * @returns {import('../types').GridLayout}
 */
export function resizeNestedPanels(grid, parentPanelId, newSizes) {
  const found = findPanelById(grid, parentPanelId);
  if (!found || !found.panel.children) return grid;
  
  const total = newSizes.reduce((sum, s) => sum + s, 0);
  const normalizedSizes = newSizes.map(s => (s / total) * 100);
  
  return updateAtPath(grid, found.path, (panel) => ({
    ...panel,
    children: {
      ...panel.children,
      panels: panel.children.panels.map((child, i) => ({
        ...child,
        size: normalizedSizes[i]
      }))
    }
  }));
}

/**
 * Resize rows by adjusting heights
 * @param {import('../types').GridLayout} grid
 * @param {number[]} newHeights
 * @returns {import('../types').GridLayout}
 */
export function resizeRows(grid, newHeights) {
  if (grid.rows.length !== newHeights.length) return grid;

  const total = newHeights.reduce((sum, h) => sum + h, 0);
  const normalizedHeights = newHeights.map(h => (h / total) * 100);

  return {
    ...grid,
    rows: grid.rows.map((row, i) => ({
      ...row,
      height: normalizedHeights[i]
    }))
  };
}

/**
 * Update gutter width
 * @param {import('../types').GridLayout} grid
 * @param {number} gutterWidth
 * @returns {import('../types').GridLayout}
 */
export function updateGutterWidth(grid, gutterWidth) {
  return { ...grid, gutterWidth };
}

/**
 * Get panel by ID (for backwards compatibility - only top level)
 * @param {import('../types').GridLayout} grid
 * @param {string} panelId
 * @returns {{row: import('../types').GridRow, panel: import('../types').Panel, rowIndex: number, panelIndex: number} | null}
 */
export function getPanelById(grid, panelId) {
  for (let rowIndex = 0; rowIndex < grid.rows.length; rowIndex++) {
    const row = grid.rows[rowIndex];
    const panelIndex = row.panels.findIndex(p => p.id === panelId);
    if (panelIndex !== -1) {
      return { row, panel: row.panels[panelIndex], rowIndex, panelIndex };
    }
  }
  return null;
}

/**
 * Update panel content (handles nested panels too)
 * @param {import('../types').GridLayout} grid
 * @param {string} panelId
 * @param {import('../types').PanelContent} content
 * @returns {import('../types').GridLayout}
 */
export function updatePanelContent(grid, panelId, content) {
  const found = findPanelById(grid, panelId);
  if (!found) return grid;
  
  return updateAtPath(grid, found.path, (panel) => ({
    ...panel,
    content,
    children: undefined
  }));
}

/**
 * Delete a row
 * @param {import('../types').GridLayout} grid
 * @param {string} rowId
 * @returns {import('../types').GridLayout}
 */
export function deleteRow(grid, rowId) {
  if (grid.rows.length <= 1) return grid;

  const rowIndex = grid.rows.findIndex(r => r.id === rowId);
  if (rowIndex === -1) return grid;

  const deletedRowHeight = grid.rows[rowIndex].height;
  const remainingRows = grid.rows.filter(r => r.id !== rowId);
  
  const heightPerRow = deletedRowHeight / remainingRows.length;
  
  return {
    ...grid,
    rows: remainingRows.map(row => ({
      ...row,
      height: row.height + heightPerRow
    }))
  };
}

/**
 * Check if a panel can be split horizontally
 * @param {import('../types').GridLayout} grid
 * @param {string} panelId
 * @returns {boolean}
 */
export function canSplitHorizontal(grid, panelId) {
  const found = findPanelById(grid, panelId);
  if (!found) return false;
  return canSplitPanel(found.panel);
}

/**
 * Check if a panel can be split vertically
 * @param {import('../types').GridLayout} grid
 * @param {string} panelId
 * @returns {boolean}
 */
export function canSplitVertical(grid, panelId) {
  const found = findPanelById(grid, panelId);
  if (!found) return false;
  return canSplitPanel(found.panel);
}

/**
 * Collect all leaf panel IDs from the grid (for frame numbering)
 * @param {import('../types').GridLayout} grid
 * @returns {string[]}
 */
export function getAllLeafPanelIds(grid) {
  const ids = [];
  
  function collectFromPanel(panel) {
    if (panel.children) {
      panel.children.panels.forEach(child => collectFromPanel(child));
    } else {
      ids.push(panel.id);
    }
  }
  
  grid.rows.forEach(row => {
    row.panels.forEach(panel => collectFromPanel(panel));
  });
  
  return ids;
}
