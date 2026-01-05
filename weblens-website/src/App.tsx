import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import HowItWorks from "./pages/HowItWorks";
import Features from "./pages/Features";
import WhyWebLens from "./pages/WhyWebLens";
import Inspector from "./pages/Inspector";
import Flows from "./pages/Flows";
import Docs from "./pages/Docs";
import Roadmap from "./pages/Roadmap";
import NotFound from "./pages/NotFound";
import AiFeatures from "./pages/AiFeatures";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark" storageKey="weblens-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/features" element={<Features />} />
              <Route path="/inspector" element={<Inspector />} />
              <Route path="/flows" element={<Flows />} />
              <Route path="/why-weblens" element={<WhyWebLens />} />
              <Route path="/docs/:slug?" element={<Docs />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/ai" element={<AiFeatures />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
