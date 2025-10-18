import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Zap, Code, TrendingUp, Package, MessageCircle, BarChart3 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import GlassCard from '../components/GlassCard';
import { assistant as assistantApi, messages as messagesApi, orders } from '../services/api';
import { useProjectStore } from '../store/projectStore';
import { generateContextualSuggestions, getInitialGreeting } from '../services/botInstructions';

export default function Assistant() {
  const { currentProject } = useProjectStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [businessContext, setBusinessContext] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Fetch business context
  const { data: messageStats } = useQuery({
    queryKey: ['messageStats', currentProject?.id],
    queryFn: () => messagesApi.getStats(currentProject?.id),
    enabled: !!currentProject,
    staleTime: 60000,
  });

  // Build context for AI and set initial message
  useEffect(() => {
    if (currentProject && messageStats) {
      const context = {
        project_name: currentProject.name,
        total_messages: messageStats?.data?.total_count || 0,
        unread_messages: messageStats?.data?.unread_count || 0,
      };
      setBusinessContext(context);
      
      // Set initial greeting with context if messages is empty
      if (messages.length === 0) {
        setMessages([{
          id: 1,
          role: 'assistant',
          content: getInitialGreeting(context),
          timestamp: new Date(),
          suggestions: generateContextualSuggestions([], context),
        }]);
      }
    }
  }, [currentProject, messageStats]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // Query mutation
  const queryMutation = useMutation({
    mutationFn: (query) => {
      // Build conversation history for context
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp?.toISOString()
      }));
      
      return assistantApi.query({
        project_id: currentProject?.id,
        message: query,
        use_function_calling: true,
        context: {
          conversation_history: conversationHistory,
          project_name: currentProject?.name,
          total_messages: businessContext?.total_messages || 0,
          unread_messages: businessContext?.unread_messages || 0
        }
      });
    },
    onSuccess: (response) => {
      const assistantMessage = {
        id: Date.now(),
        role: 'assistant',
        content: response.reply || response.data?.reply || 'No response',
        function_calls: response.function_calls || response.data?.function_calls,
        tokens: response.tokens_used || response.data?.tokens_used,
        cost: response.cost || response.data?.cost,
        timestamp: new Date(),
        suggestions: generateContextualSuggestions(messages, businessContext),
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
    onError: (error) => {
      console.error('Assistant query failed:', error);
      const errorMessage = {
        id: Date.now(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    },
  });

  const handleSend = () => {
    if (!input.trim() || !currentProject) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    // Query assistant
    queryMutation.mutate(input);
    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action) => {
    setInput(action);
    // Auto-send the quick action
    setTimeout(() => {
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: action,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      queryMutation.mutate(action);
      setInput('');
    }, 100);
  };

  // Suggested actions
  const suggestedActions = [
    { icon: TrendingUp, text: 'Show me today\'s sales performance', color: 'from-green-500 to-emerald-600' },
    { icon: Package, text: 'List recent orders', color: 'from-blue-500 to-cyan-600' },
    { icon: MessageCircle, text: 'Summarize unread messages', color: 'from-purple-500 to-pink-600' },
    { icon: BarChart3, text: 'Generate weekly report', color: 'from-orange-500 to-red-600' },
  ];

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-4 sm:gap-6">
      {/* Chat Area - 50% of screen */}
      <div className="flex-1 lg:w-[50%] flex flex-col min-h-0">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-3xl font-bold text-gradient mb-2">AI Assistant</h1>
          <p className="text-gray-400">Powered by Gemini 2.0 Flash • FREE • Context-Aware</p>
        </motion.div>

        {/* Quick Actions */}
        {messages.length <= 1 && !queryMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3 mb-4"
          >
            {suggestedActions.map((action, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickAction(action.text)}
                className="glass-card p-4 text-left rounded-xl hover:border-accent-500/50 transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-medium leading-tight">{action.text}</p>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Messages Container - Bigger */}
        <GlassCard ref={chatContainerRef} className="flex-1 p-4 sm:p-6 overflow-y-auto mb-4 space-y-4 max-h-[70vh] sm:max-h-[75vh]">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, x: message.role === 'user' ? 50 : -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-600' 
                    : 'bg-gradient-to-br from-accent-500 to-purple-600'
                }`}>
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-2xl ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block p-4 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-500/30'
                      : 'glass-card'
                  }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Dynamic Suggested Actions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Suggested Actions:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {message.suggestions.map((suggestion, idx) => {
                            // Map icon names to components
                            const iconMap = {
                              'TrendingUp': TrendingUp,
                              'Package': Package,
                              'MessageCircle': MessageCircle,
                              'BarChart3': BarChart3,
                              'User': User,
                            };
                            const IconComponent = iconMap[suggestion.icon] || Sparkles;
                            
                            return (
                              <motion.button
                                key={idx}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleQuickAction(suggestion.text)}
                                className="glass-card p-3 rounded-lg text-left hover:border-accent-500/50 transition-all group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${suggestion.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                    <IconComponent className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-xs font-medium leading-tight">{suggestion.text}</span>
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    {message.tokens && (
                      <p className="text-xs text-gray-500 mt-2">
                        {message.tokens} tokens • ${message.cost?.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading */}
          {queryMutation.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="glass-card p-4 rounded-2xl">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-accent-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-accent-400 rounded-full animate-bounce animation-delay-200" />
                  <div className="w-2 h-2 bg-accent-400 rounded-full animate-bounce animation-delay-400" />
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </GlassCard>

        {/* Input Area */}
        <GlassCard className="p-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about orders, customers, or sales..."
              className="flex-1 input-glass resize-none"
              rows="2"
              disabled={queryMutation.isPending || !currentProject}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!input.trim() || queryMutation.isPending || !currentProject}
              className="btn-neon self-end disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          </div>
        </GlassCard>
      </div>

      {/* Sidebar - Takes remaining 50% on desktop */}
      <div className="hidden lg:flex lg:w-[50%] flex-col space-y-4 overflow-y-auto">
        {/* Model Info */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-400" />
            AI Model
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-400">Model</p>
              <p className="font-medium">Gemini 2.0 Flash</p>
              <span className="text-xs text-green-400">FREE • Fast</span>
            </div>
            <div>
              <p className="text-gray-400">Temperature</p>
              <p className="font-medium">0.7</p>
            </div>
            <div>
              <p className="text-gray-400">Max Tokens</p>
              <p className="font-medium">8,192</p>
            </div>
            <div>
              <p className="text-gray-400">Context Awareness</p>
              <p className="font-medium text-green-400">Enabled</p>
            </div>
          </div>
        </GlassCard>

        {/* Business Context */}
        {businessContext && (
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent-400" />
              Business Overview
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-400">Project</p>
                <p className="font-medium">{businessContext.project_name}</p>
              </div>
              <div>
                <p className="text-gray-400">Total Messages</p>
                <p className="font-medium">{businessContext.total_messages}</p>
              </div>
              {businessContext.unread_messages > 0 && (
                <div>
                  <p className="text-gray-400">Unread Messages</p>
                  <p className="font-medium text-orange-400">{businessContext.unread_messages}</p>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Available Functions */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">AI Capabilities</h3>
          <div className="space-y-2">
            {[
              'Analyze Sales Data',
              'Manage Orders',
              'Respond to Customers',
              'Generate Reports',
              'Schedule Follow-ups',
            ].map((action, index) => (
              <motion.div
                key={action}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="w-1.5 h-1.5 bg-accent-400 rounded-full" />
                <span className="text-sm">{action}</span>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        {/* Usage Stats */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Today's Usage</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Requests</span>
                <span className="text-sm font-medium">24 / 100</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '24%' }}
                  className="h-full bg-gradient-to-r from-accent-500 to-purple-500"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Tokens</span>
                <span className="text-sm font-medium">1.2K / 10K</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '12%' }}
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
