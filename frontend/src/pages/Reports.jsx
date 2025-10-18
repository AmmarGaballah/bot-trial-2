import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  MessageSquare,
  Package,
  Sparkles,
  Download,
  Calendar,
  Brain,
  Target,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import GlassCard from '../components/GlassCard';
import { reports as reportsApi } from '../services/api';
import { useProjectStore } from '../store/projectStore';
import { formatCurrency, formatNumber, formatDateTime } from '../utils/helpers';

const REPORT_TYPES = [
  {
    id: 'sales',
    title: 'Sales Analytics',
    description: 'Revenue, orders, and performance metrics',
    icon: DollarSign,
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'orders',
    title: 'Order Tracking',
    description: 'Order fulfillment and tracking analytics',
    icon: Package,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'customers',
    title: 'Customer Engagement',
    description: 'Customer behavior and sentiment analysis',
    icon: Users,
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'performance',
    title: 'System Performance',
    description: 'AI automation and system metrics',
    icon: Activity,
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'roi',
    title: 'ROI Analysis',
    description: 'Return on investment for AI automation',
    icon: Target,
    color: 'from-indigo-500 to-purple-500'
  }
];

const CHART_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function Reports() {
  const { currentProject } = useProjectStore();
  const queryClient = useQueryClient();
  
  const [selectedReportType, setSelectedReportType] = useState('sales');
  const [dateRange, setDateRange] = useState('last_30_days');
  const [generatingReport, setGeneratingReport] = useState(false);

  // Fetch existing reports
  const { data: reportsList, isLoading: reportsLoading } = useQuery({
    queryKey: ['reports', currentProject?.id],
    queryFn: () => reportsApi.list(currentProject?.id),
    enabled: !!currentProject,
  });

  // Generate new report mutation
  const generateReportMutation = useMutation({
    mutationFn: (data) => reportsApi.generate(currentProject?.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports']);
      setGeneratingReport(false);
    },
  });

  const handleGenerateReport = () => {
    if (!currentProject?.id) {
      console.error('No project selected');
      return;
    }
    
    setGeneratingReport(true);
    
    const now = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case 'last_7_days':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'last_30_days':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    generateReportMutation.mutate({
      report_type: selectedReportType,
      start_date: startDate.toISOString(),
      end_date: now.toISOString()
    });
  };

  const latestReport = reportsList?.find(r => r.report_type === selectedReportType);
  const reportData = latestReport?.payload;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 mb-2 flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-purple-400" />
            Analytics & Reports
          </h1>
          <p className="text-slate-400">AI-powered insights and comprehensive analytics</p>
        </motion.div>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {REPORT_TYPES.map((type, index) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedReportType(type.id)}
              className="cursor-pointer"
            >
              <GlassCard className={`relative overflow-hidden transition-all ${
                selectedReportType === type.id 
                  ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/50' 
                  : 'hover:ring-1 hover:ring-white/20'
              }`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-${selectedReportType === type.id ? '20' : '10'} transition-opacity`} />
                <div className="relative p-4">
                  <type.icon className={`w-8 h-8 mb-3 ${selectedReportType === type.id ? 'text-purple-400' : 'text-slate-400'}`} />
                  <h3 className="font-semibold text-white mb-1">{type.title}</h3>
                  <p className="text-xs text-slate-400">{type.description}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {/* Report Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <GlassCard className="p-4">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  >
                    <option value="last_7_days">Last 7 Days</option>
                    <option value="last_30_days">Last 30 Days</option>
                    <option value="last_month">Last Month</option>
                  </select>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerateReport}
                disabled={generatingReport || !currentProject}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingReport ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate AI Report
                  </>
                )}
              </motion.button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Report Content */}
        {reportData ? (
          <div className="space-y-8">
            {/* Summary Cards */}
            {reportData.summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(reportData.summary).map(([key, value], index) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <GlassCard className="p-6 hover:scale-105 transition-transform">
                      <p className="text-slate-400 text-sm mb-2 capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-3xl font-bold text-white">
                        {typeof value === 'number' 
                          ? key.toLowerCase().includes('rate') || key.toLowerCase().includes('percentage')
                            ? `${value.toFixed(1)}%`
                            : key.toLowerCase().includes('revenue') || key.toLowerCase().includes('cost') || key.toLowerCase().includes('savings')
                            ? formatCurrency(value)
                            : formatNumber(value)
                          : value}
                      </p>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue Chart */}
              {reportData.revenue_by_day && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <GlassCard className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      Revenue Trend
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={Object.entries(reportData.revenue_by_day).map(([date, revenue]) => ({
                        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        revenue
                      }))}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem',
                            color: '#fff'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#8b5cf6" 
                          fillOpacity={1} 
                          fill="url(#revenueGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </motion.div>
              )}

              {/* Status Breakdown */}
              {reportData.status_breakdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <GlassCard className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-blue-400" />
                      Order Status Distribution
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={Object.entries(reportData.status_breakdown).map(([status, count]) => ({
                            name: status,
                            value: count
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.keys(reportData.status_breakdown).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem',
                            color: '#fff'
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </motion.div>
              )}

              {/* Channel Usage */}
              {reportData.channel_usage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.0 }}
                >
                  <GlassCard className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-purple-400" />
                      Channel Usage
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={Object.entries(reportData.channel_usage).map(([channel, count]) => ({
                        channel: channel.charAt(0).toUpperCase() + channel.slice(1),
                        messages: count
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="channel" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem',
                            color: '#fff'
                          }}
                        />
                        <Bar dataKey="messages" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </GlassCard>
                </motion.div>
              )}

              {/* AI Performance */}
              {reportData.ai_performance && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.1 }}
                >
                  <GlassCard className="p-6">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Brain className="w-5 h-5 text-pink-400" />
                      AI Automation
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(reportData.ai_performance).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="text-white font-semibold">
                            {typeof value === 'number' 
                              ? key.toLowerCase().includes('rate')
                                ? `${value.toFixed(1)}%`
                                : formatNumber(value)
                              : value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </div>

            {/* AI Insights */}
            {reportData.ai_insights && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <GlassCard className="p-6">
                  <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-yellow-400" />
                    AI-Powered Insights
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {reportData.ai_insights.trends && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-purple-400 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Key Trends
                        </h4>
                        <ul className="space-y-2">
                          {(Array.isArray(reportData.ai_insights.trends) 
                            ? reportData.ai_insights.trends 
                            : [reportData.ai_insights.trends]
                          ).map((trend, index) => (
                            <li key={index} className="text-slate-300 pl-4 border-l-2 border-purple-500/50">
                              {trend}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {reportData.ai_insights.recommendations && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-blue-400 flex items-center gap-2">
                          <Target className="w-5 h-5" />
                          Recommendations
                        </h4>
                        <ul className="space-y-2">
                          {(Array.isArray(reportData.ai_insights.recommendations)
                            ? reportData.ai_insights.recommendations
                            : [reportData.ai_insights.recommendations]
                          ).map((rec, index) => (
                            <li key={index} className="text-slate-300 pl-4 border-l-2 border-blue-500/50">
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {reportData.ai_insights.summary && (
                    <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-slate-300 leading-relaxed">{reportData.ai_insights.summary}</p>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="p-12">
              <div className="text-center">
                <BarChart3 className="w-20 h-20 text-slate-400 mx-auto mb-4 opacity-20" />
                <h3 className="text-2xl font-semibold text-white mb-2">No Report Generated Yet</h3>
                <p className="text-slate-400 mb-6">
                  Select a report type and click "Generate AI Report" to create comprehensive analytics
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium flex items-center gap-2 mx-auto hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Generate First Report
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </div>
  );
}
