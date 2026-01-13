import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { 
  Sun, 
  Moon, 
  Monitor,
  Activity,
  Layers,
  Search,
  Book,
  Command,
  ChevronRight,
  Terminal,
  Cpu,
  Brain,
  Unplug
} from "lucide-react";

const navigation = [
  { name: "How it Works", href: "/how-it-works", icon: Activity },
  { name: "Features", href: "/features", icon: Layers },
  { name: "AI Assistant", href: "/ai", icon: Brain },
  { name: "Documentation", href: "/docs", icon: Book },
];

export function Header() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-14">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo Section */}
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/logo-no-bg.png" alt="WebLens" className="h-8 w-8 group-hover:drop-shadow-[0_0_8px_rgba(99,102,241,0.6)] transition-all" />
            <span className="font-black tracking-tighter text-base uppercase">WEBLENS</span>
            <div className="h-5 w-px bg-border ml-2" />
            <span className="tech-label text-[9px] opacity-40">v1.0.0</span>
          </Link>

          {/* Technical Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== "/" && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1 text-[11px] font-bold tracking-tight transition-colors border-b-2 border-transparent h-14 mt-[1px]",
                    isActive 
                      ? "text-primary border-primary bg-secondary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name.toUpperCase()}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-6">

          {/* Minimal Theme Toggle */}
          <div className="flex items-center gap-1 border border-border bg-secondary p-1">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative h-7 w-7 flex items-center justify-center hover:bg-secondary transition-colors group overflow-hidden"
              aria-label="Toggle Theme"
            >
              <Sun className="h-4 w-4 text-warning absolute transition-all duration-500 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
              <Moon className="h-4 w-4 text-primary absolute transition-all duration-500 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
            </button>
          </div>


          <Button
            size="sm"
            className="h-9 px-5 bg-primary text-white rounded-none text-[11px] font-black tracking-widest hover:bg-primary/90 border-none"
            asChild
          >
            <Link to="/docs" className="gap-2">
              Get Started
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
