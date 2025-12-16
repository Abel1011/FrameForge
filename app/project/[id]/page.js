'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layers, X } from 'lucide-react';
import { loadProject, saveProject, generateId, createGridWithPanels } from '../../lib/storage';
import { useAutoSave } from '../../hooks/useAutoSave';
import { useJobPolling } from '../../hooks/useJobPolling';
import GridEditor from '../../components/GridEditor';
import PageSidebar from '../../components/PageSidebar';
import EditorToolbar from '../../components/EditorToolbar';
import ExportDialog from '../../components/ExportDialog';
import StoryIdeaScreen from '../../components/StoryIdeaScreen';
import ProjectSetupWizard from '../../components/ProjectSetupWizard';
import ProjectSettingsDialog from '../../components/ProjectSettingsDialog';
import PanelContextToolbar from '../../components/PanelContextToolbar';
import { GenerateComicDialog, GeneratePageDialog } from '../../components/AIGenerateDialog';
import GenerationProgressOverlay from '../../components/GenerationProgressOverlay';
import { exportPageAsImage, exportProjectAsPDF } from '../../lib/export';
import { getPanelById, getAllLeafPanelIds, findPanelById, updatePanelContent } from '../../lib/grid';
import { updateLayer, removeLayer as deleteLayer } from '../../lib/layers';

