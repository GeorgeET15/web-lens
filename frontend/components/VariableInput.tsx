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
}

export function VariableInput({ value, onChange, savedValues, placeholder, className }: VariableInputProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filter, setFilter] = useState('');
    const [cursorPos, setCursorPos] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    const updateCoords = () => {
        if (inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
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
            />
            {showSuggestions && coords && createPortal(
                <div 
                    className="fixed z-[10000] bg-gray-900 border border-indigo-500/50 rounded-lg shadow-2xl max-h-48 overflow-y-auto"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        width: coords.width,
                    }}
                >
                    <div className="p-1 text-[9px] text-gray-500 uppercase font-bold border-b border-white/5 px-2">Suggestions</div>
                    {savedValues?.filter((v: any) => v.key.toLowerCase().includes(filter.toLowerCase())).map((v: any) => (
                        <button
                            key={v.key}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur
                                selectVariable(v.key);
                            }}
                            className="w-full px-3 py-2 text-left text-[10px] text-gray-300 hover:bg-indigo-500/20 hover:text-indigo-400 border-b border-white/5 last:border-0 transition-colors flex items-center gap-2"
                        >
                            <Database className="w-3 h-3 opacity-50" />
                            <div className="flex flex-col">
                                <span className="font-mono text-indigo-400">{v.key}</span>
                                {v.label && v.label !== v.key && <span className="text-[8px] text-gray-500">{v.label}</span>}
                            </div>
                        </button>
                    ))}
                    {savedValues?.filter((v: any) => v.key.toLowerCase().includes(filter.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-[10px] text-gray-600 italic">No variables match "{filter}"</div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
