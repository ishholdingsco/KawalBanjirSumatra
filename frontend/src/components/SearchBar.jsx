import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { ANIMATIONS } from '../lib/constants';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    }
  };

  const handleClear = () => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={`
        relative
        ${isFocused ? 'scale-[1.02]' : 'scale-100'}
        ${ANIMATIONS.transitionFast}
      `}>
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Cari lokasi, deskripsi, atau kategori..."
          className={`
            w-full pl-11 pr-12 py-3.5
            rounded-xl border-2
            bg-white/95 backdrop-blur-sm
            text-gray-900 placeholder-gray-500
            focus:outline-none focus:ring-4 focus:ring-blue-300/50
            ${isFocused ? 'border-blue-400 shadow-lg' : 'border-white/50 shadow-md'}
            ${ANIMATIONS.transitionFast}
          `}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={`
              absolute right-3 top-1/2 transform -translate-y-1/2
              p-1.5 rounded-full bg-gray-200 hover:bg-gray-300
              text-gray-600 hover:text-gray-900
              ${ANIMATIONS.transitionFast}
            `}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
}
