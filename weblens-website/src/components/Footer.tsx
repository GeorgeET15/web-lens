import { Link } from "react-router-dom";
import { ArrowUpRight, Command, Github, Twitter, Shield, Terminal } from "lucide-react";

const footerLinks = {
  ENGINE: [
    { name: "Theory", href: "/how-it-works" },
    { name: "Flows", href: "/flows" },
    { name: "Features", href: "/features" },
    { name: "Inspector", href: "/inspector" },
  ],
  LOGIC: [
    { name: "Manifesto", href: "/docs" },
    { name: "Blocks", href: "/docs/blocks" },
    { name: "TAF_System", href: "/docs/taf" },
  ],
  LINKS: [
    { name: "GitHub", href: "https://github.com", external: true },
    { name: "System_Status", href: "#", external: true },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12 relative z-10">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand Panel */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-5 w-5 bg-primary flex items-center justify-center rounded-none shadow-[0_0_10px_rgba(99,102,241,0.4)]">
                <Command className="h-3 w-3 text-white" />
              </div>
              <span className="font-black tracking-tighter text-xs uppercase">WEBLENS</span>
            </Link>
            <p className="text-[10px] text-muted-foreground leading-relaxed font-mono opacity-50">
              Deterministic UI verification engine.<br />
              Built for production-grade reliability.<br />
              v1.1.0_STABLE
            </p>
          </div>

          {/* Nav Maps */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="space-y-3">
              <div className="tech-label text-[9px] text-primary">{category}</div>
              <ul className="space-y-1.5">
                {links.map((link) => (
                  <li key={link.name}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group/link"
                      >
                        {link.name.toUpperCase()}
                        <ArrowUpRight className="h-2 w-2 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.name.toUpperCase()}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* System Diagnostics Bar */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full bg-success animate-pulse" />
                <span className="tech-label text-[7px] opacity-40">LOCAL_RUNTIME_ACTIVE</span>
             </div>
             <div className="flex items-center gap-1.5">
                <Shield className="h-2.5 w-2.5 text-muted-foreground/30" />
                <span className="tech-label text-[7px] opacity-40">LOCAL_STORAGE_ONLY</span>
             </div>
          </div>
          
          <div className="flex items-center gap-6 font-mono text-[8px] text-muted-foreground/30">
             <span>© 2025 WEBLENS_SYS</span>
             <Link to="#" className="hover:text-primary transition-colors">PRIVACY_PROT</Link>
             <Link to="#" className="hover:text-primary transition-colors">TERM_OF_OP</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
