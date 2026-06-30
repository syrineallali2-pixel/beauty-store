'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { useCartStore } from '../lib/cartStore';
import Link from 'next/link';

interface Product {
  id?: string;
  name: string;
  brand: string;
  price: number;
  image_url: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  follow_up?: string;
  timestamp?: string;
}

// 1. ADD THE PROP INTERFACE TYPE DEFINITION HERE
interface AIChatProps {
  avatarSrc?: string;
}

function SparkleIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path d="M10 2.5 11.8 8l5.7 2-5.7 2L10 17.5 8.2 12l-5.7-2 5.7-2L10 2.5Z" fill="currentColor" />
    </svg>
  );
}

function CloseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PointerIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" aria-hidden="true">
      <path d="M7.5 3.5v7.7L6.2 10a1.3 1.3 0 0 0-1.8 1.8l3 3.8c.6.8 1.6 1.2 2.6 1.2h2.6a3 3 0 0 0 3-3v-3.9a1.2 1.2 0 0 0-2.4 0v-.8a1.2 1.2 0 0 0-2.4 0v-.8a1.2 1.2 0 0 0-2.4 0V3.5a1.2 1.2 0 0 0-2.4 0Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 2. CONSUME PROP WITH FALLBACK VALUE IN SIGNATURE
export default function AIChat({ avatarSrc = '/ai-assistant-avatar.jpg' }: AIChatProps) {
  const [user] = useAuthState(auth);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from Firestore when user logs in
  useEffect(() => {
    if (!user) {
      setTimeout(() => setMessages([]), 0);
      return;
    }

    const loadMessages = async () => {
      try {
        const q = query(
          collection(db, `users/${user.uid}/conversations`),
          orderBy('timestamp', 'asc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const loaded = snapshot.docs.map(doc => doc.data() as Message);
        setMessages(loaded);
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    };

    loadMessages();
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // FIX: Protect Firestore from 'undefined' values by building a clean, sanitized object
  const saveMessage = async (message: Message) => {
    if (!user) return;

    const cleanMessage: {
      role: 'user' | 'assistant';
      content: string;
      timestamp: string;
      products?: Product[];
      follow_up?: string;
    } = {
      role: message.role,
      content: message.content || '',
      timestamp: message.timestamp || new Date().toISOString()
    };

    if (message.products && message.products.length > 0) {
      cleanMessage.products = message.products;
    }
    if (message.follow_up) {
      cleanMessage.follow_up = message.follow_up;
    }

    await addDoc(collection(db, `users/${user.uid}/conversations`), cleanMessage);
  };

  const sendMessage = async () => {
    if (!user) {
      alert('Please sign in to chat');
      return;
    }
    if (!input.trim() || loading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(userMessage);
    
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentInput,
          max_price: null,
          top_k: 5,
          history: messages.slice(-6) 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || 'Failed backend sync');
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.advice || 'No advice returned from server.',
        products: data.products ? data.products.slice(0, 3) : [],
        follow_up: data.follow_up || '',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(assistantMessage);
    } catch (error) {
      const errorMessageText = error instanceof Error ? error.message : 'Connection Refused';
      console.error('Error during chat transaction:', error);
      
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I'm having trouble connecting to my brain right now. (Error: ${errorMessageText})`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    
    const q = query(collection(db, `users/${user.uid}/conversations`));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    setMessages([]);
  };

  // 3. UPDATE THE CLOSED FLOATING BUTTON RENDERING LAYER HERE
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 rounded-full shadow-lg z-50 hover:scale-110 transition overflow-hidden border-2 border-pink-400 bg-white group flex items-center justify-center"
      >
        {/* Floating Sparkles Layer positioned directly over the image */}
        <span className="absolute top-1 right-2 z-10 text-[#FFB6C1] drop-shadow-md animate-bounce">
          <SparkleIcon />
        </span>
        <span className="absolute bottom-2 left-1 z-10 text-[#A63C52] drop-shadow-md animate-pulse delay-75">
          <SparkleIcon className="h-2.5 w-2.5" />
        </span>

        <img 
          src={avatarSrc} 
          alt="AI Beauty Assistant Avatar" 
          className="w-full h-full object-cover group-hover:brightness-105 transition"
        />
        
        {/* Subtle decorative internal pulse aura tag component indicator ring */}
        <span className="absolute inset-0 rounded-full border-2 border-pink-500 animate-ping opacity-25 pointer-events-none" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[500px] sm:h-[600px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border">
      <div className="flex justify-between items-center p-4 border-b bg-pink-50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          {/* Also added the custom miniature avatar to the header bar context */}
          <img src={avatarSrc} alt="" className="w-6 h-6 rounded-full object-cover border border-pink-200" />
          <span className="font-bold text-black">Lumière Assistant</span>
        </div>
        <div className="flex gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-gray-500 hover:text-red-500"
            >
              Clear
            </button>
          )}
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-[#A63C52]" aria-label="Close chat">
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-10">
            <p>Ask me about makeup products!</p>
            <p className="text-xs mt-2">Example: &quot;matte lipstick for dark skin&quot;</p>
            {!user && (
              <p className="text-xs mt-4 text-pink-500 flex items-center justify-center gap-1.5">
                <PointerIcon />
                Sign in to save your conversations
              </p>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                <p className="text-sm">{msg.content}</p>
                
                {msg.products && msg.products.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.products.map((product, pIdx) => (
                      <div key={pIdx} className="flex gap-2 bg-white rounded-lg p-2">
                        {product.id ? (
                          <Link href={`/product/${product.id}`} className="flex gap-2 flex-1 min-w-0">
                            <img 
                              src={product.image_url?.startsWith('//') ? 'https:' + product.image_url : product.image_url || '/placeholder.png'}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-black line-clamp-2">{product.name}</p>
                              <p className="text-xs text-gray-500">{product.brand}</p>
                              <p className="text-sm font-bold text-black">${product.price}</p>
                            </div>
                          </Link>
                        ) : (
                          <>
                            <img 
                              src={product.image_url?.startsWith('//') ? 'https:' + product.image_url : product.image_url || '/placeholder.png'}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-black line-clamp-2">{product.name}</p>
                              <p className="text-xs text-gray-500">{product.brand}</p>
                              <p className="text-sm font-bold text-black">${product.price}</p>
                            </div>
                          </>
                        )}
                        <button
                          onClick={() => addItem({
                            id: product.id || `${product.name}-${product.brand}`,
                            name: product.name,
                            brand: product.brand,
                            price: product.price,
                            image_url: product.image_url,
                            quantity: 1
                          })}
                          className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold hover:bg-green-600 self-center"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {msg.follow_up && (
                  <p className="text-xs mt-2 text-pink-600 font-semibold">{msg.follow_up}</p>
                )}
              </div>
            </div>
          ))
        )}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-sm text-gray-500">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask for recommendations..."
          className="flex-1 border rounded-full px-4 py-2 text-sm text-black outline-none focus:border-pink-500"
          disabled={!user}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !user}
          className="bg-pink-500 text-white px-4 py-2 rounded-full text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
      
      {!user && (
        <div className="p-2 text-center text-xs text-gray-400 border-t">
          Sign in to chat
        </div>
      )}
    </div>
  );
}
