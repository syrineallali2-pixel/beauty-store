'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCartStore } from '../../lib/cartStore';
import SearchBar from '../../components/SearchBar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, googleProvider } from '../../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { createPortal } from 'react-dom';

interface ProductColor {
  hex_value: string;
  colour_name: string;
}

interface Product {
  id: number | string;
  name: string;
  brand: string;
  price?: number;
  price_usd?: number;
  image_link: string;
  api_featured_image?: string;
  description: string;
  extracted_finish?: string;
  product_colors: ProductColor[];
}

function CartIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M7.5 8.5h9l-.8 10.2a2 2 0 0 1-2 1.8H10a2 2 0 0 1-2-1.8L7.5 8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 8.5V7a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.5 12.2c1.6 1.5 3.4 1.5 5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function ExplorePage() {
  // --- ALL HOOKS CALLED AT THE TOP ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShades, setSelectedShades] = useState<Record<string | number, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false); // Handles hydration safety for Portals
  
  const [user, authLoading] = useAuthState(auth);
  const addItem = useCartStore((state) => state.addItem);
  const totalItems = useCartStore((state) => state.totalItems);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const signIn = () => signInWithPopup(auth, googleProvider);
  const signOutUser = () => signOut(auth);

  // Set mounted state on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- DATA FETCHING EFFECT ---
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetch('/api/products/search?q=')
      .then((res) => res.json())
      .then((data) => {
        const rawProducts = Array.isArray(data) ? data : data.products || [];
        setProducts(rawProducts);
        
        const initialShades: Record<string | number, string> = {};
        rawProducts.forEach((p: Product) => {
          if (p.product_colors && p.product_colors.length > 0) {
            initialShades[p.id] = p.product_colors[0].hex_value;
          }
        });
        setSelectedShades(initialShades);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setLoading(false);
      });
  }, [user]);

  // --- GSAP-COMPATIBLE SCROLL REVEAL EFFECT ---
  useEffect(() => {
    if (loading || products.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-10');
          } else {
            entry.target.classList.remove('opacity-100', 'translate-y-0');
            entry.target.classList.add('opacity-0', 'translate-y-10');
          }
        });
      },
      { 
        threshold: 0.05, 
        rootMargin: "0px 0px -30px 0px" 
      }
    );

    const cards = document.querySelectorAll('.product-card-reveal');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [products, loading]);

  // --- ADD TO CART HANDLER WITH POPPING MESSAGE ---
  const handleAddToCart = (product: Product, cleanImageUrl: string) => {
    addItem({
      id: String(product.id),
      name: product.name,
      brand: product.brand || 'Lumière',
      price: Number(product.price || product.price_usd || 0),
      image_url: cleanImageUrl,
      quantity: 1
    });

    setToastMessage(`Added "${product.name}" to cart.`);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // --- CONDITIONAL RENDERS ---
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5F5]">
        <div className="w-8 h-8 border-4 border-[#A63C52] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#FFF5F5] via-[#FFFBF9] to-[#FFF0F2] flex flex-col items-center justify-center p-6 text-center text-[#3D262B]">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-pink-50 space-y-8">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl text-[#A63C52]">Welcome to Lumière</h1>
            <p className="text-gray-500 text-sm">Please sign in to explore our collection.</p>
          </div>
          <button 
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 text-gray-700 py-3.5 rounded-full font-medium hover:bg-gray-50 hover:border-gray-200 transition-all shadow-sm cursor-pointer"
          >
            Continue with Google
          </button>
          <Link href="/" className="block text-sm text-[#A63C52] hover:underline font-medium pt-4">Return to Homepage</Link>
        </div>
      </div>
    );
  }

  // --- MAIN CONTENT ---
  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#FFF5F5] via-[#FFFBF9] to-[#FFF0F2] text-[#3D262B]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6 relative z-30">
        <Link href="/" className="font-serif text-2xl font-bold tracking-wide text-[#A63C52]">Lumière</Link>
        <div className="flex-1 max-w-lg mx-8"><SearchBar /></div>
        <div className="flex items-center gap-6">
          <Link href="/cart" className="relative p-2 text-xl hover:scale-105 transition-transform">
            <CartIcon />
            {totalItems > 0 && <span className="absolute -top-1 -right-1 bg-[#A63C52] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{totalItems}</span>}
          </Link>
          <button onClick={signOutUser} className="text-[11px] bg-white text-[#705359] border px-3 py-1 rounded-full uppercase tracking-wider font-medium shadow-sm hover:bg-gray-50 cursor-pointer transition-colors">Sign Out</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12 relative z-10">
        <h1 className="font-serif text-4xl mb-10 text-[#3D262B]">The Collection</h1>
        
        {loading ? (
          <div className="w-full py-24 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A63C52]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product, index) => {
              const activeImage = product.image_link || product.api_featured_image || '/placeholder.png';
              const cleanImageUrl = activeImage.startsWith('//') ? 'https:' + activeImage : activeImage;
              
              return (
                <div 
                  key={product.id} 
                  className="product-card-reveal opacity-0 translate-y-10 transition-all duration-700 ease-out bg-white/70 p-5 rounded-[2rem] border border-pink-100/60 shadow-sm flex flex-col justify-between group will-change-transform hover:scale-105 hover:shadow-xl hover:bg-white"
                  style={{ transitionDelay: `${(index % 4) * 100}ms` }}
                >
                  <Link href={`/product/${product.id}`} className="block cursor-pointer flex-1">
                    <div className="w-full h-48 overflow-hidden rounded-2xl bg-gray-50/50 flex items-center justify-center p-4">
                      <img 
                        src={cleanImageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.png';
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-4 mb-1">
                      {product.brand || 'Lumière'}
                    </span>
                    <h3 className="font-serif text-base text-[#3D262B] line-clamp-2 group-hover:text-[#A63C52] transition-colors duration-300">
                      {product.name}
                    </h3>
                  </Link>

                  {/* UPGRADED ADD TO CART BUTTON WITH CLICKABLE INTERACTIONS */}
                  <button 
                    onClick={() => handleAddToCart(product, cleanImageUrl)}
                    className="mt-5 bg-[#A63C52] text-white w-full py-3 rounded-xl text-xs font-bold tracking-wider uppercase shadow-sm hover:bg-[#8A2F43] transition-all duration-200 transform active:scale-95 cursor-pointer relative z-20"
                  >
                    Add To Cart
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* GSAP-safe portal toast notification. */}
      {toastMessage && mounted && createPortal(
        <div className="fixed bottom-6 left-6 z-[99999] bg-[#3D262B] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-pink-950/20 max-w-sm">
          <CartIcon className="h-5 w-5 text-[#FFB6C1]" />
          <p className="text-xs font-medium tracking-wide">{toastMessage}</p>
        </div>,
        document.body
      )}
    </div>
  );
}
