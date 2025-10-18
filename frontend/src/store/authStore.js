import { create } from 'zustand';
import { auth, projects } from '../services/api';
import { useProjectStore } from './projectStore';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Load projects and set default
  loadProjects: async () => {
    try {
      const response = await projects.list();
      const projectsList = response.data || response || [];
      
      const projectStore = useProjectStore.getState();
      projectStore.setProjects(projectsList);
      
      // Set first project as current if none selected
      if (projectsList.length > 0 && !projectStore.currentProject) {
        projectStore.setCurrentProject(projectsList[0]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  },

  // Initialize auth from localStorage
  initialize: async () => {
    const token = localStorage.getItem('access_token');
    
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const user = await auth.me();
      set({ user, isAuthenticated: true, isLoading: false });
      
      // Load projects after auth
      await get().loadProjects();
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Login
  login: async (email, password) => {
    try {
      const response = await auth.login(email, password);
      const { access_token, refresh_token } = response;
      
      localStorage.setItem('access_token', access_token);
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }
      
      const user = await auth.me();
      set({ user, isAuthenticated: true });
      
      // Load projects after login
      await get().loadProjects();
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  },

  // Register
  register: async (email, password, name) => {
    try {
      await auth.register({ email, password, name });
      
      // Auto-login after registration
      return await get().login(email, password);
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  },

  // Logout
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await auth.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false });
    }
  },
}));
