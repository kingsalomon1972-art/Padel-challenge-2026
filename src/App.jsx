import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Trophy, 
  Calendar, 
  TrendingUp,
  LayoutDashboard,
  Check,
  MessageCircle,
  PlayCircle
} from 'lucide-react';

// --- CONFIGURAZIONE LOGO ---
import logo from './logo.png'; 

// --- CONFIGURAZIONE FIREBASE ---
let firebaseConfig;
if (typeof __firebase_config !== 'undefined') {
  firebaseConfig = JSON.parse(__firebase_config);
} else {
  firebaseConfig = {
    apiKey: "AIzaSyB2w2clbQb6bO8JAanYlhNWQ5_X3NQfoxQ",
    authDomain: "padel-challenge-2026.firebaseapp.com",
    projectId: "padel-challenge-2026",
    storageBucket: "padel-challenge-2026.firebasestorage.app",
    messagingSenderId: "1072658469938",
    appId: "1:1072658469938:web:c3fa66d8d03a677e0fd82b"
  };
}

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) { console.error(e); }

const APP_ID = 'padel-friends-v1';

// --- HELPERS ---
const getDaysInMonth = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date).toISOString().split('T')[0]);
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const PlayerAvatar = ({ player, size = "md" }) => {
  const sizeClasses = { sm: "w-8 h-8", md: "w-10 h-10" };
  if (player?.photoUrl) return <img src={player.photoUrl} className={`${sizeClasses[size]} rounded-full object-cover border-2 border-slate-600`} />;
  return <div className={`${sizeClasses[size]} rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center font-bold text-slate-300`}>
    {player?.name?.charAt(0).toUpperCase() || '?'}
  </div>;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [players, setPlayers] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);

  useEffect(() => {
    if (auth) return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsubPlayers = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'players'), (s) => {
      const d = s.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(d);
      const savedId = localStorage.getItem('padel_player_id');
      if (savedId) { const found = d.find(p => p.id === savedId); if (found) setCurrentPlayer(found); }
    });
    const unsubAvail = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities'), (s) => {
      setAvailabilities(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubPlayers(); unsubAvail(); };
  }, [user]);

  const toggleAvailability = async (dateStr) => {
    if (!currentPlayer) return;
    const existing = availabilities.find(a => a.date === dateStr && a.playerId === currentPlayer.id);
    if (existing) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities', existing.id));
    else await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities'), { date: dateStr, playerId: currentPlayer.id });
  };

  const calendarDates = useMemo(() => {
    const today = new Date();
    return getDaysInMonth(today.getFullYear(), today.getMonth()).filter(d => d >= today.toISOString().split('T')[0]);
  }, []);

  const upcomingMatches = useMemo(() => {
    const counts = {};
    availabilities.forEach(a => counts[a.date] = (counts[a.date] || 0) + 1);
    return Object.keys(counts).filter(date => counts[date] >= 4).sort();
  }, [availabilities]);

  const shareOnWhatsApp = (date, confirmedPlayers) => {
    const day = new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    const names = confirmedPlayers.map(p => p.name).join(', ');
    const text = `🎾 *PADEL CONFERMATO!* \n📅 Data: *${day}* \n👥 Giocatori: ${names}\n\n_Vado a prenotare su Playtomic!_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-slate-800 p-6 rounded-2xl">
          <h2 className="text-xl font-bold mb-4 text-center">Seleziona il tuo profilo</h2>
          <div className="space-y-2">
            {players.map(p => (
              <button key={p.id} onClick={() => { setCurrentPlayer(p); localStorage.setItem('padel_player_id', p.id); }} className="w-full bg-slate-700 p-3 rounded-xl flex items-center gap-3">
                <PlayerAvatar player={p} size="sm" /> <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans">
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 font-black italic"><img src={logo} className="w-6 h-6" /> PADEL 2026</div>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-xs font-bold">
          <PlayerAvatar player={currentPlayer} size="sm" /> {currentPlayer.name}
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-md mx-auto">
        {activeTab === 'dashboard' && (
          <div className="text-center py-10">
            <h1 className="text-2xl font-bold">Bentornato!</h1>
            <p className="text-slate-400">Controlla le date disponibili o la classifica.</p>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-6">
            {upcomingMatches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lime-400 text-xs font-black uppercase tracking-widest">Partite Confermate</h3>
                {upcomingMatches.map(date => {
                  const confirmedPlayers = availabilities.filter(a => a.date === date).map(a => players.find(p => p.id === a.playerId));
                  return (
                    <div key={date} className="bg-lime-900/10 border border-lime-500/30 p-4 rounded-2xl">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-lg">{new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</span>
                        <div className="flex -space-x-2">
                          {confirmedPlayers.map((p, i) => <PlayerAvatar key={i} player={p} size="sm" />)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => shareOnWhatsApp(date, confirmedPlayers)} className="bg-green-600/20 text-green-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                          <MessageCircle size={14} /> WhatsApp
                        </button>
                        
                        {/* DEEP LINK DIRETTO TRAMITE TAG <a> */}
                        <a 
                          href="playtomic://" 
                          className="bg-blue-600/20 text-blue-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                          <PlayCircle size={14} /> Playtomic
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-slate-500 text-xs font-black uppercase tracking-widest">Le tue disponibilità</h3>
              {calendarDates.map(date => {
                const dayAvail = availabilities.filter(a => a.date === date);
                const isSelected = dayAvail.some(a => a.playerId === currentPlayer.id);
                return (
                  <button key={date} onClick={() => toggleAvailability(date)} className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all ${isSelected ? 'bg-slate-800 border-lime-400' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="text-left">
                      <div className="font-bold">{new Date(date).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'long' })}</div>
                      <div className="text-[10px] text-slate-500">{dayAvail.length} persone disponibili</div>
                    </div>
                    {isSelected ? <Check className="text-lime-400" /> : <div className="w-5 h-5 rounded-full border border-slate-700" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-lime-400' : 'text-slate-500'}><LayoutDashboard /></button>
        <button onClick={() => setActiveTab('calendar')} className={activeTab === 'calendar' ? 'text-lime-400' : 'text-slate-500'}><Calendar /></button>
        <button onClick={() => setActiveTab('ranking')} className={activeTab === 'ranking' ? 'text-lime-400' : 'text-slate-500'}><Trophy /></button>
      </nav>
    </div>
  );
}
