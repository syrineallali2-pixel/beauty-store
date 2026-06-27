'use client';

import { useCartStore } from '../../lib/cartStore';
import Link from 'next/link';
import { useState, useEffect } from 'react';

function CartIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M7.5 8.5h9l-.8 10.2a2 2 0 0 1-2 1.8H10a2 2 0 0 1-2-1.8L7.5 8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 8.5V7a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.5 12.2c1.6 1.5 3.4 1.5 5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M8 9.5v8M12 9.5v8M16 9.5v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5.5 6.5h13M9 6.5l.7-2h4.6l.7 2M7 6.5l.7 14h8.6l.7-14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CartTitle() {
  return (
    <h1 className="text-3xl font-serif font-bold text-center mb-8 text-[#3D262B] flex items-center justify-center gap-3">
      <CartIcon className="h-8 w-8 text-[#A63C52]" />
      Your Cart
    </h1>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // This calculates the live price based on current item counts.
  const dynamicTotal = items.reduce((accumulator, item) => {
    return accumulator + (Number(item.price) * item.quantity);
  }, 0);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-tr from-[#FFF5F5] via-[#FFFBF9] to-[#FFF0F2] py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <CartTitle />
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-8 text-center">
            <p className="text-[#705359] animate-pulse text-sm font-medium">Loading your cart...</p>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-tr from-[#FFF5F5] via-[#FFFBF9] to-[#FFF0F2] py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <CartTitle />
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-8 text-center">
            <p className="text-[#705359] mb-6 font-medium">Your cart is empty</p>
            <Link href="/" className="bg-[#A63C52] text-white px-6 py-2.5 rounded-full inline-block font-medium shadow-sm hover:bg-[#8F3045] transition-colors">
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-tr from-[#FFF5F5] via-[#FFFBF9] to-[#FFF0F2] py-12 text-[#3D262B]">
      <div className="container mx-auto px-4 max-w-3xl">
        <CartTitle />
        
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 p-5 border-b border-pink-50 items-center">
              <img 
                src={item.image_url?.startsWith('//') ? 'https:' + item.image_url : item.image_url || '/placeholder.png'}
                alt={item.name}
                className="w-20 h-20 object-contain bg-gray-50 rounded-xl p-1 border border-pink-50"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-base text-[#3D262B] line-clamp-1">{item.name}</h3>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{item.brand || 'Lumière'}</p>
                <p className="text-sm font-bold text-[#A63C52]">${Number(item.price).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Quantity selection menu */}
                <select
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                  className="border border-[#EAC9CE] bg-white text-sm rounded-xl px-3 py-1.5 font-medium text-[#705359] focus:outline-none focus:ring-1 focus:ring-[#A63C52] cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-[#A63C52] hover:text-[#8F3045] hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                  title="Remove item"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
          
          <div className="p-6 bg-pink-50/30 border-t border-pink-50">
            <div className="flex justify-between items-center mb-6">
              <span className="font-medium text-base text-[#705359]">Subtotal:</span>
              {/* Dynamic total updates automatically */}
              <span className="font-serif font-bold text-2xl text-[#A63C52]">${dynamicTotal.toFixed(2)}</span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={clearCart}
                className="flex-1 border border-[#EAC9CE] text-[#705359] rounded-full py-3 text-sm font-medium hover:bg-white/60 active:scale-[0.99] transition-all cursor-pointer"
              >
                Clear Cart
              </button>
              <button className="flex-1 bg-[#A63C52] text-white rounded-full py-3 text-sm font-medium shadow-sm hover:bg-[#8F3045] active:scale-[0.99] transition-all cursor-pointer">
                Checkout
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-[#A63C52] hover:underline font-medium">
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
}
