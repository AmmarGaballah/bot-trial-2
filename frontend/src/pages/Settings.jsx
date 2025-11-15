import { useEffect, useMemo, useState } from 'react';
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
  RefreshCw,
  Facebook,
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

  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ['integrations', currentProject?.id],
    queryFn: () => api.integrations.list(currentProject?.id),
    enabled: !!currentProject?.id,
  });

  const telegramIntegration = useMemo(() => {
    if (!integrations) return null;
    return integrations.find((integration) => integration.provider === 'telegram') || null;
  }, [integrations]);

  const whatsappIntegration = useMemo(() => {
    if (!integrations) return null;
    return integrations.find((integration) => integration.provider === 'whatsapp') || null;
  }, [integrations]);

  const instagramIntegration = useMemo(() => {
    if (!integrations) return null;
    return integrations.find((integration) => integration.provider === 'instagram') || null;
  }, [integrations]);

  const facebookIntegration = useMemo(() => {
    if (!integrations) return null;
    return integrations.find((integration) => integration.provider === 'facebook') || null;
  }, [integrations]);

  const defaultTelegramSettings = {
    auto_reply_enabled: true,
    response_delay_seconds: 2,
    welcome_message: "👋 Hello! I'm your AI assistant. How can I help you today?",
    fallback_message: 'I am checking that for you and will get back shortly.',
    commands: {
      start: { enabled: true },
      products: { enabled: true },
      track: { enabled: true },
      rate: { enabled: true },
    },
  };

  const [telegramSettings, setTelegramSettings] = useState(defaultTelegramSettings);

  const defaultWhatsAppSettings = {
    business_account_id: '',
    phone_number_id: '',
    access_token: '',
    auto_reply_enabled: true,
    default_response: 'Thanks for reaching out! Our team will respond shortly.',
    keyword_triggers: '',
  };

  const [whatsappSettings, setWhatsappSettings] = useState(defaultWhatsAppSettings);

  const defaultInstagramSettings = {
    business_account_id: '',
    app_id: '',
    app_secret: '',
    auto_reply_enabled: true,
    auto_dm_keywords: '',
    comment_reply_enabled: true,
    default_response: 'Thanks for the message! We will get back to you soon.',
  };

  const [instagramSettings, setInstagramSettings] = useState(defaultInstagramSettings);

  const defaultFacebookSettings = {
    page_id: '',
    app_id: '',
    app_secret: '',
    auto_reply_enabled: true,
    default_response: 'Thanks for contacting us! We will respond shortly.',
    keyword_triggers: '',
  };

  const [facebookSettings, setFacebookSettings] = useState(defaultFacebookSettings);

  useEffect(() => {
    if (!telegramIntegration) return;

    const remoteSettings = telegramIntegration.config?.telegram_settings || {};
    setTelegramSettings((prev) => ({
      ...defaultTelegramSettings,
      ...prev,
      ...remoteSettings,
      commands: {
        ...defaultTelegramSettings.commands,
        ...(prev.commands || {}),
        ...(remoteSettings.commands || {}),
      },
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegramIntegration?.id]);

  useEffect(() => {
    if (!whatsappIntegration) {
      setWhatsappSettings(defaultWhatsAppSettings);
      return;
    }

    const remoteSettings = whatsappIntegration.config?.whatsapp_settings || {};
    setWhatsappSettings((prev) => ({
      ...defaultWhatsAppSettings,
      ...prev,
      ...remoteSettings,
      keyword_triggers: Array.isArray(remoteSettings.keyword_triggers)
        ? remoteSettings.keyword_triggers.join(', ')
        : prev.keyword_triggers,
      access_token:
        typeof remoteSettings.access_token === 'string' && remoteSettings.access_token.includes('...')
          ? ''
          : remoteSettings.access_token || '',
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatsappIntegration?.id]);

  useEffect(() => {
    if (!instagramIntegration) {
      setInstagramSettings(defaultInstagramSettings);
      return;
    }

    const remoteSettings = instagramIntegration.config?.instagram_settings || {};
    setInstagramSettings((prev) => ({
      ...defaultInstagramSettings,
      ...prev,
      ...remoteSettings,
      auto_dm_keywords: Array.isArray(remoteSettings.auto_dm_keywords)
        ? remoteSettings.auto_dm_keywords.join(', ')
        : prev.auto_dm_keywords,
      app_secret:
        typeof remoteSettings.app_secret === 'string' && remoteSettings.app_secret.includes('...')
          ? ''
          : remoteSettings.app_secret || '',
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instagramIntegration?.id]);

  useEffect(() => {
    if (!facebookIntegration) {
      setFacebookSettings(defaultFacebookSettings);
      return;
    }

    const remoteSettings = facebookIntegration.config?.facebook_settings || {};
    setFacebookSettings((prev) => ({
      ...defaultFacebookSettings,
      ...prev,
      ...remoteSettings,
      keyword_triggers: Array.isArray(remoteSettings.keyword_triggers)
        ? remoteSettings.keyword_triggers.join(', ')
        : prev.keyword_triggers,
      app_secret:
        typeof remoteSettings.app_secret === 'string' && remoteSettings.app_secret.includes('...')
          ? ''
          : remoteSettings.app_secret || '',
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facebookIntegration?.id]);

  const updateMutation = useMutation({
    mutationFn: (data) => api.projects.update(currentProject?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const updateTelegramMutation = useMutation({
    mutationFn: (payload) =>
      api.integrations.update(currentProject?.id, telegramIntegration.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['integrations', currentProject?.id]);
      toast.success('Telegram settings updated');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update Telegram settings');
    },
  });

  const updateWhatsAppMutation = useMutation({
    mutationFn: (payload) =>
      api.integrations.update(currentProject?.id, whatsappIntegration.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['integrations', currentProject?.id]);
      toast.success('WhatsApp settings updated');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update WhatsApp settings');
    },
  });

  const updateInstagramMutation = useMutation({
    mutationFn: (payload) =>
      api.integrations.update(currentProject?.id, instagramIntegration.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['integrations', currentProject?.id]);
      toast.success('Instagram settings updated');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update Instagram settings');
    },
  });

  const updateFacebookMutation = useMutation({
    mutationFn: (payload) =>
      api.integrations.update(currentProject?.id, facebookIntegration.id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries(['integrations', currentProject?.id]);
      toast.success('Facebook settings updated');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update Facebook settings');
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

  const handleTelegramSave = () => {
    if (!telegramIntegration) return;

    updateTelegramMutation.mutate({
      config: {
        telegram_settings: {
          auto_reply_enabled: telegramSettings.auto_reply_enabled,
          response_delay_seconds: telegramSettings.response_delay_seconds,
          welcome_message: telegramSettings.welcome_message,
          fallback_message: telegramSettings.fallback_message,
          commands: telegramSettings.commands,
        },
      },
    });
  };

  const handleTelegramToggle = (key) => {
    setTelegramSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCommandToggle = (commandKey) => {
    setTelegramSettings((prev) => ({
      ...prev,
      commands: {
        ...prev.commands,
        [commandKey]: {
          enabled: !prev.commands?.[commandKey]?.enabled,
        },
      },
    }));
  };

  const handleWhatsAppToggle = (key) => {
    setWhatsappSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleInstagramToggle = (key) => {
    setInstagramSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleFacebookToggle = (key) => {
    setFacebookSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleWhatsAppSave = () => {
    if (!whatsappIntegration) return;

    updateWhatsAppMutation.mutate({
      config: {
        whatsapp_settings: {
          business_account_id: whatsappSettings.business_account_id || null,
          phone_number_id: whatsappSettings.phone_number_id || null,
          access_token: whatsappSettings.access_token || null,
          auto_reply_enabled: whatsappSettings.auto_reply_enabled,
          default_response: whatsappSettings.default_response || null,
          keyword_triggers: whatsappSettings.keyword_triggers
            ? whatsappSettings.keyword_triggers.split(',').map((kw) => kw.trim()).filter(Boolean)
            : [],
        },
      },
    });
  };

  const handleInstagramSave = () => {
    if (!instagramIntegration) return;

    updateInstagramMutation.mutate({
      config: {
        instagram_settings: {
          business_account_id: instagramSettings.business_account_id || null,
          app_id: instagramSettings.app_id || null,
          app_secret: instagramSettings.app_secret || null,
          auto_reply_enabled: instagramSettings.auto_reply_enabled,
          auto_dm_keywords: instagramSettings.auto_dm_keywords
            ? instagramSettings.auto_dm_keywords.split(',').map((kw) => kw.trim()).filter(Boolean)
            : [],
          comment_reply_enabled: instagramSettings.comment_reply_enabled,
          default_response: instagramSettings.default_response || null,
        },
      },
    });
  };

  const handleFacebookSave = () => {
    if (!facebookIntegration) return;

    updateFacebookMutation.mutate({
      config: {
        facebook_settings: {
          page_id: facebookSettings.page_id || null,
          app_id: facebookSettings.app_id || null,
          app_secret: facebookSettings.app_secret || null,
          auto_reply_enabled: facebookSettings.auto_reply_enabled,
          default_response: facebookSettings.default_response || null,
          keyword_triggers: facebookSettings.keyword_triggers
            ? facebookSettings.keyword_triggers.split(',').map((kw) => kw.trim()).filter(Boolean)
            : [],
        },
      },
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
                        <div
                          className={`w-2 h-2 rounded-full ${
                            telegramIntegration?.status === 'connected' ? 'bg-green-400' : 'bg-gray-400'
                          }`}
                        />
                        <span
                          className={`text-sm ${
                            telegramIntegration?.status === 'connected' ? 'text-green-400' : 'text-gray-400'
                          }`}
                        >
                          {telegramIntegration?.status === 'connected' ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                    {isLoadingIntegrations && (
                      <div className="text-sm text-slate-400">Loading integration settings...</div>
                    )}
                    {!telegramIntegration && !isLoadingIntegrations && (
                      <div className="text-sm text-slate-400">
                        No Telegram integration connected. Connect it first to configure settings.
                      </div>
                    )}
                    {telegramIntegration && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-300">Auto-Reply</span>
                              <button
                                onClick={() => handleTelegramToggle('auto_reply_enabled')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  telegramSettings.auto_reply_enabled ? 'bg-purple-500' : 'bg-slate-600'
                                }`}
                                disabled={updateTelegramMutation.isLoading}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    telegramSettings.auto_reply_enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-300">Response Delay</span>
                              <input
                                type="number"
                                min={0}
                                max={3600}
                                value={telegramSettings.response_delay_seconds ?? ''}
                                onChange={(e) =>
                                  setTelegramSettings((prev) => ({
                                    ...prev,
                                    response_delay_seconds: e.target.value === '' ? null : Number(e.target.value),
                                  }))
                                }
                                className="w-24 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm"
                                disabled={updateTelegramMutation.isLoading}
                              />
                              <span className="text-xs text-slate-500 ml-2">seconds</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-slate-300 mb-2">Welcome Message</label>
                            <textarea
                              rows={2}
                              value={telegramSettings.welcome_message || ''}
                              onChange={(e) =>
                                setTelegramSettings((prev) => ({
                                  ...prev,
                                  welcome_message: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none"
                              disabled={updateTelegramMutation.isLoading}
                            />
                            <label className="block text-sm text-slate-300 mb-2 mt-3">Fallback Message</label>
                            <textarea
                              rows={2}
                              value={telegramSettings.fallback_message || ''}
                              onChange={(e) =>
                                setTelegramSettings((prev) => ({
                                  ...prev,
                                  fallback_message: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none"
                              disabled={updateTelegramMutation.isLoading}
                            />
                          </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-white/10">
                          <h4 className="text-sm font-semibold text-white mb-4">📱 Bot Commands</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { key: 'start', label: '/start', description: 'Welcome & Menu', color: 'text-blue-400' },
                              { key: 'products', label: '/products', description: 'Show Products', color: 'text-green-400' },
                              { key: 'track', label: '/track', description: 'Track Orders', color: 'text-orange-400' },
                              { key: 'rate', label: '/rate', description: 'Collect Feedback', color: 'text-yellow-400' },
                            ].map((command) => (
                              <div key={command.key} className="p-3 bg-white/5 rounded-lg border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={command.color}>{command.label}</span>
                                  <span className="text-xs text-slate-400">{command.description}</span>
                                </div>
                                <label className="inline-flex items-center gap-2 text-xs text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={telegramSettings.commands?.[command.key]?.enabled ?? false}
                                    onChange={() => handleCommandToggle(command.key)}
                                    className="w-4 h-4"
                                    disabled={updateTelegramMutation.isLoading}
                                  />
                                  Enabled
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 flex gap-2">
                          <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Sync
                          </button>
                          <button
                            className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
                            onClick={handleTelegramSave}
                            disabled={updateTelegramMutation.isLoading}
                          >
                            {updateTelegramMutation.isLoading ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <SettingsIcon className="w-4 h-4" />
                                Save Settings
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
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
                          <p className="text-sm text-slate-400">Automate WhatsApp conversations</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            whatsappIntegration?.status === 'connected' ? 'bg-green-400' : 'bg-gray-400'
                          }`}
                        />
                        <span className={`text-sm ${whatsappIntegration ? 'text-slate-300' : 'text-gray-400'}`}>
                          {whatsappIntegration
                            ? whatsappIntegration.status === 'connected'
                              ? 'Connected'
                              : 'Not Connected'
                            : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                    {isLoadingIntegrations && (
                      <div className="text-sm text-slate-400">Loading integration settings...</div>
                    )}
                    {!whatsappIntegration && !isLoadingIntegrations && (
                      <div className="text-sm text-slate-400">
                        No WhatsApp integration connected. Connect it first to configure settings.
                      </div>
                    )}
                    {whatsappIntegration && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">Business Account ID</label>
                              <input
                                type="text"
                                value={whatsappSettings.business_account_id}
                                onChange={(e) =>
                                  setWhatsappSettings((prev) => ({ ...prev, business_account_id: e.target.value }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateWhatsAppMutation.isLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">Phone Number ID</label>
                              <input
                                type="text"
                                value={whatsappSettings.phone_number_id}
                                onChange={(e) =>
                                  setWhatsappSettings((prev) => ({ ...prev, phone_number_id: e.target.value }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateWhatsAppMutation.isLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">Access Token</label>
                              <input
                                type="password"
                                value={whatsappSettings.access_token}
                                placeholder={whatsappSettings.access_token ? '' : 'Enter to update token'}
                                onChange={(e) =>
                                  setWhatsappSettings((prev) => ({ ...prev, access_token: e.target.value }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateWhatsAppMutation.isLoading}
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-300">Auto-Reply</span>
                              <button
                                onClick={() => handleWhatsAppToggle('auto_reply_enabled')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  whatsappSettings.auto_reply_enabled ? 'bg-green-500' : 'bg-slate-600'
                                }`}
                                disabled={updateWhatsAppMutation.isLoading}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    whatsappSettings.auto_reply_enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">Default Response</label>
                              <textarea
                                rows={3}
                                value={whatsappSettings.default_response || ''}
                                onChange={(e) =>
                                  setWhatsappSettings((prev) => ({ ...prev, default_response: e.target.value }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none"
                                disabled={updateWhatsAppMutation.isLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">Keyword Triggers (comma separated)</label>
                              <input
                                type="text"
                                value={whatsappSettings.keyword_triggers}
                                onChange={(e) =>
                                  setWhatsappSettings((prev) => ({ ...prev, keyword_triggers: e.target.value }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateWhatsAppMutation.isLoading}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex gap-2">
                          <button
                            className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
                            onClick={handleWhatsAppSave}
                            disabled={updateWhatsAppMutation.isLoading}
                          >
                            {updateWhatsAppMutation.isLoading ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <SettingsIcon className="w-4 h-4" />
                                Save Settings
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
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
                          <p className="text-sm text-slate-400">Social and DM automation</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            instagramIntegration?.status === 'connected' ? 'bg-green-400' : 'bg-gray-400'
                          }`}
                        />
                        <span className={`text-sm ${instagramIntegration ? 'text-slate-300' : 'text-gray-400'}`}>
                          {instagramIntegration
                            ? instagramIntegration.status === 'connected'
                              ? 'Connected'
                              : 'Not Connected'
                            : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                    {isLoadingIntegrations && (
                      <div className="text-sm text-slate-400">Loading integration settings...</div>
                    )}
                    {!instagramIntegration && !isLoadingIntegrations && (
                      <div className="text-sm text-slate-400">
                        No Instagram integration connected. Connect it first to configure settings.
                      </div>
                    )}
                    {instagramIntegration && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">Business Account ID</label>
                              <input
                                type="text"
                                value={instagramSettings.business_account_id}
                                onChange={(e) =>
                                  setInstagramSettings((prev) => ({
                                    ...prev,
                                    business_account_id: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateInstagramMutation.isLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">App ID</label>
                              <input
                                type="text"
                                value={instagramSettings.app_id}
                                onChange={(e) =>
                                  setInstagramSettings((prev) => ({
                                    ...prev,
                                    app_id: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateInstagramMutation.isLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">App Secret</label>
                              <input
                                type="password"
                                value={instagramSettings.app_secret}
                                placeholder={instagramSettings.app_secret ? '' : 'Enter to update secret'}
                                onChange={(e) =>
                                  setInstagramSettings((prev) => ({
                                    ...prev,
                                    app_secret: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateInstagramMutation.isLoading}
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-300">Auto-Reply</span>
                              <button
                                onClick={() => handleInstagramToggle('auto_reply_enabled')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  instagramSettings.auto_reply_enabled ? 'bg-pink-500' : 'bg-slate-600'
                                }`}
                                disabled={updateInstagramMutation.isLoading}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    instagramSettings.auto_reply_enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-300">Comment Auto-Reply</span>
                              <button
                                onClick={() => handleInstagramToggle('comment_reply_enabled')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  instagramSettings.comment_reply_enabled ? 'bg-pink-500' : 'bg-slate-600'
                                }`}
                                disabled={updateInstagramMutation.isLoading}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    instagramSettings.comment_reply_enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">Default Response</label>
                              <textarea
                                rows={3}
                                value={instagramSettings.default_response || ''}
                                onChange={(e) =>
                                  setInstagramSettings((prev) => ({
                                    ...prev,
                                    default_response: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none"
                                disabled={updateInstagramMutation.isLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">Auto DM Keywords (comma separated)</label>
                              <input
                                type="text"
                                value={instagramSettings.auto_dm_keywords}
                                onChange={(e) =>
                                  setInstagramSettings((prev) => ({
                                    ...prev,
                                    auto_dm_keywords: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateInstagramMutation.isLoading}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex gap-2">
                          <button
                            className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
                            onClick={handleInstagramSave}
                            disabled={updateInstagramMutation.isLoading}
                          >
                            {updateInstagramMutation.isLoading ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <SettingsIcon className="w-4 h-4" />
                                Save Settings
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Facebook Integration */}
                  <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                          <Facebook className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Facebook Page</h3>
                          <p className="text-sm text-slate-400">Messenger and comments automation</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            facebookIntegration?.status === 'connected' ? 'bg-green-400' : 'bg-gray-400'
                          }`}
                        />
                        <span className={`text-sm ${facebookIntegration ? 'text-slate-300' : 'text-gray-400'}`}>
                          {facebookIntegration
                            ? facebookIntegration.status === 'connected'
                              ? 'Connected'
                              : 'Not Connected'
                            : 'Not Connected'}
                        </span>
                      </div>
                    </div>
                    {isLoadingIntegrations && (
                      <div className="text-sm text-slate-400">Loading integration settings...</div>
                    )}
                    {!facebookIntegration && !isLoadingIntegrations && (
                      <div className="text-sm text-slate-400">
                        No Facebook integration connected. Connect it first to configure settings.
                      </div>
                    )}
                    {facebookIntegration && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">Page ID</label>
                              <input
                                type="text"
                                value={facebookSettings.page_id}
                                onChange={(e) =>
                                  setFacebookSettings((prev) => ({
                                    ...prev,
                                    page_id: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateFacebookMutation.isLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">App ID</label>
                              <input
                                type="text"
                                value={facebookSettings.app_id}
                                onChange={(e) =>
                                  setFacebookSettings((prev) => ({
                                    ...prev,
                                    app_id: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateFacebookMutation.isLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">App Secret</label>
                              <input
                                type="password"
                                value={facebookSettings.app_secret}
                                placeholder={facebookSettings.app_secret ? '' : 'Enter to update secret'}
                                onChange={(e) =>
                                  setFacebookSettings((prev) => ({
                                    ...prev,
                                    app_secret: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateFacebookMutation.isLoading}
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-slate-300">Auto-Reply</span>
                              <button
                                onClick={() => handleFacebookToggle('auto_reply_enabled')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  facebookSettings.auto_reply_enabled ? 'bg-blue-500' : 'bg-slate-600'
                                }`}
                                disabled={updateFacebookMutation.isLoading}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    facebookSettings.auto_reply_enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">Default Response</label>
                              <textarea
                                rows={3}
                                value={facebookSettings.default_response || ''}
                                onChange={(e) =>
                                  setFacebookSettings((prev) => ({
                                    ...prev,
                                    default_response: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none"
                                disabled={updateFacebookMutation.isLoading}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-slate-300 mb-2">Keyword Triggers (comma separated)</label>
                              <input
                                type="text"
                                value={facebookSettings.keyword_triggers}
                                onChange={(e) =>
                                  setFacebookSettings((prev) => ({
                                    ...prev,
                                    keyword_triggers: e.target.value,
                                  }))
                                }
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                                disabled={updateFacebookMutation.isLoading}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex gap-2">
                          <button
                            className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
                            onClick={handleFacebookSave}
                            disabled={updateFacebookMutation.isLoading}
                          >
                            {updateFacebookMutation.isLoading ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <SettingsIcon className="w-4 h-4" />
                                Save Settings
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
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
