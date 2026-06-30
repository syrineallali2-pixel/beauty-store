'use client';

import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useCartStore } from '../lib/cartStore';
import SearchBar from './SearchBar';

function CartIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M7.5 8.5h9l-.8 10.2a2 2 0 0 1-2 1.8H10a2 2 0 0 1-2-1.8L7.5 8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 8.5V7a2.5 2.5 0 0 1 5 0v1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.5 12.2c1.6 1.5 3.4 1.5 5 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export default function Navbar() {
  const [user, loading] = useAuthState(auth);
  const totalItems = useCartStore((state) => state.totalItems);

  const signIn = () => signInWithPopup(auth, googleProvider);
  const signOutUser = () => signOut(auth);

  return (
    <nav className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-8 sm:py-6 relative z-50 flex flex-col gap-3">
      {/* Row 1: Logo, Desktop Search, Actions */}
      <div className="flex items-center justify-between w-full gap-4">
        {/* Logo */}
        <Link href="/" className="font-serif text-2xl font-bold tracking-wide text-[#A63C52] hover:opacity-80 transition shrink-0">
          Lumière
        </Link>

        {/* Desktop Search - Hidden on Mobile */}
        <div className="hidden sm:block flex-1 max-w-lg mx-4">
          <SearchBar className="relative w-full z-50" />
        </div>

        {/* Actions (Cart & Auth) */}
        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          <Link href="/cart" className="relative p-2 hover:scale-105 transition text-[#3D262B]">
            <CartIcon className="h-6 w-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#A63C52] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                {totalItems}
              </span>
            )}
          </Link>

          {loading ? (
            <div className="w-8 h-8 rounded-full border-2 border-[#A63C52] border-t-transparent animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3 bg-white/70 backdrop-blur-sm p-1 sm:p-1.5 pr-3 sm:pr-4 rounded-full shadow-sm border border-[#EAC9CE]">
              {user.photoURL && (
                <img src={user.photoURL} alt={user.displayName || "User profile"} className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-pink-100" />
              )}
              <span className="text-xs font-semibold text-[#705359] hidden md:inline">
                {user.displayName}
              </span>
              <button onClick={signOutUser} className="text-[10px] sm:text-[11px] bg-white text-[#705359] hover:bg-pink-50 border border-gray-200 px-2 sm:px-3 py-1 rounded-full transition font-bold uppercase tracking-wider cursor-pointer">
                Sign Out
              </button>
            </div>
          ) : (
            <button onClick={signIn} className="bg-[#A63C52] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium hover:bg-[#8F3045] shadow-sm hover:shadow-md transition-all cursor-pointer">
              <span className="hidden min-[400px]:inline">Sign in with Google</span>
              <span className="min-[400px]:hidden">Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Mobile Search - Hidden on Desktop */}
      <div className="sm:hidden w-full">
        <SearchBar className="relative w-full z-50 block" />
      </div>
    </nav>
  );
}
