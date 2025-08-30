import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Deposits from "./pages/Deposits";
import Downloads from "./pages/Downloads";
import EnhancedInvites from "./pages/EnhancedInvites";
import CheckerFileManager from "./pages/CheckerFileManager";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  // Apply dark theme by default
  document.documentElement.classList.add("dark");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/deposits" element={<Deposits />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/invites" element={<EnhancedInvites />} />
              <Route path="/checker-files" element={<CheckerFileManager />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

createRoot(document.getElementById("root")!).render(<App />);
