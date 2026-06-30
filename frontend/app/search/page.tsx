'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useCartStore } from '../../lib/cartStore';
import Link from 'next/link';
import Navbar from '../../components/Navbar';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image_url: string;
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setProducts([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (err) {
        console.error("Failed fetching search page catalog data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#FFF5F5] via-[#FFFBF9] to-[#FFF0F2] text-[#3D262B]">
      <Navbar />

      {/* SEARCH MAIN RESULTS CONTAINER WORKSPACE */}
      <main className="mx-auto max-w-7xl px-4 sm:px-8 py-12 relative z-10">
        <h1 className="font-serif text-2xl sm:text-3xl font-light mb-1">
          Search Results for: <span className="italic font-normal text-[#A63C52]">"{query}"</span>
        </h1>
        <p className="text-sm text-[#705359] mb-8">
          {loading ? 'Searching catalog...' : `${products.length} stunning matching items found`}
        </p>

        {/* Loading Matrix Grid State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white/40 border border-pink-100 rounded-3xl p-4 h-80 flex flex-col justify-between">
                <div className="bg-gray-200/40 h-48 rounded-2xl w-full" />
                <div className="space-y-2 mt-4">
                  <div className="bg-gray-200/40 h-3 w-1/3 rounded" />
                  <div className="bg-gray-200/40 h-4 w-3/4 rounded" />
                  <div className="bg-gray-200/40 h-4 w-1/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          /* Empty Search Fallback State */
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-pink-100 p-8 sm:p-12 text-center shadow-sm max-w-xl mx-auto space-y-4">
            <p className="text-[#705359]">We couldn't find any items matching your criteria. Try adjusting your keywords.</p>
            <Link href="/" className="bg-[#A63C52] text-white px-6 py-2.5 rounded-full inline-block text-sm font-medium hover:bg-[#8F3045] transition-all shadow-sm cursor-pointer">
              Return to Homepage
            </Link>
          </div>
        ) : (
          /* Active Grid Collection Display Panel */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {products.map((product) => (
              <div key={product.id} className="glass-card border border-pink-100 rounded-3xl p-4 flex flex-col justify-between group transition-all duration-300">
                <Link href={`/product/${product.id}`} className="block cursor-pointer">
                  <div className="relative overflow-hidden rounded-2xl aspect-square bg-white border border-pink-50">
                    <img 
                      src={product.image_url?.startsWith('//') ? 'https:' + product.image_url : product.image_url || '/placeholder.png'} 
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                </Link>
                <div className="mt-4 flex-1 flex flex-col justify-between">
                  <Link href={`/product/${product.id}`} className="block cursor-pointer">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mb-0.5">{product.brand || 'Lumière'}</p>
                    <h3 className="font-semibold text-[#3D262B] text-sm group-hover:text-[#A63C52] transition-colors line-clamp-2">{product.name}</h3>
                  </Link>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <Link href={`/product/${product.id}`} className="font-serif text-base font-bold text-[#3D262B] hover:text-[#A63C52] transition-colors">
                      ${Number(product.price).toFixed(2)}
                    </Link>
                    <button 
                      onClick={() => addItem({ ...product, price: Number(product.price), quantity: 1 })}
                      className="bg-[#A63C52] hover:bg-[#8F3045] text-white text-xs font-medium px-4 py-2 rounded-full shadow-sm transition-all transform active:scale-95 cursor-pointer"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5F5]">
        <p className="text-[#A63C52] animate-pulse text-sm font-medium tracking-wide">Loading matching products...</p>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
