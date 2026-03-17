'use client';

import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, doc, getDocs, onSnapshot, query, setDoc, where, Timestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CalendarHeart, MapPin, Clock, Calendar, Heart, Send, CheckCircle2 } from 'lucide-react';
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';
import Image from 'next/image';

export default function WeddingWebsite() {
  const params = useParams();
  const slug = params.slug as string;
  const [website, setWebsite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // RSVP Form State
  const [rsvpForm, setRsvpForm] = useState({
    guestName: '',
    attendees: 1,
    eventsAttending: [] as string[],
  });
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);

  // Countdown State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!slug) return;

    const q = query(collection(db, 'websites'), where('slug', '==', slug));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setWebsite({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setError(true);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [slug]);

  useEffect(() => {
    if (!website?.weddingDate) return;

    const targetDate = website.weddingDate.toDate();
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [website?.weddingDate]);

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website) return;

    try {
      const rsvpRef = doc(collection(db, `websites/${website.id}/rsvps`));
      await setDoc(rsvpRef, {
        guestName: rsvpForm.guestName,
        attendees: Number(rsvpForm.attendees),
        eventsAttending: rsvpForm.eventsAttending,
        createdAt: Timestamp.now(),
        websiteOwnerUid: website.ownerUid,
      });
      setRsvpSubmitted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `websites/${website.id}/rsvps`);
    }
  };

  const toggleEvent = (eventId: string) => {
    setRsvpForm(prev => ({
      ...prev,
      eventsAttending: prev.eventsAttending.includes(eventId)
        ? prev.eventsAttending.filter(id => id !== eventId)
        : [...prev.eventsAttending, eventId]
    }));
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

  if (error || !website) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] text-center px-6">
        <Heart className="w-16 h-16 text-slate-300 mb-6" />
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Website Not Found</h1>
        <p className="text-slate-600">The wedding website you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-rose-200">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] aspect-square rounded-full bg-rose-100 blur-3xl"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] aspect-square rounded-full bg-amber-100 blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="mb-8 text-rose-600">
            <Heart className="w-12 h-12 mx-auto fill-current opacity-80" />
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-slate-900 mb-6 font-serif">
            {website.brideName} <span className="text-rose-600 font-sans font-light italic">&</span> {website.groomName}
          </h1>
          <p className="text-xl md:text-2xl text-slate-600 mb-12 uppercase tracking-widest font-medium">
            {format(website.weddingDate.toDate(), 'MMMM do, yyyy')}
          </p>

          {/* Countdown */}
          <div className="flex gap-4 md:gap-8 text-center bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-white shadow-xl shadow-rose-900/5">
            <div className="flex flex-col items-center min-w-[60px] md:min-w-[80px]">
              <span className="text-3xl md:text-5xl font-bold text-rose-900">{timeLeft.days}</span>
              <span className="text-xs md:text-sm uppercase tracking-wider text-rose-600/80 font-semibold mt-2">Days</span>
            </div>
            <div className="text-3xl md:text-5xl font-light text-rose-200">:</div>
            <div className="flex flex-col items-center min-w-[60px] md:min-w-[80px]">
              <span className="text-3xl md:text-5xl font-bold text-rose-900">{timeLeft.hours}</span>
              <span className="text-xs md:text-sm uppercase tracking-wider text-rose-600/80 font-semibold mt-2">Hours</span>
            </div>
            <div className="text-3xl md:text-5xl font-light text-rose-200">:</div>
            <div className="flex flex-col items-center min-w-[60px] md:min-w-[80px]">
              <span className="text-3xl md:text-5xl font-bold text-rose-900">{timeLeft.minutes}</span>
              <span className="text-xs md:text-sm uppercase tracking-wider text-rose-600/80 font-semibold mt-2">Mins</span>
            </div>
            <div className="text-3xl md:text-5xl font-light text-rose-200 hidden md:block">:</div>
            <div className="flex flex-col items-center min-w-[60px] md:min-w-[80px] hidden md:flex">
              <span className="text-3xl md:text-5xl font-bold text-rose-900">{timeLeft.seconds}</span>
              <span className="text-xs md:text-sm uppercase tracking-wider text-rose-600/80 font-semibold mt-2">Secs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Message Section */}
      {website.message && (
        <section className="py-20 px-6 bg-white border-y border-rose-50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 font-serif">Our Story</h2>
            <p className="text-lg text-slate-600 leading-relaxed italic">
              &quot;{website.message}&quot;
            </p>
          </div>
        </section>
      )}

      {/* Events Section */}
      {website.events && website.events.length > 0 && (
        <section className="py-24 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4 font-serif">Wedding Events</h2>
            <div className="w-24 h-1 bg-rose-200 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {website.events.map((ev: any) => (
              <div key={ev.id} className="bg-white rounded-3xl p-8 shadow-lg shadow-slate-200/40 border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <h3 className="text-2xl font-bold text-rose-900 mb-6 font-serif">{ev.name}</h3>
                
                <div className="space-y-4 text-slate-600 mb-8">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">{format(ev.date.toDate(), 'EEEE, MMMM do, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">{ev.time}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">{ev.venue}</p>
                      <p className="text-sm mt-1">{ev.address}</p>
                    </div>
                  </div>
                </div>

                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.venue} ${ev.address}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full py-3 text-center rounded-xl bg-slate-50 text-rose-700 font-semibold hover:bg-rose-50 transition-colors border border-slate-200 hover:border-rose-200"
                >
                  Get Directions
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RSVP Section */}
      <section className="py-24 px-6 bg-rose-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
           <div className="absolute top-[-20%] right-[-10%] w-[60%] aspect-square rounded-full bg-white blur-3xl"></div>
        </div>

        <div className="max-w-2xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 font-serif">Are you attending?</h2>
            <p className="text-rose-200 text-lg">Please let us know by filling out the form below.</p>
          </div>

          {rsvpSubmitted ? (
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-12 text-center border border-white/20">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
              <p className="text-rose-100">Your RSVP has been successfully received. We can&apos;t wait to see you!</p>
            </div>
          ) : (
            <form onSubmit={handleRsvpSubmit} className="bg-white rounded-3xl p-8 md:p-10 shadow-2xl text-slate-900">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    value={rsvpForm.guestName}
                    onChange={e => setRsvpForm({...rsvpForm, guestName: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-slate-50 focus:bg-white" 
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Guests</label>
                  <select 
                    value={rsvpForm.attendees}
                    onChange={e => setRsvpForm({...rsvpForm, attendees: Number(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all bg-slate-50 focus:bg-white appearance-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>

                {website.events && website.events.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">Which events will you attend?</label>
                    <div className="space-y-3">
                      {website.events.map((ev: any) => (
                        <label key={ev.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={rsvpForm.eventsAttending.includes(ev.id)}
                            onChange={() => toggleEvent(ev.id)}
                            className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                          />
                          <span className="font-medium text-slate-700">{ev.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="w-full py-4 rounded-xl bg-rose-600 text-white font-bold text-lg hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2 mt-8"
                >
                  <Send className="w-5 h-5" />
                  Send RSVP
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-500 text-sm">
        <p>Made with ❤️ using ShaadiSites</p>
      </footer>
    </div>
  );
}
