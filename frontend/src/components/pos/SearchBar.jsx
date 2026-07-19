import { Search } from 'lucide-react';

export default function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <Search
        size={20}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-forest/40"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search menu items..."
        className="w-full min-h-[52px] rounded-xl border-2 border-forest/15 bg-white py-3 pl-12 pr-4 text-base text-forest placeholder:text-forest/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
    </div>
  );
}
