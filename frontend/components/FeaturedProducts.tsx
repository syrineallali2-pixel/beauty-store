'use client';

import { useState, useEffect, useRef } from 'react';
import { useCartStore } from '../lib/cartStore';
import Link from 'next/link';
import { createPortal } from 'react-dom';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  image_url: string;
}

function BagIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M7.5 8.5h9l-.8 10.2a2 2 0 0 1-2 1.8H10a2 2 0 0 1-2-1.8L7.5 8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 8.5V7a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.5 12.2c1.6 1.5 3.4 1.5 5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const sectionRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchRandomProducts = async () => {
      try {
        const cachedProducts = sessionStorage.getItem('lumiere_featured_products');
        if (cachedProducts) {
          setProducts(JSON.parse(cachedProducts));
          setLoading(false);
          return;
        }

        const res = await fetch('/api/products/featured');
        if (!res.ok) throw new Error('Failed to fetch from Postgres API');
        const data = await res.json();
        setProducts(data);
        sessionStorage.setItem('lumiere_featured_products', JSON.stringify(data));
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRandomProducts();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-10');
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const cards = document.querySelectorAll('.product-card-reveal');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [products]);

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: Number(product.price),
      image_url: product.image_url,
      quantity: 1
    });

    setToastMessage(`Added "${product.name}" to cart.`);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  if (loading) return <div className="w-full py-24 flex justify-center text-[#A63C52]">Loading...</div>;
  if (products.length === 0) return null;

  return (
    <section ref={sectionRef} className="max-w-7xl mx-auto px-8 py-24 relative z-10">
      <div className="flex flex-col items-center mb-12 text-center">
        <span className="text-[#FFB6C1] text-xs font-bold tracking-widest uppercase mb-2">Curated For You</span>
        <h2 className="font-serif text-4xl text-[#A63C52]">Discover Signatures</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="product-card-reveal opacity-0 translate-y-10 transition-all duration-700 ease-out flex flex-col group bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 overflow-hidden"
            style={{ transitionDelay: `${index * 150}ms` }}
          >
            <div className="relative w-full h-72 overflow-hidden bg-gray-100">
              <Link href={`/product/${product.id}`} className="absolute inset-0 z-10 block" />
              <img
                src={product.image_url?.startsWith('//') ? 'https:' + product.image_url : product.image_url || '/placeholder.png'}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20 pointer-events-none">
                <button
                  onClick={() => handleAddToCart(product)}
                  className="bg-white text-[#A63C52] font-bold py-3 px-6 rounded-full shadow-lg hover:scale-105 transition-transform pointer-events-auto"
                >
                  Quick Add
                </button>
              </div>
            </div>

            <div className="p-6 flex flex-col flex-1">
              <Link href={`/product/${product.id}`} className="block flex-1 cursor-pointer">
                <span className="text-xs text-gray-500 font-medium uppercase mb-1 block">{product.brand || 'Lumière'}</span>
                <h3 className="text-lg font-semibold text-[#3D262B] mb-2 group-hover:text-[#A63C52] transition-colors">{product.name}</h3>
              </Link>
              <div className="mt-auto pt-4 flex justify-between items-center border-t border-gray-100">
                <Link href={`/product/${product.id}`} className="text-xl font-bold text-[#A63C52] cursor-pointer">
                  ${Number(product.price).toFixed(2)}
                </Link>
                <button
                  onClick={() => handleAddToCart(product)}
                  className="h-10 w-10 rounded-full bg-pink-50 text-[#A63C52] hover:bg-[#A63C52] hover:text-white hover:scale-110 transition-all flex items-center justify-center"
                  aria-label={`Add ${product.name} to cart`}
                >
                  <BagIcon />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {toastMessage && mounted && createPortal(
        <div className="fixed bottom-6 left-6 z-[99999] bg-[#3D262B] text-white px-5 py-3.5 rounded-2xl shadow-2xl">
          <p className="text-xs font-medium">{toastMessage}</p>
        </div>,
        document.body
      )}
    </section>
  );
}
