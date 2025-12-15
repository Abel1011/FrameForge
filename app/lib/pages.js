import { generateId, getTimestamp, createDefaultGrid } from './storage';

/**
 * Create a new page
 * @param {string} projectId
 * @param {number} order
 * @param {import('../types').PageOrientation} [orientation='portrait']
 * @returns {import('../types').Page}
 */
export function createNewPage(projectId, order, orientation = 'portrait') {
  const now = getTimestamp();
  return {
    id: generateId(),
    projectId,
    order,
    orientation,
    grid: createDefaultGrid(),
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Add a page to project
 * @param {import('../types').Project} project
 * @returns {import('../types').Project}
 */
export function addPage(project) {
  const newPage = createNewPage(project.id, project.pages.length);
  return {
    ...project,
    pages: [...project.pages, newPage],
    updatedAt: getTimestamp()
  };
}

/**
 * Delete a page from project
 * @param {import('../types').Project} project
 * @param {string} pageId
 * @returns {import('../types').Project}
 */
export function deletePage(project, pageId) {
  if (project.pages.length <= 1) return project;
  
  const updatedPages = project.pages
    .filter(p => p.id !== pageId)
    .map((p, i) => ({ ...p, order: i }));
  
  return {
    ...project,
    pages: updatedPages,
    updatedAt: getTimestamp()
  };
}

/**
 * Duplicate a page
 * @param {import('../types').Project} project
 * @param {string} pageId
 * @returns {{project: import('../types').Project, newPageId: string}}
 */
export function duplicatePage(project, pageId) {
  const sourcePage = project.pages.find(p => p.id === pageId);
  if (!sourcePage) return { project, newPageId: null };
  
  const sourceIndex = project.pages.findIndex(p => p.id === pageId);
  const now = getTimestamp();
  
  // Deep clone the page
  const duplicatedPage = JSON.parse(JSON.stringify(sourcePage));
  duplicatedPage.id = generateId();
  duplicatedPage.order = sourceIndex + 1;
  duplicatedPage.createdAt = now;
  duplicatedPage.updatedAt = now;
  
  // Generate new IDs for rows and panels
  duplicatedPage.grid.rows = duplicatedPage.grid.rows.map(row => {
    const newRowId = generateId();
    return {
      ...row,
      id: newRowId,
      panels: row.panels.map(panel => ({
        ...panel,
        id: generateId(),
        rowId: newRowId,
        content: {
          ...panel.content,
          layers: panel.content.layers.map(layer => ({
            ...layer,
            id: generateId()
          }))
        }
      }))
    };
  });
  
  const updatedPages = [
    ...project.pages.slice(0, sourceIndex + 1),
    duplicatedPage,
    ...project.pages.slice(sourceIndex + 1).map(p => ({ ...p, order: p.order + 1 }))
  ];
  
  return {
    project: {
      ...project,
      pages: updatedPages,
      updatedAt: now
    },
    newPageId: duplicatedPage.id
  };
}

/**
 * Reorder pages
 * @param {import('../types').Project} project
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {import('../types').Project}
 */
export function reorderPages(project, fromIndex, toIndex) {
  const pages = [...project.pages];
  const [movedPage] = pages.splice(fromIndex, 1);
  pages.splice(toIndex, 0, movedPage);
  
  const reorderedPages = pages.map((p, i) => ({ ...p, order: i }));
  
  return {
    ...project,
    pages: reorderedPages,
    updatedAt: getTimestamp()
  };
}

/**
 * Get page by ID
 * @param {import('../types').Project} project
 * @param {string} pageId
 * @returns {import('../types').Page | undefined}
 */
export function getPageById(project, pageId) {
  return project.pages.find(p => p.id === pageId);
}
