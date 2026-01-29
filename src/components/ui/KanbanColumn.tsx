"use client";

import { KanbanCard } from "./KanbanCard";
import { UserPlus, Phone, MessageSquare, CheckCircle, XCircle } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  contacted: boolean;
  contactedAt: string | null;
  enrolled: boolean;
  enrolledAt: string | null;
  isTarget: boolean;
  notes: string | null;
  callOutcome: string | null;
  outcomeNotes: string | null;
  createdAt: string;
  course: { id: string; name: string; price: number } | null;
  campaign: { id: string; name: string; platform?: string } | null;
  assignedTo: { id: string; name: string; email: string } | null;
  // Call tracking fields
  callAttempts: number;
  firstAttemptAt: string | null;
  lastAttemptAt: string | null;
}

interface KanbanColumnProps {
  status: string;
  label: string;
  leads: Lead[];
  color: string;
  onLeadClick: (lead: Lead) => void;
}

export function KanbanColumn({
  status,
  label,
  leads,
  color,
  onLeadClick,
}: KanbanColumnProps) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
    red: "bg-red-500",
  };

  const statusConfig: Record<string, { icon: React.ReactNode; hint: string }> = {
    NUOVO: { 
      icon: <UserPlus size={20} className="text-blue-400" />, 
      hint: "Nessun lead nuovo" 
    },
    CONTATTATO: { 
      icon: <Phone size={20} className="text-yellow-500" />, 
      hint: "Nessun lead contattato" 
    },
    IN_TRATTATIVA: { 
      icon: <MessageSquare size={20} className="text-purple-500" />, 
      hint: "Nessun lead in trattativa" 
    },
    ISCRITTO: { 
      icon: <CheckCircle size={20} className="text-green-500" />, 
      hint: "Nessun lead iscritto" 
    },
    PERSO: { 
      icon: <XCircle size={20} className="text-red-400" />, 
      hint: "Nessun lead perso" 
    },
  };

  const currentStatusConfig = statusConfig[status] || { 
    icon: null, 
    hint: "Nessun lead" 
  };

  return (
    <section
      className="flex flex-col min-w-[280px] max-w-[320px] rounded-xl bg-gray-50"
      aria-label={`Colonna ${label}, ${leads.length} lead`}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${colorClasses[color]}`} aria-hidden="true" />
          <h3 className="font-semibold text-gray-800 text-sm" id={`column-${status}-title`}>{label}</h3>
          <span 
            className="ml-auto px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs font-medium"
            aria-label={`${leads.length} lead`}
          >
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-320px)]"
        role="list"
        aria-labelledby={`column-${status}-title`}
        aria-live="polite"
      >
        {leads.length > 0 ? (
          leads.map((lead) => (
            <div key={lead.id} role="listitem">
              <KanbanCard
                lead={lead}
                onClick={() => onLeadClick(lead)}
              />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-lg mx-1">
            <div className="mb-2">
              {currentStatusConfig.icon}
            </div>
            <p className="text-gray-400 text-xs text-center px-2">
              {currentStatusConfig.hint}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
