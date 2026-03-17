'use client';

import { useAuth } from '@/components/firebase-provider';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Heart, Sparkles, CalendarHeart, Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // User closed the popup or clicked multiple times, ignore
        console.log('Login popup closed by user');
      } else {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="animate-pulse flex flex-col items-center">
          <Heart className="w-12 h-12 text-rose-600 mb-4" />
          <p className="text-rose-900 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-rose-200">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-rose-700">
          <Heart className="w-6 h-6 fill-current" />
          <span className="font-semibold text-xl tracking-tight">ShaadiSites</span>
        </div>
        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="px-5 py-2 rounded-full bg-rose-50 text-rose-700 font-medium hover:bg-rose-100 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
          Sign In
        </button>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-medium mb-8 border border-amber-200">
          <Sparkles className="w-4 h-4" />
          <span>Create your perfect wedding website</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 max-w-4xl mb-6">
          Share your love story with <span className="text-rose-600">elegance</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-10">
          Generate a beautiful, mobile-friendly Indian wedding website in minutes. 
          Manage events, collect RSVPs, and share your joy with friends and family.
        </p>
        
        <button 
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="px-8 py-4 rounded-full bg-rose-600 text-white font-semibold text-lg hover:bg-rose-700 transition-transform hover:scale-105 shadow-lg shadow-rose-200 flex items-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
        >
          {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarHeart className="w-5 h-5" />}
          Start Creating for Free
        </button>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-32 text-left w-full max-w-5xl">
          <div className="p-6 rounded-2xl bg-white shadow-sm border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4 text-rose-600">
              <Heart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Beautiful Design</h3>
            <p className="text-slate-600">Clean, minimal templates with traditional maroon and gold accents perfect for Indian weddings.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white shadow-sm border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-4 text-amber-600">
              <CalendarHeart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Event Management</h3>
            <p className="text-slate-600">Add multiple events like Haldi, Mehendi, and Reception with integrated Google Maps directions.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white shadow-sm border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4 text-emerald-600">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy RSVPs</h3>
            <p className="text-slate-600">Collect guest responses digitally. Track who is attending which event right from your dashboard.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
