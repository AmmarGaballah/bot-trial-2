import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { toast } from 'sonner';

export const useProjectStore = create(
  persist(
    (set, get) => ({
      currentProject: null,
      projects: [],
      isLoading: false,

      setCurrentProject: (project) => set({ currentProject: project }),
      setProjects: (projects) => set({ projects }),
      
      clearProject: () => set({ currentProject: null }),

      // Load projects from API
      loadProjects: async () => {
        try {
          set({ isLoading: true });
          const projects = await api.projects.list();
          set({ projects: projects || [] });
          
          // Set first project as current if none selected
          if (!get().currentProject && projects?.length > 0) {
            set({ currentProject: projects[0] });
          }
        } catch (error) {
          console.error('Failed to load projects:', error);
          toast.error('Failed to load projects');
        } finally {
          set({ isLoading: false });
        }
      },

      // Create new project
      createProject: async (projectData) => {
        try {
          set({ isLoading: true });
          const newProject = await api.projects.create(projectData);
          
          // Add to projects list and set as current
          const currentProjects = get().projects;
          const updatedProjects = [...currentProjects, newProject];
          
          set({ 
            projects: updatedProjects,
            currentProject: newProject 
          });
          
          toast.success('🎉 Project created successfully!');
          return { success: true, project: newProject };
        } catch (error) {
          console.error('Failed to create project:', error);
          toast.error(error.message || 'Failed to create project');
          return { success: false, error: error.message };
        } finally {
          set({ isLoading: false });
        }
      },

      // Update project
      updateProject: async (projectId, updateData) => {
        try {
          const updatedProject = await api.projects.update(projectId, updateData);
          
          // Update in projects list
          const currentProjects = get().projects;
          const updatedProjects = currentProjects.map(p => 
            p.id === projectId ? updatedProject : p
          );
          
          set({ projects: updatedProjects });
          
          // Update current project if it's the one being updated
          if (get().currentProject?.id === projectId) {
            set({ currentProject: updatedProject });
          }
          
          toast.success('Project updated successfully!');
          return { success: true };
        } catch (error) {
          console.error('Failed to update project:', error);
          toast.error(error.message || 'Failed to update project');
          return { success: false, error: error.message };
        }
      },
    }),
    {
      name: 'project-storage',
    }
  )
);
