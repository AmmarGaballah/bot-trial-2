import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  ShoppingCart, 
  MessageSquare, 
  DollarSign,
  Activity,
  Users,
  Bot,
  Zap,
  Package,
  Hash,
  TrendingDown
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GlassCard from '../components/GlassCard';
import api from '../services/api';
import { useProjectStore } from '../store/projectStore';

export default function Dashboard() {
  const { currentProject } = useProjectStore();

  // DEMO MODE: Use fake data for advertising/showcase
  const USE_DEMO_DATA = false;

  // Fetch real data
  const { data: ordersData } = useQuery({
    queryKey: ['dashboard-orders', currentProject?.id],
    queryFn: async () => {
      const response = await api.get(`/orders/${currentProject.id}?limit=100`);
      return response.data;
    },
    enabled: !!currentProject,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['dashboard-messages', currentProject?.id],
    queryFn: async () => {
      const response = await api.get(`/messages/${currentProject.id}?limit=100`);
      return response.data;
    },
    enabled: !!currentProject,
  });

  const { data: productsData } = useQuery({
    queryKey: ['dashboard-products', currentProject?.id],
    queryFn: async () => {
      const response = await api.get(`/products/${currentProject.id}`);
      return response.data;
    },
    enabled: !!currentProject,
  });

  const { data: socialStatsData } = useQuery({
    queryKey: ['dashboard-social', currentProject?.id],
    queryFn: async () => {
      const response = await api.get(`/social-media/${currentProject.id}/stats`);
      return response.data;
    },
    enabled: !!currentProject,
  });

  const { data: integrationsData } = useQuery({
    queryKey: ['dashboard-integrations', currentProject?.id],
    queryFn: async () => {
      const response = await api.get(`/integrations/${currentProject.id}`);
      return response.data;
    },
    enabled: !!currentProject,
  });

  // Calculate stats from real or demo data
  let orders, messages, products, totalRevenue, totalOrders, totalMessages, unreadMessages, totalProducts, activeIntegrations;
  
  if (USE_DEMO_DATA) {
    // DEMO DATA for showcase
    totalRevenue = 147832.50;
    totalOrders = 1247;
    totalMessages = 3892;
    unreadMessages = 47;
    totalProducts = 156;
    activeIntegrations = 8;
    
    // Mock data arrays
    orders = Array.from({ length: 1247 }, (_, i) => ({
      id: i,
      external_id: `ORD-${10000 + i}`,
      total: Math.random() * 500 + 50,
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
    
    messages = Array.from({ length: 3892 }, (_, i) => ({
      id: i,
      is_read: i > 47,
      platform: ['whatsapp', 'instagram', 'telegram', 'facebook'][Math.floor(Math.random() * 4)],
      direction: Math.random() > 0.5 ? 'inbound' : 'outbound',
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
    
    products = Array.from({ length: 156 }, (_, i) => ({
      id: i,
      in_stock: i < 142,
    }));
  } else {
    // Real data
    orders = ordersData?.orders || [];
    messages = messagesData?.messages || [];
    products = productsData?.products || [];
    
    totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    totalOrders = orders.length;
    totalMessages = messages.length;
    unreadMessages = messages.filter(m => !m.is_read).length;
    totalProducts = products.length;
    activeIntegrations = integrationsData?.integrations?.filter(i => i.is_active).length || 0;
  }

  // Group orders by day for chart
  const last7Days = [...Array(7)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const salesData = USE_DEMO_DATA ? [
    { date: 'Mon', revenue: 18420, orders: 163 },
    { date: 'Tue', revenue: 22350, orders: 198 },
    { date: 'Wed', revenue: 19780, orders: 174 },
    { date: 'Thu', revenue: 24560, orders: 215 },
    { date: 'Fri', revenue: 28940, orders: 248 },
    { date: 'Sat', revenue: 21820, orders: 192 },
    { date: 'Sun', revenue: 25130, orders: 221 },
  ] : last7Days.map(date => {
    const dayOrders = orders.filter(o => o.created_at?.startsWith(date));
    const dayRevenue = dayOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: Math.round(dayRevenue),
      orders: dayOrders.length,
    };
  });

  // Group messages by day
  const messageData = USE_DEMO_DATA ? [
    { date: 'Mon', messages: 487, unread: 12 },
    { date: 'Tue', messages: 563, unread: 8 },
    { date: 'Wed', messages: 521, unread: 15 },
    { date: 'Thu', messages: 612, unread: 9 },
    { date: 'Fri', messages: 689, unread: 11 },
    { date: 'Sat', messages: 548, unread: 6 },
    { date: 'Sun', messages: 602, unread: 7 },
  ] : last7Days.map(date => {
    const dayMessages = messages.filter(m => m.created_at?.startsWith(date));
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      messages: dayMessages.length,
      unread: dayMessages.filter(m => !m.is_read).length,
    };
  });

  const stats = [
    {
      label: 'Total Revenue',
      value: USE_DEMO_DATA ? '$147,832' : `$${totalRevenue.toFixed(2)}`,
      change: '+245%',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      trend: 'up',
    },
    {
      label: 'Total Orders',
      value: USE_DEMO_DATA ? '1,247' : totalOrders.toString(),
      change: '+189%',
      icon: ShoppingCart,
      color: 'from-blue-500 to-cyan-600',
      trend: 'up',
    },
    {
      label: 'Messages',
      value: USE_DEMO_DATA ? '3,892' : totalMessages.toString(),
      subValue: USE_DEMO_DATA ? '47 unread' : `${unreadMessages} unread`,
      icon: MessageSquare,
      color: 'from-purple-500 to-pink-600',
      trend: 'up',
      change: '+312%',
    },
    {
      label: 'Products',
      value: USE_DEMO_DATA ? '156' : totalProducts.toString(),
      subValue: USE_DEMO_DATA ? '142 in stock' : `${products.filter(p => p.in_stock).length} in stock`,
      icon: Package,
      color: 'from-orange-500 to-red-600',
      trend: 'up',
      change: '+78%',
    },
    {
      label: 'Social Comments',
      value: USE_DEMO_DATA ? '2,487' : (socialStatsData?.total_comments || 0).toString(),
      subValue: USE_DEMO_DATA ? '34 pending' : `${socialStatsData?.pending_responses || 0} pending`,
      icon: Hash,
      color: 'from-pink-500 to-rose-600',
      trend: 'up',
      change: '+423%',
    },
    {
      label: 'Active Integrations',
      value: USE_DEMO_DATA ? '8' : activeIntegrations.toString(),
      subValue: USE_DEMO_DATA ? 'All systems operational' : `${activeIntegrations} active`,
      icon: Zap,
      color: 'from-cyan-500 to-blue-600',
      trend: 'up',
      change: '+300%',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gradient mb-2">Dashboard</h1>
        <p className="text-gray-400">Welcome back! Here's what's happening with your sales.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassCard className="p-6 hover:scale-105 transition-transform duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                {stat.change && (
                  <span className={`text-sm flex items-center gap-1 ${
                    stat.trend === 'up' ? 'text-green-400' : 
                    stat.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {stat.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : 
                     stat.trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
                    {stat.change}
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
              {stat.subValue && (
                <p className="text-sm text-gray-500 mt-1">{stat.subValue}</p>
              )}
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-1">Revenue Overview</h3>
              <p className="text-sm text-gray-400">Last 7 days</p>
            </div>
            <Activity className="w-5 h-5 text-accent-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(26, 26, 46, 0.95)', 
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(20px)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8b5cf6" 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Messages Chart */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold mb-1">Message Activity</h3>
              <p className="text-sm text-gray-400">Last 7 days</p>
            </div>
            <MessageSquare className="w-5 h-5 text-accent-400" />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={messageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(26, 26, 46, 0.95)', 
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '12px',
                  backdropFilter: 'blur(20px)'
                }}
              />
              <Bar dataKey="messages" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold mb-4">Integration Status</h3>
          <div className="space-y-3">
            {(USE_DEMO_DATA ? [
              { id: 1, provider: 'shopify', is_active: true },
              { id: 2, provider: 'whatsapp', is_active: true },
              { id: 3, provider: 'instagram', is_active: true },
              { id: 4, provider: 'telegram', is_active: true },
              { id: 5, provider: 'facebook', is_active: true },
              { id: 6, provider: 'twitter', is_active: true },
              { id: 7, provider: 'woocommerce', is_active: false },
              { id: 8, provider: 'stripe', is_active: true },
            ] : integrationsData?.integrations?.slice(0, 5) || []).map((integration, index) => (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    integration.is_active ? 'bg-green-400' : 'bg-gray-400'
                  }`} />
                  <span className="font-medium capitalize">{integration.provider}</span>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${
                  integration.is_active 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {integration.is_active ? 'Active' : 'Inactive'}
                </span>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold mb-4">Product Inventory</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Total Products</span>
              <span className="text-2xl font-bold">{totalProducts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">In Stock</span>
              <span className="text-2xl font-bold text-green-400">
                {products.filter(p => p.in_stock).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Out of Stock</span>
              <span className="text-2xl font-bold text-red-400">
                {products.filter(p => !p.in_stock).length}
              </span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden mt-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ 
                  width: totalProducts > 0 
                    ? `${(products.filter(p => p.in_stock).length / totalProducts) * 100}%` 
                    : '0%' 
                }}
                className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
              />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-400" />
            Quick Actions
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Send Broadcast', color: 'from-blue-500 to-cyan-600' },
              { label: 'Generate Report', color: 'from-purple-500 to-pink-600' },
              { label: 'Sync Orders', color: 'from-green-500 to-emerald-600' },
              { label: 'Train AI Model', color: 'from-orange-500 to-red-600' },
            ].map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`w-full glass-card p-4 rounded-xl hover:scale-105 transition-all duration-200 bg-gradient-to-r ${action.color} bg-opacity-10`}
              >
                <span className="font-medium">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-400" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {/* Recent Orders */}
            {(USE_DEMO_DATA ? [
              { id: 1, external_id: 'ORD-11247', total: '245.99', created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
              { id: 2, external_id: 'ORD-11246', total: '189.50', created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString() },
              { id: 3, external_id: 'ORD-11245', total: '412.75', created_at: new Date(Date.now() - 78 * 60 * 1000).toISOString() },
            ] : orders.slice(0, 3)).map((order, index) => (
              <motion.div
                key={`order-${order.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                <div className="flex-1">
                  <p className="text-sm">
                    New order #{order.external_id} - ${parseFloat(order.total).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            ))}
            
            {/* Recent Messages */}
            {(USE_DEMO_DATA ? [
              { id: 1, direction: 'inbound', platform: 'WhatsApp', created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
              { id: 2, direction: 'outbound', platform: 'Instagram', created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString() },
              { id: 3, direction: 'inbound', platform: 'Telegram', created_at: new Date(Date.now() - 23 * 60 * 1000).toISOString() },
            ] : messages.slice(0, 2)).map((message, index) => (
              <motion.div
                key={`message-${message.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (3 + index) * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-purple-400 mt-2" />
                <div className="flex-1">
                  <p className="text-sm">
                    {message.direction === 'inbound' ? 'Received' : 'Sent'} message on {message.platform}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            ))}

            {!USE_DEMO_DATA && orders.length === 0 && messages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No recent activity</p>
                <p className="text-xs mt-2">Activity will appear here as it happens</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
