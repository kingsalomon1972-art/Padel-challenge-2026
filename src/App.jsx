import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
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
  LogOut, // Nuova icona
  Zap,
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  Mail // Nuova icona
} from 'lucide-react';

// --- IMPORTANTE: ASSICURATI CHE IL FILE SI CHIAMI logo.png ---
import logo from './logo.png'; 

// --- CONFIGURAZIONE FIREBASE ---
let firebaseConfig;

if (typeof __firebase_config !== 'undefined') {
  firebaseConfig = JSON.parse(__firebase_config);
} else {
  // Configurazione del tuo progetto Padel Challenge 2026
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
} catch (e) {
  console.error("Errore configurazione Firebase:", e);
}

const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'padel-friends-v1';

// --- HELPER IMMAGINI ---
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

// --- HELPER DATE ---
const getDaysInMonth = (year, month) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date).toISOString().split('T')[0]);
    date.setDate(date.getDate() + 1);
  }
  return days;
};

// --- HELPER CALCOLO PUNTI ---
const calculatePoints = (score) => {
  if (!score) return { t1Points: 0, t2Points: 0, winner: null, t1Games: 0, t2Games: 0 };

  const sets = String(score).trim().split(/\s+/);
  let t1Sets = 0;
  let t2Sets = 0;
  let t1Games = 0;
  let t2Games = 0;

  sets.forEach(set => {
    const parts = set.split('-');
    if (parts.length === 2) {
      const g1 = parseInt(parts[0]);
      const g2 = parseInt(parts[1]);
      if (!isNaN(g1) && !isNaN(g2)) {
        t1Games += g1;
        t2Games += g2;
        if (g1 > g2) t1Sets++;
        else if (g2 > g1) t2Sets++;
      }
    }
  });

  let t1Points = 0;
  let t2Points = 0;
  let winner = 'draw'; 

  if (t1Sets === 2 && t2Sets === 0) {
    t1Points = 8;
    t2Points = 0.2 * t2Games;
    winner = 'team1';
  } 
  else if (t2Sets === 2 && t1Sets === 0) {
    t2Points = 8;
    t1Points = 0.2 * t1Games;
    winner = 'team2';
  }
  else if (t1Sets === 2 && t2Sets === 1) {
    t1Points = 6;
    t2Points = 3;
    winner = 'team1';
  }
  else if (t2Sets === 2 && t1Sets === 1) {
    t2Points = 6;
    t1Points = 3;
    winner = 'team2';
  }
  else {
    t1Points = t1Games * 0.3;
    t2Points = t2Games * 0.3;
    winner = 'draw';
  }

  return { t1Points, t2Points, winner, t1Games, t2Games, t1Sets, t2Sets };
};

// --- COMPONENTI UI ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = "button" }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg";
  const variants = {
    primary: "bg-lime-400 text-slate-900 hover:bg-lime-300 shadow-lime-900/20",
    secondary: "bg-slate-700 text-white hover:bg-slate-600 shadow-slate-900/20",
    danger: "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50",
    ghost: "bg-transparent text-slate-400 hover:text-white"
  };
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyle} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}>
    {children}
  </div>
);

const Input = ({ label, value, onChange, type = "text", placeholder }) => (
  <div className="mb-4">
    <label className="block text-slate-400 text-sm font-medium mb-1 ml-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400 transition-colors"
    />
  </div>
);

const PlayerAvatar = ({ player, size = "md", className="" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
    xl: "w-24 h-24 text-3xl"
  };

  if (player?.photoUrl) {
    return (
      <img 
        src={player.photoUrl} 
        alt={player.name || '?'} 
        className={`${sizeClasses[size]} rounded-full object-cover border-2 border-slate-600 bg-slate-800 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-slate-700 border-2 border-slate-600 flex items-center justify-center font-bold text-slate-300 ${className}`}>
      {player?.name ? player.name.charAt(0).toUpperCase() : '?'}
    </div>
  );
};

// --- COMPONENTE AUTH LOGIN/REGISTER (NUOVO) ---
const AuthScreen = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      let msg = "Errore di autenticazione.";
      if (err.code === 'auth/wrong-password') msg = "Password errata.";
      if (err.code === 'auth/user-not-found') msg = "Utente non trovato.";
      if (err.code === 'auth/email-already-in-use') msg = "Email già in uso.";
      if (err.code === 'auth/weak-password') msg = "Password troppo debole (min 6 caratteri).";
      if (err.code === 'auth/invalid-email') msg = "Formato email non valido.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
       <div className="mb-8 flex flex-col items-center gap-4">
          <div className="w-24 h-24">
             <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black italic text-white tracking-tighter">PADEL CHALLENGE <span className="text-lime-400">2026</span></h1>
            <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest font-bold">Area Riservata</p>
          </div>
       </div>

       <Card className="w-full max-w-sm border-lime-400/20 shadow-2xl shadow-lime-900/10">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            {isRegistering ? <PlusCircle className="text-lime-400"/> : <LogIn className="text-lime-400"/>}
            {isRegistering ? 'Crea Account' : 'Accedi'}
          </h2>
          
          <form onSubmit={handleAuth}>
            <Input 
              label="Email" 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="nome@esempio.com" 
            />
            <Input 
              label="Password" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="******" 
            />
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-4 flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Attendere...' : (isRegistering ? 'Registrati' : 'Entra')}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-700 text-center">
            <p className="text-slate-400 text-xs">
              {isRegistering ? "Hai già un account?" : "Non hai un account?"}
            </p>
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setError(''); }} 
              className="text-lime-400 font-bold text-sm mt-1 hover:underline"
            >
              {isRegistering ? "Accedi ora" : "Creane uno nuovo"}
            </button>
          </div>
       </Card>
    </div>
  );
};


