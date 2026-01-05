import { cn } from "@/lib/utils";

interface MediaFrameProps {
  src: string;
  type?: "image" | "video"; // Optional, will auto-detect from file extension
  label?: string;
  caption?: string;
  className?: string;
}

export function MediaFrame({ 
  src, 
  type, 
  label = "SOURCE: ENGINE_PROBE_V1", 
  caption,
  className 
}: MediaFrameProps) {
  // Auto-detect media type from file extension if not explicitly provided
  const isVideo = type === "video" || 
    (!type && (src.endsWith('.mp4') || src.endsWith('.webm') || src.endsWith('.mov')));
  
  return (
    <div className={cn(
      "relative border border-border bg-card shadow-2xl group overflow-hidden",
      className
    )}>
      {/* Header Tape */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="tech-label text-[10px] opacity-70 tracking-widest">{label}</span>
        </div>
        <div className="text-[9px] font-mono opacity-30">0x42_BUFFER_SYNC</div>
      </div>

      {/* Media Content */}
      <div className="relative aspect-video">
        {isVideo ? (
          <video
            src={src}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover filter brightness-90 contrast-110"
          >
            <source src={src} type={src.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
            Your browser does not support the video tag.
          </video>
        ) : (
          <img 
            src={src} 
            alt={label} 
            className="w-full h-full object-cover filter brightness-90 contrast-110"
          />
        )}

        
        {/* Aesthetic Overlay: Scanlines & Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      {/* Footer Info (Optional) */}
      {caption && (
        <div className="px-5 py-4 bg-secondary border-t border-border">
          <p className="text-[11px] text-muted-foreground font-mono leading-relaxed opacity-80">
            {">"} EXEC_ANALYSIS: {caption}
          </p>
        </div>
      )}

      {/* Corner Accents */}
      <div className="absolute -top-px -left-px h-2 w-2 border-t border-l border-primary opacity-40" />
      <div className="absolute -bottom-px -right-px h-2 w-2 border-b border-r border-primary opacity-40" />
    </div>
  );
}
