import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Trophy, 
  Calendar, 
  PlusCircle, 
  Activity, 
  XCircle,
  TrendingUp,
  LayoutDashboard,
  Users,
  Trash2,
  Swords,
  PlayCircle,
  Edit2,
  Check,
  AlertTriangle,
  Database,
  Calculator,
  BarChart3,
  Minus,
  Pencil,
  BookOpen,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  LineChart,
  RefreshCw,
  Pizza,
  Lock, 
  Unlock, 
  LogIn,
  Zap,
  AlertCircle,
  CheckCircle2,
  MessageCircle
} from 'lucide-react';

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
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 300; 
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
};

const getDaysInMonth = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date).toISOString().split('T')[0]);
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const calculatePoints = (score) => {
  if (!score) return { t1Points: 0, t2Points: 0, winner: null, t1Games: 0, t2Games: 0 };
  const sets = String(score).trim().split(/\s+/);
  let t1Sets = 0, t2Sets = 0, t1Games = 0, t2Games = 0;
  sets.forEach(set => {
    const parts = set.split('-');
    if (parts.length === 2) {
      const g1 = parseInt(parts[0]), g2 = parseInt(parts[1]);
      if (!isNaN(g1) && !isNaN(g2)) {
        t1Games += g1; t2Games += g2;
        if (g1 > g2) t1Sets++; else if (g2 > g1) t2Sets++;
      }
    }
  });
  let t1Points = 0, t2Points = 0, winner = 'draw';
  if (t1Sets === 2 && t2Sets === 0) { t1Points = 8; t2Points = 0.2 * t2Games; winner = 'team1'; } 
  else if (t2Sets === 2 && t1Sets === 0) { t2Points = 8; t1Points = 0.2 * t1Games; winner = 'team2'; }
  else if (t1Sets === 2 && t2Sets === 1) { t1Points = 6; t2Points = 3; winner = 'team1'; }
  else if (t2Sets === 2 && t1Sets === 1) { t2Points = 6; t1Points = 3; winner = 'team2'; }
  else { t1Points = t1Games * 0.3; t2Points = t2Games * 0.3; winner = 'draw'; }
  return { t1Points, t2Points, winner, t1Games, t2Games, t1Sets, t2Sets };
};

// --- COMPONENTI UI ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const variants = {
    primary: "bg-lime-400 text-slate-900 hover:bg-lime-300",
    secondary: "bg-slate-700 text-white hover:bg-slate-600",
    danger: "bg-red-500/20 text-red-400 border border-red-500/50"
  };
  return <button onClick={onClick} disabled={disabled} className={`px-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${variants[variant]} ${className}`}>{children}</button>;
};

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl ${className} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}>{children}</div>
);

