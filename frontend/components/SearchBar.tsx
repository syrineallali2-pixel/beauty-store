'use client';

import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '../lib/cartStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image_url: string;
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="5.8" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.2 15.2 4.1 4.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function SearchBar({ className }: { className?: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLFormElement>(null);
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced instant preview fetch
  useEffect(() => {
    const fetchSearch = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle hitting Enter or clicking search
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      setIsSearching(true);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} ref={wrapperRef} className={className || "relative w-full max-w-xs md:max-w-md hidden sm:block z-50"}>
      {/* Search Input Box */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, brands and press Enter..."
          className="w-full bg-white/50 backdrop-blur-md border border-[#EAC9CE] text-[#3D262B] placeholder-[#705359]/60 rounded-full py-2 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-[#A63C52]/40 transition-all shadow-sm"
        />
        <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:scale-110 transition-transform">
          <SearchIcon />
        </button>
        {isSearching && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-[#A63C52] border-t-transparent rounded-full animate-spin"></div>
          </span>
        )}
      </div>

      {/* Quick Dropdown Preview Menu */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl border border-pink-100 rounded-2xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
          {results.slice(0, 5).map((product) => {
            // Safe image rendering just like the main pages
            const cleanImageUrl = product.image_url?.startsWith('//') 
              ? 'https:' + product.image_url 
              : (product.image_url || '/placeholder.png');

            return (
              <div key={product.id} className="flex items-center gap-4 p-3 hover:bg-pink-50/80 transition-colors border-b border-pink-50/50 last:border-0 group">
                
                {/* Wrap only the image and text in the Next.js Link. */}
                <Link 
                  href={`/product/${product.id}`} 
                  onClick={() => setIsOpen(false)} // Close dropdown when they click a product
                  className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                >
                  <img 
                    src={cleanImageUrl} 
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover bg-gray-50 border border-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400 truncate">
                      {product.brand || 'Lumière'}
                    </p>
                    <p className="text-sm font-semibold text-[#3D262B] truncate group-hover:text-[#A63C52] transition-colors">
                      {product.name}
                    </p>
                    <p className="text-sm font-medium text-[#705359]">
                      ${Number(product.price).toFixed(2)}
                    </p>
                  </div>
                </Link>

                {/* Keep the Add to Cart button completely separate. */}
                <button 
                  type="button"
                  onClick={(e) => {
                    // Prevent the click from accidentally triggering anything else
                    e.preventDefault(); 
                    e.stopPropagation();
                    
                    addItem({ ...product, price: Number(product.price), quantity: 1, image_url: cleanImageUrl });
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="p-2 rounded-full bg-pink-50 text-[#A63C52] hover:bg-[#A63C52] hover:text-white transition-all transform hover:scale-105"
                  title="Add to cart"
                >
                  +
                </button>

              </div>
            );
          })}
          
          <button
            type="submit"
            className="w-full text-center py-2.5 bg-pink-50/50 text-xs font-semibold text-[#A63C52] hover:bg-[#A63C52] hover:text-white transition-colors tracking-wide uppercase"
          >
            See all matching results
          </button>
        </div>
      )}
    </form>
  );
}
