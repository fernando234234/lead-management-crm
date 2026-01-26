"use client";

import { useMemo } from "react";
import { User, BookOpen, Calendar, AlertTriangle } from "lucide-react";
import { Tooltip } from "./Tooltip";

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

interface KanbanCardProps {
  lead: Lead;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  staleDays?: number;
}

export function KanbanCard({
  lead,
  onClick,
  onDragStart,
  onDragEnd,
  staleDays = 7,
}: KanbanCardProps) {
  const daysInStatus = useMemo(() => {
    const createdDate = new Date(lead.createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [lead.createdAt]);

  const isStale = daysInStatus >= staleDays && lead.status !== "ISCRITTO" && lead.status !== "PERSO";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Lead: ${lead.name}${lead.isTarget ? ", Target" : ""}${lead.course ? `, Corso: ${lead.course.name}` : ""}${lead.assignedTo ? `, Assegnato a: ${lead.assignedTo.name}` : ", Non assegnato"}${isStale ? ", In attesa da troppo tempo" : ""}`}
      className={`
        bg-white rounded-lg border p-3 cursor-pointer
        hover:shadow-md transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isStale ? "border-orange-300 bg-orange-50/50" : "border-gray-200"}
      `}
    >
      {/* Header with name and target badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-gray-900 text-sm leading-tight truncate flex-1">
          {lead.name}
        </h4>
        {lead.isTarget && (
          <Tooltip content="Lead prioritario con alta probabilita di conversione" position="top">
            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded font-medium shrink-0 cursor-help">
              Target
            </span>
          </Tooltip>
        )}
      </div>

      {/* Course */}
      {lead.course && (
        <div className="flex items-center gap-1.5 text-xs text-gray-700 mb-2">
          <BookOpen size={12} className="text-gray-400 shrink-0" aria-hidden="true" />
          <span className="truncate">{lead.course.name}</span>
        </div>
      )}

      {/* Footer: assigned to + days */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        {/* Assigned to */}
        <div className="flex items-center gap-1.5">
          {lead.assignedTo ? (
            <>
              <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center" aria-hidden="true">
                <span className="text-[10px] font-medium text-gray-600">
                  {getInitials(lead.assignedTo.name)}
                </span>
              </div>
              <span className="text-xs text-gray-600 truncate max-w-[80px]">
                {lead.assignedTo.name.split(" ")[0]}
              </span>
            </>
          ) : (
            <div className="flex items-center gap-1 text-gray-500">
              <User size={12} aria-hidden="true" />
              <span className="text-xs">Non assegnato</span>
            </div>
          )}
        </div>

        {/* Days in status */}
        <div className={`flex items-center gap-1 text-xs ${isStale ? "text-orange-700" : "text-gray-500"}`}>
          {isStale && <AlertTriangle size={12} aria-hidden="true" />}
          <Calendar size={12} aria-hidden="true" />
          <span>{daysInStatus} {daysInStatus === 1 ? "giorno" : "giorni"}</span>
        </div>
      </div>
    </article>
  );
}
