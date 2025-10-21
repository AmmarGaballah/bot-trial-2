import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  Plug, 
  Bot, 
  ShoppingCart, 
  MessageSquare, 
  BarChart3,
  Settings,
  Sparkles,
  Package,
  GraduationCap,
  Hash,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useProjectStore } from '../store/projectStore';
import api from '../services/api';

const navigation = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Integrations', to: '/integrations', icon: Plug },
  { name: 'AI Assistant', to: '/assistant', icon: Bot },
  { name: 'Orders', to: '/orders', icon: ShoppingCart },
  { name: 'Inbox', to: '/inbox', icon: MessageSquare },
  { name: 'Products', to: '/products', icon: Package },
  { name: 'Bot Training', to: '/bot-training', icon: GraduationCap },
  { name: 'Social Media', to: '/social-media', icon: Hash },
  { name: 'Reports', to: '/reports', icon: BarChart3 },
  { name: 'Settings', to: '/settings', icon: Settings },
  { name: 'About', to: '/about', icon: Info },
];

export default function Sidebar() {
  const { currentProject } = useProjectStore();

  // Fetch AI usage stats
  const { data: messagesData } = useQuery({
    queryKey: ['ai-usage', currentProject?.id],
    queryFn: async () => {
      if (!currentProject) return null;
      const response = await api.get(`/messages/${currentProject.id}?limit=100`);
      return response.data;
    },
    enabled: !!currentProject,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Calculate AI automation rate
  const messages = messagesData?.messages || [];
  const totalMessages = messages.length;
  const aiGeneratedMessages = messages.filter(m => m.ai_generated).length;
  const aiUsagePercent = totalMessages > 0 
    ? Math.round((aiGeneratedMessages / totalMessages) * 100) 
    : 0;

  // Calculate tokens used (for display)
  const totalTokens = messages.reduce((sum, m) => 
    sum + (m.ai_prompt_tokens || 0) + (m.ai_completion_tokens || 0), 0
  );
  const tokensK = Math.round(totalTokens / 1000);

  return (
    <motion.aside 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 min-h-screen glass-card border-r border-white/10 p-6"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gradient">AI Sales</h1>
          <p className="text-xs text-gray-400">Commander</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {navigation.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-accent-500/20 text-accent-400 shadow-neon'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Bottom Section - AI Usage */}
      <div className="mt-auto pt-8">
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">AI Automation</span>
            <span className="text-xs text-accent-400">{aiUsagePercent}%</span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${aiUsagePercent}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-accent-500 to-purple-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {aiGeneratedMessages} of {totalMessages} messages AI-generated
          </p>
          {tokensK > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {tokensK}K tokens used
            </p>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
