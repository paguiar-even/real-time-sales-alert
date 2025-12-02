import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Monitor from "./pages/Monitor";
import TenantMonitor from "./pages/TenantMonitor";
import StaffTenantsList from "./pages/StaffTenantsList";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import MfaEnroll from "./pages/MfaEnroll";
import MfaVerify from "./pages/MfaVerify";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/mfa/enroll" element={<MfaEnroll />} />
              <Route path="/mfa/verify" element={<MfaVerify />} />
              <Route path="/t/:slug" element={<TenantMonitor />} />
              <Route path="/tenants" element={<StaffTenantsList />} />
              <Route
                path="/monitor" 
                element={
                  <ProtectedRoute>
                    <Monitor />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAdmin>
                    <Admin />
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
