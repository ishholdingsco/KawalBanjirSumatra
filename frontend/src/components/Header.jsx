import SearchBar from './SearchBar';
import { Z_INDEX } from '../lib/constants';

export default function Header({ onSearch }) {
  return (
    <header
      className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg flex-shrink-0 backdrop-blur-sm"
      style={{ zIndex: Z_INDEX.header }}
    >
      <div className="px-4 py-3 md:py-4">
        <div className="mb-3 md:mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold truncate flex items-center gap-2">
              <span className="text-2xl">🌊</span>
              Kawal Banjir Sumatra
            </h1>
            <p className="text-xs md:text-sm text-blue-100 hidden sm:block">
              Sistem Monitoring Banjir Real-time
            </p>
          </div>
        </div>
        <SearchBar onSearch={onSearch} />
      </div>
    </header>
  );
}
