import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useProjectStore = create(
  persist(
    (set) => ({
      currentProject: null,
      projects: [],

      setCurrentProject: (project) => set({ currentProject: project }),
      setProjects: (projects) => set({ projects }),
      
      clearProject: () => set({ currentProject: null }),
    }),
    {
      name: 'project-storage',
    }
  )
);
