import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_PAGE_DIMENSIONS, DEFAULT_GUTTER_WIDTH } from '../types';

const DB_NAME = 'frameforge';
const DB_VERSION = 2;
const STORE_PROJECTS = 'projects';
const STORE_METADATA = 'metadata';
const STORE_PRESETS = 'presets';

const SCHEMA_VERSION = '1.0.0';

let dbInstance = null;

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
async function getDB() {
  if (dbInstance) return dbInstance;
  
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store for full project data
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      
      // Store for project metadata (for listing)
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
      }
      
      // Store for custom presets (global, reusable across projects)
      if (!db.objectStoreNames.contains(STORE_PRESETS)) {
        const presetStore = db.createObjectStore(STORE_PRESETS, { keyPath: 'id' });
        presetStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

/**
 * Migrate data from localStorage to IndexedDB (one-time migration)
 */
async function migrateFromLocalStorage() {
  if (typeof window === 'undefined') return;
  
  const migrationKey = 'frameforge:migrated_to_indexeddb';
  if (localStorage.getItem(migrationKey)) return;
  
  try {
    // Get old projects list
    const oldList = localStorage.getItem('frameforge:projects');
    if (!oldList) {
      localStorage.setItem(migrationKey, 'true');
      return;
    }
    
    const projects = JSON.parse(oldList);
    
    for (const meta of projects) {
      const projectData = localStorage.getItem(`frameforge:project:${meta.id}`);
      if (projectData) {
        try {
          const parsed = JSON.parse(projectData);
          if (parsed.project) {
            await saveProject(parsed.project);
          }
        } catch (e) {
          console.warn('Failed to migrate project:', meta.id, e);
        }
      }
    }
    
    // Mark migration as complete
    localStorage.setItem(migrationKey, 'true');
    
    // Clean up old localStorage data (optional - uncomment if you want to free space)
    // for (const meta of projects) {
    //   localStorage.removeItem(`frameforge:project:${meta.id}`);
    // }
    // localStorage.removeItem('frameforge:projects');
    
    console.log('Migration from localStorage to IndexedDB complete');
  } catch (e) {
    console.warn('Migration failed:', e);
  }
}

// Run migration on module load
if (typeof window !== 'undefined') {
  getDB().then(() => migrateFromLocalStorage()).catch(console.warn);
}

/**
 * Generate a unique ID
 * @returns {string}
 */
export function generateId() {
  return uuidv4();
}

/**
 * Get current ISO timestamp
 * @returns {string}
 */
export function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Create a default grid layout
 * @returns {import('../types').GridLayout}
 */
export function createDefaultGrid() {
  const rowId = generateId();
  return {
    rows: [
      {
        id: rowId,
        height: 100,
        panels: [
          {
            id: generateId(),
            rowId: rowId,
            width: 100,
            content: {
              layers: [],
              backgroundColor: '#ffffff'
            }
          }
        ]
      }
    ],
    gutterWidth: DEFAULT_GUTTER_WIDTH
  };
}

/**
 * Create a new page
 * @param {string} projectId
 * @param {number} order
 * @returns {import('../types').Page}
 */
export function createPage(projectId, order) {
  const now = getTimestamp();
  return {
    id: generateId(),
    projectId,
    order,
    grid: createDefaultGrid(),
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Create a new project
 * @param {string} name
 * @param {import('../types').ProjectType} type
 * @returns {import('../types').Project}
 */
export function createProject(name, type) {
  const id = generateId();
  const now = getTimestamp();
  const dimensions = DEFAULT_PAGE_DIMENSIONS[type];
  
  const project = {
    id,
    name,
    type,
    width: dimensions.width,
    height: dimensions.height,
    pages: [createPage(id, 0)],
    createdAt: now,
    updatedAt: now
  };
  
  return project;
}

/**
 * Serialize project for storage
 * @param {import('../types').Project} project
 * @returns {object}
 */
export function serializeProject(project) {
  return {
    id: project.id,
    version: SCHEMA_VERSION,
    project
  };
}

/**
 * Deserialize project from storage
 * @param {object} data
 * @returns {import('../types').Project | null}
 */
export function deserializeProject(data) {
  try {
    return data?.project || null;
  } catch {
    return null;
  }
}

/**
 * Save project to IndexedDB
 * @param {import('../types').Project} project
 * @returns {Promise<import('../types').Project>}
 */
export async function saveProject(project) {
  if (typeof window === 'undefined') return project;
  
  const updatedProject = {
    ...project,
    updatedAt: getTimestamp()
  };
  
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PROJECTS, STORE_METADATA], 'readwrite');
    
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve(updatedProject);
    
    // Save full project
    const projectStore = transaction.objectStore(STORE_PROJECTS);
    projectStore.put(serializeProject(updatedProject));
    
    // Save metadata
    const metaStore = transaction.objectStore(STORE_METADATA);
    metaStore.put({
      id: updatedProject.id,
      name: updatedProject.name,
      type: updatedProject.type,
      updatedAt: updatedProject.updatedAt
    });
  });
}

