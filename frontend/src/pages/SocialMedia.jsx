import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Hash, MessageSquare, Send, Sparkles, Filter, 
  Instagram, Facebook, AlertCircle, ThumbsUp, ThumbsDown,
  Clock, CheckCircle, XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import { useProjectStore } from '../store/projectStore';

export default function SocialMedia() {
  const queryClient = useQueryClient();
  const { currentProject } = useProjectStore();
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [generatingFor, setGeneratingFor] = useState(null);

  // Fetch comments
  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['social-comments', currentProject?.id, platformFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (platformFilter !== 'all') params.append('platform', platformFilter);
      if (statusFilter !== 'all') params.append('responded', statusFilter === 'responded');
      
      const response = await api.get(`/social-media/${currentProject.id}/comments?${params}`);
      return response.data;
    },
    enabled: !!currentProject,
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['social-stats', currentProject?.id],
    queryFn: async () => {
      const response = await api.get(`/social-media/${currentProject.id}/stats`);
      return response.data;
    },
    enabled: !!currentProject,
  });

  const comments = commentsData?.comments || [];
  const stats = statsData || {};

  // Generate response mutation
  const generateMutation = useMutation({
    mutationFn: async (commentId) => {
      setGeneratingFor(commentId);
      const response = await api.post(
        `/social-media/${currentProject.id}/comments/${commentId}/generate-response`,
        {}
      );
      return { commentId, response: response.data };
    },
    onSuccess: (data) => {
      toast.success('Response generated!');
      setGeneratingFor(null);
      // Show the generated response
      const response = data.response.generated_response;
      if (confirm(`Generated Response:\n\n${response}\n\nSend this response?`)) {
        sendMutation.mutate({ commentId: data.commentId, text: response });
      }
    },
    onError: (error) => {
      setGeneratingFor(null);
      toast.error(error.response?.data?.detail || 'Failed to generate response');
    },
  });

  // Send response mutation
  const sendMutation = useMutation({
    mutationFn: ({ commentId, text }) => 
      api.post(`/social-media/${currentProject.id}/comments/${commentId}/send-response`, { response_text: text }),
    onSuccess: () => {
      queryClient.invalidateQueries(['social-comments']);
      queryClient.invalidateQueries(['social-stats']);
      toast.success('Response sent successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to send response');
    },
  });

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Project Selected</h2>
          <p className="text-gray-400">Please select a project to manage social media</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Social Media</h1>
          <p className="text-gray-400">AI-powered comment responses</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Comments"
          value={stats.total_comments || 0}
          icon={MessageSquare}
          color="from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Pending"
          value={stats.pending_responses || 0}
          icon={Clock}
          color="from-yellow-500 to-orange-600"
        />
        <StatCard
          title="Responded"
          value={stats.responded || 0}
          icon={CheckCircle}
          color="from-green-500 to-emerald-600"
        />
        <StatCard
          title="Response Rate"
          value={`${stats.response_rate || 0}%`}
          icon={Sparkles}
          color="from-purple-500 to-pink-600"
        />
      </div>

      {/* Filters */}
      <div className="glass-card p-4 rounded-xl mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Platform</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full bg-dark-800/50 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-dark-800/50 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="responded">Responded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-400">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-20">
          <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Comments Yet</h3>
          <p className="text-gray-400">
            Comments from social media will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onGenerateResponse={() => generateMutation.mutate(comment.id)}
              isGenerating={generatingFor === comment.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold mb-1">{value}</p>
        <p className="text-sm text-gray-400">{title}</p>
      </div>
    </motion.div>
  );
}

function CommentCard({ comment, onGenerateResponse, isGenerating }) {
  const platformIcons = {
    instagram: Instagram,
    facebook: Facebook,
    tiktok: Hash,
  };

  const platformColors = {
    instagram: 'from-pink-500 to-purple-600',
    facebook: 'from-blue-500 to-blue-600',
    tiktok: 'from-cyan-500 to-blue-600',
  };

  const sentimentIcons = {
    positive: ThumbsUp,
    negative: ThumbsDown,
    neutral: MessageSquare,
  };

  const PlatformIcon = platformIcons[comment.platform] || Hash;
  const SentimentIcon = sentimentIcons[comment.sentiment] || MessageSquare;
  const platformColor = platformColors[comment.platform] || 'from-gray-500 to-gray-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 rounded-xl"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platformColor} flex items-center justify-center`}>
            <PlatformIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold">{comment.author_username || 'Anonymous'}</p>
            <p className="text-sm text-gray-400">{comment.platform}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {comment.sentiment && (
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              comment.sentiment === 'positive' ? 'bg-green-500/20 text-green-400' :
              comment.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              <SentimentIcon className="w-3 h-3 inline mr-1" />
              {comment.sentiment}
            </div>
          )}
          {comment.responded ? (
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Responded
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
              <Clock className="w-3 h-3 inline mr-1" />
              Pending
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-gray-300">{comment.content}</p>
        {comment.intent && (
          <p className="text-sm text-gray-500 mt-2">Intent: {comment.intent}</p>
        )}
      </div>

      {comment.responded && comment.response_content && (
        <div className="glass-card p-4 rounded-lg mb-4 border border-green-500/30">
          <p className="text-sm text-gray-400 mb-2">Response:</p>
          <p className="text-green-400">{comment.response_content}</p>
          {comment.response_sent_at && (
            <p className="text-xs text-gray-500 mt-2">
              Sent: {new Date(comment.response_sent_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {!comment.responded && (
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onGenerateResponse}
            disabled={isGenerating}
            className="flex-1 btn-neon flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="loading-spinner w-4 h-4"></div>
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate AI Response
              </>
            )}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
