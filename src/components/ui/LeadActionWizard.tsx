"use client";

import { useState, useEffect } from "react";
import {
  Compass,
  Phone,
  PhoneCall,
  FileSignature,
  Target,
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  HelpCircle,
  PhoneMissed,
  Calendar,
  TrendingUp,
  User,
  ArrowRight,
  Sparkles,
  Ban,
  PartyPopper,
} from "lucide-react";

interface Lead {
  id: string;
  name: string;
  contacted: boolean;
  isTarget: boolean;
  enrolled: boolean;
  callAttempts: number;
  callOutcome: string | null;
  lastAttemptAt: string | null;
  status: string;
  course?: { name: string } | null;
}

interface LeadActionWizardProps {
  lead: Lead;
  onLogCall: () => void;
  onSetTarget: (value: boolean) => void;
  onSetEnrolled: () => void;
}

export default function LeadActionWizard({
  lead,
  onLogCall,
  onSetTarget,
  onSetEnrolled,
}: LeadActionWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  // Open with animation
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimateIn(true), 10);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Calculate contextual info
  const isPerso = lead.status === 'PERSO';
  const isEnrolled = lead.enrolled;
  const hasCallsLogged = lead.callAttempts > 0;
  const remainingAttempts = Math.max(0, 8 - lead.callAttempts);
  const isPositivo = lead.callOutcome === 'POSITIVO';
  const isRichiamare = lead.callOutcome === 'RICHIAMARE';
  const isNegativo = lead.callOutcome === 'NEGATIVO';
  
  // Days calculations
  const daysSinceLastAttempt = lead.lastAttemptAt
    ? Math.floor((Date.now() - new Date(lead.lastAttemptAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const daysUntilAutoPerso = daysSinceLastAttempt !== null ? Math.max(0, 15 - daysSinceLastAttempt) : null;

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    setTimeout(action, 150); // Small delay for animation
  };

  const getOutcomeLabel = (outcome: string | null) => {
    switch (outcome) {
      case 'POSITIVO': return 'Interessato';
      case 'RICHIAMARE': return 'Da richiamare';
      case 'NEGATIVO': return 'Non interessato';
      default: return 'Nessun esito';
    }
  };

  const getOutcomeIcon = (outcome: string | null) => {
    switch (outcome) {
      case 'POSITIVO': return <CheckCircle className="text-green-500" size={16} />;
      case 'RICHIAMARE': return <PhoneCall className="text-yellow-500" size={16} />;
      case 'NEGATIVO': return <XCircle className="text-red-500" size={16} />;
      default: return <Phone className="text-gray-400" size={16} />;
    }
  };

  // Status sidebar content
  const renderStatusSidebar = () => (
    <div className="w-64 bg-gray-50 p-5 border-r border-gray-200">
      {/* Lead info header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
          isEnrolled ? 'bg-green-500' : isPerso ? 'bg-red-400' : isPositivo ? 'bg-emerald-500' : 'bg-commercial'
        }`}>
          {lead.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 truncate max-w-[140px]">{lead.name}</h3>
          <p className="text-xs text-gray-500 truncate max-w-[140px]">{lead.course?.name || 'Nessun corso'}</p>
        </div>
      </div>

      {/* Current status */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stato Attuale</h4>
        
        {/* Status badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          isEnrolled 
            ? 'bg-green-100 text-green-700' 
            : isPerso 
              ? 'bg-red-100 text-red-700'
              : isPositivo
                ? 'bg-emerald-100 text-emerald-700'
                : isRichiamare
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600'
        }`}>
          {isEnrolled && <><PartyPopper size={14} /> Iscritto!</>}
          {isPerso && <><Ban size={14} /> Perso</>}
          {!isEnrolled && !isPerso && isPositivo && <><Sparkles size={14} /> Interessato</>}
          {!isEnrolled && !isPerso && isRichiamare && <><PhoneCall size={14} /> Da Richiamare</>}
          {!isEnrolled && !isPerso && !hasCallsLogged && <><User size={14} /> Nuovo Lead</>}
          {!isEnrolled && !isPerso && hasCallsLogged && !isPositivo && !isRichiamare && <><Phone size={14} /> In Lavorazione</>}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{lead.callAttempts}</p>
            <p className="text-xs text-gray-500">Chiamate</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className={`text-2xl font-bold ${remainingAttempts <= 2 ? 'text-red-600' : 'text-gray-900'}`}>
              {remainingAttempts}
            </p>
            <p className="text-xs text-gray-500">Rimanenti</p>
          </div>
        </div>

        {/* Last outcome */}
        {hasCallsLogged && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Ultimo esito</p>
            <div className="flex items-center gap-2">
              {getOutcomeIcon(lead.callOutcome)}
              <span className="font-medium text-sm">{getOutcomeLabel(lead.callOutcome)}</span>
            </div>
          </div>
        )}

        {/* Time warning */}
        {isRichiamare && daysUntilAutoPerso !== null && (
          <div className={`rounded-lg p-3 border ${
            daysUntilAutoPerso <= 5 
              ? 'bg-red-50 border-red-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-2">
              <Clock size={16} className={daysUntilAutoPerso <= 5 ? 'text-red-500' : 'text-yellow-600'} />
              <div>
                <p className={`text-sm font-medium ${daysUntilAutoPerso <= 5 ? 'text-red-700' : 'text-yellow-700'}`}>
                  {daysUntilAutoPerso} giorni rimasti
                </p>
                <p className="text-xs text-gray-500">prima di PERSO automatico</p>
              </div>
            </div>
          </div>
        )}

        {/* Checkmarks for status */}
        <div className="space-y-2 mt-4">
          <div className="flex items-center gap-2 text-sm">
            {lead.contacted ? (
              <CheckCircle className="text-green-500" size={16} />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
            <span className={lead.contacted ? 'text-gray-900' : 'text-gray-400'}>Contattato</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {lead.isTarget ? (
              <CheckCircle className="text-green-500" size={16} />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
            <span className={lead.isTarget ? 'text-gray-900' : 'text-gray-400'}>Target</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {lead.enrolled ? (
              <CheckCircle className="text-green-500" size={16} />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
            )}
            <span className={lead.enrolled ? 'text-gray-900' : 'text-gray-400'}>Iscritto</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Main action content based on state
  const renderActionContent = () => {
    // CASE 1: ENROLLED - Celebration!
    if (isEnrolled) {
      return (
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4 animate-bounce">
            <PartyPopper className="text-green-600" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead Iscritto! 🎉</h2>
          <p className="text-gray-600 mb-6">
            Complimenti! <strong>{lead.name}</strong> è stato iscritto al corso.
          </p>
          <button
            onClick={() => setIsOpen(false)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            Perfetto!
          </button>
        </div>
      );
    }

    // CASE 2: PERSO - Explanation
    if (isPerso) {
      return (
        <div className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Ban className="text-red-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Lead Perso</h2>
              <p className="text-sm text-gray-500">Questo lead non può più essere modificato</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <h3 className="font-medium text-red-800 mb-3">Perché è successo?</h3>
            <ul className="space-y-2">
              {isNegativo && (
                <li className="flex items-start gap-2 text-sm text-red-700">
                  <XCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>Il lead ha dichiarato di <strong>non essere interessato</strong></span>
                </li>
              )}
              {lead.callAttempts >= 8 && (
                <li className="flex items-start gap-2 text-sm text-red-700">
                  <PhoneMissed size={16} className="flex-shrink-0 mt-0.5" />
                  <span>Hai raggiunto il <strong>massimo di 8 tentativi</strong> di chiamata</span>
                </li>
              )}
              {!isNegativo && lead.callAttempts < 8 && (
                <li className="flex items-start gap-2 text-sm text-red-700">
                  <Calendar size={16} className="flex-shrink-0 mt-0.5" />
                  <span>Sono passati <strong>più di 15 giorni</strong> dall'ultima chiamata</span>
                </li>
              )}
            </ul>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Ho capito
          </button>
        </div>
      );
    }

    // CASE 3: NEW LEAD (no calls)
    if (!hasCallsLogged) {
      return (
        <div className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nuovo Lead</h2>
              <p className="text-sm text-gray-500">Nessuna chiamata registrata</p>
            </div>
          </div>

          <p className="text-gray-600 mb-6 mt-4">
            Cosa è successo con <strong>{lead.name}</strong>?
          </p>

          <div className="space-y-3">
            {/* Primary action: Log a call */}
            <button
              onClick={() => handleAction(onLogCall)}
              className="w-full flex items-center gap-4 p-4 bg-commercial text-white rounded-xl hover:opacity-90 transition group"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
                <Phone size={24} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-lg">Ho chiamato questo lead</p>
                <p className="text-sm opacity-90">Non importa se ha risposto o meno</p>
              </div>
              <ArrowRight size={20} className="opacity-50 group-hover:translate-x-1 transition" />
            </button>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex gap-3">
                <HelpCircle className="text-blue-500 flex-shrink-0" size={20} />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Come funziona?</p>
                  <p>Dopo aver chiamato, potrai scegliere l'esito: <strong>Interessato</strong>, <strong>Da Richiamare</strong>, o <strong>Non Interessato</strong>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // CASE 4: POSITIVO - Can enroll!
    if (isPositivo) {
      return (
        <div className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Sparkles className="text-emerald-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Lead Interessato!</h2>
              <p className="text-sm text-gray-500">Pronto per l'iscrizione</p>
            </div>
          </div>

          <p className="text-gray-600 mb-6 mt-4">
            <strong>{lead.name}</strong> è interessato. Cosa vuoi fare?
          </p>

          <div className="space-y-3">
            {/* Primary: Enroll */}
            <button
              onClick={() => handleAction(onSetEnrolled)}
              className="w-full flex items-center gap-4 p-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition group"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
                <FileSignature size={24} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-lg">Ha firmato il contratto!</p>
                <p className="text-sm opacity-90">Registra l'iscrizione al corso</p>
              </div>
              <ArrowRight size={20} className="opacity-50 group-hover:translate-x-1 transition" />
            </button>

            {/* Secondary: Set as target */}
            {!lead.isTarget && (
              <button
                onClick={() => handleAction(() => onSetTarget(true))}
                className="w-full flex items-center gap-4 p-4 bg-yellow-50 border-2 border-yellow-200 text-yellow-800 rounded-xl hover:bg-yellow-100 transition group"
              >
                <div className="w-12 h-12 rounded-full bg-yellow-200 flex items-center justify-center group-hover:scale-110 transition">
                  <Target size={24} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">Segna come prioritario</p>
                  <p className="text-sm opacity-75">Lead ad alta priorità</p>
                </div>
              </button>
            )}

            {/* Tertiary: Need to call back */}
            <button
              onClick={() => handleAction(onLogCall)}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition group"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <PhoneCall size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Devo richiamarlo</p>
                <p className="text-sm text-gray-500">Aggiorna lo stato</p>
              </div>
            </button>
          </div>
        </div>
      );
    }

    // CASE 5: RICHIAMARE - Follow up needed
    if (isRichiamare) {
      const isUrgent = remainingAttempts <= 2 || (daysUntilAutoPerso !== null && daysUntilAutoPerso <= 5);
      
      return (
        <div className="flex-1 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isUrgent ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              <PhoneCall className={isUrgent ? 'text-red-600' : 'text-yellow-600'} size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Da Richiamare</h2>
              <p className="text-sm text-gray-500">
                {lead.callAttempts} chiamat{lead.callAttempts === 1 ? 'a' : 'e'} effettuat{lead.callAttempts === 1 ? 'a' : 'e'}
              </p>
            </div>
          </div>

          {/* Urgent warning */}
          {isUrgent && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 mt-4 animate-pulse">
              <div className="flex gap-3">
                <AlertTriangle className="text-red-500 flex-shrink-0" size={20} />
                <div className="text-sm text-red-700">
                  <p className="font-medium">⚠️ Attenzione!</p>
                  {remainingAttempts <= 2 && (
                    <p>Solo <strong>{remainingAttempts}</strong> tentativ{remainingAttempts === 1 ? 'o' : 'i'} rimast{remainingAttempts === 1 ? 'o' : 'i'}!</p>
                  )}
                  {daysUntilAutoPerso !== null && daysUntilAutoPerso <= 5 && (
                    <p>Solo <strong>{daysUntilAutoPerso}</strong> giorni prima che diventi PERSO!</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="text-gray-600 mb-6 mt-4">
            Cosa è successo con <strong>{lead.name}</strong>?
          </p>

          <div className="space-y-3">
            {/* Primary: Call again */}
            <button
              onClick={() => handleAction(onLogCall)}
              className={`w-full flex items-center gap-4 p-4 text-white rounded-xl hover:opacity-90 transition group ${
                isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-commercial'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition">
                <Phone size={24} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-lg">L'ho richiamato</p>
                <p className="text-sm opacity-90">Registra il nuovo esito</p>
              </div>
              <ArrowRight size={20} className="opacity-50 group-hover:translate-x-1 transition" />
            </button>

            {/* Secondary: Set as target */}
            {!lead.isTarget && (
              <button
                onClick={() => handleAction(() => onSetTarget(true))}
                className="w-full flex items-center gap-4 p-4 bg-yellow-50 border-2 border-yellow-200 text-yellow-800 rounded-xl hover:bg-yellow-100 transition group"
              >
                <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center">
                  <Target size={20} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Segna come prioritario</p>
                  <p className="text-sm opacity-75">Per non dimenticare di richiamarlo</p>
                </div>
              </button>
            )}

            {/* Info: Time limits */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="flex gap-3">
                <Clock className="text-gray-400 flex-shrink-0" size={20} />
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">Limiti di tempo</p>
                  <ul className="space-y-1 text-gray-500">
                    <li>• Max <strong>8 tentativi</strong> di chiamata</li>
                    <li>• Max <strong>15 giorni</strong> tra una chiamata e l'altra</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // DEFAULT fallback
    return (
      <div className="flex-1 p-6">
        <p className="text-gray-600">Seleziona un'azione dal menu.</p>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-400 hover:text-commercial hover:bg-commercial/10 rounded-lg transition"
        title="Guida azioni"
      >
        <Compass size={18} />
      </button>
    );
  }

  return (
    <>
      {/* Trigger button (stays visible) */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 bg-commercial text-white rounded-lg"
        title="Guida azioni"
      >
        <Compass size={18} />
      </button>

      {/* Modal Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
          animateIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => setIsOpen(false)}
      >
        {/* Modal Content */}
        <div 
          className={`bg-white rounded-2xl shadow-2xl overflow-hidden flex max-w-3xl w-full max-h-[85vh] transition-all duration-300 ${
            animateIn ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left sidebar - Status */}
          {renderStatusSidebar()}

          {/* Right content - Actions */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Header with close button */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-commercial">
                <Compass size={20} />
                <span className="font-semibold">Guida Azioni</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Action content */}
            {renderActionContent()}
          </div>
        </div>
      </div>
    </>
  );
}
