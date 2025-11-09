import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Assistant from './pages/Assistant';
import Integrations from './pages/Integrations';
import IntegrationsManagement from './pages/IntegrationsManagement';
import Messages from './pages/Messages';
import Orders from './pages/Orders';
import OrderTracking from './pages/OrderTracking';
import Products from './pages/Products';
import BotTraining from './pages/BotTraining';
import SocialMedia from './pages/SocialMedia';
import Reports from './pages/Reports';
import Subscription from './pages/Subscription';
import UsageDashboard from './pages/UsageDashboard';
import Settings from './pages/Settings';
import About from './pages/About';
import Login from './pages/Login';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  // Testing mode - bypass authentication
  const testingMode = import.meta.env.VITE_TESTING_MODE === 'true';
  
  if (testingMode) {
    return children;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Main Layout
function MainLayout({ children }) {
  const testingMode = import.meta.env.VITE_TESTING_MODE === 'true';
  
  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        {testingMode && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-6 py-2 text-yellow-400 text-sm font-medium">
            🧪 Testing Mode Active - Authentication Disabled
          </div>
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const initialize = useAuthStore(state => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/assistant" element={<Assistant />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/integrations/manage" element={<IntegrationsManagement />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/order-tracking" element={<OrderTracking />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/inbox" element={<Messages />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/bot-training" element={<BotTraining />} />
                    <Route path="/social-media" element={<SocialMedia />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/subscription" element={<Subscription />} />
                    <Route path="/usage" element={<UsageDashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/about" element={<About />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(26, 26, 46, 0.95)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            backdropFilter: 'blur(20px)',
            color: '#fff',
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