const Input = ({ label, value, onChange, type = "text", placeholder }) => (
  <div className="mb-4">
    <label className="block text-slate-400 text-sm font-medium mb-1 ml-1">{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400" />
  </div>
);

const PlayerAvatar = ({ player, size = "md", className="" }) => {
  const sizeClasses = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-16 h-16", xl: "w-24 h-24" };
  if (player?.photoUrl) return <img src={player.photoUrl} className={`${sizeClasses[size]} rounded-full object-cover border-2 border-slate-600 bg-slate-800 ${className}`} />;
  return <div className={`${sizeClasses[size]} rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center font-bold text-slate-300 ${className}`}>{player?.name ? player.name.charAt(0).toUpperCase() : '?'}</div>;
};

// --- CHART ---
const ProgressChart = ({ players, matches }) => {
  const sortedMatches = matches.filter(m => m.status === 'completed').sort((a, b) => new Date(a.date) - new Date(b.date));
  const history = {}; players.forEach(p => { history[p.id] = [0]; });
  let maxPoints = 10;
  sortedMatches.forEach(m => {
    let t1P = 0, t2P = 0;
    if (m.type === 'tiebreak') { if (m.winner === 'team1') t1P = 2; else t2P = 2; }
    else { const p = calculatePoints(m.score); t1P = p.t1Points; t2P = p.t2Points; }
    players.forEach(p => {
      const currentPoints = history[p.id][history[p.id].length - 1];
      let newPoints = currentPoints;
      if (m.team1?.includes(p.id)) newPoints += t1P;
      if (m.team2?.includes(p.id)) newPoints += t2P;
      history[p.id].push(newPoints);
      if (newPoints > maxPoints) maxPoints = newPoints;
    });
  });
  if (sortedMatches.length === 0) return <div className="text-center text-slate-500 py-10">Nessuna partita giocata</div>;
  const colors = ['#a3e635', '#3b82f6', '#facc15', '#f472b6', '#a855f7', '#22d3ee'];
  return (
    <div className="w-full bg-slate-900 rounded-xl p-4 border border-slate-800">
      <div className="flex flex-wrap gap-3 mb-4 justify-center">
        {players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-slate-300">{p.name}</span>
          </div>
        ))}
      </div>
      <div className="text-center text-[10px] text-slate-500 uppercase tracking-widest mt-2">Progresso Punti Torneo</div>
    </div>
  );
};

