import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from './services/dataService';
import { TicketGrid } from './components/TicketGrid';
import { PaymentModal } from './components/PaymentModal';
import { 
  ViewState, Ticket, RaffleConfig, Transaction, TransactionStatus, 
  TicketStatus, PaymentMethod, SocialLink, RaffleStatus, Prize, Winner, RaffleCycle, HistoricalParticipant
} from './types';
import { 
  Home, Settings, LogOut, Search, XCircle, Plus, Trash2, 
  ShieldCheck, ToggleLeft, ToggleRight, Instagram, Facebook, 
  MessageCircle, Send, Video, Trophy, Play, Archive, Edit, Save, Check, X, Image as ImageIcon, ChevronLeft, ChevronRight, BarChart3, Clock, MapPin, Phone, Mail, Lock, Key, Globe, Dices, Shuffle, Users, History, AlertCircle, Eye, Power, AlertTriangle, ArrowLeft, ArrowUpDown
} from 'lucide-react';

// --- HELPERS ---

const toLocalDateTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

// --- SUB-COMPONENTES ---

const ImageCarousel = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
  };

  useEffect(() => {
    if (images.length > 1) startTimer();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [images.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    startTimer(); 
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    startTimer();
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    startTimer();
  };

  if (images.length === 0) return null;

  return (
    <div className="relative w-full h-[350px] md:h-[450px] overflow-hidden bg-slate-100 group">
      <div 
        className="flex h-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((img, index) => (
          <div key={index} className="w-full h-full flex-shrink-0 relative">
             {/* Removed opacity-80 to make images sharper/nitida */}
             <img src={img} alt={`Slide ${index}`} className="w-full h-full object-cover" />
             {/* Reduced gradient intensity */}
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent"></div>
          </div>
        ))}
      </div>

      {/* Manual Controls - Arrows */}
      <button 
        onClick={(e) => { e.stopPropagation(); prevSlide(); }}
        className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-20 shadow-lg"
      >
        <ChevronLeft size={24} />
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); nextSlide(); }}
        className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 z-20 shadow-lg"
      >
        <ChevronRight size={24} />
      </button>

      {/* Navigation Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 shadow-sm ${
              currentIndex === index 
                ? 'bg-white w-6' 
                : 'bg-white/50 w-2 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const RaffleProgressBar = ({ total, sold }: { total: number, sold: number }) => {
  const percentage = Math.min(100, Math.max(0, (sold / total) * 100));
  
  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 mb-8 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex justify-between items-end mb-2">
        <div className="flex items-center gap-2">
           <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
             <BarChart3 size={18} />
           </div>
           <div>
             <div className="text-[10px] font-black uppercase text-slate-400">Progreso de Ventas</div>
             <div className="font-black text-slate-800 text-lg leading-none">{percentage.toFixed(1)}% <span className="text-xs font-bold text-slate-400">Completado</span></div>
           </div>
        </div>
        <div className="text-right">
          <span className="font-bold text-slate-900">{sold}</span>
          <span className="text-slate-400 text-xs"> / {total} Tickets</span>
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
        <div 
          className="bg-brand-500 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(20,184,166,0.4)] relative overflow-hidden" 
          style={{ width: `${percentage}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute top-0 left-0 bottom-0 right-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
        </div>
      </div>
    </div>
  );
};

const InlineRaffleAnimation = ({ winners, duration }: { winners: Winner[], duration: number }) => {
    // Uses the exact duration provided to time the reveal
    const [displayedNumbers, setDisplayedNumbers] = useState<string[]>(winners.map(() => "00"));
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        const intervalMs = 80;
        const totalTimeMs = duration * 1000;
        const startTime = Date.now();

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= totalTimeMs) {
                // Time up, show real winners and stop
                setDisplayedNumbers(winners.map(w => w.ticketNumber.toString().padStart(2, '0')));
                setIsFinished(true);
                clearInterval(interval);
            } else {
                // Keep spinning with random numbers
                setDisplayedNumbers(winners.map(() => Math.floor(Math.random() * 100).toString().padStart(2, '0')));
            }
        }, intervalMs);

        return () => clearInterval(interval);
    }, [winners, duration]);

    return (
        <div className="py-8 animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black text-brand-600 uppercase tracking-widest animate-pulse mb-6">
                {isFinished ? '¡Ganadores!' : 'Sorteando...'}
            </h2>
            <div className="flex flex-col gap-3 justify-center items-center">
                {winners.map((p, i) => {
                    return (
                    <div key={i} className={`bg-slate-50 p-4 rounded-2xl border ${isFinished ? 'border-brand-500 bg-brand-50' : 'border-slate-200'} w-full max-w-xs flex justify-between items-center shadow-sm transition-all`}>
                        <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Premio #{i+1}</span>
                            <span className="text-xs font-bold text-slate-600">{p.prizeName}</span>
                        </div>
                        <span className={`text-4xl font-mono font-black tabular-nums ${isFinished ? 'text-brand-600 scale-110' : 'text-slate-900'}`}>
                            {displayedNumbers[i]}
                        </span>
                    </div>
                )})}
            </div>
            {!isFinished && <p className="text-slate-400 text-xs mt-6 animate-pulse font-medium">La suerte está echada...</p>}
        </div>
    );
}

const CheckTicketsView = () => {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any | null>(null);
  
  const handleCheck = () => {
    if (!code.trim()) return;
    setResult(db.checkStatus(code.toUpperCase()));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pt-10">
      <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100">
        <h2 className="text-2xl font-black mb-2 text-center">Verificar Ticket</h2>
        <p className="text-center text-slate-400 text-sm mb-6">Ingresa el código único que recibiste al confirmar tu compra.</p>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="TRD-XXXXXX" 
            className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-mono uppercase text-center font-bold tracking-widest text-lg focus:ring-2 focus:ring-brand-500/20 transition-all" 
            value={code} 
            onChange={e => setCode(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleCheck()}
          />
          <button type="button" onClick={handleCheck} className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg">
            <Search size={24} />
          </button>
        </div>
      </div>
      
      {result && (
        <div className="animate-in fade-in slide-in-from-top-4">
          {result.valid ? (
            result.type === 'ACTIVE' ? (
                <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 border-t-8 border-t-brand-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ShieldCheck size={120} />
                </div>
                <h3 className="font-black text-slate-900 text-xl relative z-10">Ticket Verificado (En Juego)</h3>
                <p className="text-slate-500 text-sm mb-6 relative z-10">Participante: <span className="font-bold text-slate-800">{result.transaction.customerName}</span></p>
                
                <div className="bg-slate-50 p-8 rounded-[32px] text-center border border-slate-200 relative z-10">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Números Jugados</div>
                    <div className="text-4xl font-black text-brand-600 tracking-tight">{result.transaction.ticketNumbers.join(' - ')}</div>
                </div>
                <div className="mt-4 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                        <Check size={12} strokeWidth={3} /> Compra Aprobada
                    </span>
                </div>
                </div>
            ) : (
                <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 border-t-8 border-t-amber-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500">
                        <Trophy size={120} />
                    </div>
                    <div className="relative z-10 text-center mb-6">
                        <div className="inline-block bg-amber-100 text-amber-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-2 border border-amber-200">¡Ganador Histórico!</div>
                        <h3 className="font-black text-slate-900 text-2xl">{result.winnerData.raffleTitle}</h3>
                        <p className="text-slate-400 text-xs">{new Date(result.winnerData.raffleDate).toLocaleDateString()}</p>
                    </div>

                    <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 relative z-10 text-center space-y-2">
                        <div className="text-sm text-amber-800 font-bold">Premio: {result.winnerData.prizeName}</div>
                        <div className="text-3xl font-black text-amber-600">Ticket #{result.winnerData.ticketNumber}</div>
                        <div className="text-xs text-amber-700">Ganador: {result.winnerData.customerName}</div>
                    </div>
                </div>
            )
          ) : (
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 border-t-4 border-t-red-500 text-center">
              <XCircle className="text-red-500 mx-auto mb-2" size={48} />
              <h3 className="font-black text-lg">Código Inválido</h3>
              <p className="text-slate-400 text-sm">No encontramos ningún ticket asociado a este código en registros activos ni históricos.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ContactView = ({ config }: { config: RaffleConfig }) => {
  return (
    <div className="max-w-2xl mx-auto pt-10 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900">Contáctanos</h2>
        <p className="text-slate-500">¿Tienes dudas o necesitas ayuda? Estamos aquí para ti.</p>
      </div>

      <div className="grid gap-4">
        <a href={`https://wa.me/${config.whatsappContact.replace(/\+/g, '')}`} target="_blank" rel="noreferrer" className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all group">
           <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
             <MessageCircle size={28} />
           </div>
           <div>
             <h3 className="font-black text-slate-900 text-lg">WhatsApp</h3>
             <p className="text-sm text-slate-400">Atención rápida y directa</p>
           </div>
           <div className="ml-auto text-slate-300">
             <ChevronRight />
           </div>
        </a>

        {config.socialLinks.filter(l => l.isActive).map(link => (
          <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all group">
             <div className="w-14 h-14 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
               <SocialIcon platform={link.platform} />
             </div>
             <div>
               <h3 className="font-black text-slate-900 text-lg">{link.platform}</h3>
               <p className="text-sm text-slate-400">Síguenos para novedades</p>
             </div>
             <div className="ml-auto text-slate-300">
               <ChevronRight />
             </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const CountdownTimer = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const timer = window.setInterval(() => {
      const distance = new Date(targetDate).getTime() - new Date().getTime();
      if (distance < 0) { window.clearInterval(timer); return; }
      setTimeLeft({
        d: Math.floor(distance / (1000 * 60 * 60 * 24)),
        h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        s: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetDate]);
  return (
    <div className="flex justify-center gap-3 py-4">
      {[{ label: 'DÍAS', val: timeLeft.d }, { label: 'HRS', val: timeLeft.h }, { label: 'MIN', val: timeLeft.m }, { label: 'SEG', val: timeLeft.s }].map(t => (
        <div key={t.label} className="bg-slate-50 w-16 h-16 rounded-2xl flex flex-col items-center justify-center border border-slate-100">
          <span className="text-xl font-black text-slate-900 leading-none">{t.val}</span>
          <span className="text-[8px] font-black uppercase text-slate-400 mt-1">{t.label}</span>
        </div>
      ))}
    </div>
  );
};

const SocialIcon = ({ platform }: { platform: SocialLink['platform'] }) => {
  switch (platform) {
    case 'Instagram': return <Instagram size={24} />;
    case 'Facebook': return <Facebook size={24} />;
    case 'Tiktok': return <Video size={24} />;
    case 'WhatsApp': return <MessageCircle size={24} />;
    case 'Telegram': return <Send size={24} />;
  }
};

const LoginView = ({ onLogin, onCancel }: { onLogin: () => void, onCancel: () => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (db.checkPassword(password)) {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-in fade-in">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 max-w-sm w-full">
        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
           <Lock size={32} />
        </div>
        <h2 className="text-2xl font-black text-center text-slate-900 mb-2">Acceso Restringido</h2>
        <p className="text-center text-slate-400 text-sm mb-8">Ingresa la contraseña administrativa para acceder al panel.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="password" 
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-4 bg-slate-50 border rounded-2xl outline-none text-center font-bold tracking-widest transition-all ${error ? 'border-red-500 bg-red-50 text-red-500' : 'border-slate-200 focus:border-slate-900'}`}
            placeholder="••••••••"
          />
          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-black transition-all shadow-lg active:scale-95">
            Ingresar
          </button>
          <button type="button" onClick={onCancel} className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-all text-xs">
            Volver al inicio
          </button>
        </form>
      </div>
    </div>
  );
};

// --- ADMIN HUB COMPONENT ---

const AdminHub: React.FC<{
  initialConfig: RaffleConfig;
  tickets: Ticket[];
  onExit: () => void;
  onRefreshParent: () => void;
  onPreviewUpdate: (config: RaffleConfig) => void;
}> = ({ initialConfig, tickets, onExit, onRefreshParent, onPreviewUpdate }) => {
  const [adminTab, setAdminTab] = useState<'SORTEO' | 'PARTICIPANTES' | 'HISTORY' | 'AJUSTES'>('SORTEO');
  const [partSubTab, setPartSubTab] = useState<'PENDING' | 'ACTIVE'>('PENDING');
  const [historySubTab, setHistorySubTab] = useState<'SORTEOS' | 'GANADORES'>('SORTEOS');
  
  // Local state for edits
  const [editConfig, setEditConfig] = useState(initialConfig);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(db.getPaymentMethods());
  const [transactions, setTransactions] = useState<Transaction[]>(db.getTransactions());
  const [history, setHistory] = useState<RaffleCycle[]>(db.getHistory());
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  
  // Filtering & Sorting
  const [histFilter, setHistFilter] = useState('');
  const [participantFilter, setParticipantFilter] = useState('');
  const [viewHistoryDetails, setViewHistoryDetails] = useState<string | null>(null);
  const [sortHistoryDesc, setSortHistoryDesc] = useState(true);

  const [statusMsg, setStatusMsg] = useState('');

  // UI States
  const [newPrizeName, setNewPrizeName] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [newMethod, setNewMethod] = useState({ name: '', currency: 'VES' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preview Effect
  useEffect(() => {
    onPreviewUpdate(editConfig);
  }, [editConfig, onPreviewUpdate]);

  const refreshPaymentMethods = () => setPaymentMethods(db.getPaymentMethods());
  const refreshHistory = () => setHistory(db.getHistory());
  const refreshTransactions = () => {
    setTransactions(db.getTransactions());
    onRefreshParent();
  };
  const reloadAll = () => {
    refreshPaymentMethods();
    refreshHistory();
    refreshTransactions();
    setEditConfig(db.getConfig());
    onRefreshParent();
  };

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirmDeleteId === 'ARCHIVE_ALL') {
      db.archiveCurrentCycle();
      reloadAll();
      setConfirmDeleteId(null);
      showStatus('Jornada archivada correctamente');
    } else {
      setConfirmDeleteId('ARCHIVE_ALL');
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const handleSuspend = (e: React.MouseEvent) => {
     e.preventDefault();
     const activeParticipants = transactions.filter(t => t.status === TransactionStatus.APPROVED);
     if (editConfig.isSuspended) {
         const updated = {...editConfig, isSuspended: false};
         db.updateConfig(updated);
         setEditConfig(updated);
         onRefreshParent();
         showStatus('Actividad reactivada');
     } else {
         if (activeParticipants.length > 0) return;
         const updated = {...editConfig, isSuspended: true};
         db.updateConfig(updated);
         setEditConfig(updated);
         onRefreshParent();
         showStatus('Actividad suspendida');
     }
  };

  const handleRun = (e: React.MouseEvent) => {
    e.preventDefault();
    const sold = tickets.filter(t => t.status === TicketStatus.SOLD);
    if (!sold.length) return alert('No hay ventas activas para sortear.');
    
    // Choose winners immediately
    const freshTxs = db.getTransactions();
    const freshSold = tickets.filter(t => t.status === TicketStatus.SOLD);
    const shuffled = [...freshSold].sort(() => Math.random() - 0.5);
    const futureWinners: Winner[] = editConfig.prizes.map((p, i) => {
        const winTk = editConfig.allowMultipleWins ? shuffled[Math.floor(Math.random()*shuffled.length)] : shuffled[i % shuffled.length];
        const owner = freshTxs.find(t => t.uniqueCode === winTk.ownerId);
        return { ticketNumber: winTk.number, customerName: owner?.customerName || 'Anónimo', prizeName: p.name };
    });

    // Save winners to config but keep status RUNNING so Home can animate
    db.startRaffleAnimation();
    db.updateConfig({...db.getConfig(), winners: futureWinners}); // Set winners early for animation
    
    reloadAll();
    showStatus('Sorteo iniciado...');
    
    // Auto-complete after animation duration
    // Logic: Wait for selectionDuration seconds (animation) + 1s buffer
    setTimeout(() => {
       db.completeRaffle(futureWinners);
       reloadAll();
       showStatus('Sorteo completado');
    }, editConfig.selectionDuration * 1000 + 1000); 
  };

  const handleSaveConfig = (e: React.MouseEvent) => {
    e.preventDefault();
    db.updateConfig(editConfig);
    setEditConfig(db.getConfig()); 
    onRefreshParent();
    showStatus('Configuración guardada');
  };

  const handleAddPrize = (e: React.MouseEvent) => {
    e.preventDefault();
    if (newPrizeName.trim()) {
      setEditConfig(prev => ({
        ...prev,
        prizes: [...prev.prizes, { id: Date.now().toString(), name: newPrizeName, rank: prev.prizes.length + 1 }]
      }));
      setNewPrizeName('');
    }
  };

  const handleDeletePrize = (id: string) => {
    setEditConfig(prev => ({
      ...prev,
      prizes: prev.prizes.filter(p => p.id !== id)
    }));
  };

  const handleAddImage = (e: React.MouseEvent) => {
    e.preventDefault();
    if (newImageUrl.trim()) {
      setEditConfig(prev => ({
        ...prev,
        carouselImages: [...(prev.carouselImages || []), newImageUrl]
      }));
      setNewImageUrl('');
    }
  };

  const handleDeleteImage = (index: number) => {
    setEditConfig(prev => ({
      ...prev,
      carouselImages: prev.carouselImages.filter((_, i) => i !== index)
    }));
  };

  const handleAddPaymentMethod = (e: React.MouseEvent) => {
    e.preventDefault();
    if (newMethod.name && newMethod.currency) {
      db.addPaymentMethod({
        currency: newMethod.currency.toUpperCase(),
        name: newMethod.name,
        details: 'Editar detalles...',
        instructions: 'Editar instrucciones...',
        isActive: true
      });
      refreshPaymentMethods();
      setIsAddingMethod(false);
      setNewMethod({ name: '', currency: 'VES' });
    }
  };

  const handleDeletePaymentMethod = (id: string) => {
    if (confirmDeleteId === id) {
      db.deletePaymentMethod(id);
      refreshPaymentMethods();
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const handleUpdateMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMethod) {
      db.updatePaymentMethod(editingMethod);
      setEditingMethod(null);
      refreshPaymentMethods();
    }
  };

  const handleRemoveParticipant = (txId: string) => {
     if (confirmDeleteId === txId) {
       db.withdrawParticipant(txId);
       refreshTransactions();
       setConfirmDeleteId(null);
     } else {
       setConfirmDeleteId(txId);
       setTimeout(() => setConfirmDeleteId(null), 3000);
     }
  };

  const handleRejectTransaction = (txId: string) => {
    if(!confirm('¿Seguro que deseas rechazar esta solicitud? Se liberarán los tickets.')) return;
    
    db.rejectTransaction(txId, 'Rechazado por administrador');
    // Force immediate UI update for snappy feel by filtering out the item locally
    setTransactions(prev => prev.filter(t => t.id !== txId));
    onRefreshParent(); // Sync parent later
    showStatus('Solicitud rechazada correctamente');
  };

  const handleChangePassword = () => {
    if (newPassword && newPassword === confirmPassword) {
      db.updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showStatus('Contraseña actualizada');
    } else {
      alert('Las contraseñas no coinciden o están vacías');
    }
  };

  const getMethodName = (id: string) => paymentMethods.find(p => p.id === id)?.name || 'Desconocido';

  // Sort History Helper
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortHistoryDesc ? dateB - dateA : dateA - dateB;
    });
  }, [history, sortHistoryDesc]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-in fade-in">
      {statusMsg && (
        <div className="fixed top-24 right-6 bg-brand-500 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-in slide-in-from-right font-bold">
          {statusMsg}
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1 bg-slate-900 p-6 rounded-[40px] flex justify-between items-center text-white shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg"><ShieldCheck /></div>
            <div><h2 className="text-xl font-black">Admin Hub</h2><p className="text-[10px] text-slate-400 uppercase tracking-widest">Panel de Control</p></div>
          </div>
          <div className="flex gap-2">
            {(['SORTEO', 'PARTICIPANTES', 'HISTORY', 'AJUSTES'] as const).map(t => (
              <button 
                type="button"
                key={t} 
                onClick={() => setAdminTab(t)} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${adminTab === t ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
            <button type="button" onClick={onExit} className="p-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"><LogOut size={18}/></button>
          </div>
        </div>
      </div>

      {adminTab === 'SORTEO' && (
        <div className="grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-black flex items-center gap-2"><Trophy className="text-amber-500"/> Gestión de Jornada</h3>
                <div className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-mono font-bold text-slate-500">
                    {editConfig.raffleId}
                </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Fecha y Hora</label>
                <div className="relative group">
                  <input 
                    type="datetime-local" 
                    value={toLocalDateTime(editConfig.raffleDate)} 
                    onChange={e => setEditConfig({...editConfig, raffleDate: e.target.value ? new Date(e.target.value).toISOString() : ''})} 
                    onClick={(e) => {
                      try { (e.target as any).showPicker?.(); } catch(err) {}
                    }}
                    className="w-full p-4 bg-slate-200 border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer appearance-none min-h-[50px] text-slate-900 font-black shadow-inner" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Sorteo (Seg)</label>
                  <input type="number" value={editConfig.selectionDuration} onChange={e => setEditConfig({...editConfig, selectionDuration: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none"/>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase">Multiganador</label>
                  <button type="button" onClick={() => setEditConfig({...editConfig, allowMultipleWins: !editConfig.allowMultipleWins})} className={`w-full p-4 rounded-2xl font-black text-xs transition-all ${editConfig.allowMultipleWins ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {editConfig.allowMultipleWins ? 'ACTIVADO' : 'DESACTIVADO'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                    <button type="button" onClick={handleRun} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all"><Play size={18}/> Iniciar Sorteo</button>
                    <button type="button" onClick={handleArchive} className={`${confirmDeleteId === 'ARCHIVE_ALL' ? 'bg-red-500 text-white' : 'bg-brand-50 text-brand-600'} px-6 py-4 rounded-2xl font-black flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all`}>
                    <Archive size={18}/> {confirmDeleteId === 'ARCHIVE_ALL' ? '¿Confirmar?' : 'Archivar'}
                    </button>
                </div>
                <button 
                    type="button" 
                    onClick={handleSuspend}
                    disabled={!editConfig.isSuspended && transactions.some(t => t.status === TransactionStatus.APPROVED)}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        editConfig.isSuspended 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : (transactions.some(t => t.status === TransactionStatus.APPROVED) ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100')
                    }`}
                >
                    <Power size={16}/>
                    {editConfig.isSuspended ? 'Reactivar Actividad' : 'Suspender Actividad'}
                    {!editConfig.isSuspended && transactions.some(t => t.status === TransactionStatus.APPROVED) && <span className="text-[9px]">(Requiere 0 activos)</span>}
                </button>
              </div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
             <div className="flex justify-between mb-4 items-center">
               <h3 className="text-lg font-black">Premios Configurados</h3>
             </div>
             
             {/* Inline Add Prize Form */}
             <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    value={newPrizeName} 
                    onChange={e => setNewPrizeName(e.target.value)}
                    placeholder="Nuevo Premio..."
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                    onKeyDown={e => e.key === 'Enter' && handleAddPrize(e as any)}
                />
                <button type="button" onClick={handleAddPrize} className="p-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all">
                    <Plus size={20}/>
                </button>
             </div>

             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {editConfig.prizes.map((p, i) => (
                  <div key={p.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center group hover:bg-slate-100 transition-all">
                     <span className="font-bold text-sm text-slate-700">#{i+1} {p.name}</span>
                     <button type="button" onClick={() => handleDeletePrize(p.id)} className="text-red-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                  </div>
                ))}
                {editConfig.prizes.length === 0 && <p className="text-center text-slate-400 py-10 italic text-xs">Aún no hay premios.</p>}
             </div>
             <button type="button" onClick={handleSaveConfig} className="w-full mt-4 bg-slate-100 text-slate-600 py-3 rounded-xl text-xs font-black hover:bg-slate-200 transition-all">Guardar Lista de Premios</button>
          </div>
        </div>
      )}

      {adminTab === 'PARTICIPANTES' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between flex-wrap gap-4">
             <div className="flex gap-2 p-1 bg-slate-100 w-fit rounded-2xl">
                <button type="button" onClick={() => setPartSubTab('PENDING')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${partSubTab === 'PENDING' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Pendientes ({transactions.filter(t => t.status === TransactionStatus.PENDING).length})</button>
                <button type="button" onClick={() => setPartSubTab('ACTIVE')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${partSubTab === 'ACTIVE' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Activos ({transactions.filter(t => t.status === TransactionStatus.APPROVED).length})</button>
             </div>
             {partSubTab === 'ACTIVE' && (
                 <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                    <Search size={18} className="text-slate-300"/>
                    <input 
                        placeholder="Buscar (ID, Tlf, Nombre)" 
                        className="bg-transparent outline-none text-sm w-48" 
                        value={participantFilter} 
                        onChange={e => setParticipantFilter(e.target.value)}
                    />
                 </div>
             )}
          </div>

          {partSubTab === 'PENDING' ? (
            <div className="grid md:grid-cols-3 gap-6">
              {transactions.filter(t => t.status === TransactionStatus.PENDING).map(t => (
                <div key={t.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 border-t-4 border-t-amber-400">
                  <h4 className="font-black text-slate-900">{t.customerName}</h4>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-2 font-mono"><span>Ref: {t.referenceNumber}</span><span>{t.currency}</span></div>
                  
                  {/* Payment Method in Card */}
                  <div className="text-xs font-bold text-slate-500 mb-2">Pasarela: {getMethodName(t.paymentMethodId)}</div>

                  {/* Details: Amount and Tickets */}
                  <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs">
                     <div className="flex justify-between font-bold text-slate-700">
                         <span>Monto:</span>
                         <span>${t.amount.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between font-bold text-slate-700 mt-1">
                         <span>Tickets:</span>
                         <span>{t.ticketNumbers.length}</span>
                     </div>
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => {db.approveTransaction(t.id); refreshTransactions();}} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-[10px] font-black hover:bg-green-600 transition-all">APROBAR</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleRejectTransaction(t.id); }} className="flex-1 bg-slate-100 text-slate-500 py-2 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-all">RECHAZAR</button>
                  </div>
                </div>
              ))}
              {transactions.filter(t => t.status === TransactionStatus.PENDING).length === 0 && <p className="col-span-full text-center text-slate-400 py-20 italic">No hay solicitudes pendientes.</p>}
            </div>
          ) : (
            <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                  <tr>
                    <th className="p-6">Participante</th>
                    <th className="p-6">Ref / Pasarela</th>
                    <th className="p-6">ID Único</th>
                    <th className="p-6">Monto</th>
                    <th className="p-6">Moneda</th>
                    <th className="p-6">Tickets</th>
                    <th className="p-6">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .filter(t => t.status === TransactionStatus.APPROVED)
                    .filter(t => {
                        const q = participantFilter.toLowerCase();
                        return (t.uniqueCode?.toLowerCase().includes(q) || t.customerPhone.includes(q) || t.customerName.toLowerCase().includes(q));
                    })
                    .map(t => (
                    <tr key={t.id} className="border-t border-slate-50 hover:bg-slate-50 transition-all">
                      <td className="p-6">
                        <div className="font-bold text-slate-900">{t.customerName}</div>
                        <div className="text-[10px] text-slate-400">{t.customerPhone}</div>
                      </td>
                      <td className="p-6 text-xs">
                         <div className="font-mono">{t.referenceNumber}</div>
                         <div className="font-bold text-slate-500">{getMethodName(t.paymentMethodId)}</div>
                         {/* Added Phone Number Below Reference as requested */}
                         <div className="text-[10px] text-slate-400 mt-1">{t.customerPhone}</div>
                      </td>
                      <td className="p-6 font-mono text-xs font-bold text-slate-600">{t.uniqueCode}</td>
                      <td className="p-6 font-bold text-black">${t.amount.toFixed(2)}</td>
                      <td className="p-6 font-bold text-black">{t.currency}</td>
                      <td className="p-6 font-black text-brand-600">{t.ticketNumbers.join(', ')}</td>
                      <td className="p-6">
                        <button 
                            type="button" 
                            onClick={() => handleRemoveParticipant(t.id)} 
                            className={`${confirmDeleteId === t.id ? 'bg-red-500 text-white' : 'text-red-300 hover:text-red-500 hover:bg-red-50'} p-2 rounded-lg transition-all`}
                        >
                          <Trash2 size={18}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.filter(t => t.status === TransactionStatus.APPROVED).length === 0 && <p className="text-center text-slate-400 py-20 italic">No hay participantes activos.</p>}
            </div>
          )}
        </div>
      )}

      {adminTab === 'HISTORY' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          {!viewHistoryDetails ? (
            <>
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 gap-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-lg font-black">Historial</h3>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                        <button onClick={() => setHistorySubTab('SORTEOS')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${historySubTab === 'SORTEOS' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Sorteos</button>
                        <button onClick={() => setHistorySubTab('GANADORES')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${historySubTab === 'GANADORES' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>Ganadores</button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setSortHistoryDesc(!sortHistoryDesc)} 
                            className="p-2 bg-slate-50 rounded-xl text-slate-500 hover:bg-slate-100"
                            title={sortHistoryDesc ? "Más recientes primero" : "Más antiguos primero"}
                        >
                            <ArrowUpDown size={18} />
                        </button>
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                            <Search size={18} className="text-slate-300"/><input placeholder="Filtrar..." className="bg-transparent outline-none text-sm" value={histFilter} onChange={e => setHistFilter(e.target.value)}/>
                        </div>
                    </div>
                </div>

                {history.length === 0 && <p className="text-center text-slate-400 py-20 italic">El historial está vacío.</p>}

                {historySubTab === 'SORTEOS' ? (
                    <div className="grid gap-6">
                    {sortedHistory.filter(h => h.title.toLowerCase().includes(histFilter.toLowerCase())).map(h => (
                        <div key={h.id} className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                        <div className="flex justify-between border-b pb-4 mb-4 items-center">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase">ID: {h.id}</div>
                                <h4 className="font-black text-slate-900 text-xl">{h.title}</h4>
                                <p className="text-xs text-slate-500">{new Date(h.date).toLocaleDateString()} {new Date(h.date).toLocaleTimeString()}</p>
                            </div>
                            <div className="flex gap-2">
                                <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black">{h.allParticipants.length} PARTICIPANTES</div>
                                <button onClick={() => setViewHistoryDetails(h.id)} className="bg-brand-50 text-brand-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-brand-100 transition-all flex items-center gap-1">
                                    <Eye size={12} /> Ver Registro
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Premios Entregados</span>
                            <div className="flex flex-wrap gap-2">
                                {h.winners.map((w,i)=>(
                                    <div key={i} className="text-xs bg-slate-50 text-slate-600 p-2 rounded-lg border border-slate-100">{w.prizeName}</div>
                                ))}
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                                <tr>
                                    <th className="p-6">ID Sorteo</th>
                                    <th className="p-6">Ganador</th>
                                    <th className="p-6">ID Único</th>
                                    <th className="p-6">Ref / Teléfono</th>
                                    <th className="p-6">Monto</th>
                                    <th className="p-6">Ticket</th>
                                    <th className="p-6">Premio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedHistory.flatMap(h => h.winners.map(w => ({...w, raffleId: h.id, raffleTitle: h.title})))
                                .filter(w => w.customerName.toLowerCase().includes(histFilter.toLowerCase()) || w.raffleId.toLowerCase().includes(histFilter.toLowerCase()))
                                .map((w, i) => (
                                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                                        <td className="p-6 text-xs font-mono text-slate-400">{w.raffleId}</td>
                                        <td className="p-6 font-bold text-slate-900">{w.customerName}</td>
                                        <td className="p-6 font-mono text-xs text-slate-500">{(w as any).uniqueCode || '-'}</td>
                                        <td className="p-6 text-xs">
                                            <div className="font-mono">Ref: {(w as any).referenceNumber}</div>
                                            <div className="text-slate-400">{(w as any).phone}</div>
                                        </td>
                                        <td className="p-6 font-bold text-black">${(w as any).amount || 0}</td>
                                        <td className="p-6"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold text-xs">#{w.ticketNumber}</span></td>
                                        <td className="p-6 font-bold text-brand-600">{w.prizeName}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </>
          ) : (
             <div className="space-y-4 animate-in slide-in-from-right">
                 <button onClick={() => setViewHistoryDetails(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm mb-4">
                     <ArrowLeft size={16}/> Volver al listado
                 </button>
                 
                 {(() => {
                     const cycle = history.find(h => h.id === viewHistoryDetails);
                     if (!cycle) return <p>Sorteo no encontrado</p>;
                     
                     return (
                         <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                             <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                 <div>
                                     <h3 className="font-black text-xl">{cycle.title}</h3>
                                     <p className="text-xs text-slate-400">Registro completo ({cycle.allParticipants.length} participantes)</p>
                                 </div>
                                 <input 
                                     placeholder="Buscar (ID Ticket, Tlf, Nombre)" 
                                     className="bg-white border border-slate-200 p-2 rounded-xl outline-none text-sm w-64" 
                                     value={histFilter} 
                                     onChange={e => setHistFilter(e.target.value)}
                                 />
                             </div>
                             <table className="w-full text-left text-sm">
                                <thead className="bg-white text-[10px] font-black text-slate-400 uppercase border-b border-slate-50">
                                    <tr>
                                        <th className="p-4">Participante</th>
                                        <th className="p-4">ID Ticket</th>
                                        <th className="p-4">Ref / Pasarela</th>
                                        <th className="p-4">Monto</th>
                                        <th className="p-4">Tickets</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(cycle.allParticipants as HistoricalParticipant[])
                                        .filter(p => {
                                            const q = histFilter.toLowerCase();
                                            return (
                                                (p.uniqueCode?.toLowerCase().includes(q) || '') ||
                                                (p.phone?.includes(q) || '') ||
                                                (p.name?.toLowerCase().includes(q) || '')
                                            );
                                        })
                                        .sort((a, b) => {
                                           // Sort winners first
                                           if (a.isWinner && !b.isWinner) return -1;
                                           if (!a.isWinner && b.isWinner) return 1;
                                           return 0;
                                        })
                                        .map((p, idx) => (
                                        <tr key={idx} className={`border-b border-slate-50 hover:bg-slate-50 ${p.isWinner ? 'bg-amber-50/50' : ''}`}>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900">{p.name} {p.isWinner && <Trophy size={12} className="inline text-amber-500 ml-1"/>}</div>
                                                <div className="text-[10px] text-slate-400">{p.phone}</div>
                                            </td>
                                            <td className="p-4 font-mono text-xs font-bold text-slate-600">{p.uniqueCode || 'N/A'}</td>
                                            <td className="p-4 text-xs">
                                                <div className="font-mono">{p.referenceNumber}</div>
                                                <div className="text-slate-400">{p.paymentMethodName || 'N/A'}</div>
                                            </td>
                                            <td className="p-4 font-bold">
                                                ${p.amount} <span className="text-[10px] text-slate-400">{p.currency}</span>
                                            </td>
                                            <td className="p-4 font-black text-brand-600 text-xs">
                                                {p.tickets.join(', ')} <span className="text-slate-300 font-normal">({p.tickets.length})</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                         </div>
                     );
                 })()}
             </div>
          )}
        </div>
      )}

      {adminTab === 'AJUSTES' && (
        <div className="grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-lg font-black flex items-center gap-2"><Settings /> Configuración General</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Ticket ($)</label>
                  <input type="number" value={editConfig.ticketPrice} onChange={e => setEditConfig({...editConfig, ticketPrice: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tickets</label>
                  <input type="number" value={editConfig.totalTickets} onChange={e => setEditConfig({...editConfig, totalTickets: parseInt(e.target.value) || 0})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-500/20" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título Sorteo</label>
                <input value={editConfig.title} onChange={e => setEditConfig({...editConfig, title: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" />
              </div>
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Sitio Web (Footer)</label>
                 <input value={editConfig.websiteName || ''} onChange={e => setEditConfig({...editConfig, websiteName: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" placeholder="Ej: TuRifaDigitalVE"/>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
                <textarea value={editConfig.description} onChange={e => setEditConfig({...editConfig, description: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none" rows={3}/>
              </div>
              
              {/* Carousel Image Management */}
              <div className="pt-4 border-t">
                 <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Imágenes del Carrusel</label>
                 <div className="flex gap-2 mb-2">
                    <input 
                      value={newImageUrl} 
                      onChange={e => setNewImageUrl(e.target.value)} 
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs"
                    />
                    <button type="button" onClick={handleAddImage} className="p-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600">
                      <Plus size={16}/>
                    </button>
                 </div>
                 <div className="space-y-2 max-h-32 overflow-y-auto">
                    {(editConfig.carouselImages || []).map((url, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                        <img src={url} alt="mini" className="w-8 h-8 rounded-lg object-cover" />
                        <span className="flex-1 text-[10px] truncate text-slate-500">{url}</span>
                        <button type="button" onClick={() => handleDeleteImage(i)} className="text-red-300 hover:text-red-500"><X size={14}/></button>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="pt-4 border-t">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Redes Sociales (Visible/Editar)</label>
                <div className="grid grid-cols-2 gap-2">
                  {editConfig.socialLinks.map((s, idx) => (
                    <div key={s.id} className="flex gap-2 items-center">
                       <button 
                         type="button"
                         onClick={() => {
                            const n = [...editConfig.socialLinks];
                            n[idx].isActive = !n[idx].isActive;
                            setEditConfig({...editConfig, socialLinks: n});
                         }}
                         className={`p-3 rounded-xl transition-all ${s.isActive ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-300'}`}
                       >
                         <SocialIcon platform={s.platform} />
                       </button>
                       <input value={s.url} onChange={e => {
                         const n = [...editConfig.socialLinks]; n[idx].url = e.target.value; setEditConfig({...editConfig, socialLinks: n});
                       }} className="flex-1 bg-slate-50 p-2 rounded-xl text-[10px] border border-slate-100 outline-none" />
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={handleSaveConfig} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-black active:scale-95 transition-all">Guardar Ajustes</button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black">Pasarelas de Pago</h3>
                <button type="button" onClick={() => setIsAddingMethod(!isAddingMethod)} className="p-2 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 transition-all">
                  {isAddingMethod ? <X size={18}/> : <Plus size={18}/>}
                </button>
              </div>
              
              {isAddingMethod && (
                  <div className="bg-brand-50 p-4 rounded-2xl space-y-2 animate-in slide-in-from-top-2 border border-brand-100">
                      <input 
                          className="w-full p-2 rounded-lg text-xs" 
                          placeholder="Nombre (ej: Binance)" 
                          value={newMethod.name}
                          onChange={e => setNewMethod({...newMethod, name: e.target.value})}
                      />
                      <div className="flex gap-2">
                          <select 
                              className="p-2 rounded-lg text-xs bg-white flex-1"
                              value={newMethod.currency}
                              onChange={e => setNewMethod({...newMethod, currency: e.target.value})}
                          >
                              <option value="VES">VES</option>
                              <option value="USD">USD</option>
                              <option value="CRYPTO">CRYPTO</option>
                          </select>
                          <button type="button" onClick={handleAddPaymentMethod} className="bg-brand-500 text-white px-4 rounded-lg text-xs font-bold">Agregar</button>
                      </div>
                  </div>
              )}

              <div className="space-y-3">
                {paymentMethods.map(pm => (
                  <div key={pm.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 group hover:bg-slate-100 transition-all">
                    <div className="flex justify-between items-center">
                      <div className="cursor-pointer flex-1" onClick={() => setEditingMethod(editingMethod?.id === pm.id ? null : pm)}>
                        <div className="font-bold text-sm text-slate-800 flex items-center gap-2">{pm.name} <Edit size={12} className="text-slate-300 group-hover:text-brand-500 transition-all"/></div>
                        <div className="text-[10px] text-slate-400 uppercase font-black">{pm.currency}</div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <button type="button" onClick={() => {db.togglePaymentMethod(pm.id); refreshPaymentMethods();}} className={pm.isActive ? 'text-green-500' : 'text-slate-300'}>
                          {pm.isActive ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => handleDeletePaymentMethod(pm.id)} 
                          className={`${confirmDeleteId === pm.id ? 'bg-red-500 text-white p-2 rounded-lg' : 'text-red-200 hover:text-red-500 p-1'} transition-all`}
                        >
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </div>
                    {editingMethod?.id === pm.id && (
                      <form onSubmit={handleUpdateMethod} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 animate-in zoom-in-95">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Nombre Pasarela</label>
                          <input value={editingMethod.name} onChange={e => setEditingMethod({...editingMethod, name: e.target.value})} className="w-full text-xs p-2 bg-slate-50 rounded-lg outline-none border border-slate-100" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Datos Cuenta</label>
                          <input value={editingMethod.details} onChange={e => setEditingMethod({...editingMethod, details: e.target.value})} className="w-full text-xs p-2 bg-slate-50 rounded-lg outline-none border border-slate-100" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Instrucciones</label>
                          <textarea value={editingMethod.instructions} onChange={e => setEditingMethod({...editingMethod, instructions: e.target.value})} className="w-full text-xs p-2 bg-slate-50 rounded-lg outline-none border border-slate-100" rows={2}/>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 bg-brand-500 text-white py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 hover:bg-brand-600 active:scale-95 transition-all"><Save size={12}/> GUARDAR</button>
                          <button type="button" onClick={() => setEditingMethod(null)} className="flex-1 bg-slate-100 text-slate-400 py-2 rounded-lg text-[10px] font-black">CANCELAR</button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
                {paymentMethods.length === 0 && <p className="text-center text-slate-400 py-6 italic text-xs">Sin pasarelas configuradas.</p>}
              </div>
            </div>

            {/* Password Management Card */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-4">
              <h3 className="text-lg font-black flex items-center gap-2"><Key className="text-slate-400" size={20}/> Seguridad Admin</h3>
              <div className="space-y-2">
                <input 
                  type="password"
                  placeholder="Nueva Contraseña"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                />
                <input 
                  type="password"
                  placeholder="Confirmar Contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"
                />
                <button 
                  type="button" 
                  onClick={handleChangePassword}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-black hover:bg-black transition-all"
                >
                  Actualizar Contraseña
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [config, setConfig] = useState<RaffleConfig>(db.getConfig());
  const [tickets, setTickets] = useState<Ticket[]>(db.getTickets());
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setConfig(db.getConfig());
    setTickets(db.getTickets());
  };

  const toggleTicket = (number: number) => {
    if (selectedIds.includes(number)) {
      setSelectedIds(prev => prev.filter(id => id !== number));
    } else {
        if (!config.allowMultipleWins && selectedIds.length >= 100) {
             // Arbitrary limit if needed
             setSelectedIds(prev => [...prev, number]);
        } else {
            setSelectedIds(prev => [...prev, number]);
        }
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedIds([]);
    refreshData();
  };

  const renderContent = () => {
    if (view === 'ADMIN') {
      if (isAdminLoggedIn) {
        return (
          <AdminHub 
            initialConfig={config} 
            tickets={tickets} 
            onExit={() => { setIsAdminLoggedIn(false); setView('HOME'); }} 
            onRefreshParent={refreshData}
            onPreviewUpdate={(newCfg) => setConfig(newCfg)}
          />
        );
      }
      return <LoginView onLogin={() => setIsAdminLoggedIn(true)} onCancel={() => setView('HOME')} />;
    }

    if (view === 'CHECK_TICKETS') return <CheckTicketsView />;
    if (view === 'CONTACT') return <ContactView config={config} />;

    const soldCount = tickets.filter(t => t.status === TicketStatus.SOLD).length;
    
    return (
      <div className="space-y-8 animate-in fade-in pb-24">
        {/* Carousel Section */}
        <div className="max-w-4xl mx-auto rounded-[40px] overflow-hidden shadow-xl bg-slate-900 relative group">
           {config.carouselImages && config.carouselImages.length > 0 ? (
               <ImageCarousel images={config.carouselImages} />
           ) : (
               <div className="h-64 flex items-center justify-center text-slate-700 font-black text-2xl bg-slate-100">
                  <ImageIcon size={48} className="mr-4 text-slate-300"/> Sin Imágenes
               </div>
           )}
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent pointer-events-none"></div>
        </div>

        {/* Info Section (Moved Outside Carousel) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 px-2 animate-in slide-in-from-bottom-4">
             <div className="space-y-2 max-w-2xl">
                <span className="bg-brand-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-500/20">Sorteo Activo</span>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">{config.title}</h1>
                <p className="text-slate-500 text-sm md:text-base font-medium max-w-lg">{config.description}</p>
             </div>
             
             <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 min-w-[200px]">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor del Ticket</div>
                <div className="text-4xl font-black text-slate-900 flex items-start">
                    <span className="text-lg mt-1 text-brand-500 mr-1">$</span>
                    {config.ticketPrice}
                </div>
             </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
           <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                 <div className="p-3 bg-red-50 text-red-500 rounded-2xl"><Clock size={24}/></div>
                 <h3 className="font-black text-xl text-slate-900">Tiempo Restante</h3>
              </div>
              <CountdownTimer targetDate={config.raffleDate} />
              <p className="text-center text-slate-400 text-xs mt-4">El sorteo se realizará el {new Date(config.raffleDate).toLocaleDateString()} a las {new Date(config.raffleDate).toLocaleTimeString()}</p>
           </div>

           <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
               <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl"><Trophy size={24}/></div>
                 <h3 className="font-black text-xl text-slate-900">Premios en Juego</h3>
              </div>
              <div className="space-y-3">
                 {config.prizes.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-black text-slate-300 text-xs shadow-sm">#{i+1}</div>
                       <span className="font-bold text-slate-700">{p.name}</span>
                    </div>
                 ))}
                 {config.prizes.length === 0 && <p className="text-slate-400 text-sm italic">Próximamente...</p>}
              </div>
           </div>
        </div>

        {config.raffleStatus !== RaffleStatus.SCHEDULED && config.winners.length > 0 && (
           <div className="bg-slate-900 rounded-[40px] p-10 text-center shadow-2xl relative overflow-hidden border border-slate-800">
               <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
               <div className="relative z-10">
                   <InlineRaffleAnimation winners={config.winners} duration={config.selectionDuration} />
               </div>
           </div>
        )}

        <div id="tickets-section">
            <RaffleProgressBar total={config.totalTickets} sold={soldCount} />
            
            <div className="bg-white p-4 md:p-8 rounded-[40px] shadow-xl border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Elige tu Suerte</h2>
                        <p className="text-slate-400 text-sm">Selecciona los números que deseas comprar.</p>
                    </div>
                    <div className="flex gap-4 text-xs font-bold">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-white border border-slate-300"></div> Disponible</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-brand-500"></div> Seleccionado</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-200"></div> Ocupado</div>
                    </div>
                </div>

                <TicketGrid tickets={tickets} selectedIds={selectedIds} onToggle={toggleTicket} />
                
                <div className={`fixed bottom-6 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:max-w-2xl bg-slate-900 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between transition-all transform duration-300 z-40 border border-slate-800 ${selectedIds.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0'}`}>
                    <div className="flex items-center gap-4 pl-2">
                        <div className="bg-brand-500 w-10 h-10 rounded-full flex items-center justify-center font-black text-white shadow-lg shadow-brand-500/30">
                            {selectedIds.length}
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total a Pagar</span>
                           <span className="font-black text-xl leading-none">${(selectedIds.length * config.ticketPrice).toFixed(2)}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowPaymentModal(true)}
                        className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black hover:bg-brand-50 hover:text-brand-900 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                    >
                        Comprar Ahora <ArrowLeft className="rotate-180" size={18} />
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-600 selection:bg-brand-100 selection:text-brand-900">
       <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
             <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('HOME')}>
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                   <Dices size={24} strokeWidth={2.5}/>
                </div>
                <div>
                   <h1 className="font-black text-slate-900 text-lg leading-none tracking-tight">{config.websiteName}</h1>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sorteos Digitales</p>
                </div>
             </div>

             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar ml-4">
                {(['HOME', 'CHECK_TICKETS', 'CONTACT'] as const).map((v) => (
                   <button
                     key={v}
                     onClick={() => setView(v)}
                     className={`px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all ${
                       view === v 
                         ? 'bg-slate-900 text-white shadow-lg' 
                         : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                     }`}
                   >
                     {v === 'HOME' && 'INICIO'}
                     {v === 'CHECK_TICKETS' && 'VERIFICAR'}
                     {v === 'CONTACT' && 'CONTACTO'}
                   </button>
                ))}
             </div>
          </div>
       </nav>

       <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 min-h-[calc(100vh-160px)]">
          {renderContent()}
       </main>

       {view !== 'ADMIN' && (
           <footer className="bg-white border-t border-slate-200 mt-auto">
              <div className="max-w-6xl mx-auto px-6 py-12">
                 <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3 opacity-50 grayscale hover:grayscale-0 transition-all">
                        <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                           <Dices size={16}/>
                        </div>
                        <span className="font-black text-slate-900">{config.websiteName || 'TuRifaDigitalVE'}</span>
                    </div>
                    
                    <div className="flex flex-col items-center md:items-end gap-2">
                        <p className="text-slate-400 text-xs text-center md:text-right">
                        © {new Date().getFullYear()} {config.websiteName || config.ownerName}. Todos los derechos reservados.
                        </p>
                        <button 
                            onClick={() => setView('ADMIN')}
                            className="text-[10px] font-bold text-slate-300 hover:text-brand-500 uppercase tracking-widest transition-colors flex items-center gap-1"
                        >
                            <Lock size={10} /> Acceso Administrativo
                        </button>
                    </div>
                 </div>
              </div>
           </footer>
       )}

       <PaymentModal 
         isOpen={showPaymentModal}
         onClose={() => setShowPaymentModal(false)}
         selectedTicketNumbers={selectedIds}
         totalAmount={selectedIds.length * config.ticketPrice}
         config={config}
         onSuccess={handlePaymentSuccess}
       />
    </div>
  );
};

export default App;