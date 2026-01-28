"use client";

import { useState, useRef, useEffect } from "react";
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
  PhoneOff,
  PhoneMissed,
  Calendar,
  TrendingUp,
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

type WizardStep = 'main' | 'call_outcome_help' | 'status_info' | 'time_info';

export default function LeadActionWizard({
  lead,
  onLogCall,
  onSetTarget,
  onSetEnrolled,
}: LeadActionWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<WizardStep>('main');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setStep('main');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Calculate contextual info
  const isPerso = lead.status === 'PERSO';
  const isEnrolled = lead.enrolled;
  const hasCallsLogged = lead.callAttempts > 0;
  const remainingAttempts = 8 - lead.callAttempts;
  const isPositivo = lead.callOutcome === 'POSITIVO';
  const isRichiamare = lead.callOutcome === 'RICHIAMARE';
  
  // Days since last attempt
  const daysSinceLastAttempt = lead.lastAttemptAt
    ? Math.floor((Date.now() - new Date(lead.lastAttemptAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const daysUntilAutoPerso = daysSinceLastAttempt !== null ? Math.max(0, 15 - daysSinceLastAttempt) : null;

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
    setStep('main');
  };

  const getOutcomeLabel = (outcome: string | null) => {
    switch (outcome) {
      case 'POSITIVO': return 'Interessato';
      case 'RICHIAMARE': return 'Da richiamare';
      case 'NEGATIVO': return 'Non interessato';
      default: return 'Nessuno';
    }
  };

  const getOutcomeColor = (outcome: string | null) => {
    switch (outcome) {
      case 'POSITIVO': return 'text-green-600 bg-green-50';
      case 'RICHIAMARE': return 'text-yellow-600 bg-yellow-50';
      case 'NEGATIVO': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Render the main contextual menu based on lead state
  const renderMainMenu = () => {
    // CASE 1: Lead is PERSO
    if (isPerso) {
      return (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="text-red-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Lead Perso</h3>
              <p className="text-xs text-gray-500">{lead.name}</p>
            </div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <p className="text-sm text-red-700">
              Questo lead è stato segnato come <strong>PERSO</strong> e non può più essere modificato.
            </p>
          </div>

          <button
            onClick={() => setStep('status_info')}
            className="w-full flex items-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition"
          >
            <HelpCircle size={16} />
            Perché è perso?
          </button>
        </div>
      );
    }

    // CASE 2: Lead is ENROLLED
    if (isEnrolled) {
      return (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Lead Iscritto! 🎉</h3>
              <p className="text-xs text-gray-500">{lead.name}</p>
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700">
              Questo lead è stato iscritto al corso. Complimenti!
            </p>
          </div>
        </div>
      );
    }

    // CASE 3: No calls yet
    if (!hasCallsLogged) {
      return (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="text-blue-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Nuovo Lead</h3>
              <p className="text-xs text-gray-500">{lead.name}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Non hai ancora chiamato questo lead. Cosa vuoi fare?
          </p>

          <div className="space-y-2">
            <button
              onClick={() => handleAction(onLogCall)}
              className="w-full flex items-center gap-3 p-3 bg-commercial/10 hover:bg-commercial/20 text-commercial rounded-lg transition text-left"
            >
              <Phone size={20} />
              <div>
                <p className="font-medium">Ho chiamato il lead</p>
                <p className="text-xs opacity-75">Registra l'esito della chiamata</p>
              </div>
            </button>

            <button
              onClick={() => setStep('call_outcome_help')}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-gray-600 rounded-lg transition text-left"
            >
              <HelpCircle size={20} />
              <div>
                <p className="font-medium">Come funziona?</p>
                <p className="text-xs opacity-75">Spiegazione degli esiti</p>
              </div>
            </button>
          </div>
        </div>
      );
    }

    // CASE 4: Has POSITIVO outcome - can enroll!
    if (isPositivo) {
      return (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Lead Interessato!</h3>
              <p className="text-xs text-gray-500">{lead.name}</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-700">
              ✅ Questo lead è interessato dopo <strong>{lead.callAttempts}</strong> chiamat{lead.callAttempts === 1 ? 'a' : 'e'}.
            </p>
          </div>

          <p className="text-sm text-gray-600 mb-3">Cosa vuoi fare?</p>

          <div className="space-y-2">
            <button
              onClick={() => handleAction(onSetEnrolled)}
              className="w-full flex items-center gap-3 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-left"
            >
              <FileSignature size={20} />
              <div>
                <p className="font-medium">Ha firmato il contratto!</p>
                <p className="text-xs opacity-90">Registra l'iscrizione al corso</p>
              </div>
            </button>

            {!lead.isTarget && (
              <button
                onClick={() => handleAction(() => onSetTarget(true))}
                className="w-full flex items-center gap-3 p-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg transition text-left"
              >
                <Target size={20} />
                <div>
                  <p className="font-medium">Segna come prioritario</p>
                  <p className="text-xs opacity-75">Lead ad alta priorità</p>
                </div>
              </button>
            )}

            <button
              onClick={() => handleAction(onLogCall)}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-gray-600 rounded-lg transition text-left"
            >
              <PhoneCall size={20} />
              <div>
                <p className="font-medium">Devo richiamare</p>
                <p className="text-xs opacity-75">Aggiorna l'esito</p>
              </div>
            </button>
          </div>
        </div>
      );
    }

    // CASE 5: RICHIAMARE outcome - needs follow-up
    if (isRichiamare) {
      return (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <PhoneCall className="text-yellow-600" size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Da Richiamare</h3>
              <p className="text-xs text-gray-500">{lead.name}</p>
            </div>
          </div>

          {/* Status summary */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Chiamate effettuate:</span>
              <span className="font-medium">{lead.callAttempts} / 8</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tentativi rimanenti:</span>
              <span className={`font-medium ${remainingAttempts <= 2 ? 'text-red-600' : 'text-green-600'}`}>
                {remainingAttempts}
              </span>
            </div>
            {daysUntilAutoPerso !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Giorni rimasti:</span>
                <span className={`font-medium ${daysUntilAutoPerso <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {daysUntilAutoPerso}
                </span>
              </div>
            )}
          </div>

          {/* Warning if running low */}
          {(remainingAttempts <= 2 || (daysUntilAutoPerso !== null && daysUntilAutoPerso <= 5)) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <AlertTriangle className="text-yellow-600 flex-shrink-0" size={16} />
                <p className="text-xs text-yellow-700">
                  {remainingAttempts <= 2 
                    ? `Solo ${remainingAttempts} tentativ${remainingAttempts === 1 ? 'o' : 'i'} rimast${remainingAttempts === 1 ? 'o' : 'i'}!`
                    : `Solo ${daysUntilAutoPerso} giorni prima che diventi PERSO!`
                  }
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-gray-600 mb-3">Cosa è successo?</p>

          <div className="space-y-2">
            <button
              onClick={() => handleAction(onLogCall)}
              className="w-full flex items-center gap-3 p-3 bg-commercial/10 hover:bg-commercial/20 text-commercial rounded-lg transition text-left"
            >
              <Phone size={20} />
              <div>
                <p className="font-medium">L'ho richiamato</p>
                <p className="text-xs opacity-75">Registra il nuovo esito</p>
              </div>
            </button>

            {!lead.isTarget && (
              <button
                onClick={() => handleAction(() => onSetTarget(true))}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-gray-600 rounded-lg transition text-left"
              >
                <Target size={20} />
                <div>
                  <p className="font-medium">Segna come prioritario</p>
                  <p className="text-xs opacity-75">Ricordati di richiamarlo</p>
                </div>
              </button>
            )}

            <button
              onClick={() => setStep('time_info')}
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-gray-600 rounded-lg transition text-left"
            >
              <Clock size={20} />
              <div>
                <p className="font-medium">Quanto tempo ho?</p>
                <p className="text-xs opacity-75">Info sui limiti</p>
              </div>
            </button>
          </div>
        </div>
      );
    }

    // DEFAULT: Has calls but unexpected state (shouldn't happen often)
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Compass className="text-gray-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{lead.name}</h3>
            <p className="text-xs text-gray-500">{lead.callAttempts} chiamate</p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => handleAction(onLogCall)}
            className="w-full flex items-center gap-3 p-3 bg-commercial/10 hover:bg-commercial/20 text-commercial rounded-lg transition text-left"
          >
            <Phone size={20} />
            <span className="font-medium">Registra chiamata</span>
          </button>

          <button
            onClick={() => setStep('call_outcome_help')}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-gray-600 rounded-lg transition text-left"
          >
            <HelpCircle size={20} />
            <span className="font-medium">Come funziona?</span>
          </button>
        </div>
      </div>
    );
  };

  // Render help screens
  const renderCallOutcomeHelp = () => (
    <div className="p-4">
      <button
        onClick={() => setStep('main')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
      >
        ← Indietro
      </button>

      <h3 className="font-semibold text-gray-900 mb-3">Gli esiti delle chiamate</h3>

      <div className="space-y-3">
        <div className="flex gap-3 p-3 bg-green-50 rounded-lg">
          <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-green-700">Interessato</p>
            <p className="text-xs text-green-600">Il lead vuole iscriversi. Puoi procedere con l'iscrizione!</p>
          </div>
        </div>

        <div className="flex gap-3 p-3 bg-yellow-50 rounded-lg">
          <PhoneCall className="text-yellow-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-yellow-700">Da Richiamare</p>
            <p className="text-xs text-yellow-600">Non risponde o chiede di essere richiamato. Max 8 tentativi in 15 giorni.</p>
          </div>
        </div>

        <div className="flex gap-3 p-3 bg-red-50 rounded-lg">
          <XCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-medium text-red-700">Non Interessato</p>
            <p className="text-xs text-red-600">Il lead non vuole iscriversi. Sarà segnato come PERSO.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStatusInfo = () => (
    <div className="p-4">
      <button
        onClick={() => setStep('main')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
      >
        ← Indietro
      </button>

      <h3 className="font-semibold text-gray-900 mb-3">Perché questo lead è PERSO?</h3>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700 mb-3">Un lead diventa PERSO quando:</p>
        <ul className="space-y-2 text-sm text-red-600">
          <li className="flex items-start gap-2">
            <XCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>Hai selezionato "Non Interessato" come esito</span>
          </li>
          <li className="flex items-start gap-2">
            <PhoneMissed size={16} className="flex-shrink-0 mt-0.5" />
            <span>Hai raggiunto 8 tentativi di chiamata senza successo</span>
          </li>
          <li className="flex items-start gap-2">
            <Calendar size={16} className="flex-shrink-0 mt-0.5" />
            <span>Sono passati più di 15 giorni dall'ultima chiamata con esito "Da Richiamare"</span>
          </li>
        </ul>
      </div>
    </div>
  );

  const renderTimeInfo = () => (
    <div className="p-4">
      <button
        onClick={() => setStep('main')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
      >
        ← Indietro
      </button>

      <h3 className="font-semibold text-gray-900 mb-3">Limiti di tempo</h3>

      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>Max 8 tentativi:</strong> Dopo 8 chiamate senza risposta positiva, il lead diventa automaticamente PERSO.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-700">
            <strong>Max 15 giorni:</strong> Se non richiami entro 15 giorni dall'ultima chiamata, il lead diventa PERSO.
          </p>
        </div>

        {lead.lastAttemptAt && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              <strong>Ultima chiamata:</strong> {new Date(lead.lastAttemptAt).toLocaleDateString('it-IT')}
              {daysSinceLastAttempt !== null && (
                <span className="ml-1">({daysSinceLastAttempt} giorni fa)</span>
              )}
            </p>
            {daysUntilAutoPerso !== null && (
              <p className={`text-sm mt-1 ${daysUntilAutoPerso <= 5 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                <strong>Tempo rimasto:</strong> {daysUntilAutoPerso} giorni
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          setIsOpen(!isOpen);
          setStep('main');
        }}
        className={`p-2 rounded-lg transition ${
          isOpen 
            ? 'bg-commercial text-white' 
            : 'text-gray-400 hover:text-commercial hover:bg-commercial/10'
        }`}
        title="Guida azioni"
      >
        <Compass size={18} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={() => {
              setIsOpen(false);
              setStep('main');
            }}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition z-10"
          >
            <X size={16} />
          </button>

          {/* Content based on step */}
          {step === 'main' && renderMainMenu()}
          {step === 'call_outcome_help' && renderCallOutcomeHelp()}
          {step === 'status_info' && renderStatusInfo()}
          {step === 'time_info' && renderTimeInfo()}
        </div>
      )}
    </div>
  );
}
