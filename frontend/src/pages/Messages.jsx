import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Search,
  Filter,
  ChevronDown,
  Sparkles,
  Instagram,
  Facebook,
  Phone,
  MessageCircle,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { messages as messagesApi } from '../services/api';
import { useProjectStore } from '../store/projectStore';
import { formatDateTime } from '../utils/helpers';

const CHANNEL_ICONS = {
  whatsapp: MessageCircle,
  telegram: Send,
  instagram: Instagram,
  facebook: Facebook,
  sms: Phone,
  email: MessageSquare
};

const CHANNEL_COLORS = {
  whatsapp: 'text-green-400',
  telegram: 'text-blue-400',
  instagram: 'text-pink-400',
  facebook: 'text-indigo-400',
  sms: 'text-purple-400',
  email: 'text-gray-400'
};

export default function Messages() {
  const { currentProject } = useProjectStore();
  const queryClient = useQueryClient();
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [showAIOptions, setShowAIOptions] = useState(false);

  // Fetch conversations
  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', currentProject?.id, channelFilter],
    queryFn: () => messagesApi.getConversations(currentProject?.id, { channel: channelFilter }),
    enabled: !!currentProject,
  });

  // Fetch messages for selected conversation
  const { data: conversationMessages } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: () => messagesApi.getMessages(selectedConversation?.id),
    enabled: !!selectedConversation,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data) => messagesApi.send(selectedConversation?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedConversation?.id]);
      setMessageInput('');
    },
  });

  // AI auto-reply mutation
  const aiReplyMutation = useMutation({
    mutationFn: (conversationId) => messagesApi.generateAIReply(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages', selectedConversation?.id]);
    },
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    sendMessageMutation.mutate({
      content: messageInput,
      channel: selectedConversation.channel
    });
  };

  const handleAIReply = () => {
    if (!selectedConversation) return;
    aiReplyMutation.mutate(selectedConversation.id);
  };

  const filteredConversations = conversations?.filter(conv => 
    searchQuery === '' || 
    conv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.customer_email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-2 flex items-center gap-3">
            <MessageSquare className="w-10 h-10 text-purple-400" />
            Messages
          </h1>
          <p className="text-slate-400">Unified inbox with AI-powered responses</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Conversations List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1"
          >
            <GlassCard className="h-full flex flex-col">
              {/* Search and Filter */}
              <div className="p-4 border-b border-white/5">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  />
                </div>

                {/* Channel Filter */}
                <div className="flex flex-wrap gap-2">
                  {['all', 'whatsapp', 'telegram', 'instagram', 'facebook'].map((channel) => {
                    const IconComponent = CHANNEL_ICONS[channel] || MessageSquare;
                    const isActive = channelFilter === channel;
                    
                    return (
                      <motion.button
                        key={channel}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setChannelFilter(channel)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                        {channel === 'all' ? 'All' : channel.charAt(0).toUpperCase() + channel.slice(1)}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Conversations */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
                    <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-center">No conversations found</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredConversations.map((conv) => {
                      const ChannelIcon = CHANNEL_ICONS[conv.channel] || MessageSquare;
                      const channelColor = CHANNEL_COLORS[conv.channel] || 'text-gray-400';
                      const isActive = selectedConversation?.id === conv.id;

                      return (
                        <motion.div
                          key={conv.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => setSelectedConversation(conv)}
                          className={`p-4 border-b border-white/5 cursor-pointer transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-l-4 border-l-purple-500'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                {conv.customer_name?.charAt(0) || 'U'}
                              </div>
                              <ChannelIcon className={`absolute -bottom-1 -right-1 w-5 h-5 ${channelColor} bg-slate-900 rounded-full p-0.5`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium text-white truncate">{conv.customer_name || 'Unknown'}</h3>
                                <span className="text-xs text-slate-400">{formatDateTime(conv.last_message_at, 'relative')}</span>
                              </div>
                              <p className="text-sm text-slate-400 truncate mb-1">{conv.last_message}</p>
                              <div className="flex items-center justify-between">
                                {conv.unread_count > 0 && (
                                  <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                                    {conv.unread_count}
                                  </span>
                                )}
                                {conv.ai_enabled && (
                                  <span className="flex items-center gap-1 text-xs text-purple-400">
                                    <Bot className="w-3 h-3" />
                                    AI Active
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Chat Window */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <GlassCard className="h-full flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {selectedConversation.customer_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h2 className="font-semibold text-white">{selectedConversation.customer_name}</h2>
                          <p className="text-xs text-slate-400">{selectedConversation.customer_email}</p>
                        </div>
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAIReply}
                        disabled={aiReplyMutation.isLoading}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
                      >
                        {aiReplyMutation.isLoading ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            AI Reply
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <AnimatePresence>
                      {conversationMessages?.map((msg, index) => {
                        const isOutbound = msg.direction === 'outbound';
                        const isAI = msg.ai_generated;

                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[70%] ${isOutbound ? 'order-2' : 'order-1'}`}>
                              {!isOutbound && (
                                <div className="flex items-center gap-2 mb-1 ml-2">
                                  <User className="w-4 h-4 text-slate-400" />
                                  <span className="text-xs text-slate-400">{selectedConversation.customer_name}</span>
                                </div>
                              )}
                              
                              <div
                                className={`p-4 rounded-2xl backdrop-blur-xl ${
                                  isOutbound
                                    ? isAI
                                      ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 border border-purple-500/50'
                                      : 'bg-blue-500/20 border border-blue-500/30'
                                    : 'bg-white/5 border border-white/10'
                                }`}
                              >
                                <p className="text-white break-words">{msg.content}</p>
                              </div>
                              
                              <div className={`flex items-center gap-2 mt-1 ${isOutbound ? 'justify-end mr-2' : 'ml-2'}`}>
                                {isAI && isOutbound && (
                                  <span className="flex items-center gap-1 text-xs text-purple-400">
                                    <Bot className="w-3 h-3" />
                                    AI
                                  </span>
                                )}
                                <span className="text-xs text-slate-400">{formatDateTime(msg.created_at, 'time')}</span>
                                {isOutbound && msg.status === 'sent' && <CheckCheck className="w-3 h-3 text-blue-400" />}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-xl">
                    <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                      <div className="flex-1 relative">
                        <textarea
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Type your message..."
                          rows={1}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage(e);
                            }
                          }}
                        />
                      </div>
                      
                      <motion.button
                        type="submit"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={!messageInput.trim() || sendMessageMutation.isLoading}
                        className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendMessageMutation.isLoading ? (
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </motion.button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare className="w-24 h-24 mb-4 opacity-20" />
                  <h3 className="text-xl font-medium mb-2">No conversation selected</h3>
                  <p className="text-center">Select a conversation from the list to start messaging</p>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
