import SearchBar from './SearchBar';
import { Z_INDEX } from '../lib/constants';

export default function Header({ onSearch }) {
  return (
    <header
      className="text-gray-800 shadow-lg flex-shrink-0 backdrop-blur-sm"
      style={{ zIndex: Z_INDEX.header, background: '#bfddf8' }}
    >
      <div className="px-4 py-3 md:py-4">
        {/* Mobile Layout: Stack vertically */}
        <div className="flex flex-col gap-3 sm:hidden">
          <div className="flex items-center justify-center">
            <img
              src="/logo-mobile.png"
              alt="Kawal Banjir Sumatra"
              className="h-16 w-auto"
            />
          </div>
          <SearchBar onSearch={onSearch} />
        </div>

        {/* Desktop/Tablet Layout: Side by side */}
        <div className="hidden sm:flex sm:items-center sm:gap-4 md:gap-6">
          <div className="flex-shrink-0">
            <img
              src="/logo.png"
              alt="Kawal Banjir Sumatra"
              className="h-12 md:h-14 lg:h-16 w-auto"
            />
          </div>
          <div className="flex-1 min-w-0">
            <SearchBar onSearch={onSearch} />
          </div>
        </div>
      </div>
    </header>
  );
}
