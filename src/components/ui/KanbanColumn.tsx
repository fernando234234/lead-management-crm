"use client";

import { useState } from "react";
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
}

interface KanbanColumnProps {
  status: string;
  label: string;
  leads: Lead[];
  color: string;
  onDrop: (leadId: string, newStatus: string) => void;
  onLeadClick: (lead: Lead) => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

export function KanbanColumn({
  status,
  label,
  leads,
  color,
  onDrop,
  onLeadClick,
  onDragStart,
  onDragEnd,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = e.dataTransfer.getData("text/plain");
    if (leadId) {
      onDrop(leadId, status);
    }
  };

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
    red: "bg-red-500",
  };

  const bgColorClasses: Record<string, string> = {
    blue: "bg-blue-50",
    yellow: "bg-yellow-50",
    purple: "bg-purple-50",
    green: "bg-green-50",
    red: "bg-red-50",
  };

  const statusConfig: Record<string, { icon: React.ReactNode; hint: string }> = {
    NUOVO: { 
      icon: <UserPlus size={20} className="text-blue-400" />, 
      hint: "Trascina qui per nuovi contatti" 
    },
    CONTATTATO: { 
      icon: <Phone size={20} className="text-yellow-500" />, 
      hint: "Trascina qui dopo il primo contatto" 
    },
    IN_TRATTATIVA: { 
      icon: <MessageSquare size={20} className="text-purple-500" />, 
      hint: "Trascina qui per lead in negoziazione" 
    },
    ISCRITTO: { 
      icon: <CheckCircle size={20} className="text-green-500" />, 
      hint: "Trascina qui i lead convertiti" 
    },
    PERSO: { 
      icon: <XCircle size={20} className="text-red-400" />, 
      hint: "Trascina qui i lead non interessati" 
    },
  };

  const currentStatusConfig = statusConfig[status] || { 
    icon: null, 
    hint: "Trascina qui un lead" 
  };

  return (
    <section
      className={`
        flex flex-col min-w-[280px] max-w-[320px] rounded-xl
        ${isDragOver ? bgColorClasses[color] : "bg-gray-50"}
        transition-colors duration-200
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
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
        className={`
          flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-320px)]
          ${isDragOver ? "ring-2 ring-inset ring-gray-300 rounded-b-xl" : ""}
        `}
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
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
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
