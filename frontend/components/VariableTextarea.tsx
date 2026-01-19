import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Database } from 'lucide-react';
import { cn } from '../lib/utils';

interface VariableTextareaProps {
    value: string;
    onChange: (value: string) => void;
    savedValues?: { key: string; label: string }[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onBlur?: () => void;
    autoFocus?: boolean;
}

export function VariableTextarea({ 
    value, 
    onChange, 
    savedValues, 
    placeholder, 
    className,
    disabled,
    onKeyDown,
    onBlur,
    autoFocus
}: VariableTextareaProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filter, setFilter] = useState('');
    const [cursorPos, setCursorPos] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    const updateCoords = () => {
        if (textareaRef.current) {
            const rect = textareaRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            
            // Default position: below the textarea
            let top = rect.bottom + window.scrollY;
            let left = rect.left + window.scrollX;
            
            // Check if dropdown would overflow bottom of viewport
            const dropdownHeight = 200; // max-h-48 = ~192px
            if (rect.bottom + dropdownHeight > viewportHeight) {
                // Position above textarea instead
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

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            // Reset height to auto to correctly calculate new scrollHeight (shrink if needed)
            textareaRef.current.style.height = 'auto';
            // Set new height based on content
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
        
        // Return focus
        setTimeout(() => textareaRef.current?.focus(), 10);
    };

    // Shared typography classes
    const typographyClasses = "font-mono text-sm leading-relaxed whitespace-pre-wrap break-words tracking-normal";

    return (
        <div className={cn("relative w-full", showSuggestions && "z-[9999]")}>
            {/* Actual textarea (Visible) */}
            <textarea 
                ref={textareaRef}
                value={value}
                onChange={handleInput}
                data-gramm="false" // Disable Grammarly
                spellCheck="false"
                onClick={(e) => setCursorPos(e.currentTarget.selectionStart || 0)}
                onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart || 0)}
                placeholder={placeholder}
                className={cn(
                    className, // Inherit padding/height from parent
                    "relative caret-white block w-full text-zinc-100 bg-transparent", // Visible text
                    typographyClasses
                )}
                onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200);
                    onBlur?.();
                }}
                onKeyDown={onKeyDown}
                disabled={disabled}
                autoFocus={autoFocus}
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
                    <div className="p-1 px-2 text-[9px] text-zinc-500 uppercase font-black border-b border-white/5 bg-black/20">Suggestions</div>
                    {savedValues?.filter(v => v.key.toLowerCase().includes(filter.toLowerCase())).map(v => (
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
                    {savedValues?.filter(v => v.key.toLowerCase().includes(filter.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-[10px] text-zinc-600 italic">No variables match "{filter}"</div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
