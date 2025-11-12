import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Search, ChevronDown, LogOut, Check, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import api from '../services/api';

export default function Header() {
  const { user, logout } = useAuthStore();
  const { currentProject, setCurrentProject } = useProjectStore();
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const queryClient = useQueryClient();

  // Fetch all projects
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      return await api.projects.list();
    },
  });

  const projects = projectsData || [];

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (name) => {
      return await api.projects.create({ name, description: '', timezone: 'UTC' });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['projects']);
      setCurrentProject(data);
      setShowCreateModal(false);
      setNewProjectName('');
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create project');
    },
  });

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      createProjectMutation.mutate(newProjectName.trim());
    }
  };

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-card border-b border-white/10 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders, messages, customers..."
              className="input-glass w-full pl-12"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Project Selector */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowProjectMenu(!showProjectMenu)}
              className="glass-card px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/10 transition-colors"
            >
              <div className={`w-2 h-2 rounded-full ${currentProject ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">
                {currentProject ? currentProject.name : 'Select Project'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showProjectMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-64 glass-card rounded-xl p-2 z-50 border border-white/10"
                >
                  {projects.map((project) => (
                    <motion.button
                      key={project.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        setCurrentProject(project);
                        setShowProjectMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-2 rounded-lg hover:bg-white/10 transition-colors ${
                        currentProject?.id === project.id ? 'bg-accent-500/20' : ''
                      }`}
                    >
                      <span className="text-sm font-medium">{project.name}</span>
                      {currentProject?.id === project.id && (
                        <Check className="w-4 h-4 text-accent-400" />
                      )}
                    </motion.button>
                  ))}
                  
                  {/* Create New Project Button */}
                  {projects.length > 0 && <div className="border-t border-white/10 my-2" />}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => {
                      setShowCreateModal(true);
                      setShowProjectMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-500/20 hover:bg-accent-500/30 transition-colors text-accent-400"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Create New Project</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative glass-card p-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 rounded-full text-xs flex items-center justify-center">
              3
            </span>
          </motion.button>

          {/* User Menu */}
          <div className="flex items-center gap-3 glass-card px-4 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center">
              <span className="text-sm font-semibold text-white">
                {user?.name?.charAt(0) || user?.email?.charAt(0)}
              </span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={logout}
              className="ml-2 text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-8 max-w-md w-full rounded-2xl border border-white/10"
            >
              <h2 className="text-2xl font-bold mb-4">Create New Project</h2>
              <form onSubmit={handleCreateProject}>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="My Awesome Store"
                    required
                    className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 glass-card px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProjectMutation.isLoading || !newProjectName.trim()}
                    className="flex-1 btn-neon disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createProjectMutation.isLoading ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
