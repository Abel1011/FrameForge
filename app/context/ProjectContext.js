'use client';

import { createContext, useContext, useReducer, useCallback } from 'react';
import { 
  createProject as createNewProject, 
  saveProject, 
  loadProject, 
  deleteProject as removeProject,
  createPage,
  generateId,
  getTimestamp
} from '../lib/storage';

/**
 * @typedef {'CREATE_PROJECT' | 'LOAD_PROJECT' | 'DELETE_PROJECT' | 'UPDATE_PROJECT' | 'SET_CURRENT_PAGE' | 'ADD_PAGE' | 'DELETE_PAGE' | 'DUPLICATE_PAGE' | 'REORDER_PAGES' | 'UPDATE_GRID'} ActionType
 */

/**
 * @typedef {Object} ProjectState
 * @property {import('../types').Project | null} project
 * @property {string | null} currentPageId
 * @property {boolean} isLoading
 */

const initialState = {
  project: null,
  currentPageId: null,
  isLoading: false
};

/**
 * @param {ProjectState} state
 * @param {{type: ActionType, payload?: any}} action
 * @returns {ProjectState}
 */
function projectReducer(state, action) {
  switch (action.type) {
    case 'CREATE_PROJECT': {
      const project = createNewProject(action.payload.name, action.payload.type);
      // Fire-and-forget async save
      saveProject(project).catch(console.error);
      return {
        ...state,
        project,
        currentPageId: project.pages[0]?.id || null
      };
    }
    
    case 'LOAD_PROJECT': {
      return {
        ...state,
        project: action.payload.project,
        currentPageId: action.payload.project?.pages[0]?.id || null
      };
    }
    
    case 'DELETE_PROJECT': {
      // Fire-and-forget async delete
      removeProject(action.payload.id).catch(console.error);
      return {
        ...state,
        project: state.project?.id === action.payload.id ? null : state.project,
        currentPageId: state.project?.id === action.payload.id ? null : state.currentPageId
      };
    }
    
    case 'UPDATE_PROJECT': {
      if (!state.project) return state;
      const updatedProject = {
        ...state.project,
        ...action.payload,
        updatedAt: getTimestamp()
      };
      return {
        ...state,
        project: updatedProject
      };
    }
    
    case 'SET_CURRENT_PAGE': {
      return {
        ...state,
        currentPageId: action.payload.pageId
      };
    }
    
    case 'ADD_PAGE': {
      if (!state.project) return state;
      const newPage = createPage(state.project.id, state.project.pages.length);
      const updatedProject = {
        ...state.project,
        pages: [...state.project.pages, newPage],
        updatedAt: getTimestamp()
      };
      return {
        ...state,
        project: updatedProject,
        currentPageId: newPage.id
      };
    }
    
    case 'DELETE_PAGE': {
      if (!state.project || state.project.pages.length <= 1) return state;
      const pageIndex = state.project.pages.findIndex(p => p.id === action.payload.pageId);
      const updatedPages = state.project.pages
        .filter(p => p.id !== action.payload.pageId)
        .map((p, i) => ({ ...p, order: i }));
      
      let newCurrentPageId = state.currentPageId;
      if (state.currentPageId === action.payload.pageId) {
        newCurrentPageId = updatedPages[Math.min(pageIndex, updatedPages.length - 1)]?.id || null;
      }
      
      return {
        ...state,
        project: {
          ...state.project,
          pages: updatedPages,
          updatedAt: getTimestamp()
        },
        currentPageId: newCurrentPageId
      };
    }
    
    case 'DUPLICATE_PAGE': {
      if (!state.project) return state;
      const sourcePage = state.project.pages.find(p => p.id === action.payload.pageId);
      if (!sourcePage) return state;
      
      const sourceIndex = state.project.pages.findIndex(p => p.id === action.payload.pageId);
      const duplicatedPage = {
        ...JSON.parse(JSON.stringify(sourcePage)),
        id: generateId(),
        order: sourceIndex + 1,
        createdAt: getTimestamp(),
        updatedAt: getTimestamp()
      };
      
      // Update IDs for rows and panels
      duplicatedPage.grid.rows = duplicatedPage.grid.rows.map(row => {
        const newRowId = generateId();
        return {
          ...row,
          id: newRowId,
          panels: row.panels.map(panel => ({
            ...panel,
            id: generateId(),
            rowId: newRowId
          }))
        };
      });
      
      const updatedPages = [
        ...state.project.pages.slice(0, sourceIndex + 1),
        duplicatedPage,
        ...state.project.pages.slice(sourceIndex + 1).map(p => ({ ...p, order: p.order + 1 }))
      ];
      
      return {
        ...state,
        project: {
          ...state.project,
          pages: updatedPages,
          updatedAt: getTimestamp()
        },
        currentPageId: duplicatedPage.id
      };
    }
    
    case 'REORDER_PAGES': {
      if (!state.project) return state;
      const { fromIndex, toIndex } = action.payload;
      const pages = [...state.project.pages];
      const [movedPage] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, movedPage);
      
      const reorderedPages = pages.map((p, i) => ({ ...p, order: i }));
      
      return {
        ...state,
        project: {
          ...state.project,
          pages: reorderedPages,
          updatedAt: getTimestamp()
        }
      };
    }
    
    case 'UPDATE_GRID': {
      if (!state.project || !state.currentPageId) return state;
      const updatedPages = state.project.pages.map(page => {
        if (page.id === state.currentPageId) {
          return {
            ...page,
            grid: action.payload.grid,
            updatedAt: getTimestamp()
          };
        }
        return page;
      });
      
      return {
        ...state,
        project: {
          ...state.project,
          pages: updatedPages,
          updatedAt: getTimestamp()
        }
      };
    }
    
    default:
      return state;
  }
}

const ProjectContext = createContext(/** @type {{state: ProjectState, dispatch: React.Dispatch<any>, actions: any} | null} */ (null));

export function ProjectProvider({ children }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  const actions = {
    createProject: useCallback((name, type) => {
      dispatch({ type: 'CREATE_PROJECT', payload: { name, type } });
    }, []),
    
    loadProject: useCallback(async (id) => {
      const project = await loadProject(id);
      dispatch({ type: 'LOAD_PROJECT', payload: { project } });
      return project;
    }, []),
    
    deleteProject: useCallback((id) => {
      dispatch({ type: 'DELETE_PROJECT', payload: { id } });
    }, []),
    
    updateProject: useCallback((updates) => {
      dispatch({ type: 'UPDATE_PROJECT', payload: updates });
    }, []),
    
    setCurrentPage: useCallback((pageId) => {
      dispatch({ type: 'SET_CURRENT_PAGE', payload: { pageId } });
    }, []),
    
    addPage: useCallback(() => {
      dispatch({ type: 'ADD_PAGE' });
    }, []),
    
    deletePage: useCallback((pageId) => {
      dispatch({ type: 'DELETE_PAGE', payload: { pageId } });
    }, []),
    
    duplicatePage: useCallback((pageId) => {
      dispatch({ type: 'DUPLICATE_PAGE', payload: { pageId } });
    }, []),
    
    reorderPages: useCallback((fromIndex, toIndex) => {
      dispatch({ type: 'REORDER_PAGES', payload: { fromIndex, toIndex } });
    }, []),
    
    updateGrid: useCallback((grid) => {
      dispatch({ type: 'UPDATE_GRID', payload: { grid } });
    }, [])
  };

  return (
    <ProjectContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
