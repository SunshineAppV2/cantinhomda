import { useState, useRef, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';

interface AutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
    suggestions: string[];
    placeholder?: string;
    label?: string;
    className?: string;
    readOnly?: boolean;
}

export function AutocompleteInput({
    value,
    onChange,
    suggestions,
    placeholder,
    label,
    className = '',
    readOnly = false
}: AutocompleteInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter suggestions based on input
    const filteredSuggestions = useMemo(() => {
        if (!suggestions || !Array.isArray(suggestions)) return [];
        const query = (value || '').toLowerCase();
        return suggestions
            .filter(s => s && s.toLowerCase().includes(query))
            .filter(s => s !== value) // Don't show if already exactly matches
            .slice(0, 10); // Limit to 10 suggestions
    }, [suggestions, value]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1 tracking-wider uppercase">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    value={value || ''}
                    readOnly={readOnly}
                    onChange={(e) => {
                        if (readOnly) return;
                        onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => !readOnly && setIsOpen(true)}
                    placeholder={placeholder}
                    className={`w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all pr-8 ${readOnly ? 'bg-slate-50 cursor-not-allowed text-slate-500' : ''}`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Search className="w-4 h-4 text-slate-300" />
                </div>
            </div>

            {/* Suggestions Dropdown */}
            {isOpen && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                    {filteredSuggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer text-slate-700 transition-colors border-b border-slate-50 last:border-none"
                            onClick={() => {
                                onChange(suggestion);
                                setIsOpen(false);
                            }}
                        >
                            <span className="font-medium">{suggestion}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
