'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useCartStore } from '../../../lib/cartStore';
import Navbar from '../../../components/Navbar';

interface ProductColor {
  hex_value: string;
  colour_name: string;
}

interface Product {
  id: string | number;
  name: string;
  brand: string;
  price?: number;
  price_usd?: number;
  image_url?: string;
  image_link?: string;
  api_featured_image?: string;
  description: string;
  category: string;
  extracted_finish?: string;
  tags_text?: string;
  rating_filled?: number;
  product_colors: ProductColor[];
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill={filled ? "currentColor" : "none"} aria-hidden="true">
      <path d="m10 2.4 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7L10 2.4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedShade, setSelectedShade] = useState<string>('');
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        if (data.product_colors && data.product_colors.length > 0) {
          setSelectedShade(data.product_colors[0].hex_value);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading product:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5F5]">
        <p className="text-[#A63C52] animate-pulse font-medium tracking-widest uppercase text-sm">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFF5F5] text-[#3D262B] space-y-4">
        <h1 className="text-2xl font-serif">Product Not Found</h1>
        <Link href="/explore" className="text-[#A63C52] underline hover:text-[#8F3045]">Return to Collection</Link>
      </div>
    );
  }

  const activeImage = product.image_url || product.image_link || product.api_featured_image || '/placeholder.png';
  const cleanImageUrl = activeImage.startsWith('//') ? 'https:' + activeImage : activeImage;
  const activePrice = product.price_usd ?? product.price ?? 0;
  const ratingStars = Math.round(product.rating_filled || 5);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#FFF5F5] via-[#FFFBF9] to-[#FFF0F2] text-[#3D262B]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-16 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
        {/* Left: Big Image Showcase */}
        <div className="relative aspect-square rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden bg-white shadow-xl border border-pink-50 p-6 sm:p-8 flex items-center justify-center group">
          <img 
            src={cleanImageUrl} 
            alt={product.name} 
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
            onError={(e) => (e.target as HTMLImageElement).src = '/placeholder.png'}
          />
        </div>

        {/* Right: Data & Interactions */}
        <div className="space-y-6 sm:space-y-8">
          <div>
            <p className="text-xs uppercase font-bold tracking-widest text-[#A63C52] mb-2">{product.brand || 'Lumière'}</p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#3D262B] leading-tight mb-4">{product.name}</h1>
            
            {/* Rating Stars & Tags */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex gap-0.5 text-[#C9943A]">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} filled={i < ratingStars} />
                ))}
              </div>
              {product.tags_text && (
                <span className="text-gray-500 text-xs px-2 py-1 bg-white rounded border border-gray-200 uppercase tracking-wide">
                  {product.tags_text.split(' ')[0]}
                </span>
              )}
            </div>
          </div>

          <p className="text-xl sm:text-2xl font-serif font-medium text-[#3D262B] border-y border-pink-100 py-4 sm:py-6">
            ${Number(activePrice).toFixed(2)}
          </p>

          <p className="text-gray-600 leading-relaxed text-sm md:text-base">
            {product.description || "A beautiful addition to your collection."}
          </p>

          {/* Smart Color Picker */}
          {product.product_colors?.length > 0 && (
            <div className="space-y-4 bg-white/50 p-4 sm:p-6 rounded-2xl border border-pink-50">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                Select Shade: <span className="text-[#3D262B]">
                  {product.product_colors.find(c => c.hex_value === selectedShade)?.colour_name || 'Standard'}
                </span>
              </p>
              <div className="flex flex-wrap gap-2.5 sm:gap-3">
                {product.product_colors.map((color, idx) => (
                  <button
                    key={idx}
                    title={color.colour_name}
                    onClick={() => setSelectedShade(color.hex_value)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all transform hover:scale-110 ${
                      selectedShade === color.hex_value ? 'border-[#3D262B] scale-110 shadow-md' : 'border-gray-200 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.hex_value }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add to Cart Action */}
          <button
            onClick={() => {
              const chosenColorName = product.product_colors?.find(c => c.hex_value === selectedShade)?.colour_name;
              addItem({
                id: `${product.id}-${chosenColorName || 'std'}`, 
                name: `${product.name} ${chosenColorName ? `(${chosenColorName})` : ''}`,
                brand: product.brand,
                price: Number(activePrice),
                image_url: cleanImageUrl,
                quantity: 1
              });
            }}
            className="w-full bg-[#A63C52] text-white py-3.5 sm:py-4 rounded-full font-medium tracking-wide uppercase shadow-lg hover:bg-[#8F3045] hover:shadow-xl transition-all transform active:scale-[0.98] cursor-pointer"
          >
            Add To Bag - ${Number(activePrice).toFixed(2)}
          </button>
        </div>
      </main>
    </div>
  );
}
