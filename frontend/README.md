# Lumiere Beauty AI Frontend

Lumiere is a full-stack beauty shopping and recommendation experience. The frontend is built with Next.js and provides a polished storefront, product search, product detail pages, cart management, Firebase authentication, and an AI beauty assistant.

The app connects to:
- Next.js API routes for product search, featured products, and product details.
- A FastAPI recommendation backend for AI-assisted beauty advice.
- PostgreSQL for product catalog data.
- Firebase for authentication and chat history.

## Key Features

- Luxury beauty homepage with scroll-based reveal animations.
- Product discovery, search, and product detail pages.
- Cart state powered by Zustand.
- Google sign-in through Firebase.
- AI beauty assistant with saved conversations.
- Backend proxy route for recommendation requests.
- Responsive styling with Tailwind CSS.
- GSAP-powered reveal animation for editorial sections.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Firebase
- Zustand
- PostgreSQL client
- GSAP

## Project Structure

```txt
frontend/
├── app/
│   ├── page.tsx                 # Homepage
│   ├── explore/page.tsx         # Product catalog
│   ├── product/[id]/page.tsx    # Product details
│   ├── cart/page.tsx            # Shopping cart
│   ├── search/page.tsx          # Search results
│   └── api/                     # Next.js API routes
├── components/
│   ├── AIChat.tsx               # AI assistant widget
│   ├── FeaturedProducts.tsx     # Homepage product section
│   └── SearchBar.tsx            # Search input and preview menu
├── lib/
│   ├── cartStore.ts             # Zustand cart store
│   └── firebase.ts              # Firebase client setup
└── public/                      # Images and static assets
```

## Environment Variables

Create `frontend/.env.local` and configure the values used by Firebase, PostgreSQL, and the backend proxy.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

DATABASE_URL=
BACKEND_URL=http://127.0.0.1:8080
```

Do not commit real API keys or database credentials.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Available Scripts

```bash
npm run dev      # Start local development server
npm run build    # Build production app
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Backend Connection

The chat assistant calls `app/api/chat/route.ts`, which forwards requests to the FastAPI backend:

```txt
POST /recommend
```

By default, the frontend expects the backend at:

```txt
http://127.0.0.1:8080
```

Set `BACKEND_URL` in `.env.local` if your backend runs somewhere else.

## Product Data

Product routes read from PostgreSQL through `DATABASE_URL`:

- `GET /api/products/search`
- `GET /api/products/featured`
- `GET /api/products/[id]`

Make sure the database includes a `products` table with product names, brands, prices, image URLs, and related metadata.

## Notes

- The app uses `next/font`, so production builds may need internet access to fetch Google-hosted fonts.
- The current UI relies on static assets inside `public/`.
- The AI assistant requires the FastAPI backend to be running for recommendation responses.
