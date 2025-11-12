import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  MessageCircle,
  Send,
  Facebook,
  Instagram,
  MessageSquare,
  Video,
  Plus,
  Settings as SettingsIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Check,
  ListTree,
  X,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import GlassCard from '../components/GlassCard';
import { integrations } from '../services/api';
import { useProjectStore } from '../store/projectStore';

const availableIntegrations = [
  {
    id: 'shopify',
    name: 'Shopify',
    icon: ShoppingBag,
    description: 'Sync orders and products from your Shopify store',
    color: 'from-green-500 to-emerald-600',
    instructions: `**How to Connect Shopify:**

1. **Get Your Shopify Credentials:**
   - Log into your Shopify Admin panel
   - Go to Settings > Apps and sales channels
   - Click "Develop apps" (or create a new app)
   - Create a new app and give it a name
   - Click "Configure Admin API scopes"
   - Select: read_orders, write_orders, read_products, read_customers
   - Save and install the app
   - Copy your API Key and API Secret

2. **Connect to AI Sales Commander:**
   - Click the "Connect" button above
   - Enter your Shopify store URL (e.g., mystore.myshopify.com)
   - Paste your API Key
   - Paste your API Secret
   - Click "Save"

3. **Initial Sync:**
   - First sync takes 5-10 minutes
   - Your orders will appear in the Orders page
   - Products are synced automatically

**Troubleshooting:**
- If connection fails, verify your API credentials
- Ensure all required scopes are enabled
- Check that your Shopify plan supports API access

**Need Help?** Contact support or ask the AI Assistant!`,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageCircle,
    description: 'Send and receive messages via WhatsApp Business API',
    color: 'from-green-400 to-green-600',
    instructions: `**How to Connect WhatsApp Business:**

1. **Prerequisites:**
   - WhatsApp Business API account
   - Verified phone number
   - Facebook Business Manager access

2. **Get WhatsApp Credentials:**
   - Log into Facebook Business Manager
   - Go to WhatsApp > API Setup
   - Note your Phone Number ID
   - Generate a Permanent Access Token
   - Copy your Webhook Verify Token

3. **Connect to Platform:**
   - Click "Connect" button
   - Enter your Phone Number ID
   - Paste your Access Token
   - Set Webhook URL (provided after connection)
   - Verify webhook

4. **Start Messaging:**
   - Messages appear in Messages page
   - Reply directly from platform
   - Use templates for broadcasts

**Important:** WhatsApp has strict message policies. Review guidelines before sending.`,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: Send,
    description: 'Connect your Telegram bot for customer communication',
    color: 'from-blue-400 to-blue-600',
    instructions: `**How to Connect Telegram Bot:**

1. **Create Telegram Bot:**
   - Open Telegram and search for @BotFather
   - Send /newbot command
   - Follow prompts to create your bot
   - Save the API Token provided

2. **Configure Bot:**
   - Send /setdescription to add bot description
   - Send /setabouttext for about section
   - Send /setcommands to add menu commands

3. **Connect to Platform:**
   - Click "Connect" button
   - Paste your Bot API Token
   - Click "Save"
   - Platform will configure webhooks automatically

4. **Usage:**
   - Share bot link with customers
   - Messages appear in Messages page
   - Reply and manage conversations
   - Use AI-powered auto-responses

**Tip:** Add bot to a channel or group for broader reach!`,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    description: 'Manage Instagram Direct Messages and comments',
    color: 'from-pink-500 to-purple-600',
    instructions: `**How to Connect Instagram:**

1. **Requirements:**
   - Instagram Business account (not personal)
   - Facebook Page linked to Instagram
   - Facebook Business Manager access

2. **Get Credentials:**
   - Go to Facebook Developers
   - Create an app or use existing
   - Add Instagram Basic Display
   - Get Instagram User Access Token
   - Note your Instagram Business Account ID

3. **Connect Platform:**
   - Click "Connect" button
   - Enter Instagram Account ID
   - Paste Access Token
   - Authorize permissions
   - Save connection

4. **Features:**
   - Direct Messages management
   - Comment monitoring
   - Automated responses
   - Story mentions tracking

**Note:** Instagram API has rate limits. Monitor usage in Settings.`,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    description: 'Connect Facebook Messenger for customer support',
    color: 'from-blue-500 to-indigo-600',
    instructions: `**How to Connect Facebook Messenger:**

1. **Prerequisites:**
   - Facebook Page (business page)
   - Page Admin access
   - Facebook App (create in Facebook Developers)

2. **Setup Steps:**
   - Go to Facebook Developers
   - Create or select your app
   - Add Messenger product
   - Generate Page Access Token
   - Set up webhooks

3. **Connect to Platform:**
   - Click "Connect" button
   - Enter your Page ID
   - Paste Page Access Token
   - Configure webhook URL (provided)
   - Verify webhook connection

4. **Start Using:**
   - Customer messages appear in Messages page
   - Reply instantly from platform
   - Use templates and quick replies
   - Enable AI auto-responses

**Pro Tip:** Set up greeting text and away message in Facebook Page settings!`,
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: MessageSquare,
    description: 'AI-powered customer support via Discord server',
    color: 'from-indigo-500 to-purple-600',
    instructions: `**How to Connect Discord Bot:**

1. **Create Discord Application:**
   - Go to Discord Developer Portal
   - Click "New Application"
   - Name your application
   - Go to Bot section
   - Click "Add Bot"
   - Copy Bot Token

2. **Bot Permissions:**
   - Enable: Send Messages, Read Messages
   - Enable: Manage Messages, Embed Links
   - Generate OAuth2 URL with permissions

3. **Add Bot to Server:**
   - Copy OAuth2 URL
   - Open in browser
   - Select your server
   - Authorize bot

4. **Connect Platform:**
   - Click "Connect" button
   - Paste Bot Token
   - Enter Server ID
   - Select channels to monitor
   - Save

**Features:** AI-powered responses, ticket system, role management`,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Video,
    description: 'TikTok Shop and Business Messages integration',
    color: 'from-black via-purple-500 to-cyan-400',
    instructions: `**How to Connect TikTok Shop:**

1. **Requirements:**
   - TikTok Shop Business account
   - Seller Center access
   - API access enabled

2. **Get API Credentials:**
   - Log into TikTok Seller Center
   - Go to Settings > Open API
   - Create new API application
   - Get App Key and App Secret
   - Generate Access Token

3. **Connect Platform:**
   - Click "Connect" button
   - Enter TikTok Shop ID
   - Paste App Key
   - Paste App Secret
   - Paste Access Token
   - Save connection

4. **Sync Features:**
   - Orders sync automatically
   - Product catalog integration
   - Message management
   - Analytics tracking

**Note:** TikTok Shop API is currently available in select regions.`,
  },
];