// --- COMPONENTE GRAFICO SVG ---
const ProgressChart = ({ players, matches }) => {
  const sortedMatches = matches
    .filter(m => m.status === 'completed')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const history = {};
  players.forEach(p => { history[p.id] = [0]; });

  let maxPoints = 10; 
  
  sortedMatches.forEach(m => {
    let t1P = 0, t2P = 0;
    
    if (m.type === 'tiebreak') {
      if (m.winner === 'team1') { t1P = 2; t2P = 0; }
      else { t1P = 0; t2P = 2; }
    } else {
      const p = calculatePoints(m.score);
      t1P = p.t1Points;
      t2P = p.t2Points;
    }

    players.forEach(p => {
      const currentPoints = history[p.id][history[p.id].length - 1];
      let newPoints = currentPoints;
      if (m.team1 && m.team1.includes(p.id)) newPoints += t1P;
      if (m.team2 && m.team2.includes(p.id)) newPoints += t2P;
      history[p.id].push(newPoints);
      if (newPoints > maxPoints) maxPoints = newPoints;
    });
  });

  const numSteps = sortedMatches.length;
  if (numSteps === 0) return <div className="text-center text-slate-500 py-10">Nessuna partita giocata</div>;

  const width = 100;
  const height = 60;
  const padding = 5;
  const chartW = width - (padding * 2);
  const chartH = height - (padding * 2);
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
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {[0, 0.5, 1].map(t => (<line key={t} x1={padding} y1={padding + (chartH * t)} x2={width - padding} y2={padding + (chartH * t)} stroke="#1e293b" strokeWidth="0.5" />))}
        {players.map((p, i) => {
          const points = history[p.id];
          const pointsString = points.map((val, idx) => {
            const x = padding + (idx / numSteps) * chartW;
            const y = (height - padding) - (val / maxPoints) * chartH;
            return `${x},${y}`;
          }).join(' ');

          const lastVal = points[points.length - 1];
          const lastX = padding + (points.length - 1) / numSteps * chartW;
          const lastY = (height - padding) - (lastVal / maxPoints) * chartH;

          return (
            <g key={p.id}>
              <polyline points={pointsString} fill="none" stroke={colors[i % colors.length]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md" />
              <foreignObject x={lastX - 3} y={lastY - 3} width="8" height="8" className="overflow-visible">
                <PlayerAvatar player={p} size="sm" className="w-full h-full border-[0.5px] border-slate-900 shadow-sm" style={{borderColor: colors[i % colors.length]}} />
              </foreignObject>
            </g>
          );
        })}
      </svg>
      <div className="text-center text-[10px] text-slate-500 mt-2 uppercase tracking-widest">Partite Giocate</div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [showSplash, setShowSplash] = useState(true); 
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showChart, setShowChart] = useState(false);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  
  const [calendarView, setCalendarView] = useState('current'); 

  const [isEditingProfile, setIsEditingProfile] = useState(false); 
  const [isAddingMatch, setIsAddingMatch] = useState(false);
  const [isAddingTieBreak, setIsAddingTieBreak] = useState(false); 
  const [editingMatchId, setEditingMatchId] = useState(null); 
  const [matchToDelete, setMatchToDelete] = useState(null); 
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [playerToEdit, setPlayerToEdit] = useState(null);

  const [newMatchData, setNewMatchData] = useState({
    team1p1: '', team1p2: '', team2p1: '', team2p2: '', score: '', date: new Date().toISOString().split('T')[0]
  });
  const [profileName, setProfileName] = useState('');
  
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerPhoto, setNewPlayerPhoto] = useState(null);
  
  const fileInputRef = useRef(null);
  const profilePhotoInputRef = useRef(null); 
  const editFileInputRef = useRef(null);
  
  const [isConfigured, setIsConfigured] = useState(true);

  // --- FIREBASE LOGIC ---
  useEffect(() => {
    if (firebaseConfig.apiKey === "INSERISCI_QUI_API_KEY") {
      setIsConfigured(false);
      return;
    }
    // CONTROLLO AUTH STATE
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const unsubPlayers = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'players'), (s) => {
      const d = s.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(d);
      
      // Auto-selezione se esiste un saved ID nel localStorage
      const savedId = localStorage.getItem('padel_player_id');
      if (savedId) {
        const found = d.find(p => p.id === savedId);
        if (found) setCurrentPlayer(found);
      }
    });
    const unsubMatches = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), (s) => {
      const allMatches = s.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      allMatches.sort((a, b) => {
        if (a.round && b.round) return a.round - b.round;
        const dateA = new Date(a.date || 0);
        const dateB = new Date(b.date || 0);
        return dateB - dateA; 
      });
      setMatches(allMatches);
    });
    const unsubAvail = onSnapshot(collection(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities'), (s) => {
      setAvailabilities(s.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubPlayers(); unsubMatches(); unsubAvail(); };
  }, [user]);

  // --- BUSINESS LOGIC ---

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentPlayer(null);
    localStorage.removeItem('padel_player_id');
    setShowSplash(true);
  };

  const handlePhotoSelect = async (e, setPhotoState) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0]);
      setPhotoState(compressed);
    }
  };

  const handleCreateProfile = async () => {
    if (!profileName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'players'), {
        name: profileName,
        photoUrl: newPlayerPhoto,
        ownerId: user.uid, // Associa il profilo a questo utente Auth
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      const newPlayer = { id: docRef.id, name: profileName, photoUrl: newPlayerPhoto, ownerId: user.uid };
      setCurrentPlayer(newPlayer);
      localStorage.setItem('padel_player_id', docRef.id);
      setProfileName('');
      setNewPlayerPhoto(null);
      setIsEditingProfile(false);
    } catch (e) { console.error(e); }
  };

  const handleLoginClick = (player) => {
    // Non chiediamo più la password locale, l'utente è già autenticato con Firebase
    setCurrentPlayer(player);
    localStorage.setItem('padel_player_id', player.id);
  };

  const handleAddPlayerGeneric = async () => {
    if (!newPlayerName.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'players'), {
        name: newPlayerName,
        photoUrl: newPlayerPhoto,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      setNewPlayerName('');
      setNewPlayerPhoto(null);
    } catch (e) { console.error(e); }
  };

  const handleEditPlayerClick = (player) => setPlayerToEdit({ ...player, newPhoto: null });

  const saveEditedPlayer = async () => {
    if (!playerToEdit || !playerToEdit.name.trim()) return;
    try {
      const updateData = { name: playerToEdit.name };
      if (playerToEdit.newPhoto) updateData.photoUrl = playerToEdit.newPhoto;
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'players', playerToEdit.id), updateData);
      setPlayerToEdit(null);
    } catch (err) { console.error(err); }
  };

  const handleDeletePlayerClick = (playerId) => setPlayerToDelete(playerId);

  const executeDeletePlayer = async () => {
    if (!playerToDelete) return;
    try {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'players', playerToDelete));
      if (currentPlayer?.id === playerToDelete) {
          setCurrentPlayer(null);
          localStorage.removeItem('padel_player_id');
      }
      setPlayerToDelete(null);
    } catch (err) { console.error(err); }
  };

  const toggleAvailability = async (dateStr) => {
    if (!currentPlayer) return;
    const existing = availabilities.find(a => a.date === dateStr && a.playerId === currentPlayer.id);
    if (existing) await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities', existing.id));
    else await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'availabilities'), { date: dateStr, playerId: currentPlayer.id, playerName: currentPlayer.name || 'Anonimo' });
  };

  const generateTournament = async () => {
    if (players.length < 4) { alert("Servono almeno 4 giocatori!"); return; }
    const p = players.slice(0, 4);
    const rounds = [{t1:[p[0].id,p[1].id],t2:[p[2].id,p[3].id]},{t1:[p[0].id,p[2].id],t2:[p[1].id,p[3].id]},{t1:[p[0].id,p[3].id],t2:[p[1].id,p[2].id]}];
    const batchPromises = [];
    let matchCount = 1;
    for (let cycle = 1; cycle <= 2; cycle++) {
      rounds.forEach(round => {
        batchPromises.push(addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), {
          date: new Date().toISOString().split('T')[0], score: '', team1: round.t1, team2: round.t2, round: matchCount++, cycle, createdAt: serverTimestamp(), status: 'scheduled'
        }));
      });
    }
    await Promise.all(batchPromises);
    alert("Calendario Generato!");
  };

  const handleSaveMatchResult = async () => {
    const { team1p1, team1p2, team2p1, team2p2, score, date } = newMatchData;
    if (!team1p1 || !team1p2 || !team2p1 || !team2p2 || !score) return;
    const { winner } = calculatePoints(score);
    const matchData = { score: String(score), date: date || new Date().toISOString().split('T')[0], team1: [team1p1, team1p2], team2: [team2p1, team2p2], recordedBy: currentPlayer?.name || 'Anonimo', winner, status: 'completed' };
    if (editingMatchId) await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', editingMatchId), matchData);
    else await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), { ...matchData, createdAt: serverTimestamp() });
    closeMatchModal();
  };

  const handleSaveTieBreak = async (winnerTeam) => {
    const { team1p1, team1p2, team2p1, team2p2, date, score } = newMatchData;
    if (!team1p1 || !team1p2 || !team2p1 || !team2p2) return;
    if (!score) { alert("Inserisci il punteggio!"); return; } 
    
    const matchData = { 
        score: score, 
        date: date || new Date().toISOString().split('T')[0], 
        team1: [team1p1, team1p2], 
        team2: [team2p1, team2p2], 
        recordedBy: currentPlayer?.name || 'Anonimo', 
        winner: winnerTeam, 
        status: 'completed',
        type: 'tiebreak' 
    };
    
    await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'matches'), { ...matchData, createdAt: serverTimestamp() });
    setIsAddingTieBreak(false);
    setNewMatchData({ team1p1: '', team1p2: '', team2p1: '', team2p2: '', score: '', date: new Date().toISOString().split('T')[0] });
  };

  const openMatchModal = (match = null) => {
    if (match) {
      setEditingMatchId(match.id);
      setNewMatchData({ team1p1: match.team1[0], team1p2: match.team1[1], team2p1: match.team2[0], team2p2: match.team2[1], score: match.score || '', date: match.date || new Date().toISOString().split('T')[0] });
    } else {
      setEditingMatchId(null);
      setNewMatchData({ team1p1: '', team1p2: '', team2p1: '', team2p2: '', score: '', date: new Date().toISOString().split('T')[0] });
    }
    setIsAddingMatch(true);
  };

  const closeMatchModal = () => { setIsAddingMatch(false); setEditingMatchId(null); };
  const askDeleteConfirmation = (e, matchId) => { if (e) { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); } setMatchToDelete(matchId); };
  const executeDeleteMatch = async () => {
    if (!matchToDelete) return;
    try { await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', matchToDelete)); setMatchToDelete(null); if (isAddingMatch && editingMatchId === matchToDelete) closeMatchModal(); } catch (err) { console.error(err); }
  };

  const ranking = useMemo(() => {
    const stats = {};
    players.forEach(p => { 
        stats[p.id] = { 
            id: p.id, 
            name: p.name, 
            photoUrl: p.photoUrl, 
            wins: 0, 
            losses: 0, 
            draws: 0, 
            played: 0, 
            points: 0, 
            gamesWon: 0, 
            gamesLost: 0,
            tieBreaksWon: 0,
            tieBreaksLost: 0
        }; 
    });
    matches.filter(m => m.score && m.status !== 'scheduled').forEach(m => {
      
      let t1Points = 0, t2Points = 0, t1Games = 0, t2Games = 0, winner = 'draw';

      if (m.type === 'tiebreak') {
          winner = m.winner;
          if (winner === 'team1') { t1Points = 2; t2Points = 0; }
          else { t1Points = 0; t2Points = 2; }
      } else {
          const p = calculatePoints(m.score);
          t1Points = p.t1Points;
          t2Points = p.t2Points;
          t1Games = p.t1Games;
          t2Games = p.t2Games;
          winner = p.winner;
      }

      const team1 = m.team1 || [];
      const team2 = m.team2 || [];

      if (winner === 'team1') { 
          team1.forEach(pid => { 
              if(stats[pid]) {
                  if (m.type !== 'tiebreak') stats[pid].wins++; 
                  if(m.type === 'tiebreak') stats[pid].tieBreaksWon++;
              }
          }); 
          team2.forEach(pid => { 
              if(stats[pid]) {
                  if (m.type !== 'tiebreak') stats[pid].losses++; 
                  if(m.type === 'tiebreak') stats[pid].tieBreaksLost++;
              }
          }); 
      }
      else if (winner === 'team2') { 
          team2.forEach(pid => { 
              if(stats[pid]) {
                  if (m.type !== 'tiebreak') stats[pid].wins++; 
                  if(m.type === 'tiebreak') stats[pid].tieBreaksWon++; 
              }
          }); 
          team1.forEach(pid => { 
              if(stats[pid]) {
                  if (m.type !== 'tiebreak') stats[pid].losses++;
                  if(m.type === 'tiebreak') stats[pid].tieBreaksLost++;
              }
          }); 
      }
      else { 
          team1.forEach(pid => { if(stats[pid]) stats[pid].draws++; }); 
          team2.forEach(pid => { if(stats[pid]) stats[pid].draws++; }); 
      }
      
      team1.forEach(pid => { if (stats[pid]) { stats[pid].points += t1Points; stats[pid].played++; stats[pid].gamesWon += t1Games; stats[pid].gamesLost += t2Games; } });
      team2.forEach(pid => { if (stats[pid]) { stats[pid].points += t2Points; stats[pid].played++; stats[pid].gamesWon += t2Games; stats[pid].gamesLost += t1Games; } });
    });
    return Object.values(stats).sort((a, b) => b.points - a.points);
  }, [players, matches]);

  // DATE DINAMICHE PER IL CALENDARIO
  const calendarDates = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); 

    if (calendarView === 'current') {
      const days = getDaysInMonth(currentYear, currentMonth);
      return days.filter(d => d >= today.toISOString().split('T')[0]);
    } else {
      let nextMonth = currentMonth + 1;
      let year = currentYear;
      if (nextMonth > 11) { nextMonth = 0; year++; }
      return getDaysInMonth(year, nextMonth);
    }
  }, [calendarView]);

  const monthLabel = useMemo(() => {
    const today = new Date();
    const date = new Date();
    if (calendarView === 'next') {
        date.setMonth(today.getMonth() + 1);
    }
    return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  }, [calendarView]);

  const missingPlayers = useMemo(() => {
      const activeDates = calendarDates;
      const availablePlayerIds = new Set();
      availabilities.forEach(a => {
          if (activeDates.includes(a.date)) {
              availablePlayerIds.add(a.playerId);
          }
      });
      return players.filter(p => !availablePlayerIds.has(p.id));
  }, [players, availabilities, calendarDates]);

  const upcomingMatches = useMemo(() => {
      return calendarDates.filter(date => {
          const count = availabilities.filter(a => a.date === date).length;
          return count >= 4;
      });
  }, [calendarDates, availabilities]);


  // --- RENDER START ---

  // 1. SPLASH SCREEN
  if (showSplash) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
        <div onClick={() => setShowSplash(false)} className="cursor-pointer flex flex-col items-center gap-6 group select-none">
          <div className="relative">
            <div className="relative w-80 h-80 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 ease-out">
              <img src={logo} alt="Padel Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="text-center space-y-2 mt-2">
            <h1 className="text-5xl font-black italic tracking-tighter text-white">PADEL</h1>
            <div className="text-4xl font-black text-lime-400 tracking-widest">CHALLENGE</div>
            <div className="text-xl font-bold text-slate-500 tracking-[0.5em] mt-2">2026</div>
          </div>
          <div className="absolute bottom-12 text-slate-500 text-xs uppercase tracking-widest animate-bounce">Tocca per entrare</div>
        </div>
      </div>
    );
  }

  // 2. ERRORI CONFIG
  if (!isConfigured) return <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center"><div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center text-yellow-400 mb-6 animate-pulse"><Database size={40} /></div><h1 className="text-3xl font-black mb-2">Database Non Collegato</h1></div>;
  
  // 3. SE UTENTE NON LOGGATO -> MOSTRA FORM AUTH (EMAIL/PASSWORD)
  if (!user) {
    return <AuthScreen />;
  }

  // 4. SELEZIONE PROFILO (DOPO LOGIN FIREBASE)
  if (!currentPlayer && !isEditingProfile) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col justify-center items-center relative">
        <div className="w-full max-w-md space-y-8 text-center">
          <div><div className="mx-auto w-24 h-24 mb-4 drop-shadow-xl"><img src={logo} alt="Logo" className="w-full h-full object-contain" /></div><h1 className="text-4xl font-black italic tracking-tighter">PADEL CHALLENGE <span className="text-lime-400">2026</span></h1></div>
          <Card>
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-bold flex items-center gap-2"><LogIn size={20} className="text-lime-400" /> Chi sei?</h2>
               <div className="text-xs text-slate-500">{user.email}</div>
            </div>
            
            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2">
              {players.map(p => (
                <button key={p.id} onClick={() => handleLoginClick(p)} className="bg-slate-700 hover:bg-slate-600 p-3 rounded-xl flex items-center justify-between gap-3 transition-all text-left border border-slate-600 hover:border-lime-400 group">
                  <div className="flex items-center gap-3"><PlayerAvatar player={p} size="sm" /><span className="font-bold">{p.name}</span></div>
                  <ArrowRight size={14} className="text-slate-500 group-hover:text-lime-400" />
                </button>
              ))} 
            </div>
            <div className="border-t border-slate-700 mt-4 pt-4 space-y-3">
              <button onClick={() => setIsEditingProfile(true)} className="w-full py-3 bg-slate-800 border border-slate-600 border-dashed rounded-xl text-slate-400 font-bold hover:text-white hover:border-white transition-all flex items-center justify-center gap-2">
                <PlusCircle size={18} /> Crea Nuovo Giocatore
              </button>
              <button onClick={handleLogout} className="w-full py-2 text-red-400 text-xs uppercase font-bold hover:text-red-300">
                Disconnetti Account
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // 5. CREAZIONE NUOVO PROFILO
  if (isEditingProfile) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col justify-center items-center">
        <Card className="w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4">Nuovo Giocatore</h2>
          <div className="flex flex-col items-center gap-4 mb-4"><div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-slate-700 overflow-hidden relative group cursor-pointer" onClick={() => profilePhotoInputRef.current.click()}>{newPlayerPhoto ? (<img src={newPlayerPhoto} alt="Preview" className="w-full h-full object-cover" />) : (<Camera size={20} className="text-slate-500 group-hover:text-lime-400" />)}</div><input type="file" ref={profilePhotoInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoSelect(e, setNewPlayerPhoto)} /></div>
          <Input label="Nome" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Es. Il Cannibale" />
          <div className="flex gap-3"><Button onClick={() => setIsEditingProfile(false)} variant="secondary" className="flex-1">Annulla</Button><Button onClick={handleCreateProfile} className="flex-1">Crea Profilo</Button></div>
        </Card>
      </div>
    );
  }

  const completedMatchesCount = matches.filter(m => m.score && m.type !== 'tiebreak').length;
  const scheduledMatchesCount = matches.filter(m => !m.score).length;

  // 6. MAIN DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 font-sans selection:bg-lime-400 selection:text-black relative">
      
      {/* MODALI CANCELLAZIONE */}
      {matchToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/50 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-2"><Trash2 size={32} /></div>
              <h3 className="text-xl font-bold text-white">Eliminare Partita?</h3>
              <p className="text-slate-400 text-sm">Questa azione è irreversibile.</p>
              <div className="flex gap-3 w-full mt-2"><Button onClick={() => setMatchToDelete(null)} variant="secondary" className="flex-1">Annulla</Button><Button onClick={executeDeleteMatch} variant="danger" className="flex-1">Elimina</Button></div>
            </div>
          </div>
        </div>
      )}

      {playerToDelete && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/50 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-2"><Trash2 size={32} /></div>
              <h3 className="text-xl font-bold text-white">Eliminare Giocatore?</h3>
              <p className="text-slate-400 text-sm">Le partite giocate da questo utente rimarranno.</p>
              <div className="flex gap-3 w-full mt-2"><Button onClick={() => setPlayerToDelete(null)} variant="secondary" className="flex-1">Annulla</Button><Button onClick={executeDeletePlayer} variant="danger" className="flex-1">Elimina</Button></div>
            </div>
          </div>
        </div>
      )}

      {playerToEdit && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-lime-500/50 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex flex-col gap-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Pencil size={20} className="text-lime-400"/> Modifica Profilo</h3>
              <div className="flex flex-col items-center gap-2 mb-2"><div className="w-20 h-20 relative"><PlayerAvatar player={playerToEdit.newPhoto ? {photoUrl: playerToEdit.newPhoto} : playerToEdit} size="xl" /><button onClick={() => editFileInputRef.current.click()} className="absolute bottom-0 right-0 bg-lime-400 p-1.5 rounded-full text-slate-900 hover:scale-110 transition-transform"><Camera size={14} /></button></div><input type="file" ref={editFileInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoSelect(e, (data) => setPlayerToEdit(prev => ({...prev, newPhoto: data})))} /></div>
              <Input label="Nome" value={playerToEdit.name} onChange={(e) => setPlayerToEdit({...playerToEdit, name: e.target.value})} placeholder="Nome..." />
              <div className="flex gap-3 w-full mt-2"><Button onClick={() => setPlayerToEdit(null)} variant="secondary" className="flex-1">Annulla</Button><Button onClick={saveEditedPlayer} className="flex-1">Salva</Button></div>
            </div>
          </div>
        </div>
      )}

      <header className="fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-50 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2"><div className="w-6 h-6"><img src={logo} alt="Mini Logo" className="w-full h-full object-contain" /></div><span className="font-black italic text-xl tracking-tight">PADEL <span className="text-lime-400">2026</span></span></div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">
                <PlayerAvatar player={currentPlayer} size="sm" />
                <span className="text-xs font-bold text-slate-300 pr-1 hidden sm:inline">{currentPlayer?.name}</span>
            </div>
            <button onClick={handleLogout} className="p-2 bg-slate-800 rounded-full border border-slate-700 text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-colors">
                <LogOut size={16} />
            </button>
        </div>
      </header>

      <main className="pt-20 px-4 max-w-md mx-auto space-y-6">
        {activeTab === 'dashboard' && !isAddingMatch && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Card className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-slate-800 to-slate-900"><span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Chiuse</span><span className="text-4xl font-black text-white mt-1">{completedMatchesCount}</span></Card>
              <Card className="flex flex-col items-center justify-center py-6 bg-gradient-to-br from-lime-900/20 to-lime-900/10 border-lime-500/20"><span className="text-lime-400 text-xs font-bold uppercase tracking-wider">Aperte</span><span className="text-4xl font-black text-lime-400 mt-1">{scheduledMatchesCount}</span></Card>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={() => setActiveTab('ranking')} className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700 group"><Trophy size={20} className="text-yellow-400 group-hover:scale-110 transition-transform" /><span className="font-bold text-sm">Classifica</span></button>
                <button onClick={() => setActiveTab('tournament')} className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700 group"><Swords size={20} className="text-lime-400 group-hover:scale-110 transition-transform" /><span className="font-bold text-sm">Torneo</span></button>
                <button onClick={() => setActiveTab('calendar')} className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700 group"><Calendar size={20} className="text-blue-400 group-hover:scale-110 transition-transform" /><span className="font-bold text-sm">Date</span></button>
                <button onClick={() => setActiveTab('rules')} className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-700 group"><BookOpen size={20} className="text-purple-400 group-hover:scale-110 transition-transform" /><span className="font-bold text-sm">Regole</span></button>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><TrendingUp size={20} className="text-lime-400" /> Ultime Attività</h3>
              {matches.filter(m=>m.score).length === 0 ? (<div className="text-center py-10 opacity-50"><p>Nessuna partita terminata.</p></div>) : (
                <div className="space-y-3">{matches.filter(m=>m.score).slice(0, 3).map(m => {
                    let points1 = 0, points2 = 0;
                    if(m.type === 'tiebreak') {
                        if(m.winner === 'team1') { points1 = 2; points2 = 0; }
                        else { points1 = 0; points2 = 2; }
                    } else {
                        const pts = calculatePoints(m.score);
                        points1 = pts.t1Points;
                        points2 = pts.t2Points;
                    }
                    return (
                    <Card key={m.id} onClick={() => openMatchModal(m)} className={`relative overflow-hidden group cursor-pointer hover:bg-slate-800/80 active:scale-[0.98] transition-all ${m.type === 'tiebreak' ? 'border-orange-500/30' : ''}`}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${m.type === 'tiebreak' ? 'bg-orange-500' : 'bg-lime-400'}`} />
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-slate-500 font-mono">{new Date(m.date).toLocaleDateString()}</span>
                            {m.type === 'tiebreak' ? <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1"><Zap size={10}/> Tie-Break</span> : <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">{String(m.score)}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className={`flex justify-between font-medium ${m.winner==='team1'||m.winner==='draw'?'text-lime-400 font-bold':'text-white'}`}><span>{players.find(p=>p.id===m.team1[0])?.name || '?'} & {players.find(p=>p.id===m.team1[1])?.name || '?'}</span><span className="text-xs opacity-70 ml-2">+{points1.toFixed(1)}</span></div>
                            <div className={`flex justify-end gap-2 font-medium ${m.winner==='team2'||m.winner==='draw'?'text-lime-400 font-bold':'text-white'}`}><span className="text-xs opacity-70">+{points2.toFixed(1)}</span><span>{players.find(p=>p.id===m.team2[0])?.name || '?'} & {players.find(p=>p.id===m.team2[1])?.name || '?'}</span></div>
                        </div>
                    </Card>);
                  })}</div>
              )}
            </div>
            <div className="h-4"></div>
            <Button onClick={() => openMatchModal()} className="w-full py-4 text-lg"><PlusCircle size={24} /> Registra Risultato Libero</Button>
          </>
        )}

        {/* VIEW: RANKING & OTHERS */}
        {activeTab === 'ranking' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold flex items-center gap-2"><Trophy className="text-yellow-400" /> Classifica</h2><button onClick={() => setShowChart(!showChart)} className="bg-lime-400 text-slate-900 p-2.5 rounded-xl hover:bg-lime-300 shadow-lg shadow-lime-900/20 transition-all active:scale-95">{showChart ? <LayoutDashboard size={20}/> : <LineChart size={20}/>}</button></div>
            {showChart ? (<ProgressChart players={players} matches={matches} />) : (ranking.map((p, idx) => (
                <div key={p.id} className="flex flex-col bg-slate-800 p-4 rounded-xl border border-slate-700 gap-3 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${idx === 0 ? 'bg-yellow-400 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-orange-700 text-white' : 'bg-slate-700 text-slate-400'}`}>{idx + 1}</div>
                            <div className="flex items-center gap-3"><PlayerAvatar player={p} size="md" /><span className="font-bold text-xl">{p.name}</span></div>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-black text-lime-400">{p.points % 1 !== 0 ? p.points.toFixed(1) : p.points}</div>
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Punti Totali</div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-700">
                        <div className="bg-slate-900/50 rounded-lg p-2 text-center"><div className="text-[10px] text-slate-500 uppercase font-bold">Vinte</div><div className="text-sm font-bold text-white">{p.wins}</div></div>
                        <div className="bg-slate-900/50 rounded-lg p-2 text-center"><div className="text-[10px] text-slate-500 uppercase font-bold">Pari</div><div className="text-sm font-bold text-slate-300">{p.draws}</div></div>
                        <div className="bg-slate-900/50 rounded-lg p-2 text-center"><div className="text-[10px] text-slate-500 uppercase font-bold">Perse</div><div className="text-sm font-bold text-slate-400">{p.losses}</div></div>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                        <div className="bg-lime-900/10 border border-lime-500/20 rounded-lg p-2 text-center"><div className="text-[9px] text-lime-500/70 uppercase font-bold">Game V</div><div className="text-sm font-bold text-lime-400">{p.gamesWon}</div></div>
                        <div className="bg-red-900/10 border border-red-500/20 rounded-lg p-2 text-center"><div className="text-[9px] text-red-500/70 uppercase font-bold">Game P</div><div className="text-sm font-bold text-red-400">{p.gamesLost}</div></div>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 text-center"><div className="text-[9px] text-orange-500/70 uppercase font-bold">TB Vinti</div><div className="text-sm font-bold text-orange-400">{p.tieBreaksWon}</div></div>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 text-center"><div className="text-[9px] text-orange-500/70 uppercase font-bold">TB Persi</div><div className="text-sm font-bold text-red-400 opacity-70">{p.tieBreaksLost}</div></div>
                    </div>
                </div>
            )))}
          </div>
        )}

        {/* TOURNAMENT VIEW - CORRETTA */}
        {activeTab === 'tournament' && !isAddingMatch && !isAddingTieBreak && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Swords className="text-lime-400" /> Torneo</h2>
              {matches.length > 0 && (<button onClick={() => { if(window.confirm("Attenzione: Questo cancellerà TUTTE le partite. Continuare?")) matches.forEach(m => deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'matches', m.id))); }} className="text-xs text-red-400 underline hover:text-red-300">Reset Tutto</button>)}
            </div>

            {matches.length === 0 && (
              <Card className="text-center py-8">
                 <Swords size={48} className="mx-auto text-slate-600 mb-4" />
                 <h3 className="text-lg font-bold text-white mb-2">Nessun Torneo Attivo</h3>
                 {players.length < 4 ? 
                    <div className="text-yellow-400 text-sm mb-4 bg-yellow-400/10 p-2 rounded border border-yellow-400/20"><AlertTriangle size={16} className="inline mr-1"/> Servono 4 giocatori! Vai su "Players".</div> :
                    <p className="text-slate-400 text-sm mb-6">Genera un calendario dove tutti giocano con e contro tutti (2 volte).</p>
                 }
                 <Button onClick={generateTournament} className="w-full" disabled={players.length < 4}>Genera Calendario (4P)</Button>
              </Card>
            )}

            <div className="space-y-4">
              {matches.filter(m => m.type !== 'tiebreak').map((m, idx) => {
                if(!m || !m.team1 || !m.team2) return null; 
                const isPlayed = !!m.score;
                const dateDisplay = new Date(m.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
                const { winner, t1Points, t2Points } = calculatePoints(m.score);
                return (
                  <div key={m.id} className="relative group">
                     <button onClick={(e) => askDeleteConfirmation(e, m.id)} className="absolute top-2 right-2 z-20 p-2 bg-slate-900/80 hover:bg-red-500 text-slate-400 hover:text-white rounded-lg shadow-sm border border-slate-700 transition-all" title="Elimina"><Trash2 size={16}/></button>
                    <Card onClick={() => openMatchModal(m)} className={`border-l-4 ${isPlayed ? 'border-l-slate-600 opacity-90' : 'border-l-lime-400'} hover:bg-slate-800/80 transition-all pr-12`}>
                      <div className="flex justify-between items-center mb-3"><div className="flex items-center gap-2"><span className={`text-xs font-bold px-2 py-1 rounded ${isPlayed ? 'bg-slate-700 text-slate-400' : 'bg-lime-400/20 text-lime-400'}`}>{m.round ? `Match ${m.round}` : 'Libera'}</span><span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={10} /> {dateDisplay}</span></div><div className="flex items-center gap-2 mr-6">{!isPlayed && <span className="text-xs text-lime-400 animate-pulse font-bold">DA GIOCARE</span>}{isPlayed && <span className="text-xs text-slate-500 font-medium flex items-center gap-1"><Check size={12}/> Completata</span>}</div></div>
                      <div className="flex items-center justify-between gap-2">
                        <div className={`flex-1 p-2 rounded-lg text-center transition-colors ${isPlayed && (winner === 'team1' || winner === 'draw') ? 'bg-lime-900/20 border border-lime-500/30' : 'bg-slate-900/50'}`}><div className={`text-sm ${isPlayed && (winner === 'team1' || winner === 'draw') ? 'font-black text-lime-400' : 'font-medium text-white'}`}>{players.find(p=>p.id===m.team1[0])?.name || '?'}</div><div className={`text-sm ${isPlayed && (winner === 'team1' || winner === 'draw') ? 'font-black text-lime-400' : 'font-medium text-white'}`}>{players.find(p=>p.id===m.team1[1])?.name || '?'}</div>{isPlayed && <div className="text-xs text-lime-400 mt-1 font-mono">+{t1Points.toFixed(1)}</div>}</div>
                        <div className="flex flex-col items-center justify-center w-16">{isPlayed ? (<span className="text-xl font-black text-white tracking-widest">{String(m.score)}</span>) : (<span className="font-black text-slate-600 italic text-lg">VS</span>)}</div>
                        <div className={`flex-1 p-2 rounded-lg text-center transition-colors ${isPlayed && (winner === 'team2' || winner === 'draw') ? 'bg-lime-900/20 border border-lime-500/30' : 'bg-slate-900/50'}`}><div className={`text-sm ${isPlayed && (winner === 'team2' || winner === 'draw') ? 'font-black text-lime-400' : 'font-medium text-white'}`}>{players.find(p=>p.id===m.team2[0])?.name || '?'}</div><div className={`text-sm ${isPlayed && (winner === 'team2' || winner === 'draw') ? 'font-black text-lime-400' : 'font-medium text-white'}`}>{players.find(p=>p.id===m.team2[1])?.name || '?'}</div>{isPlayed && <div className="text-xs text-lime-400 mt-1 font-mono">+{t2Points.toFixed(1)}</div>}</div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>

            {/* SEZIONE TIE BREAK DEDICATA */}
            <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-orange-400 flex items-center gap-2"><Zap size={20}/> Extra: Tie-Break</h3>
                    <button onClick={() => setIsAddingTieBreak(true)} className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-xs font-bold hover:bg-orange-500 hover:text-white transition-all">+ Aggiungi</button>
                </div>
                <div className="space-y-2">
                    {matches.filter(m => m.type === 'tiebreak').length === 0 && <div className="text-xs text-slate-500 text-center py-2">Nessun tie-break giocato.</div>}
                    {matches.filter(m => m.type === 'tiebreak').map(m => (
                        <div key={m.id} className="relative group">
                            <button onClick={(e) => askDeleteConfirmation(e, m.id)} className="absolute top-2 right-2 z-20 p-1.5 bg-slate-900/80 hover:bg-red-500 text-slate-400 hover:text-white rounded-lg shadow-sm border border-slate-700 transition-all" title="Elimina"><Trash2 size={14}/></button>
                            <Card className="border-l-4 border-l-orange-500 bg-slate-900/50">
                                <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
                                    <span>{new Date(m.date).toLocaleDateString()}</span>
                                    <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{m.score}</span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <div className={`flex-1 text-center p-2 rounded ${m.winner === 'team1' ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30' : 'text-slate-400'}`}>
                                        <div className="text-xs">{players.find(p=>p.id===m.team1[0])?.name}</div>
                                        <div className="text-xs">{players.find(p=>p.id===m.team1[1])?.name}</div>
                                    </div>
                                    <div className="font-black text-slate-600 text-xs">VS</div>
                                    <div className={`flex-1 text-center p-2 rounded ${m.winner === 'team2' ? 'bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30' : 'text-slate-400'}`}>
                                        <div className="text-xs">{players.find(p=>p.id===m.team2[0])?.name}</div>
                                        <div className="text-xs">{players.find(p=>p.id===m.team2[1])?.name}</div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        )}

        {isAddingTieBreak && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 fixed inset-0 z-[60] bg-slate-950 flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold flex items-center gap-2"><Zap className="text-orange-400"/> Registra Tie-Break</h2><button onClick={() => setIsAddingTieBreak(false)} className="text-slate-400 p-2">Annulla</button></div>
            <div className="space-y-6 flex-1">
                <div className="bg-orange-500/10 p-4 rounded-xl border border-orange-500/30 text-orange-200 text-sm text-center">
                    <p>Il Tie-Break ai 10 punti assegna <strong>2 punti</strong> secchi alla coppia vincitrice.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                    {/* INPUT PUNTEGGIO */}
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <Input 
                            label="Risultato (es. 10-8)" 
                            value={newMatchData.score} 
                            onChange={e => setNewMatchData({...newMatchData, score: e.target.value})} 
                            placeholder="10-8" 
                        />
                    </div>

                    <div className="p-4 rounded-2xl border bg-slate-900 border-slate-700">
                        <label className="text-slate-400 font-bold text-sm mb-3 block uppercase tracking-wider text-center">Team A</label>
                        <div className="space-y-3">
                            {[1, 2].map(num => (<select key={num} className="bg-slate-800 text-white p-3 rounded-xl text-sm border border-slate-600 w-full" value={newMatchData[`team1p${num}`]} onChange={e => setNewMatchData({...newMatchData, [`team1p${num}`]: e.target.value})}><option value="">Giocatore {num}</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>))}
                        </div>
                        <Button onClick={() => handleSaveTieBreak('team1')} className="w-full mt-4 bg-slate-700 hover:bg-orange-500 hover:text-white border border-slate-600">🏆 Vince A</Button>
                    </div>
                    
                    <div className="flex items-center justify-center font-black text-slate-700">VS</div>

                    <div className="p-4 rounded-2xl border bg-slate-900 border-slate-700">
                        <label className="text-slate-400 font-bold text-sm mb-3 block uppercase tracking-wider text-center">Team B</label>
                        <div className="space-y-3">
                            {[1, 2].map(num => (<select key={num} className="bg-slate-800 text-white p-3 rounded-xl text-sm border border-slate-600 w-full" value={newMatchData[`team2p${num}`]} onChange={e => setNewMatchData({...newMatchData, [`team2p${num}`]: e.target.value})}><option value="">Giocatore {num}</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>))}
                        </div>
                        <Button onClick={() => handleSaveTieBreak('team2')} className="w-full mt-4 bg-slate-700 hover:bg-orange-500 hover:text-white border border-slate-600">🏆 Vince B</Button>
                    </div>
                </div>
            </div>
            </div>
        )}

        {isAddingMatch && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 fixed inset-0 z-[60] bg-slate-950 flex flex-col p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold">{editingMatchId ? 'Modifica Partita' : 'Nuova Partita'}</h2><button onClick={closeMatchModal} className="text-slate-400 p-2">Annulla</button></div>
            <div className="space-y-6 flex-1">
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800"><Input label="Data Partita" type="date" value={newMatchData.date} onChange={e => setNewMatchData({...newMatchData, date: e.target.value})} /><p className="text-xs text-slate-500 mt-[-10px] mb-2">Cambia la data se avete giocato in un giorno diverso da oggi.</p></div>
              <div className="grid grid-cols-1 gap-4">
                  <div className={`p-4 rounded-2xl border ${editingMatchId ? 'bg-slate-900 border-slate-700' : 'bg-lime-900/10 border-lime-500/30'}`}><label className="text-lime-400 font-bold text-sm mb-3 block uppercase tracking-wider text-center">Team A</label><div className="space-y-3">{[1, 2].map(num => (<select key={num} disabled={!!editingMatchId} className="bg-slate-800 text-white p-3 rounded-xl text-sm border border-slate-600 w-full disabled:opacity-70 disabled:cursor-not-allowed" value={newMatchData[`team1p${num}`]} onChange={e => setNewMatchData({...newMatchData, [`team1p${num}`]: e.target.value})}><option value="">Giocatore {num}</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>))}</div></div>
                  <div className={`p-4 rounded-2xl border ${editingMatchId ? 'bg-slate-900 border-slate-700' : 'bg-red-900/10 border-red-500/30'}`}><label className="text-red-400 font-bold text-sm mb-3 block uppercase tracking-wider text-center">Team B</label><div className="space-y-3">{[1, 2].map(num => (<select key={num} disabled={!!editingMatchId} className="bg-slate-800 text-white p-3 rounded-xl text-sm border border-slate-600 w-full disabled:opacity-70 disabled:cursor-not-allowed" value={newMatchData[`team2p${num}`]} onChange={e => setNewMatchData({...newMatchData, [`team2p${num}`]: e.target.value})}><option value="">Giocatore {num}</option>{players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>))}</div></div>
              </div>
              <div className="pt-4 space-y-3"><Input label="Punteggio (es. 6-4 6-2)" value={newMatchData.score} onChange={e => setNewMatchData({...newMatchData, score: e.target.value})} placeholder="6-3 6-4" /><p className="text-xs text-slate-500">Usa il formato corretto per calcolare i punti (es: 6-2 6-4).</p><Button onClick={handleSaveMatchResult} className="w-full py-4 text-lg shadow-xl shadow-lime-900/20">{editingMatchId ? 'Salva Risultato' : 'Crea Partita'}</Button>{editingMatchId && (<Button onClick={(e) => askDeleteConfirmation(e, editingMatchId)} variant="danger" className="w-full"><Trash2 size={18} /> Elimina Partita</Button>)}</div>
            </div>
          </div>
        )}

        {/* RULES, CALENDAR, PLAYERS */}
        {activeTab === 'rules' && (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="text-lime-400" /> Regolamento</h2>
            <div className="space-y-4">
            <Card className="border-l-4 border-l-lime-400 bg-slate-900/80"><div className="flex items-center justify-between mb-2"><h3 className="font-bold text-white text-lg">Vittoria Netta (2-0)</h3><div className="bg-lime-400/20 text-lime-400 px-2 py-1 rounded text-xs font-bold">Best Scenar</div></div><ul className="space-y-2 text-sm text-slate-300"><li className="flex items-center gap-2"><Check size={14} className="text-lime-400"/><span><strong>8 Punti</strong> a testa per i vincitori.</span></li><li className="flex items-center gap-2"><Minus size={14} className="text-slate-500"/><span><strong>0.2 Punti</strong> per ogni game vinto ai perdenti.</span></li></ul></Card>
            <Card className="border-l-4 border-l-yellow-400 bg-slate-900/80"><div className="flex items-center justify-between mb-2"><h3 className="font-bold text-white text-lg">Vittoria Combattuta (2-1)</h3><div className="bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded text-xs font-bold">Battle</div></div><ul className="space-y-2 text-sm text-slate-300"><li className="flex items-center gap-2"><Check size={14} className="text-yellow-400"/><span><strong>6 Punti</strong> a testa per i vincitori.</span></li><li className="flex items-center gap-2"><Check size={14} className="text-slate-400"/><span><strong>3 Punti</strong> a testa per i perdenti.</span></li></ul></Card>
            <Card className="border-l-4 border-l-slate-400 bg-slate-900/80"><div className="flex items-center justify-between mb-2"><h3 className="font-bold text-white text-lg">Pareggio (1-1)</h3><div className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs font-bold">Draw</div></div><p className="text-sm text-slate-400 mb-2">Se la partita finisce un set pari, viene considerata pareggio.</p><ul className="space-y-2 text-sm text-slate-300"><li className="flex items-center gap-2"><Calculator size={14} className="text-blue-400"/><span><strong>0.3 Punti</strong> per ogni game vinto a tutti i giocatori.</span></li></ul></Card>
            
            <Card className="border-l-4 border-l-orange-500 bg-slate-900/80"><div className="flex items-center justify-between mb-2"><h3 className="font-bold text-white text-lg">Tie-Break (10 punti)</h3><div className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs font-bold">Extra</div></div><p className="text-sm text-slate-400 mb-2">Se avanza tempo e si gioca un tie-break ai 10.</p><ul className="space-y-2 text-sm text-slate-300"><li className="flex items-center gap-2"><Zap size={14} className="text-orange-400"/><span><strong>2 Punti</strong> secchi ai vincitori.</span></li></ul></Card>

            <Card className="border-l-4 border-l-red-400 bg-slate-900/80">
                <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-white text-lg">Regola Aurea</h3>
                <div className="bg-red-400/20 text-red-400 px-2 py-1 rounded text-xs font-bold">Importante</div>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2">
                    <Pizza size={14} className="text-red-400"/>
                    <span><strong>Chi perde paga la pizza.</strong> Chi vince gode e mangia.</span>
                </li>
                </ul>
            </Card>
            </div>
        </div>
        )}

        {activeTab === 'calendar' && (<div className="space-y-4"><div className="flex gap-2 mb-4"><button onClick={() => setCalendarView('current')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${calendarView === 'current' ? 'bg-lime-400 text-slate-900 shadow-lg' : 'bg-slate-800 text-slate-400'}`}>Mese Corrente</button><button onClick={() => setCalendarView('next')} className={`flex-1 py-3 rounded-xl font-bold transition-all ${calendarView === 'next' ? 'bg-lime-400 text-slate-900 shadow-lg' : 'bg-slate-800 text-slate-400'}`}>Mese Prossimo</button></div>
        
        {/* LISTA PIGRONI */}
        {missingPlayers.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-xl mb-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="text-orange-400" size={18} />
                    <span className="text-orange-400 font-bold text-sm uppercase tracking-wider">Mancano all'appello ({monthLabel})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {missingPlayers.map(p => (
                        <div key={p.id} className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded-full">
                            <PlayerAvatar player={p} size="sm" className="w-5 h-5 text-[10px]" />
                            <span className="text-xs text-slate-300">{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* MATCH CONFERMATI SUMMARY */}
        {upcomingMatches.length > 0 && (
           <div className="mb-6">
             <h3 className="text-lime-400 font-bold text-sm mb-2 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 size={16} /> Partite Confermate
             </h3>
             <div className="space-y-2">
               {upcomingMatches.map(date => {
                   const confirmedPlayers = availabilities.filter(a => a.date === date).map(a => players.find(p => p.id === a.playerId));
                   
                   const shareOnWhatsApp = (e) => {
                       e.stopPropagation();
                       const dayStr = new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
                       const text = `🎾 *PADEL CONFERMATO!* \n📅 Data: *${dayStr}* \n👥 Giocatori: ${confirmedPlayers.map(p => p.name).join(', ')}\n\n_Vado a prenotare su Playtomic!_`;
                       window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                   };

                   return (
                   <div key={date} className="bg-lime-900/10 border border-lime-500/30 p-3 rounded-xl flex items-center justify-between">
                       <div className="flex flex-col gap-2">
                           <span className="text-white font-bold text-sm">{new Date(date).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                           <div className="flex flex-col gap-1.5">
                                <button onClick={shareOnWhatsApp} className="flex items-center gap-1.5 text-[10px] text-green-400 font-black uppercase hover:text-green-300">
                                    <MessageCircle size={12} /> WhatsApp
                                </button>
                                <a href="playtomic://" className="flex items-center gap-1.5 text-[10px] text-blue-400 font-black uppercase hover:text-blue-300">
                                    <PlayCircle size={12} /> Prenota Campo
                                </a>
                           </div>
                       </div>
                       <div className="flex -space-x-2">
                           {confirmedPlayers.map((p, i) => (
                               <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 z-10">
                                   <PlayerAvatar player={p} size="sm" className="w-full h-full" />
                               </div>
                           ))}
                       </div>
                   </div>
                   );
               })}
             </div>
           </div>
        )}

        <h2 className="text-2xl font-bold flex items-center gap-2 capitalize"><Calendar className="text-lime-400" /> {monthLabel}</h2><div className="grid grid-cols-1 gap-3">{calendarDates.map(date => { const dayAvail = availabilities.filter(a => a.date === date); const amIAvailable = dayAvail.some(a => a.playerId === currentPlayer.id); const isMatch = dayAvail.length >= 4; const dObj = new Date(date); const dayName = dObj.toLocaleDateString('it-IT', { weekday: 'long' }); const dayNum = dObj.getDate(); const month = dObj.toLocaleDateString('it-IT', { month: 'short' }); return (<button key={date} onClick={() => toggleAvailability(date)} className={`relative w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${amIAvailable ? 'bg-slate-800 border-lime-400/50' : 'bg-slate-900 border-slate-800 opacity-80'} ${isMatch ? 'ring-2 ring-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.3)]' : ''}`}><div className="flex flex-col items-center justify-center w-12 h-12 bg-slate-950 rounded-lg border border-slate-700"><span className="text-xs text-slate-500 uppercase">{month}</span><span className="text-xl font-bold text-white">{dayNum}</span></div><div className="flex-1 text-left"><div className="flex items-center gap-2"><span className="capitalize font-bold text-white">{dayName}</span>{isMatch && <span className="bg-lime-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded uppercase animate-pulse">SI GIOCA!</span>}</div><div className="flex -space-x-2 mt-2">{dayAvail.map((a, i) => (<div key={i} className="w-6 h-6 rounded-full bg-slate-600 border border-slate-800 flex items-center justify-center text-[10px] text-white">{(a.playerName || '?').charAt(0)}</div>))}</div></div><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${amIAvailable ? 'border-lime-400 bg-lime-400 text-slate-900' : 'border-slate-600'}`}>{amIAvailable && <Activity size={14} />}</div></button>); })}</div></div>)}
        {activeTab === 'players' && (<div className="space-y-6"><h2 className="text-2xl font-bold flex items-center gap-2"><Users className="text-lime-400" /> Gestione Giocatori</h2><Card><h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Aggiungi Nuovo</h3><div className="flex flex-col gap-3"><div className="flex items-center gap-3"><div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center border border-slate-700 overflow-hidden relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>{newPlayerPhoto ? (<img src={newPlayerPhoto} alt="Preview" className="w-full h-full object-cover" />) : (<Camera size={20} className="text-slate-500 group-hover:text-lime-400" />)}</div><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoSelect(e, setNewPlayerPhoto)} /><div className="flex-1"><input type="text" value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="Nome giocatore..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-lime-400" /></div><Button onClick={handleAddPlayerGeneric} className="w-12 !px-0 flex items-center justify-center"><PlusCircle size={20} /></Button></div></div></Card><div className="space-y-2"><h3 className="text-sm font-bold text-slate-400 uppercase ml-1">Lista Completa ({players.length})</h3>{players.map(p => (<div key={p.id} className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700 group"><div className="flex items-center gap-3"><PlayerAvatar player={p} size="md" /><div><div className="font-bold text-white">{p.name}</div>{p.id === currentPlayer?.id && <span className="text-[10px] bg-lime-400/20 text-lime-400 px-2 py-0.5 rounded">Tu</span>}</div></div><div className="flex gap-1"><button onClick={() => handleEditPlayerClick(p)} className="p-2 text-slate-500 hover:text-lime-400 hover:bg-lime-900/10 rounded-lg transition-colors"><Pencil size={18} /></button><button onClick={() => handleDeletePlayerClick(p.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={18} /></button></div></div>))}</div></div>)}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 pb-safe px-1 py-3 flex justify-around items-center z-50">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 w-12 ${activeTab==='dashboard'?'text-lime-400':'text-slate-500'}`}><LayoutDashboard size={20} /><span className="text-[9px] font-bold">Home</span></button>
        <button onClick={() => setActiveTab('ranking')} className={`flex flex-col items-center gap-1 w-12 ${activeTab==='ranking'?'text-lime-400':'text-slate-500'}`}><Trophy size={20} /><span className="text-[9px] font-bold">Classifica</span></button>
        <button onClick={() => setActiveTab('tournament')} className={`flex flex-col items-center gap-1 w-12 ${activeTab==='tournament'?'text-lime-400':'text-slate-500'}`}><Swords size={20} /><span className="text-[9px] font-bold">Torneo</span></button>
        <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1 w-12 ${activeTab==='calendar'?'text-lime-400':'text-slate-500'}`}><Calendar size={20} /><span className="text-[9px] font-bold">Date</span></button>
        <button onClick={() => setActiveTab('players')} className={`flex flex-col items-center gap-1 w-12 ${activeTab==='players'?'text-lime-400':'text-slate-500'}`}><Users size={20} /><span className="text-[9px] font-bold">Players</span></button>
        <button onClick={() => setActiveTab('rules')} className={`flex flex-col items-center gap-1 w-12 ${activeTab==='rules'?'text-lime-400':'text-slate-500'}`}><BookOpen size={20} /><span className="text-[9px] font-bold">Regole</span></button>
      </nav>
    </div>
  );
}
