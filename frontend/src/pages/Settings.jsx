import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Lock,
  Palette,
  Globe,
  Save,
  Check,
  Sparkles,
  Shield,
  Key,
  Mail,
  FolderKanban,
  Plus,
  Trash2,
  Edit2,
  X,
  MessageSquare,
  MessageCircle,
  ShoppingBag,
  Instagram,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import GlassCard from '../components/GlassCard';
import { useProjectStore } from '../store/projectStore';
import api from '../services/api';

export default function Settings() {
  const { currentProject } = useProjectStore();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    projectName: currentProject?.name || '',
    timezone: currentProject?.timezone || 'UTC',
    aiEnabled: true,
    notificationsEnabled: true,
    emailNotifications: true,
    theme: 'dark'
  });

  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => api.projects.update(currentProject?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: settings.projectName,
      timezone: settings.timezone,
      settings: {
        ai_enabled: settings.aiEnabled,
        notifications_enabled: settings.notificationsEnabled,
        email_notifications: settings.emailNotifications,
        theme: settings.theme
      }
    });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'ai', label: 'AI Settings', icon: Sparkles },
    { id: 'integrations', label: 'Integrations', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 mb-2 flex items-center gap-3">
            <SettingsIcon className="w-10 h-10 text-purple-400" />
            Settings
          </h1>
          <p className="text-slate-400">Manage your project preferences and configurations</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard className="p-4">
              <div className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full px-4 py-3 rounded-lg text-left flex items-center gap-3 transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white ring-1 ring-purple-500/50'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </motion.button>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3"
          >
            <GlassCard className="p-6">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-4">General Settings</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={settings.projectName}
                      onChange={(e) => setSettings({ ...settings, projectName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Theme
                    </label>
                    <div className="flex gap-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSettings({ ...settings, theme: 'dark' })}
                        className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                          settings.theme === 'dark'
                            ? 'bg-purple-500/20 ring-2 ring-purple-500/50 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <Palette className="w-5 h-5" />
                        Dark
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSettings({ ...settings, theme: 'light' })}
                        className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
                          settings.theme === 'light'
                            ? 'bg-purple-500/20 ring-2 ring-purple-500/50 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <Palette className="w-5 h-5" />
                        Light
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    AI Settings
                  </h2>
                  
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div>
                      <h3 className="font-medium text-white">AI Auto-Reply</h3>
                      <p className="text-sm text-slate-400">Automatically respond to customer messages</p>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, aiEnabled: !settings.aiEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.aiEnabled ? 'bg-purple-500' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.aiEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <h3 className="font-medium text-purple-300 mb-2">AI Performance</h3>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">73%</p>
                        <p className="text-xs text-slate-400">Automation Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">1.8s</p>
                        <p className="text-xs text-slate-400">Avg Response</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-white">324%</p>
                        <p className="text-xs text-slate-400">ROI</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-purple-400" />
                    Integration Settings
                  </h2>
                  
                  {/* Telegram Integration */}
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Telegram Bot</h3>
                          <p className="text-sm text-slate-400">AI-powered customer communication</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-sm text-green-400">Connected</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-300">Auto-Reply</span>
                          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-purple-500">
                            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-300">Response Delay</span>
                          <input 
                            type="number" 
                            defaultValue="2" 
                            className="w-20 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">Welcome Message</label>
                        <textarea 
                          rows={2}
                          defaultValue="👋 Hello! I'm your AI assistant. How can I help you today?"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <h4 className="text-sm font-semibold text-white mb-4">📱 Bot Commands</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-blue-400">/start</span>
                            <span className="text-xs text-slate-400">Welcome & Menu</span>
                          </div>
                          <input 
                            type="checkbox" 
                            defaultChecked 
                            className="w-4 h-4"
                          />
                          <label className="text-xs text-slate-300 ml-2">Enabled</label>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-green-400">/products</span>
                            <span className="text-xs text-slate-400">Show Products</span>
                          </div>
                          <input 
                            type="checkbox" 
                            defaultChecked 
                            className="w-4 h-4"
                          />
                          <label className="text-xs text-slate-300 ml-2">Enabled</label>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-orange-400">/track</span>
                            <span className="text-xs text-slate-400">Track Orders</span>
                          </div>
                          <input 
                            type="checkbox" 
                            defaultChecked 
                            className="w-4 h-4"
                          />
                          <label className="text-xs text-slate-300 ml-2">Enabled</label>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-yellow-400">/rate</span>
                            <span className="text-xs text-slate-400">Collect Feedback</span>
                          </div>
                          <input 
                            type="checkbox" 
                            defaultChecked 
                            className="w-4 h-4"
                          />
                          <label className="text-xs text-slate-300 ml-2">Enabled</label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Sync
                      </button>
                      <button className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2">
                        <SettingsIcon className="w-4 h-4" />
                        Configure
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Integration */}
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <MessageCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">WhatsApp Business</h3>
                          <p className="text-sm text-slate-400">Business messaging platform</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-400">Not Connected</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors">
                        Connect
                      </button>
                    </div>
                  </div>

                  {/* Shopify Integration */}
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Shopify Store</h3>
                          <p className="text-sm text-slate-400">E-commerce platform integration</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-400">Not Connected</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors">
                        Connect
                      </button>
                    </div>
                  </div>

                  {/* Instagram Integration */}
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
                          <Instagram className="w-5 h-5 text-pink-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Instagram Business</h3>
                          <p className="text-sm text-slate-400">Social media messaging</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-400">Not Connected</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="px-4 py-2 bg-pink-500/20 text-pink-400 rounded-lg hover:bg-pink-500/30 transition-colors">
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Bell className="w-6 h-6 text-blue-400" />
                    Notification Settings
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <h3 className="font-medium text-white">Push Notifications</h3>
                        <p className="text-sm text-slate-400">Receive browser notifications</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.notificationsEnabled ? 'bg-blue-500' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div>
                        <h3 className="font-medium text-white">Email Notifications</h3>
                        <p className="text-sm text-slate-400">Receive email updates</p>
                      </div>
                      <button
                        onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.emailNotifications ? 'bg-blue-500' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-green-400" />
                    Security Settings
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5 text-green-400" />
                        <h3 className="font-medium text-green-300">Account Secured</h3>
                      </div>
                      <p className="text-sm text-slate-400">Your account is protected with industry-standard encryption</p>
                    </div>

                    <div className="p-4 bg-white/5 rounded-lg">
                      <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        API Keys
                      </h3>
                      <p className="text-sm text-slate-400 mb-4">Manage API keys for integrations</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
                      >
                        View API Keys
                      </motion.button>
                    </div>

                    <div className="p-4 bg-white/5 rounded-lg">
                      <h3 className="font-medium text-white mb-2 flex items-center gap-2">
                        <Lock className="w-5 h-5" />
                        Change Password
                      </h3>
                      <p className="text-sm text-slate-400 mb-4">Update your account password</p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
                      >
                        Change Password
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                {saved && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-green-400"
                  >
                    <Check className="w-5 h-5" />
                    Settings saved successfully!
                  </motion.div>
                )}
                <div className="flex-1" />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  disabled={updateMutation.isLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
                >
                  {updateMutation.isLoading ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