export default function Integrations() {
  const { currentProject } = useProjectStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [credentials, setCredentials] = useState({ apiKey: '', apiSecret: '', webhookUrl: '' });
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedInstructions, setSelectedInstructions] = useState(null);

  // Fetch integrations
  const { data: connectedIntegrations, isLoading, refetch } = useQuery({
    queryKey: ['integrations', currentProject?.id],
    queryFn: () => integrations.list(currentProject?.id),
    enabled: !!currentProject,
    onSuccess: (data) => {
      console.log('Integrations fetched:', data);
    }
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: (data) => integrations.create(currentProject?.id, data),
    onSuccess: (data) => {
      console.log('Integration connected successfully:', data);
      toast.success('Integration connected successfully!');
      // Fix: Use the correct query key that matches the useQuery
      queryClient.invalidateQueries(['integrations', currentProject?.id]);
      // Also manually refetch to ensure immediate update
      refetch();
      setShowModal(false);
      setCredentials({ apiKey: '', apiSecret: '', webhookUrl: '' });
      setConnectingProvider(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Connection failed');
      setConnectingProvider(null);
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: ({ projectId, integrationId }) => 
      integrations.sync(projectId, integrationId),
    onSuccess: () => {
      toast.success('Sync started successfully');
      // Fix: Use the correct query key that matches the useQuery
      queryClient.invalidateQueries(['integrations', currentProject?.id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Sync failed');
    },
  });

  const getIntegrationStatus = (provider) => {
    // Handle both direct array and nested data structure
    const integrations = connectedIntegrations?.data || connectedIntegrations || [];
    const integration = integrations.find(
      (i) => i.provider === provider
    );
    return integration?.status || 'disconnected';
  };

  const getIntegrationId = (provider) => {
    // Handle both direct array and nested data structure
    const integrations = connectedIntegrations?.data || connectedIntegrations || [];
    const integration = integrations.find(
      (i) => i.provider === provider
    );
    return integration?.id;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'syncing':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const handleConnect = (provider) => {
    const integration = availableIntegrations.find(i => i.id === provider);
    setSelectedProvider(integration);
    setShowModal(true);
  };

  const handleSubmitConnection = () => {
    if (!credentials.apiKey) {
      toast.error('API Key is required');
      return;
    }

    setConnectingProvider(selectedProvider.id);
    connectMutation.mutate({
      provider: selectedProvider.id,
      credentials: {
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret,
        webhook_url: credentials.webhookUrl,
      },
      config: {
        auto_sync: true,
      }
    });
  };

  const handleSync = (provider) => {
    const integrationId = getIntegrationId(provider);
    if (!integrationId || !currentProject) return;

    syncMutation.mutate({
      projectId: currentProject.id,
      integrationId: integrationId,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="animate-spin w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Integrations</h1>
          <p className="text-gray-400">
            Connect your favorite platforms to automate sales and customer communication
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/integrations/manage')}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all flex items-center gap-2"
        >
          <ListTree className="w-5 h-5" />
          Manage All
        </motion.button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Connected</p>
              <p className="text-3xl font-bold">
                {connectedIntegrations?.data?.filter(i => i.status === 'connected').length || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Available</p>
              <p className="text-3xl font-bold">{availableIntegrations.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Errors</p>
              <p className="text-3xl font-bold">
                {connectedIntegrations?.data?.filter(i => i.status === 'error').length || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
              <X className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableIntegrations.map((integration, index) => {
          const status = getIntegrationStatus(integration.id);
          const isConnected = status === 'connected';
          const isError = status === 'error';
          const isConnecting = connectingProvider === integration.id;

          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="p-6 hover:scale-105 transition-all duration-300">
                {/* Icon & Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${integration.color} flex items-center justify-center`}>
                    <integration.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {status}
                  </span>
                </div>

                {/* Info */}
                <h3 className="text-xl font-semibold mb-2">{integration.name}</h3>
                <p className="text-sm text-gray-400 mb-6">{integration.description}</p>

                {/* Actions */}
                <div className="flex gap-2">
                  {isConnected ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleSync(integration.id)}
                        disabled={syncMutation.isPending}
                        className="flex-1 glass-card px-4 py-2 rounded-xl hover:bg-white/10 transition-colors font-medium text-sm"
                      >
                        <RefreshCw className={`w-4 h-4 inline mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                        Sync
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="glass-card px-4 py-2 rounded-xl hover:bg-white/10 transition-colors"
                      >
                        <SettingsIcon className="w-4 h-4" />
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleConnect(integration.id)}
                      disabled={isConnecting || !currentProject}
                      className="w-full btn-neon disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isConnecting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin inline mr-2" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 inline mr-2" />
                          Connect
                        </>
                      )}
                    </motion.button>
                  )}
                </div>

                {/* Instructions Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedInstructions(integration);
                    setShowInstructions(true);
                  }}
                  className="w-full mt-3 glass-card px-4 py-2 rounded-xl hover:bg-white/10 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-3 h-3" />
                  View Setup Instructions
                </motion.button>

                {/* Error Message */}
                {isError && (
                  <p className="mt-3 text-xs text-red-400 bg-red-400/10 p-2 rounded-lg">
                    Connection error. Please check credentials.
                  </p>
                )}

                {/* Last Sync */}
                {isConnected && (
                  <p className="mt-3 text-xs text-gray-500">
                    Last synced: 5 minutes ago
                  </p>
                )}
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Info Box */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-3">📚 Integration Guide</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <p>
            <strong className="text-gray-200">Shopify:</strong> Requires API key and secret from your Shopify admin panel
          </p>
          <p>
            <strong className="text-gray-200">WhatsApp:</strong> Need WhatsApp Business API access token
          </p>
          <p>
            <strong className="text-gray-200">Telegram:</strong> Create a bot with @BotFather and get your bot token
          </p>
          <p className="mt-4 text-accent-400">
            💡 Tip: Each integration requires specific credentials. Check our documentation for detailed setup instructions.
          </p>
        </div>
      </GlassCard>

      {/* Connection Modal */}
      {showModal && selectedProvider && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 max-w-md w-full rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedProvider.color} flex items-center justify-center`}>
                <selectedProvider.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Connect {selectedProvider.name}</h2>
                <p className="text-sm text-gray-400">{selectedProvider.description}</p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitConnection(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Key *
                </label>
                <input
                  type="text"
                  value={credentials.apiKey}
                  onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  className="input-glass w-full"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Secret (optional)
                </label>
                <input
                  type="password"
                  value={credentials.apiSecret}
                  onChange={(e) => setCredentials({ ...credentials, apiSecret: e.target.value })}
                  placeholder="Enter your API secret"
                  className="input-glass w-full"
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Webhook URL (optional)
                </label>
                <input
                  type="url"
                  value={credentials.webhookUrl}
                  onChange={(e) => setCredentials({ ...credentials, webhookUrl: e.target.value })}
                  placeholder="https://your-domain.com/webhook"
                  className="input-glass w-full"
                  autoComplete="url"
                />
              </div>
            </form>

            <div className="flex gap-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowModal(false);
                  setCredentials({ apiKey: '', apiSecret: '', webhookUrl: '' });
                }}
                disabled={connectMutation.isPending}
                className="flex-1 glass-card px-4 py-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmitConnection}
                disabled={connectMutation.isPending || !credentials.apiKey}
                className="flex-1 btn-neon disabled:opacity-50"
              >
                {connectMutation.isPending ? 'Connecting...' : 'Connect'}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && selectedInstructions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-8 max-w-2xl w-full rounded-2xl max-h-[80vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6 sticky top-0 bg-dark-900/90 backdrop-blur-lg pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${selectedInstructions.color} flex items-center justify-center`}>
                  <selectedInstructions.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{selectedInstructions.name} Setup</h2>
                  <p className="text-sm text-gray-400">Complete step-by-step instructions</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setShowInstructions(false);
                  setSelectedInstructions(null);
                }}
                className="glass-card p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Instructions Content */}
            <div className="prose prose-invert max-w-none">
              <div className="text-sm leading-relaxed space-y-4 whitespace-pre-wrap">
                {selectedInstructions.instructions}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 mt-8 pt-6 border-t border-white/10">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowInstructions(false);
                  setSelectedInstructions(null);
                }}
                className="flex-1 glass-card px-4 py-3 rounded-xl hover:bg-white/10 transition-colors font-medium"
              >
                Close
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowInstructions(false);
                  setSelectedInstructions(null);
                  handleConnect(selectedInstructions.id);
                }}
                disabled={!currentProject}
                className="flex-1 btn-neon disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Connect Now
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