export default function ProjectEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [currentPageId, setCurrentPageId] = useState(null);
  const [selectedPanelId, setSelectedPanelId] = useState(null);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showStoryIdeaScreen, setShowStoryIdeaScreen] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showProjectSettings, setShowProjectSettings] = useState(false);
  const [aiGeneratedSettings, setAiGeneratedSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [panelActionTrigger, setPanelActionTrigger] = useState(null);
  const [showGenerateComicDialog, setShowGenerateComicDialog] = useState(false);
  const [showGeneratePageDialog, setShowGeneratePageDialog] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(null);
  const [generationType, setGenerationType] = useState(null); // 'comic' or 'page'
  const [pendingStoryDescription, setPendingStoryDescription] = useState('');
  const [pendingPageDescription, setPendingPageDescription] = useState('');
  const [pendingKeepLayouts, setPendingKeepLayouts] = useState(false);
  const canvasRef = useRef(null);

  const { saveStatus } = useAutoSave(project);
  
  // Job polling hook for background generation (works for both comic and page)
  const {
    job: activeJob,
    isPolling,
    isComplete: isJobComplete,
    isError: isJobError,
    progress: jobProgress,
    result: jobResult,
    generatedItems: jobGeneratedItems,
    startPolling,
    reset: resetJob,
  } = useJobPolling({ pollInterval: 2000 });

  // Load project on mount
  useEffect(() => {
    const loadProjectData = async () => {
      const loadedProject = await loadProject(params.id);
      if (loadedProject) {
        setProject(loadedProject);
        setCurrentPageId(loadedProject.pages[0]?.id || null);
        // Show story idea screen if settings not complete (new project)
        if (!loadedProject.settings?.setupComplete) {
          setShowStoryIdeaScreen(true);
        }
      } else {
        router.push('/');
      }
      setIsLoading(false);
    };
    loadProjectData();
  }, [params.id, router]);

  // React to job polling updates - update progress overlay
  useEffect(() => {
    if (!activeJob) return;
    
    // Update progress overlay based on job status
    if (jobProgress) {
      setGenerationProgress({
        stage: jobProgress.stage,
        message: jobProgress.message,
        currentPage: jobProgress.currentPage,
        totalPages: jobProgress.totalPages,
        currentPanel: jobProgress.currentPanel,
        totalPanels: jobProgress.totalPanels,
        percent: jobProgress.percent,
      });
    }
  }, [activeJob, jobProgress]);

  // React to job completion - process results (handles both comic and page jobs)
  useEffect(() => {
    if (!isJobComplete || !jobResult || !project) return;
    
    const processJobResult = async () => {
      const now = new Date().toISOString();
      
      // Handle PAGE generation job
      if (generationType === 'page') {
        const panels = jobResult.panels || [];
        let imagesAdded = 0;
        
        // Get current page from project and currentPageId
        const pageToUpdate = project?.pages.find(p => p.id === currentPageId);
        
        if (panels.length > 0 && pageToUpdate) {
          let updatedGrid = JSON.parse(JSON.stringify(pageToUpdate.grid));
          
          // Get flat list of all panels in current page
          const allPanels = [];
          updatedGrid.rows.forEach(row => {
            row.panels.forEach(panel => {
              allPanels.push(panel);
            });
          });
          
          // Add images to panels
          panels.forEach((generatedPanel, index) => {
            if (generatedPanel.imageUrl && index < allPanels.length) {
              const targetPanel = allPanels[index];
              
              const newLayer = {
                id: generateId(),
                type: 'image',
                position: { x: 0, y: 0 },
                size: { width: '100%', height: '100%', fillPanel: true },
                data: {
                  src: generatedPanel.imageUrl,
                  fit: 'cover',
                  aiGeneration: {
                    prompt: generatedPanel.panelPlan?.sceneDescription || pendingPageDescription,
                    seed: generatedPanel.seed,
                    structuredPrompt: generatedPanel.structuredPrompt,
                    generatedAt: now
                  }
                }
              };
              
              const currentContent = targetPanel.content || { layers: [], backgroundColor: '#ffffff' };
              targetPanel.content = {
                ...currentContent,
                layers: [...currentContent.layers, newLayer]
              };
              
              imagesAdded++;
            }
          });
          
          // Update the page
          const updatedPage = {
            ...pageToUpdate,
            grid: updatedGrid,
            updatedAt: now
          };
          
          // Update pages array
          const updatedPages = project.pages.map(p => 
            p.id === pageToUpdate.id ? updatedPage : p
          );
          
          const updatedProject = { ...project, pages: updatedPages, updatedAt: now };
          setProject(updatedProject);
          await saveProject(updatedProject);
          
          setGenerationProgress({
            stage: 'complete',
            message: `Successfully generated ${imagesAdded} images for this page!`,
            currentPage: 1,
            totalPages: 1,
            stats: {
              pages: 1,
              images: imagesAdded
            }
          });
          
          console.log(`✅ Page generated: ${imagesAdded} images`);
        }
        
        setShowGeneratePageDialog(false);
        setIsGeneratingAI(false);
        resetJob(); // Clear job to prevent re-processing
        return;
      }
      
      // Handle COMIC generation job (existing logic)
      const newPages = [];
      let totalImagesAdded = 0;
      
      // Process each generated page from job result
      const pages = jobResult.pages || [];
      pages.forEach((generatedPage, pageIndex) => {
        const panelCount = generatedPage.panels?.length || 0;
        
        // Create grid for this page
        const pageGrid = pendingKeepLayouts && project.pages[pageIndex]
          ? JSON.parse(JSON.stringify(project.pages[pageIndex].grid))
          : createGridWithPanels(panelCount, project.height > project.width);
        
        // Get flat list of all panels
        const allPanels = [];
        pageGrid.rows.forEach(row => {
          row.panels.forEach(panel => {
            allPanels.push(panel);
          });
        });
        
        // Add images to panels
        generatedPage.panels?.forEach((generatedPanel, panelIndex) => {
          if (generatedPanel.imageUrl && panelIndex < allPanels.length) {
            const targetPanel = allPanels[panelIndex];
            
            const newLayer = {
              id: generateId(),
              type: 'image',
              position: { x: 0, y: 0 },
              size: { width: '100%', height: '100%', fillPanel: true },
              data: {
                src: generatedPanel.imageUrl,
                fit: 'cover',
                aiGeneration: {
                  prompt: generatedPanel.panelPlan?.sceneDescription || pendingStoryDescription,
                  seed: generatedPanel.seed,
                  structuredPrompt: generatedPanel.structuredPrompt,
                  generatedAt: now
                }
              }
            };
            
            const existingLayers = pendingKeepLayouts ? [] : (targetPanel.content?.layers || []);
            targetPanel.content = {
              backgroundColor: targetPanel.content?.backgroundColor || '#ffffff',
              layers: [...existingLayers, newLayer]
            };
            
            totalImagesAdded++;
          }
        });
        
        const newPage = {
          id: pendingKeepLayouts && project.pages[pageIndex] ? project.pages[pageIndex].id : generateId(),
          projectId: project.id,
          order: pageIndex,
          orientation: project.height > project.width ? 'portrait' : 'landscape',
          grid: pageGrid,
          createdAt: pendingKeepLayouts && project.pages[pageIndex] ? project.pages[pageIndex].createdAt : now,
          updatedAt: now,
          aiMetadata: {
            pageDescription: generatedPage.pagePlan?.pageDescription,
            mood: generatedPage.pagePlan?.mood,
            panelsPlan: generatedPage.panelsPlan,
            generatedAt: now
          }
        };
        
        newPages.push(newPage);
      });
      
      // Update project
      const updatedProject = {
        ...project,
        pages: newPages,
        updatedAt: now,
        aiMetadata: {
          ...project.aiMetadata,
          lastGeneration: {
            type: 'full-comic',
            title: jobResult.title,
            summary: jobResult.summary,
            storyDescription: pendingStoryDescription,
            pageCount: newPages.length,
            totalImages: totalImagesAdded,
            generatedAt: now
          }
        }
      };
      
      setProject(updatedProject);
      await saveProject(updatedProject);
      
      if (newPages.length > 0) {
        setCurrentPageId(newPages[0].id);
      }
      
      // Update progress to complete
      setGenerationProgress({
        stage: 'complete',
        message: `Successfully generated ${newPages.length} pages with ${totalImagesAdded} images!`,
        currentPage: newPages.length,
        totalPages: newPages.length,
        stats: {
          pages: newPages.length,
          images: totalImagesAdded
        }
      });
      
      setIsGeneratingAI(false);
      console.log(`✅ Comic generated: ${newPages.length} pages, ${totalImagesAdded} images`);
      resetJob(); // Clear job to prevent re-processing
    };
    
    processJobResult();
  }, [isJobComplete, jobResult, project, pendingStoryDescription, pendingKeepLayouts, generationType, currentPageId, pendingPageDescription, resetJob]);

  // React to job error
  useEffect(() => {
    if (!isJobError || !activeJob) return;
    
    setGenerationProgress({
      stage: 'error',
      message: activeJob.error || 'Generation failed',
      currentPage: 0,
      totalPages: jobProgress?.totalPages || 0
    });
    
    // Close dialog if page generation
    if (generationType === 'page') {
      setShowGeneratePageDialog(false);
    }
    
    setIsGeneratingAI(false);
  }, [isJobError, activeJob, jobProgress, generationType]);

  // Handle AI-generated settings from StoryIdeaScreen
  const handleAIGeneratedSettings = useCallback((settings) => {
    if (!project) return;
    
    // Determine default context based on project type
    const contextMap = {
      'comic': 'comic-panel',
      'manga': 'manga-panel',
      'storyboard': 'storyboard',
      'graphic-novel': 'graphic-novel'
    };
    
    const updatedProject = {
      ...project,
      settings: {
        ...settings,
        projectContext: settings.projectContext || contextMap[project.type] || 'comic-panel',
        setupComplete: true
      },
      updatedAt: new Date().toISOString()
    };
    setProject(updatedProject);
    saveProject(updatedProject);
    setShowStoryIdeaScreen(false);
  }, [project]);

  // Handle manual setup choice from StoryIdeaScreen
  const handleManualSetup = useCallback((aiSettings = null) => {
    setAiGeneratedSettings(aiSettings);
    setShowStoryIdeaScreen(false);
    setShowSetupWizard(true);
  }, []);

  // Handle switching from wizard to AI story idea screen (go directly to input)
  const handleSwitchToAI = useCallback(() => {
    setShowSetupWizard(false);
    setAiGeneratedSettings(null);
    setShowStoryIdeaScreen('ai-input');
  }, []);

  // Handle going back to choose path screen from wizard
  const handleBackToChoose = useCallback(() => {
    setShowSetupWizard(false);
    setAiGeneratedSettings(null);
    setShowStoryIdeaScreen(true);
  }, []);

  // Handle setup wizard completion
  const handleSetupComplete = useCallback((settings) => {
    if (!project) return;
    
    const updatedProject = {
      ...project,
      settings,
      updatedAt: new Date().toISOString()
    };
    setProject(updatedProject);
    saveProject(updatedProject);
    setShowSetupWizard(false);
    setAiGeneratedSettings(null);
  }, [project]);

  const handleSetupSkip = useCallback(() => {
    if (!project) return;
    
    // Determine default context based on project type
    const contextMap = {
      'comic': 'comic-panel',
      'manga': 'manga-panel',
      'storyboard': 'storyboard',
      'graphic-novel': 'graphic-novel'
    };
    
    const updatedProject = {
      ...project,
      settings: {
        characters: [],
        locations: [],
        artStyle: { id: 'manga', name: 'Manga/Anime', customPrompt: 'Japanese manga style, clean lines, expressive characters, screentones' },
        styleMedium: 'digital-art',
        mood: 'bright',
        colorPalette: ['#fef3c7', '#fde68a', '#fbbf24', '#f59e0b'],
        defaultLighting: 'natural',
        projectContext: contextMap[project.type] || 'comic-panel',
        setupComplete: true
      },
      updatedAt: new Date().toISOString()
    };
    setProject(updatedProject);
    saveProject(updatedProject);
    setShowStoryIdeaScreen(false);
    setShowSetupWizard(false);
    setAiGeneratedSettings(null);
  }, [project]);

  // Handle project settings update
  const handleProjectSettingsSave = useCallback((settings) => {
    if (!project) return;
    
    const updatedProject = {
      ...project,
      settings: { ...settings, setupComplete: true },
      updatedAt: new Date().toISOString()
    };
    setProject(updatedProject);
    saveProject(updatedProject);
  }, [project]);

  // Get current page
  const currentPage = project?.pages.find(p => p.id === currentPageId);

  // Grid change handler
  const handleGridChange = useCallback((newGrid) => {
    if (!project || !currentPageId) return;

    setProject(prev => {
      const updatedPages = prev.pages.map(page =>
        page.id === currentPageId
          ? { ...page, grid: newGrid, updatedAt: new Date().toISOString() }
          : page
      );
      const updatedProject = {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString()
      };
      saveProject(updatedProject);
      return updatedProject;
    });
  }, [currentPageId, project]);

  // Page management handlers
  const handleAddPage = useCallback(() => {
    if (!project) return;

    const newPageId = crypto.randomUUID();
    const newPage = {
      id: newPageId,
      projectId: project.id,
      order: project.pages.length,
      grid: {
        rows: [{
          id: crypto.randomUUID(),
          height: 100,
          panels: [{
            id: crypto.randomUUID(),
            rowId: '',
            width: 100,
            content: { layers: [], backgroundColor: '#ffffff' }
          }]
        }],
        gutterWidth: 8
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    newPage.grid.rows[0].panels[0].rowId = newPage.grid.rows[0].id;

    setProject(prev => {
      const updatedProject = {
        ...prev,
        pages: [...prev.pages, newPage],
        updatedAt: new Date().toISOString()
      };
      saveProject(updatedProject);
      return updatedProject;
    });
    setCurrentPageId(newPageId);
  }, [project]);

  const handleDeletePage = useCallback((pageId) => {
    if (!project || project.pages.length <= 1) return;

    const pageIndex = project.pages.findIndex(p => p.id === pageId);
    
    setProject(prev => {
      const updatedPages = prev.pages
        .filter(p => p.id !== pageId)
        .map((p, i) => ({ ...p, order: i }));
      const updatedProject = {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString()
      };
      saveProject(updatedProject);
      return updatedProject;
    });

    if (currentPageId === pageId) {
      const newIndex = Math.min(pageIndex, project.pages.length - 2);
      setCurrentPageId(project.pages.filter(p => p.id !== pageId)[newIndex]?.id);
    }
  }, [project, currentPageId]);

  const handleDuplicatePage = useCallback((pageId) => {
    if (!project) return;

    const sourcePage = project.pages.find(p => p.id === pageId);
    if (!sourcePage) return;

    const sourceIndex = project.pages.findIndex(p => p.id === pageId);
    const duplicatedPage = JSON.parse(JSON.stringify(sourcePage));
    duplicatedPage.id = crypto.randomUUID();
    duplicatedPage.order = sourceIndex + 1;
    duplicatedPage.createdAt = new Date().toISOString();
    duplicatedPage.updatedAt = new Date().toISOString();

    // Generate new IDs
    duplicatedPage.grid.rows = duplicatedPage.grid.rows.map(row => {
      const newRowId = crypto.randomUUID();
      return {
        ...row,
        id: newRowId,
        panels: row.panels.map(panel => ({
          ...panel,
          id: crypto.randomUUID(),
          rowId: newRowId,
          content: {
            ...panel.content,
            layers: panel.content.layers.map(layer => ({
              ...layer,
              id: crypto.randomUUID()
            }))
          }
        }))
      };
    });

    setProject(prev => {
      const updatedPages = [
        ...prev.pages.slice(0, sourceIndex + 1),
        duplicatedPage,
        ...prev.pages.slice(sourceIndex + 1).map(p => ({ ...p, order: p.order + 1 }))
      ];
      const updatedProject = {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString()
      };
      saveProject(updatedProject);
      return updatedProject;
    });
    setCurrentPageId(duplicatedPage.id);
  }, [project]);

  const handleReorderPages = useCallback((fromIndex, toIndex) => {
    if (!project) return;

    setProject(prev => {
      const pages = [...prev.pages];
      const [movedPage] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, movedPage);
      const reorderedPages = pages.map((p, i) => ({ ...p, order: i }));
      const updatedProject = {
        ...prev,
        pages: reorderedPages,
        updatedAt: new Date().toISOString()
      };
      saveProject(updatedProject);
      return updatedProject;
    });
  }, [project]);

  const handleTogglePageOrientation = useCallback((pageId) => {
    if (!project) return;

    setProject(prev => {
      const updatedPages = prev.pages.map(page => {
        if (page.id !== pageId) return page;
        const currentOrientation = page.orientation || 'portrait';
        const newOrientation = currentOrientation === 'portrait' ? 'landscape' : 'portrait';
        return {
          ...page,
          orientation: newOrientation,
          updatedAt: new Date().toISOString()
        };
      });
      const updatedProject = {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString()
      };
      saveProject(updatedProject);
      return updatedProject;
    });
  }, [project]);

  // Get selected panel info
  const selectedPanelInfo = useMemo(() => {
    if (!currentPage?.grid || !selectedPanelId) return null;
    const found = findPanelById(currentPage.grid, selectedPanelId);
    if (!found) return null;
    
    // Calculate frame number
    const leafIds = getAllLeafPanelIds(currentPage.grid);
    const frameNumber = leafIds.indexOf(selectedPanelId) + 1;
    
    return {
      panel: found.panel,
      frameNumber: frameNumber > 0 ? frameNumber : null
    };
  }, [currentPage?.grid, selectedPanelId]);

  // Get selected layer info
  const selectedLayerInfo = useMemo(() => {
    if (!selectedPanelInfo?.panel || !selectedLayerId) return null;
    const panel = selectedPanelInfo.panel;
    const layer = panel.content?.layers?.find(l => l.id === selectedLayerId);
    return layer || null;
  }, [selectedPanelInfo, selectedLayerId]);

  // Handle layer update from toolbar
  const handleLayerUpdate = useCallback((updates) => {
    if (!selectedPanelInfo?.panel || !selectedLayerId || !currentPage) return;
    
    const panel = selectedPanelInfo.panel;
    const newContent = updateLayer(panel.content, selectedLayerId, updates);
    const newGrid = updatePanelContent(currentPage.grid, panel.id, newContent);
    handleGridChange(newGrid);
  }, [selectedPanelInfo, selectedLayerId, currentPage, handleGridChange]);

  // Handle layer delete from toolbar
  const handleLayerDelete = useCallback(() => {
    if (!selectedPanelInfo?.panel || !selectedLayerId || !currentPage) return;
    
    const panel = selectedPanelInfo.panel;
    const newContent = deleteLayer(panel.content, selectedLayerId);
    const newGrid = updatePanelContent(currentPage.grid, panel.id, newContent);
    handleGridChange(newGrid);
    setSelectedLayerId(null);
  }, [selectedPanelInfo, selectedLayerId, currentPage, handleGridChange]);

  // Trigger panel action from context toolbar
  const triggerPanelAction = useCallback((action) => {
    setPanelActionTrigger({ action, timestamp: Date.now() });
  }, []);

  // Clear panel action after it's been processed
  const clearPanelAction = useCallback(() => {
    setPanelActionTrigger(null);
  }, []);

  // Gutter change handler
  const handleGutterChange = useCallback((newGutterWidth) => {
    if (!project || !currentPageId) return;

    setProject(prev => {
      const updatedPages = prev.pages.map(page =>
        page.id === currentPageId
          ? { 
              ...page, 
              grid: { ...page.grid, gutterWidth: newGutterWidth },
              updatedAt: new Date().toISOString() 
            }
          : page
      );
      const updatedProject = {
        ...prev,
        pages: updatedPages,
        updatedAt: new Date().toISOString()
      };
      saveProject(updatedProject);
      return updatedProject;
    });
  }, [currentPageId, project]);

  // Count panels in current page for AI generation
  const currentPagePanelCount = useMemo(() => {
    if (!currentPage?.grid) return 0;
    return getAllLeafPanelIds(currentPage.grid).length;
  }, [currentPage]);

  // Calculate aspect ratio for a panel based on percentages and project dimensions
  const calculateAspectRatio = useCallback((panelWidthPercent, rowHeightPercent, projectWidth, projectHeight) => {
    if (!projectWidth || !projectHeight) return '1:1';
    const actualWidth = (panelWidthPercent / 100) * projectWidth;
    const actualHeight = (rowHeightPercent / 100) * projectHeight;
    const ratio = actualWidth / actualHeight;
    // Common aspect ratios
    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    if (Math.abs(ratio - 1.5) < 0.1) return '3:2';
    if (Math.abs(ratio - 1.78) < 0.1) return '16:9';
    if (Math.abs(ratio - 0.67) < 0.1) return '2:3';
    if (Math.abs(ratio - 0.56) < 0.1) return '9:16';
    return `${ratio.toFixed(2)}:1`;
  }, []);

  // Get panel info for current page (for API)
  const getCurrentPagePanels = useCallback(() => {
    if (!currentPage?.grid) return [];
    const panelIds = getAllLeafPanelIds(currentPage.grid);
    return panelIds.map(id => {
      const info = findPanelById(currentPage.grid, id);
      if (!info) return null;
      const panel = info.panel;
      return {
        id: panel.id,
        width: panel.width,
        height: info.row?.height || 100,
        hasContent: panel.content?.layers?.length > 0,
        aspectRatio: calculateAspectRatio(panel.width, info.row?.height || 100, project?.width, project?.height)
      };
    }).filter(Boolean);
  }, [currentPage, project]);

  // Handle Generate Full Comic (Background Job with Polling)
  const handleGenerateComic = useCallback(async ({ pageCount, storyDescription, keepLayouts }) => {
    if (!project) return;
    
    // Store params for when job completes
    setPendingStoryDescription(storyDescription);
    setPendingKeepLayouts(keepLayouts);
    
    setIsGeneratingAI(true);
    setShowGenerateComicDialog(false);
    
    // Show progress overlay
    setGenerationProgress({
      stage: 'planning',
      message: 'Starting comic generation...',
      currentPage: 0,
      totalPages: pageCount,
      currentPanel: 0,
      totalPanels: 0,
      percent: 0
    });
    
    try {
      // Start the background job
      const response = await fetch('/api/generate-comic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyDescription,
          pageCount,
          keepLayouts,
          projectId: project.id,
          projectType: project.type,
          width: project.width,
          height: project.height,
          projectSettings: project.settings,
          existingPages: keepLayouts ? project.pages.map(p => ({
            id: p.id,
            order: p.order,
            orientation: p.orientation,
            grid: p.grid
          })) : []
        })
      });
      
      const data = await response.json();
      console.log('Generate Comic Response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start comic generation');
      }
      
      // Start polling for job updates
      if (data.jobId) {
        console.log(`📋 Started polling for job: ${data.jobId}`);
        startPolling(data.jobId);
      } else {
        throw new Error('No job ID returned from server');
      }
      
    } catch (error) {
      console.error('Failed to start comic generation:', error);
      setGenerationProgress({
        stage: 'error',
        message: error.message || 'Failed to start comic generation',
        currentPage: 0,
        totalPages: pageCount
      });
      setIsGeneratingAI(false);
    }
  }, [project, startPolling]);

  // Handle Generate Current Page (uses background job + polling)
  const handleGeneratePage = useCallback(async ({ pageDescription, keepLayout }) => {
    if (!project || !currentPage) return;
    
    setIsGeneratingAI(true);
    setGenerationType('page');
    setPendingPageDescription(pageDescription);
    
    setGenerationProgress({
      stage: 'preparing',
      message: 'Starting page generation...',
      currentPage: 1,
      totalPages: 1,
      currentPanel: 0,
      totalPanels: getCurrentPagePanels().length,
      percent: 0
    });
    
    try {
      const panels = getCurrentPagePanels();
      
      const response = await fetch('/api/generate-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Page info
          pageDescription,
          keepLayout,
          panelCount: panels.length,
          
          // Project info
          projectId: project.id,
          projectType: project.type,
          width: project.width,
          height: project.height,
          
          // Full project settings (characters, style, etc.)
          projectSettings: project.settings,
          
          // Current page details
          currentPage: {
            id: currentPage.id,
            order: currentPage.order,
            orientation: currentPage.orientation,
            grid: currentPage.grid
          },
          
          // Panel details for generation
          panels
        })
      });
      
      const data = await response.json();
      console.log('Generate Page Response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate page');
      }
      
      // API now returns jobId - start polling
      if (data.jobId) {
        console.log(`📋 Page generation job started: ${data.jobId}`);
        startPolling(data.jobId);
        // Job completion will be handled by the useEffect
      } else {
        throw new Error('No job ID returned from API');
      }
      
    } catch (error) {
      console.error('Failed to generate page:', error);
      setGenerationProgress({
        stage: 'error',
        message: error.message,
        currentPage: 0,
        totalPages: 1
      });
      setIsGeneratingAI(false);
    }
  }, [project, currentPage, getCurrentPagePanels, startPolling]);

  // Export handlers
  const handleExportPage = useCallback(async (format, dpi) => {
    if (!canvasRef.current) return;
    const pageElement = canvasRef.current.querySelector('[data-page-canvas]');
    if (pageElement) {
      await exportPageAsImage(pageElement, format, dpi, `${project.name}-page-${currentPage.order + 1}`);
    }
  }, [project, currentPage]);

  const handleExportProject = useCallback(async (dpi) => {
    // For simplicity, export current page as PDF
    // Full implementation would render all pages
    if (!canvasRef.current) return;
    const pageElement = canvasRef.current.querySelector('[data-page-canvas]');
    if (pageElement) {
      await exportProjectAsPDF([pageElement], project, dpi);
    }
  }, [project]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ink-50)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[var(--ink-400)]" style={{ fontFamily: 'var(--font-body)' }}>Loading project...</span>
        </div>
      </div>
    );
  }

  if (!project || !currentPage) {
    return (
      <div className="min-h-screen bg-[var(--ink-50)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--ink-500)] mb-4" style={{ fontFamily: 'var(--font-body)' }}>Project not found</p>
          <button 
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // Show story idea screen for new projects (choose path)
  if (showStoryIdeaScreen) {
    return (
      <StoryIdeaScreen
        project={project}
        onUseAI={handleAIGeneratedSettings}
        onManualSetup={handleManualSetup}
        onSkip={handleSetupSkip}
        initialMode={showStoryIdeaScreen === 'ai-input' ? 'ai-input' : 'choose'}
      />
    );
  }

  // Show setup wizard for new projects or when reviewing AI settings
  if (showSetupWizard) {
    return (
      <ProjectSetupWizard
        project={project}
        onComplete={handleSetupComplete}
        onSkip={handleSetupSkip}
        initialSettings={aiGeneratedSettings}
        onSwitchToAI={handleSwitchToAI}
        onBackToChoose={handleBackToChoose}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--ink-50)]">
      <EditorToolbar
        project={project}
        saveStatus={saveStatus}
        onExport={() => setShowExportDialog(true)}
        onBack={() => router.push('/')}
        gutterWidth={currentPage?.grid?.gutterWidth || 8}
        onGutterChange={handleGutterChange}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        pageCount={project.pages.length}
        onOpenProjectSettings={() => setShowProjectSettings(true)}
        onGenerateComic={() => setShowGenerateComicDialog(true)}
        onGeneratePage={() => setShowGeneratePageDialog(true)}
      />

      {/* Contextual Panel Toolbar - Always visible */}
      <PanelContextToolbar
        panel={selectedPanelInfo?.panel}
        grid={currentPage?.grid}
        onGridChange={handleGridChange}
        onAddImage={() => triggerPanelAction('addImage')}
        onAddText={() => triggerPanelAction('addText')}
        onAddSpeechBubble={() => triggerPanelAction('addSpeechBubble')}
        onOpenAIDialog={() => triggerPanelAction('openAIDialog')}
        onEditAIImage={() => triggerPanelAction('editAIImage')}
        onDeselect={() => { setSelectedPanelId(null); setSelectedLayerId(null); }}
        frameNumber={selectedPanelInfo?.frameNumber}
        selectedLayer={selectedLayerInfo}
        onLayerUpdate={handleLayerUpdate}
        onLayerDelete={handleLayerDelete}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <div ref={canvasRef} className="flex-1 overflow-hidden">
          <div data-page-canvas>
            <GridEditor
              grid={currentPage.grid}
              onGridChange={handleGridChange}
              selectedPanelId={selectedPanelId}
              onPanelSelect={setSelectedPanelId}
              selectedLayerId={selectedLayerId}
              onLayerSelect={setSelectedLayerId}
              pageWidth={project.width}
              pageHeight={project.height}
              projectType={project.type}
              pageOrientation={currentPage.orientation || 'portrait'}
              projectSettings={project.settings}
              panelActionTrigger={panelActionTrigger}
              onPanelActionProcessed={clearPanelAction}
            />
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <PageSidebar
            pages={project.pages}
            currentPageId={currentPageId}
            onPageSelect={setCurrentPageId}
            onPageAdd={handleAddPage}
            onPageDelete={handleDeletePage}
            onPageDuplicate={handleDuplicatePage}
            onPageReorder={handleReorderPages}
            onToggleOrientation={handleTogglePageOrientation}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {showSidebar && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowSidebar(false)}
            />
            <div className="absolute right-0 top-0 bottom-0 w-64 bg-[var(--paper-soft)] shadow-2xl animate-slide-left">
              <div className="flex items-center justify-between p-4 border-b border-[var(--ink-100)] bg-[var(--paper-white)]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span className="text-sm font-bold text-[var(--ink-700)]" style={{ fontFamily: 'var(--font-display)' }}>Pages</span>
                  <span className="text-xs font-medium text-[var(--ink-400)] bg-[var(--ink-50)] px-1.5 py-0.5 rounded-md">{project.pages.length}</span>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 hover:bg-[var(--ink-50)] rounded-lg text-[var(--ink-400)] hover:text-[var(--ink-700)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <PageSidebar
                pages={project.pages}
                currentPageId={currentPageId}
                onPageSelect={(id) => {
                  setCurrentPageId(id);
                  setShowSidebar(false);
                }}
                onPageAdd={handleAddPage}
                onPageDelete={handleDeletePage}
                onPageDuplicate={handleDuplicatePage}
                onPageReorder={handleReorderPages}
                onToggleOrientation={handleTogglePageOrientation}
                isMobile={true}
              />
            </div>
          </div>
        )}
      </div>

      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        project={project}
        currentPageId={currentPageId}
        onExportPage={handleExportPage}
        onExportProject={handleExportProject}
      />

      <ProjectSettingsDialog
        isOpen={showProjectSettings}
        onClose={() => setShowProjectSettings(false)}
        settings={project.settings}
        onSave={handleProjectSettingsSave}
      />

      {/* AI Generation Dialogs */}
      <GenerateComicDialog
        isOpen={showGenerateComicDialog}
        onClose={() => setShowGenerateComicDialog(false)}
        onGenerate={handleGenerateComic}
        currentPageCount={project.pages.length}
        projectSettings={project.settings}
        isGenerating={isGeneratingAI}
      />

      <GeneratePageDialog
        isOpen={showGeneratePageDialog}
        onClose={() => setShowGeneratePageDialog(false)}
        onGenerate={handleGeneratePage}
        panelCount={currentPagePanelCount}
        projectSettings={project.settings}
        isGenerating={isGeneratingAI}
      />

      {/* Generation Progress Overlay */}
      <GenerationProgressOverlay
        isVisible={!!generationProgress}
        progress={generationProgress}
        onCancel={() => {
          setGenerationProgress(null);
          resetJob();
        }}
      />
    </div>
  );
}