// --- MAIN APP ---
export default function App() {
  const [showSplash, setShowSplash] = useState(true); 
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [calendarView, setCalendarView] = useState('current');
  const [showChart, setShowChart] = useState(false);

  // Modal states
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [isAddingTieBreak, setIsAddingTieBreak] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [matchToDelete, setMatchToDelete] = useState(null);

  const [newMatchData, setNewMatchData] = useState({ team1p1: '', team1p2: '', team2p1: '', team2p2: '', score: '', date: new Date().toISOString().split('T')[0] });
  const [profileName, setProfileName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [loginTargetId, setLoginTargetId] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (e) { console.error(e); }
    };
    initAuth();
    if (auth) return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const unsubPlayers = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'players'), (s) => {
      const d = s.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(d);
      const savedId = localStorage.getItem('padel_player_id');
      if (savedId) { const found = d.find(p => p.id === savedId); if (found) setCurrentPlayer(found); }
    });
    const unsubMatches = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), (s) => {
      setMatches(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubAvail = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities'), (s) => {
      setAvailabilities(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubPlayers(); unsubMatches(); unsubAvail(); };
  }, [user]);

  // Actions
  const handlePhotoSelect = async (e) => {
    if (e.target.files?.[0]) {
      const compressed = await compressImage(e.target.files[0]);
      setNewPlayerPhoto(compressed);
    }
  };

  const handleCreateProfile = async () => {
    if (!profileName.trim() || !profilePassword.trim()) return;
    const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'players'), {
      name: profileName, password: profilePassword, photoUrl: newPlayerPhoto, createdAt: serverTimestamp()
    });
    setCurrentPlayer({ id: docRef.id, name: profileName, photoUrl: newPlayerPhoto });
    localStorage.setItem('padel_player_id', docRef.id);
    setIsEditingProfile(false);
  };

  const performLogin = () => {
    const target = players.find(p => p.id === loginTargetId);
    if (target && target.password === loginPassword) {
      setCurrentPlayer(target); localStorage.setItem('padel_player_id', target.id); setLoginTargetId(null);
    } else alert("Password errata!");
  };

  const toggleAvailability = async (dateStr) => {
    if (!currentPlayer) return;
    const existing = availabilities.find(a => a.date === dateStr && a.playerId === currentPlayer.id);
    if (existing) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities', existing.id));
    else await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities'), { date: dateStr, playerId: currentPlayer.id, playerName: currentPlayer.name });
  };

  const handleSaveMatch = async () => {
    const { team1p1, team1p2, team2p1, team2p2, score, date } = newMatchData;
    if (!team1p1 || !team1p2 || !team2p1 || !team2p2 || !score) return;
    const { winner } = calculatePoints(score);
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), {
      date, team1: [team1p1, team1p2], team2: [team2p1, team2p2], score, winner, status: 'completed', createdAt: serverTimestamp()
    });
    setIsAddingMatch(false);
  };

  const handleSaveTieBreak = async (winnerTeam) => {
    const { team1p1, team1p2, team2p1, team2p2, score, date } = newMatchData;
    if (!team1p1 || !team1p2 || !team2p1 || !team2p2 || !score) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), {
      date, team1: [team1p1, team1p2], team2: [team2p1, team2p2], score, winner: winnerTeam, type: 'tiebreak', status: 'completed', createdAt: serverTimestamp()
    });
    setIsAddingTieBreak(false);
  };

  // Memos
  const ranking = useMemo(() => {
    const stats = {};
    players.forEach(p => stats[p.id] = { id: p.id, name: p.name, photoUrl: p.photoUrl, points: 0, wins: 0, losses: 0, played: 0, gamesWon: 0, gamesLost: 0 });
    matches.filter(m => m.status === 'completed').forEach(m => {
      let p1 = 0, p2 = 0, g1 = 0, g2 = 0;
      if (m.type === 'tiebreak') { if (m.winner === 'team1') p1 = 2; else p2 = 2; }
      else { const res = calculatePoints(m.score); p1 = res.t1Points; p2 = res.t2Points; g1 = res.t1Games; g2 = res.t2Games; }
      m.team1.forEach(id => { if (stats[id]) { stats[id].points += p1; stats[id].played++; stats[id].gamesWon += g1; stats[id].gamesLost += g2; if (m.winner === 'team1') stats[id].wins++; else if (m.winner === 'team2') stats[id].losses++; } });
      m.team2.forEach(id => { if (stats[id]) { stats[id].points += p2; stats[id].played++; stats[id].gamesWon += g2; stats[id].gamesLost += g1; if (m.winner === 'team2') stats[id].wins++; else if (m.winner === 'team1') stats[id].losses++; } });
    });
    return Object.values(stats).sort((a, b) => b.points - a.points);
  }, [players, matches]);

  const calendarDates = useMemo(() => {
    const today = new Date();
    let month = today.getMonth();
    let year = today.getFullYear();
    if (calendarView === 'next') { month++; if (month > 11) { month = 0; year++; } }
    return getDaysInMonth(year, month).filter(d => d >= today.toISOString().split('T')[0]);
  }, [calendarView]);

  const upcomingMatches = useMemo(() => {
    const counts = {};
    availabilities.forEach(a => counts[a.date] = (counts[a.date] || 0) + 1);
    return Object.keys(counts).filter(date => counts[date] >= 4).sort();
  }, [availabilities]);

  if (showSplash) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6" onClick={() => setShowSplash(false)}>
        <img src={logo} alt="Logo" className="w-64 h-64 object-contain animate-pulse mb-8" />
        <h1 className="text-4xl font-black italic text-white text-center">PADEL CHALLENGE <span className="text-lime-400">2026</span></h1>
        <p className="text-slate-500 mt-4 animate-bounce">Tocca per iniziare</p>
      </div>
    );
  }

  if (!currentPlayer && !isEditingProfile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <Card className="w-full max-w-md">
          <h2 className="text-xl font-bold mb-6 text-center">Scegli il tuo profilo</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {players.map(p => (
              <button key={p.id} onClick={() => setLoginTargetId(p.id)} className="w-full bg-slate-700 p-4 rounded-xl flex items-center justify-between hover:bg-slate-600 transition-colors">
                <div className="flex items-center gap-3"><PlayerAvatar player={p} size="sm" /> <span className="font-bold">{p.name}</span></div>
                {p.password ? <Lock size={16} className="text-slate-500"/> : <Unlock size={16} className="text-lime-400"/>}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setIsEditingProfile(true)} className="w-full mt-6">Crea Nuovo Giocatore</Button>
          {loginTargetId && (
            <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-6 z-50">
              <Card className="w-full max-w-xs">
                <Input label="Password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={() => setLoginTargetId(null)} variant="secondary" className="flex-1">Annulla</Button>
                  <Button onClick={performLogin} className="flex-1">Entra</Button>
                </div>
              </Card>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (isEditingProfile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white">
        <Card className="w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">Nuovo Profilo</h2>
          <Input label="Nome" value={profileName} onChange={e => setProfileName(e.target.value)} />
          <Input label="Password" type="password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={() => setIsEditingProfile(false)} variant="secondary" className="flex-1">Annulla</Button>
            <Button onClick={handleCreateProfile} className="flex-1">Crea</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans relative">
      <header className="fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md p-4 border-b border-slate-800 z-40 flex justify-between items-center">
        <div className="flex items-center gap-2 font-black italic"><img src={logo} className="w-6 h-6" /> PADEL 2026</div>
        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full">
          <PlayerAvatar player={currentPlayer} size="sm" />
          <span className="text-xs font-bold">{currentPlayer.name}</span>
          <button onClick={() => { setCurrentPlayer(null); localStorage.removeItem('padel_player_id'); }}><XCircle size={16} className="text-slate-500 ml-1"/></button>
        </div>
      </header>

      <main className="pt-24 px-4 max-w-md mx-auto space-y-6">
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center py-6 bg-gradient-to-br from-slate-800 to-slate-900">
                <span className="text-slate-500 text-xs font-bold uppercase">Giocate</span>
                <div className="text-3xl font-black mt-1">{matches.filter(m => m.status === 'completed').length}</div>
              </Card>
              <Card className="text-center py-6 bg-gradient-to-br from-lime-900/20 to-slate-900 border-lime-500/20">
                <span className="text-lime-400 text-xs font-bold uppercase">Miei Punti</span>
                <div className="text-3xl font-black text-lime-400 mt-1">{ranking.find(r => r.id === currentPlayer.id)?.points.toFixed(1) || 0}</div>
              </Card>
            </div>
            <div className="grid grid-cols-2 gap-2">
               <Button onClick={() => setActiveTab('ranking')} variant="secondary"><Trophy size={18} className="text-yellow-400" /> Classifica</Button>
               <Button onClick={() => setActiveTab('calendar')} variant="secondary"><Calendar size={18} className="text-blue-400" /> Date</Button>
            </div>
            <h3 className="text-lg font-bold flex items-center gap-2 mt-4"><TrendingUp size={20} className="text-lime-400" /> Ultime Partite</h3>
            <div className="space-y-3">
              {matches.filter(m => m.status === 'completed').slice(-3).reverse().map(m => (
                <Card key={m.id} className="border-l-4 border-l-lime-400">
                   <div className="flex justify-between text-[10px] text-slate-500 mb-2 uppercase font-bold"><span>{m.date}</span><span className="text-white bg-slate-700 px-2 rounded">{m.score}</span></div>
                   <div className="flex justify-between items-center text-sm font-medium">
                      <span className={m.winner === 'team1' ? 'text-lime-400 font-bold' : ''}>{players.find(p => p.id === m.team1[0])?.name} & {players.find(p => p.id === m.team1[1])?.name}</span>
                      <span className="text-slate-600 px-2 italic">vs</span>
                      <span className={m.winner === 'team2' ? 'text-lime-400 font-bold' : ''}>{players.find(p => p.id === m.team2[0])?.name} & {players.find(p => p.id === m.team2[1])?.name}</span>
                   </div>
                </Card>
              ))}
            </div>
            <Button onClick={() => setIsAddingMatch(true)} className="w-full mt-4 py-4"><PlusCircle /> Registra Risultato</Button>
          </>
        )}

        {activeTab === 'ranking' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-yellow-400" /> Classifica</h2><button onClick={() => setShowChart(!showChart)} className="text-lime-400">{showChart ? <LayoutDashboard/> : <LineChart/>}</button></div>
            {showChart ? <ProgressChart players={players} matches={matches} /> : ranking.map((p, idx) => (
              <Card key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-yellow-400 text-black' : 'bg-slate-700 text-slate-400'}`}>{idx + 1}</div>
                  <PlayerAvatar player={p} size="sm" />
                  <span className="font-bold">{p.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-lime-400">{p.points.toFixed(1)}</div>
                  <div className="text-[8px] text-slate-500 uppercase">Punti</div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => setCalendarView('current')} variant={calendarView==='current'?'primary':'secondary'} className="flex-1">Mese Corrente</Button>
              <Button onClick={() => setCalendarView('next')} variant={calendarView==='next'?'primary':'secondary'} className="flex-1">Mese Prossimo</Button>
            </div>
            {upcomingMatches.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-lime-400 uppercase tracking-widest">Partite Confermate</h4>
                {upcomingMatches.map(date => {
                  const playersInMatch = availabilities.filter(a => a.date === date).map(a => players.find(p => p.id === a.playerId));
                  const shareWA = () => {
                    const text = `🎾 *PADEL CONFERMATO!* \n📅 Data: *${date}* \n👥 Giocatori: ${playersInMatch.map(p => p.name).join(', ')}\n\n_Vado a prenotare su Playtomic!_`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  };
                  return (
                    <Card key={date} className="bg-lime-900/10 border-lime-500/30">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold">{date}</span>
                        <div className="flex -space-x-2">
                          {playersInMatch.map((p, i) => <PlayerAvatar key={i} player={p} size="sm" className="border-2 border-slate-900"/>)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={shareWA} className="bg-green-600/20 text-green-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><MessageCircle size={14}/> WhatsApp</button>
                        <a href="playtomic://" className="bg-blue-600/20 text-blue-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 active:scale-95"><PlayCircle size={14}/> Playtomic</a>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            <div className="space-y-2">
               {calendarDates.map(date => {
                 const dayAvail = availabilities.filter(a => a.date === date);
                 const isSelected = dayAvail.some(a => a.playerId === currentPlayer.id);
                 return (
                   <button key={date} onClick={() => toggleAvailability(date)} className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all ${isSelected ? 'bg-slate-800 border-lime-400' : 'bg-slate-900 border-slate-800'}`}>
                     <div className="text-left"><div className="font-bold">{date}</div><div className="text-[10px] text-slate-500 uppercase">{dayAvail.length} Disponibili</div></div>
                     {isSelected ? <Check className="text-lime-400" /> : <div className="w-5 h-5 rounded-full border border-slate-700" />}
                   </button>
                 );
               })}
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-4">
             <h2 className="text-2xl font-bold">Regolamento</h2>
             <Card className="border-l-4 border-l-lime-400">
                <h3 className="font-bold">Vittoria 2-0</h3>
                <p className="text-sm text-slate-400">8 Punti ai vincitori, 0.2 punti per game ai perdenti.</p>
             </Card>
             <Card className="border-l-4 border-l-yellow-400">
                <h3 className="font-bold">Vittoria 2-1</h3>
                <p className="text-sm text-slate-400">6 Punti ai vincitori, 3 punti ai perdenti.</p>
             </Card>
             <Card className="border-l-4 border-l-orange-500">
                <h3 className="font-bold">Tie-Break (10 pt)</h3>
                <p className="text-sm text-slate-400">2 Punti secchi ai vincitori.</p>
             </Card>
             <Card className="border-l-4 border-l-red-500">
                <h3 className="font-bold">Pizza Rule</h3>
                <p className="text-sm text-slate-400">Chi perde paga la pizza. <Pizza size={14} className="inline ml-1"/></p>
             </Card>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Giocatori</h2>
            {players.map(p => (
              <Card key={p.id} className="flex justify-between items-center">
                <div className="flex items-center gap-3"><PlayerAvatar player={p} size="sm" /> <span className="font-bold">{p.name}</span></div>
                {p.id !== currentPlayer.id && <button onClick={() => setPlayerToDelete(p.id)} className="text-slate-600 hover:text-red-400"><Trash2 size={16}/></button>}
              </Card>
            ))}
          </div>
        )}

        {/* MODALS */}
        {isAddingMatch && (
          <div className="fixed inset-0 bg-black/95 z-[60] p-6 overflow-y-auto">
            <div className="flex justify-between mb-6"><h2 className="text-xl font-bold">Nuova Partita</h2><button onClick={() => setIsAddingMatch(false)}><XCircle/></button></div>
            <div className="space-y-4">
              <Input label="Data" type="date" value={newMatchData.date} onChange={e => setNewMatchData({...newMatchData, date: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-lime-400 uppercase">Team A</label>
                  <select className="w-full bg-slate-800 p-3 rounded-xl" value={newMatchData.team1p1} onChange={e => setNewMatchData({...newMatchData, team1p1: e.target.value})}><option value="">P1</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  <select className="w-full bg-slate-800 p-3 rounded-xl" value={newMatchData.team1p2} onChange={e => setNewMatchData({...newMatchData, team1p2: e.target.value})}><option value="">P2</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-red-400 uppercase">Team B</label>
                  <select className="w-full bg-slate-800 p-3 rounded-xl" value={newMatchData.team2p1} onChange={e => setNewMatchData({...newMatchData, team2p1: e.target.value})}><option value="">P1</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  <select className="w-full bg-slate-800 p-3 rounded-xl" value={newMatchData.team2p2} onChange={e => setNewMatchData({...newMatchData, team2p2: e.target.value})}><option value="">P2</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                </div>
              </div>
              <Input label="Risultato (es 6-4 6-2)" value={newMatchData.score} onChange={e => setNewMatchData({...newMatchData, score: e.target.value})} placeholder="6-0 6-0" />
              <Button onClick={handleSaveMatch} className="w-full py-4">Salva Partita</Button>
              <Button onClick={() => setIsAddingTieBreak(true)} variant="secondary" className="w-full">Registra Tie-Break Extra</Button>
            </div>
          </div>
        )}

        {isAddingTieBreak && (
          <div className="fixed inset-0 bg-black/95 z-[70] p-6">
            <div className="flex justify-between mb-6"><h2 className="text-xl font-bold text-orange-400">Nuovo Tie-Break</h2><button onClick={() => setIsAddingTieBreak(false)}><XCircle/></button></div>
            <Input label="Punteggio (es 10-8)" value={newMatchData.score} onChange={e => setNewMatchData({...newMatchData, score: e.target.value})} />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Button onClick={() => handleSaveTieBreak('team1')} variant="secondary" className="border border-lime-500/30">Vince Team A</Button>
              <Button onClick={() => handleSaveTieBreak('team2')} variant="secondary" className="border border-red-500/30">Vince Team B</Button>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 pb-8 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-lime-400' : 'text-slate-500'}><LayoutDashboard /></button>
        <button onClick={() => setActiveTab('ranking')} className={activeTab === 'ranking' ? 'text-lime-400' : 'text-slate-500'}><Trophy /></button>
        <button onClick={() => setActiveTab('calendar')} className={activeTab === 'calendar' ? 'text-lime-400' : 'text-slate-500'}><Calendar /></button>
        <button onClick={() => setActiveTab('players')} className={activeTab === 'players' ? 'text-lime-400' : 'text-slate-500'}><Users /></button>
        <button onClick={() => setActiveTab('rules')} className={activeTab === 'rules' ? 'text-lime-400' : 'text-slate-500'}><BookOpen /></button>
      </nav>
    </div>
  );
}
