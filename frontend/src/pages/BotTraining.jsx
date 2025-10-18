import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  GraduationCap, Plus, Edit2, Trash2, Search, 
  X, AlertCircle, BookOpen, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { useProjectStore } from '../store/projectStore';

export default function BotTraining() {
  const queryClient = useQueryClient();
  const { currentProject } = useProjectStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInstruction, setEditingInstruction] = useState(null);

  // Fetch instructions
  const { data: instructionsData, isLoading } = useQuery({
    queryKey: ['bot-instructions', currentProject?.id],
    queryFn: async () => {
      const response = await api.get(`/bot-training/${currentProject.id}/instructions`);
      return response.data;
    },
    enabled: !!currentProject,
  });

  const instructions = instructionsData?.instructions || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => api.post(`/bot-training/${currentProject.id}/instructions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bot-instructions']);
      toast.success('Instruction added successfully!');
      setShowAddModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to create instruction');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => 
      api.put(`/bot-training/${currentProject.id}/instructions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bot-instructions']);
      toast.success('Instruction updated successfully!');
      setEditingInstruction(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update instruction');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => 
      api.delete(`/bot-training/${currentProject.id}/instructions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['bot-instructions']);
      toast.success('Instruction deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to delete instruction');
    },
  });

  const filteredInstructions = instructions.filter(inst =>
    inst.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inst.instruction.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Project Selected</h2>
          <p className="text-gray-400">Please select a project to train the AI bot</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Bot Training</h1>
          <p className="text-gray-400">Train your AI assistant with custom instructions</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          className="btn-neon flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Instruction
        </motion.button>
      </div>

      {/* Info Card */}
      <div className="glass-card p-6 rounded-xl mb-6 border border-purple-500/30">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">How Bot Training Works</h3>
            <p className="text-gray-400 text-sm mb-3">
              Add custom instructions to teach your AI bot how to respond. Higher priority instructions are followed first.
              The bot will use these rules when responding to customers on social media and in the assistant.
            </p>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Instructions:</span>
                <span className="text-white font-semibold ml-2">{instructions.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Active:</span>
                <span className="text-green-400 font-semibold ml-2">
                  {instructions.filter(i => i.is_active).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4 rounded-xl mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search instructions..."
            className="w-full bg-dark-800/50 rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Instructions List */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Loading instructions...</p>
        </div>
      ) : filteredInstructions.length === 0 ? (
        <div className="text-center py-20">
          <GraduationCap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Instructions Yet</h3>
          <p className="text-gray-400 mb-6">
            {searchTerm ? 'No instructions match your search' : 'Add instructions to train your AI bot'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-neon"
            >
              Add Your First Instruction
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredInstructions.map((instruction) => (
            <InstructionCard
              key={instruction.id}
              instruction={instruction}
              onEdit={() => setEditingInstruction(instruction)}
              onDelete={() => {
                if (confirm('Are you sure you want to delete this instruction?')) {
                  deleteMutation.mutate(instruction.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <InstructionModal
        show={showAddModal || editingInstruction}
        instruction={editingInstruction}
        onClose={() => {
          setShowAddModal(false);
          setEditingInstruction(null);
        }}
        onSave={(data) => {
          if (editingInstruction) {
            updateMutation.mutate({ id: editingInstruction.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
      />
    </div>
  );
}

function InstructionCard({ instruction, onEdit, onDelete }) {
  const categoryColors = {
    tone: 'from-blue-500 to-cyan-600',
    product_knowledge: 'from-green-500 to-emerald-600',
    response_style: 'from-purple-500 to-pink-600',
    promotions: 'from-yellow-500 to-orange-600',
    service: 'from-red-500 to-pink-600',
  };

  const categoryColor = categoryColors[instruction.category] || 'from-gray-500 to-gray-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-xl hover:bg-white/5 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold">{instruction.title}</h3>
            {instruction.category && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${categoryColor} text-white`}>
                {instruction.category}
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
              Priority: {instruction.priority}
            </span>
          </div>
          <p className="text-gray-400 text-sm">{instruction.instruction}</p>
        </div>
        <div className={`ml-4 w-12 h-12 rounded-lg flex items-center justify-center ${
          instruction.is_active ? 'bg-green-500/20' : 'bg-gray-500/20'
        }`}>
          {instruction.is_active ? (
            <span className="text-green-400 text-xs font-bold">ON</span>
          ) : (
            <span className="text-gray-400 text-xs font-bold">OFF</span>
          )}
        </div>
      </div>

      {instruction.active_for_platforms && instruction.active_for_platforms.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs text-gray-500">Platforms:</span>
          {instruction.active_for_platforms.map((platform, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-xs"
            >
              {platform}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onEdit}
          className="flex-1 glass-card px-4 py-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onDelete}
          className="glass-card px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </motion.button>
      </div>
    </motion.div>
  );
}

function InstructionModal({ show, instruction, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    instruction: '',
    category: '',
    priority: 5,
    active_for_platforms: '',
    is_active: true,
  });

  useState(() => {
    if (instruction) {
      setFormData({
        title: instruction.title || '',
        instruction: instruction.instruction || '',
        category: instruction.category || '',
        priority: instruction.priority || 5,
        active_for_platforms: (instruction.active_for_platforms || []).join(', '),
        is_active: instruction.is_active !== false,
      });
    }
  }, [instruction]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      priority: parseInt(formData.priority) || 0,
      active_for_platforms: formData.active_for_platforms
        .split(',')
        .map(p => p.trim())
        .filter(Boolean),
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 max-w-2xl w-full rounded-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {instruction ? 'Edit Instruction' : 'Add New Instruction'}
          </h2>
          <button onClick={onClose} className="glass-card p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Be Friendly and Professional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Instruction *</label>
            <textarea
              value={formData.instruction}
              onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
              required
              rows={4}
              className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Always respond in a friendly, professional manner. Use emojis when appropriate..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select category</option>
                <option value="tone">Tone</option>
                <option value="product_knowledge">Product Knowledge</option>
                <option value="response_style">Response Style</option>
                <option value="promotions">Promotions</option>
                <option value="service">Service</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Priority (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Higher = more important</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Active for Platforms (optional, comma-separated)
            </label>
            <input
              type="text"
              value={formData.active_for_platforms}
              onChange={(e) => setFormData({ ...formData, active_for_platforms: e.target.value })}
              className="w-full bg-dark-800/50 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="instagram, facebook, tiktok (leave empty for all)"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 rounded bg-dark-800"
              />
              <span className="text-sm font-medium">Active</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 glass-card px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-neon"
            >
              {instruction ? 'Update Instruction' : 'Create Instruction'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
