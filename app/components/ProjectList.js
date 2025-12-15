'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Book, Film, Layout, FileText, Trash2, Clock, Sparkles, ChevronRight, Layers } from 'lucide-react';
import { listProjects, deleteProject } from '../lib/storage';
import ConfirmDialog from './ConfirmDialog';

const PROJECT_TYPE_CONFIG = {
  'comic': { 
    icon: Book, 
    label: 'Comic',
    gradient: 'gradient-comic',
    color: 'text-orange-500'
  },
  'manga': { 
    icon: Book, 
    label: 'Manga',
    gradient: 'gradient-manga',
    color: 'text-teal-500'
  },
  'storyboard': { 
    icon: Film, 
    label: 'Storyboard',
    gradient: 'gradient-storyboard',
    color: 'text-violet-500'
  },
  'graphic-novel': { 
    icon: FileText, 
    label: 'Graphic Novel',
    gradient: 'gradient-webtoon',
    color: 'text-pink-500'
  }
};

export default function ProjectList({ onCreateNew }) {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    const loadProjects = async () => {
      const projectList = await listProjects();
      setProjects(projectList);
    };
    loadProjects();
  }, []);

  const handleDelete = (project) => {
    setDeleteConfirm(project);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteProject(deleteConfirm.id);
      const projectList = await listProjects();
      setProjects(projectList);
      setDeleteConfirm(null);
    }
  };

  const handleOpen = (projectId) => {
    router.push(`/project/${projectId}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-24 px-4 animate-fade-in">
        <div className="relative mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[var(--paper-soft)] rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 border-dashed border-[var(--ink-200)]">
            <Layers className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--ink-300)]" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg animate-float" style={{ background: 'var(--accent-primary-gradient)' }}>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-[var(--ink-800)] mb-2 text-center" style={{ fontFamily: 'var(--font-display)' }}>
          No projects yet
        </h3>
        <p className="text-[var(--ink-400)] mb-6 sm:mb-8 text-center max-w-md text-base sm:text-lg px-4">
          Start creating your first visual narrative — comics, manga, storyboards, and more
        </p>
        <button
          onClick={onCreateNew}
          className="btn-primary flex items-center gap-2 text-sm sm:text-base"
        >
          Create Your First Project
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {projects.map((project, index) => {
          const config = PROJECT_TYPE_CONFIG[project.type] || PROJECT_TYPE_CONFIG['comic'];
          const TypeIcon = config.icon;
          
          return (
            <div
              key={project.id}
              className="group relative bg-[var(--paper-white)] rounded-xl sm:rounded-2xl border border-[var(--ink-100)] p-4 sm:p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:border-[var(--ink-200)] hover:-translate-y-1 animate-slide-up overflow-hidden"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleOpen(project.id)}
            >
              {/* Top gradient bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${config.gradient}`} />
              
              <div className="flex items-start justify-between mb-3 sm:mb-5">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${config.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <TypeIcon className="w-5 h-5 sm:w-7 sm:h-7 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 
                      className="font-bold text-base sm:text-lg text-[var(--ink-800)] group-hover:text-[var(--ink-900)] transition-colors mb-0.5 sm:mb-1 truncate"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {project.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${config.color}`} style={{ fontFamily: 'var(--font-display)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {config.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project);
                  }}
                  className="p-2 sm:p-2.5 text-[var(--ink-300)] hover:text-red-500 hover:bg-red-50 rounded-lg sm:rounded-xl transition-all sm:opacity-0 sm:group-hover:opacity-100"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[var(--ink-400)]">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="truncate">{formatDate(project.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm font-medium text-[var(--ink-400)] group-hover:text-[var(--accent-primary)] transition-colors">
                  <span>Open</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </>
  );
}
