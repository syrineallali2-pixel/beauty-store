'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { useCartStore } from '../lib/cartStore';
import AIChat from '../components/AIChat';
import FeaturedProducts from '../components/FeaturedProducts';
import Navbar from '../components/Navbar';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function Home() {
  const [user, loading] = useAuthState(auth);
  const totalItems = useCartStore((state) => state.totalItems);

  useEffect(() => {
    if (loading) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".clip-reveal").forEach((section) => {
        gsap.fromTo(
          section,
          { clipPath: "inset(100% 0% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1.4,
            ease: "power4.out",
            scrollTrigger: {
              trigger: section,
              start: "top 85%",
              end: "top 45%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      ScrollTrigger.refresh();
    });

    return () => {
      ctx.revert();
    };
  }, [loading]);

  useEffect(() => {
    const dotColors = [
      "#ff6b9d", "#feca57", "#48dbfb", "#1dd1a1", "#a55eea",
      "#ff9ff3", "#ff6348", "#5f27cd", "#00d2d3", "#ee5a6f",
    ];
    let lastSpawn = 0;

    const handleMove = (e: MouseEvent) => {
      const page = document.querySelector(".makeup-page") as HTMLElement | null;
      if (!page) return;
      page.style.setProperty("--cursor-x", `${e.clientX}px`);
      page.style.setProperty("--cursor-y", `${e.clientY}px`);

      const now = performance.now();
      if (now - lastSpawn < 35) return;
      lastSpawn = now;

      const dot = document.createElement("span");
      dot.className = "cursor-dot";
      const size = 6 + Math.random() * 8;
      const color = dotColors[Math.floor(Math.random() * dotColors.length)];
      const dx = (Math.random() - 0.5) * 80;
      const dy = (Math.random() - 0.5) * 80 - 20;
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.background = color;
      dot.style.boxShadow = `0 0 12px ${color}`;
      dot.style.setProperty("--dx", `${dx}px`);
      dot.style.setProperty("--dy", `${dy}px`);
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 1100);
    };

    window.addEventListener("mousemove", handleMove);

    return () => {
      window.removeEventListener("mousemove", handleMove);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF5F5]">
        <p className="text-[#A63C52] animate-pulse text-sm font-medium tracking-wide">
          Loading application...
        </p>
      </div>
    );
  }

  return (
    <>
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <div className="makeup-page relative min-h-screen bg-gradient-to-tr from-[#FFF5F5] via-[#FFFBF9] to-[#FFF0F2] text-[#3D262B] selection:bg-pink-200 overflow-hidden">

            <div className="absolute left-0 right-0 mx-auto sm:left-32 sm:right-auto top-20 h-[480px] w-[320px] sm:h-[600px] sm:w-[420px] lg:left-44 lg:top-24 lg:h-[680px] lg:w-[500px] z-0 pointer-events-none select-none opacity-40 sm:opacity-90 overflow-hidden">
              <img
                src="/pexels-peterdanthy-37355182.jpg"
                alt="Lumière Editorial Model"
                className="absolute left-1/2 top-1/2 h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2 object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#FFF5F5]/85 via-transparent via-35% to-[#FFF5F5]/95" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#FFF5F5]/90 via-transparent via-25% to-[#FFF0F2]/90" />
            </div>

            <div className="cursor-glow" aria-hidden="true" />

            <Navbar />

            <main className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-8 py-16 md:grid-cols-2 lg:py-24 relative z-10">
              <div className="space-y-6 max-w-xl">
                <span className="inline-block rounded-full border border-[#EAC9CE] bg-white/60 px-4 py-1 text-xs font-semibold tracking-widest text-[#A63C52] uppercase">
                  New Spring Collection
                </span>
                <h1 className="font-serif text-5xl font-light leading-tight sm:text-6xl text-[#3D262B]">
                  Beauty in every <br />
                  <span className="italic font-normal text-[#A63C52]">brushstroke</span>
                </h1>
                <p className="text-base leading-relaxed text-[#705359]">
                  Crafted with the finest ingredients and a touch of magic.
                  Discover makeup that celebrates the artistry of you.
                </p>
                <div className="pt-4">
                  <Link href="/explore" className="inline-block rounded-full bg-[#A63C52] px-8 py-3.5 font-medium text-white shadow-md hover:bg-[#8F3045] hover:shadow-lg transition-all text-center">
                    Explore Collection
                  </Link>
                </div>
              </div>

              <div className="relative h-[320px] sm:h-[450px] md:h-[500px] w-full max-w-lg mx-auto">
                <div data-speed="0.8" className="absolute top-2 right-2 sm:top-4 sm:right-12 md:right-20 w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 glass-card rounded-2xl float-animation overflow-hidden shadow-md">
                  <Image src="/hero-1.jpg" alt="Makeup product closeup 1" width={208} height={208} className="w-full h-full object-cover" />
                </div>

                <div data-speed="1.2" className="absolute bottom-2 left-2 sm:bottom-12 sm:left-8 md:left-4 w-28 h-28 sm:w-40 sm:h-40 md:w-48 md:h-48 glass-card rounded-2xl float-animation-delayed overflow-hidden shadow-md">
                  <Image src="/hero-2.jpg" alt="Makeup product closeup 3" width={192} height={192} className="w-full h-full object-cover" />
                </div>
                <div
                  data-speed="0.8"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 glass-card rounded-full float-animation overflow-hidden shadow-md"
                >
                  <img
                    src="/hero-3.jpg"
                    alt="Makeup product closeup 2"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </main>

            {/* Banner Section with clip-reveal */}
            <section className="clip-reveal mx-auto max-w-7xl px-8 py-12 relative z-10">
              <div className="relative w-full h-[350px] md:h-[400px] rounded-[2.5rem] overflow-hidden shadow-xl flex items-center justify-center group bg-[#1A1114]">
                <img
                  src="/pink.jpg"
                  alt="Pink makeup powder brush explosion"
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-70 group-hover:scale-105 transition-transform duration-[1.5s] ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="relative z-10 text-center space-y-4 px-6 mt-12">
                  <span className="inline-block text-[#FFB6C1] text-xs md:text-sm font-bold tracking-[0.3em] uppercase drop-shadow-md">
                    Curated For You
                  </span>
                  <h2 className="font-serif text-4xl md:text-6xl text-white font-light tracking-wide drop-shadow-lg">
                    Discover Signatures
                  </h2>
                </div>
              </div>
            </section>


            {/* Marquee */}
            <section className="py-8 border-y border-border overflow-hidden bg-secondary/50">
              <div className="flex marquee-track whitespace-nowrap">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-16 px-8 text-2xl font-serif italic text-muted-foreground">
                    <span>Vegan</span><span>✦</span>
                    <span>Cruelty Free</span><span>✦</span>
                    <span>Dermatologist Tested</span><span>✦</span>
                    <span>Sustainable</span><span>✦</span>
                    <span>Made in France</span><span>✦</span>
                    <span>Award Winning</span><span>✦</span>
                  </div>
                ))}
              </div>
            </section>















            {/* Products Section with clip-reveal */}
            <section className="clip-reveal relative w-full py-16 mt-8 overflow-hidden">
              <div className="absolute inset-0 z-0">
                <img
                  src="/pexels-peterdanthy-37355179.jpg"
                  alt="Product Showcase Backdrop"
                  className="w-full h-full object-cover object-center opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#FFF5F5]/50 via-transparent to-[#FFF5F5]" />
              </div>

              <div className="relative z-10">
                <FeaturedProducts />
              </div>
            </section>

            {/* About */}
            <section id="about" className="px-6 md:px-12 py-24 max-w-5xl mx-auto text-center clip-reveal">
              <span className="text-xs tracking-[0.3em] uppercase text-muted-foreground">Our Story</span>
              <h2 className="text-4xl md:text-6xl font-serif mt-4 mb-6">
                Born from a love of <span className="gradient-text italic">artistry</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Lumière was founded on the belief that makeup is more than cosmetic — it's a daily ritual,
                a moment of creativity, a celebration of self. Every product is crafted in small batches
                with the finest natural ingredients.
              </p>
            </section>

            {/* Newsletter */}
            <section id="contact" className="px-6 md:px-12 py-24 max-w-3xl mx-auto">
              <div className="glass-card rounded-3xl p-10 md:p-14 text-center clip-reveal">
                <h2 className="text-3xl md:text-4xl font-serif mb-3">Join the glow list</h2>
                <p className="text-muted-foreground mb-8">
                  Be the first to know about new launches, exclusive offers and beauty rituals.
                </p>
                <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="flex-1 px-5 py-3 rounded-full bg-background border border-border outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                  <button type="submit" className="shimmer-btn bg-primary text-primary-foreground px-6 py-3 rounded-full font-medium">
                    Subscribe
                  </button>
                </form>
              </div>
            </section>

            {/* Footer */}
            <footer className="px-6 md:px-12 py-12 border-t border-border mt-12">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                <div className="text-2xl font-serif gradient-text font-bold">Lumière</div>
                <p>© 2026 Lumière Beauty. All rights reserved.</p>
                <div className="flex gap-6">
                  <a href="#" className="nav-link">Instagram</a>
                  <a href="#" className="nav-link">TikTok</a>
                  <a href="#" className="nav-link">Pinterest</a>
                </div>
              </div>
            </footer>

          </div>
        </div>
      </div>

      <AIChat avatarSrc="/ai-assistant-avatar.jpg" />
    </>
  );
}