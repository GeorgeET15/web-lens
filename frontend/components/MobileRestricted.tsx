import { Laptop, Smartphone } from 'lucide-react';

export const MobileRestricted = () => {
  return (
    <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative mb-8">
        <Smartphone className="w-16 h-16 text-zinc-700 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 opacity-50" />
        <Laptop className="w-24 h-24 text-white relative z-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]" />
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center border-4 border-black z-20">
            <div className="w-4 h-0.5 bg-white rotate-45 absolute" />
            <div className="w-4 h-0.5 bg-white -rotate-45 absolute" />
        </div>
      </div>
      
      <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-4">
        Desktop Required
      </h1>
      
      <p className="text-zinc-400 max-w-sm leading-relaxed mb-8">
        WebLens is a powerful desktop-class automation tool designed for large screens. Please switch to a laptop or desktop computer for the best experience.
      </p>

      <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] border border-zinc-800 px-4 py-2 rounded-full">
        Mobile Access Restricted
      </div>
    </div>
  );
};
