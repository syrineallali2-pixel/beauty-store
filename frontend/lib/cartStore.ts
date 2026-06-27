import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  image_url: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        const existing = get().items.find(i => i.id === item.id);
        if (existing) {
          set({
            items: get().items.map(i =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            )
          });
        } else {
          set({ items: [...get().items, { ...item, quantity: 1 }] });
        }
      },
      
      removeItem: (id) => {
        set({ items: get().items.filter(i => i.id !== id) });
      },
      
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter(i => i.id !== id) });
        } else {
          set({
            items: get().items.map(i =>
              i.id === id ? { ...i, quantity } : i
            )
          });
        }
      },
      
      clearCart: () => set({ items: [] }),
      
      get totalItems() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },
      
      get totalPrice() {
        return get().items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      }
    }),
    { name: 'cart-storage' }
  )
);