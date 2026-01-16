import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Database } from 'lucide-react';
import { cn } from '../lib/utils';

interface VariableInputProps {
    value: string;
    onChange: (value: string) => void;
    savedValues?: { key: string; label: string }[];
    placeholder?: string;
    className?: string;
    autoFocus?: boolean;
    disabled?: boolean;
}

export function VariableInput({ value, onChange, savedValues, placeholder, className, autoFocus, disabled }: VariableInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filter, setFilter] = useState('');
    const [cursorPos, setCursorPos] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    const updateCoords = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Default position: below the input
            let top = rect.bottom + window.scrollY;
            let left = rect.left + window.scrollX;
            
            // Check if dropdown would overflow bottom of viewport
            const dropdownHeight = 200; // max-h-48 = ~192px
            if (rect.bottom + dropdownHeight > viewportHeight) {
                // Position above input instead
                top = rect.top + window.scrollY - dropdownHeight - 2; // 2px gap
            }
            
            // Check if dropdown would overflow right of viewport
            if (left + rect.width > viewportWidth) {
                left = viewportWidth - rect.width - 10; // 10px margin
            }
            
            setCoords({
                top,
                left,
                width: rect.width
            });
        }
    };

    useEffect(() => {
        if (showSuggestions) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
        }
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [showSuggestions]);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart || 0;
        setCursorPos(pos);
        onChange(val);

        const textBeforeCursor = val.slice(0, pos);
        const match = textBeforeCursor.match(/\{\{([^}]*)$/);
        
        if (match) {
            setShowSuggestions(true);
            setFilter(match[1].trim());
        } else {
            setShowSuggestions(false);
        }
    };

    const selectVariable = (key: string) => {
        const textBefore = value.slice(0, cursorPos).replace(/\{\{[^}]*$/, `{{${key}}}`);
        const textAfter = value.slice(cursorPos);
        onChange(textBefore + textAfter);
        setShowSuggestions(false);
        
        // Fix: Move cursor to end of inserted variable
        setTimeout(() => {
            const el = inputRef.current;
            if (el) {
                const newPos = textBefore.length;
                el.setSelectionRange(newPos, newPos);
                el.focus();
            }
        }, 0);
    };

    return (
        <div className={cn("relative w-full", showSuggestions && "z-[9999]")}>
            <input 
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInput}
                placeholder={placeholder}
                className={className}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                autoFocus={autoFocus}
                disabled={disabled}
            />
            {showSuggestions && coords && createPortal(
                <div 
                    className="fixed z-[10000] bg-zinc-900 border border-indigo-500/50 rounded-lg shadow-2xl max-h-48 overflow-y-auto scrollbar-hide"
                    style={{
                        top: coords.top + 2, // Reduce gap from default
                        left: coords.left,
                        width: coords.width,
                    }}
                >
                    <div className="p-1 text-[9px] text-zinc-500 uppercase font-bold border-b border-white/5 px-2 bg-black/20">Suggestions</div>
                    {savedValues?.filter((v: any) => v.key.toLowerCase().includes(filter.toLowerCase())).map((v: any) => (
                        <button
                            key={v.key}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur
                                selectVariable(v.key);
                            }}
                            className="w-full px-3 py-2 text-left text-[10px] text-zinc-300 hover:bg-indigo-500/20 hover:text-indigo-400 border-b border-white/5 last:border-0 transition-colors flex items-center gap-2"
                        >
                            <Database className="w-3 h-3 opacity-50" />
                            <div className="flex flex-col">
                                <span className="font-mono text-indigo-400">{v.key}</span>
                                {v.label && v.label !== v.key && <span className="text-[8px] text-zinc-500">{v.label}</span>}
                            </div>
                        </button>
                    ))}
                    {savedValues?.filter((v: any) => v.key.toLowerCase().includes(filter.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-[10px] text-zinc-600 italic">No variables match "{filter}"</div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