/**
 * Load project from IndexedDB
 * @param {string} id
 * @returns {Promise<import('../types').Project | null>}
 */
export async function loadProject(id) {
  if (typeof window === 'undefined') return null;
  
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PROJECTS], 'readonly');
    const store = transaction.objectStore(STORE_PROJECTS);
    const request = store.get(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(deserializeProject(request.result));
    };
  });
}

/**
 * Delete project from IndexedDB
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteProject(id) {
  if (typeof window === 'undefined') return;
  
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PROJECTS, STORE_METADATA], 'readwrite');
    
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
    
    transaction.objectStore(STORE_PROJECTS).delete(id);
    transaction.objectStore(STORE_METADATA).delete(id);
  });
}

/**
 * List all projects (metadata only)
 * @returns {Promise<Array<{id: string, name: string, type: string, updatedAt: string}>>}
 */
export async function listProjects() {
  if (typeof window === 'undefined') return [];
  
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_METADATA], 'readonly');
    const store = transaction.objectStore(STORE_METADATA);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      resolve(request.result || []);
    };
  });
}

// ============ CUSTOM PRESETS ============

/**
 * Save a custom preset
 * @param {import('../types').CustomPreset} preset
 * @returns {Promise<import('../types').CustomPreset>}
 */
export async function saveCustomPreset(preset) {
  if (typeof window === 'undefined') return preset;
  
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PRESETS], 'readwrite');
    const store = transaction.objectStore(STORE_PRESETS);
    
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve(preset);
    
    store.put(preset);
  });
}

/**
 * Get all custom presets of a specific type
 * @param {import('../types').CustomPresetType} type
 * @returns {Promise<import('../types').CustomPreset[]>}
 */
export async function getCustomPresets(type) {
  if (typeof window === 'undefined') return [];
  
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PRESETS], 'readonly');
    const store = transaction.objectStore(STORE_PRESETS);
    const index = store.index('type');
    const request = index.getAll(type);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get all custom presets (all types)
 * @returns {Promise<import('../types').CustomPreset[]>}
 */
export async function getAllCustomPresets() {
  if (typeof window === 'undefined') return [];
  
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PRESETS], 'readonly');
    const store = transaction.objectStore(STORE_PRESETS);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Delete a custom preset
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteCustomPreset(id) {
  if (typeof window === 'undefined') return;
  
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PRESETS], 'readwrite');
    const store = transaction.objectStore(STORE_PRESETS);
    
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
    
    store.delete(id);
  });
}

/**
 * Update an existing custom preset
 * @param {string} id
 * @param {Object} updates - { name?, data? }
 * @returns {Promise<import('../types').CustomPreset>}
 */
export async function updateCustomPreset(id, updates) {
  if (typeof window === 'undefined') return null;
  
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_PRESETS], 'readwrite');
    const store = transaction.objectStore(STORE_PRESETS);
    
    const getRequest = store.get(id);
    
    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const preset = getRequest.result;
      if (!preset) {
        reject(new Error('Preset not found'));
        return;
      }
      
      const updated = {
        ...preset,
        ...updates,
        data: updates.data ? { ...preset.data, ...updates.data } : preset.data,
        updatedAt: getTimestamp()
      };
      
      const putRequest = store.put(updated);
      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => resolve(updated);
    };
  });
}

/**
 * Create a new custom preset
 * @param {import('../types').CustomPresetType} type
 * @param {string} name
 * @param {Object} data
 * @returns {import('../types').CustomPreset}
 */
export function createCustomPreset(type, name, data) {
  return {
    id: generateId(),
    type,
    name,
    data,
    createdAt: getTimestamp()
  };
}
