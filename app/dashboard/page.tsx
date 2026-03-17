'use client';

import { useAuth } from '@/components/firebase-provider';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, doc, getDocs, onSnapshot, query, setDoc, where, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Plus, Link as LinkIcon, Edit, Trash2, Users, MapPin, Calendar, Clock, Heart, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [website, setWebsite] = useState<any>(null);
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    brideName: '',
    groomName: '',
    weddingDate: '',
    message: '',
  });
  const [events, setEvents] = useState<any[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: '',
    date: '',
    time: '',
    venue: '',
    address: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'websites'), where('ownerUid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setWebsite({ id: snapshot.docs[0].id, ...docData });
        setFormData({
          slug: docData.slug,
          brideName: docData.brideName,
          groomName: docData.groomName,
          weddingDate: docData.weddingDate ? format(docData.weddingDate.toDate(), 'yyyy-MM-dd') : '',
          message: docData.message,
        });
        setEvents(docData.events || []);
        
        // Fetch RSVPs
        const rsvpQ = query(collection(db, `websites/${snapshot.docs[0].id}/rsvps`), where('websiteOwnerUid', '==', user.uid));
        onSnapshot(rsvpQ, (rsvpSnap) => {
          setRsvps(rsvpSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => handleFirestoreError(err, OperationType.LIST, `websites/${snapshot.docs[0].id}/rsvps`));

      } else {
        setWebsite(null);
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'websites'));

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const handleSaveWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const websiteId = formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      
      // Check if slug exists and belongs to someone else
      if (!website || website.id !== websiteId) {
        const existing = await getDocs(query(collection(db, 'websites'), where('slug', '==', websiteId)));
        if (!existing.empty && existing.docs[0].data().ownerUid !== user.uid) {
          alert('This URL is already taken. Please choose another one.');
          return;
        }
      }

      const websiteData = {
        ownerUid: user.uid,
        slug: websiteId,
        brideName: formData.brideName,
        groomName: formData.groomName,
        weddingDate: Timestamp.fromDate(new Date(formData.weddingDate)),
        message: formData.message,
        events: events,
        createdAt: website?.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'websites', websiteId), websiteData);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `websites/${formData.slug}`);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website) return;

    const newEvent = {
      id: Math.random().toString(36).substring(7),
      name: eventForm.name,
      date: Timestamp.fromDate(new Date(eventForm.date)),
      time: eventForm.time,
      venue: eventForm.venue,
      address: eventForm.address,
    };

    const updatedEvents = [...events, newEvent];

    try {
      const { id, ...websiteDataToSave } = website;
      await setDoc(doc(db, 'websites', website.id), {
        ...websiteDataToSave,
        events: updatedEvents,
        createdAt: website.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      setEventForm({ name: '', date: '', time: '', venue: '', address: '' });
      setIsAddingEvent(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `websites/${website.id}`);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!website) return;
    const updatedEvents = events.filter(ev => ev.id !== eventId);
    try {
      const { id, ...websiteDataToSave } = website;
      await setDoc(doc(db, 'websites', website.id), {
        ...websiteDataToSave,
        events: updatedEvents,
        createdAt: website.createdAt || Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `websites/${website.id}`);
    }
  };

  const handleDownloadCSV = () => {
    if (rsvps.length === 0) return;

    const headers = ['Guest Name', 'Status', 'Number of Guests', 'Events Attending', 'Submitted At'];
    const csvData = rsvps.map(rsvp => {
      const eventNames = rsvp.eventsAttending
        .map((evId: string) => events.find(e => e.id === evId)?.name)
        .filter(Boolean)
        .join(', ');
      
      return [
        `"${rsvp.guestName.replace(/"/g, '""')}"`,
        rsvp.status === 'not_attending' ? 'Not Attending' : 'Attending',
        rsvp.attendees,
        `"${eventNames.replace(/"/g, '""')}"`,
        rsvp.createdAt ? format(rsvp.createdAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : ''
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${website?.slug || 'wedding'}-rsvps.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !user) return <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans">
      <header className="bg-white border-b border-rose-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 text-rose-700">
          <Heart className="w-6 h-6 fill-current" />
          <span className="font-semibold text-xl tracking-tight">Dashboard</span>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-slate-600 hover:text-rose-600 transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {!website || isEditing ? (
          <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-8">
            <h2 className="text-2xl font-bold text-rose-900 mb-6">{website ? 'Edit Website Details' : 'Create Your Wedding Website'}</h2>
            <form onSubmit={handleSaveWebsite} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bride&apos;s Name</label>
                  <input required type="text" value={formData.brideName} onChange={e => setFormData({...formData, brideName: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Groom&apos;s Name</label>
                  <input required type="text" value={formData.groomName} onChange={e => setFormData({...formData, groomName: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all" />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Wedding Date</label>
                  <input required type="date" value={formData.weddingDate} onChange={e => setFormData({...formData, weddingDate: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Custom URL Slug</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-slate-50 border border-r-0 border-slate-200 rounded-l-lg text-slate-500 text-sm">shaadisites.com/</span>
                    <input required disabled={!!website} type="text" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})} placeholder="rahul-weds-anjali" className="w-full px-4 py-2 rounded-r-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Welcome Message</label>
                <textarea required rows={4} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all" placeholder="We can't wait to celebrate with you..."></textarea>
              </div>

              <div className="flex gap-4">
                <button type="submit" className="px-6 py-2 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors">
                  Save Details
                </button>
                {website && (
                  <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Overview Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-rose-900 mb-2">{website.brideName} & {website.groomName}</h1>
                <p className="text-slate-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(website.weddingDate.toDate(), 'MMMM do, yyyy')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href={`/${website.slug}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-rose-50 text-rose-700 font-medium hover:bg-rose-100 transition-colors border border-rose-200">
                  <LinkIcon className="w-4 h-4" />
                  View Website
                </a>
                <button onClick={() => setIsEditing(true)} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors border border-slate-200">
                  <Edit className="w-4 h-4" />
                  Edit Details
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Events Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Events</h2>
                  <button onClick={() => setIsAddingEvent(!isAddingEvent)} className="p-2 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {isAddingEvent && (
                  <form onSubmit={handleAddEvent} className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Event Name (e.g., Haldi)</label>
                      <input required type="text" value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 focus:border-rose-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                        <input required type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 focus:border-rose-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Time</label>
                        <input required type="time" value={eventForm.time} onChange={e => setEventForm({...eventForm, time: e.target.value})} className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 focus:border-rose-500 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Venue Name</label>
                      <input required type="text" value={eventForm.venue} onChange={e => setEventForm({...eventForm, venue: e.target.value})} className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 focus:border-rose-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Full Address</label>
                      <input required type="text" value={eventForm.address} onChange={e => setEventForm({...eventForm, address: e.target.value})} className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 focus:border-rose-500 outline-none" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" className="px-4 py-1.5 bg-rose-600 text-white text-sm font-medium rounded-md hover:bg-rose-700">Add</button>
                      <button type="button" onClick={() => setIsAddingEvent(false)} className="px-4 py-1.5 bg-white text-slate-600 text-sm font-medium rounded-md border border-slate-200 hover:bg-slate-50">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {events.length === 0 && !isAddingEvent && (
                    <p className="text-sm text-slate-500 text-center py-4">No events added yet.</p>
                  )}
                  {events.map(ev => (
                    <div key={ev.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex justify-between items-start group">
                      <div>
                        <h3 className="font-semibold text-slate-900">{ev.name}</h3>
                        <div className="text-sm text-slate-500 mt-1 space-y-1">
                          <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(ev.date.toDate(), 'MMM d, yyyy')} • <Clock className="w-3.5 h-3.5 ml-1" /> {ev.time}</p>
                          <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {ev.venue}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* RSVPs Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900">RSVPs</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      <Users className="w-4 h-4" />
                      {rsvps.reduce((acc, curr) => acc + curr.attendees, 0)} Attending
                    </div>
                    {rsvps.length > 0 && (
                      <button
                        onClick={handleDownloadCSV}
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-full transition-colors"
                        title="Download CSV"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {rsvps.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No RSVPs yet.</p>
                  ) : (
                    rsvps.map(rsvp => (
                      <div key={rsvp.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{rsvp.guestName}</span>
                            {rsvp.status === 'not_attending' ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Not Attending</span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Attending</span>
                            )}
                          </div>
                          {rsvp.status !== 'not_attending' && (
                            <span className="text-xs font-medium bg-white px-2 py-1 rounded border border-slate-200">+{rsvp.attendees} guests</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap gap-1">
                          {rsvp.eventsAttending.map((evId: string) => {
                            const ev = events.find(e => e.id === evId);
                            return ev ? <span key={evId} className="bg-white px-2 py-0.5 rounded border border-slate-100">{ev.name}</span> : null;
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
