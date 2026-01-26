"use client";

import { useState } from "react";
import { KanbanColumn } from "./KanbanColumn";

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

interface KanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: string) => void;
  onLeadClick: (lead: Lead) => void;
}

const COLUMNS = [
  { status: "NUOVO", label: "Nuovo", color: "blue" },
  { status: "CONTATTATO", label: "Contattato", color: "yellow" },
  { status: "IN_TRATTATIVA", label: "In Trattativa", color: "purple" },
  { status: "ISCRITTO", label: "Iscritto", color: "green" },
  { status: "PERSO", label: "Perso", color: "red" },
];

export function KanbanBoard({ leads, onStatusChange, onLeadClick }: KanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
    
    // Add a slight delay to allow the drag image to be captured
    const target = e.target as HTMLElement;
    setTimeout(() => {
      target.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLeadId(null);
    const target = e.target as HTMLElement;
    target.style.opacity = "1";
  };

  const handleDrop = (leadId: string, newStatus: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.status !== newStatus) {
      onStatusChange(leadId, newStatus);
    }
  };

  const getLeadsByStatus = (status: string) => {
    return leads.filter((lead) => lead.status === status);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((column) => (
        <KanbanColumn
          key={column.status}
          status={column.status}
          label={column.label}
          leads={getLeadsByStatus(column.status)}
          color={column.color}
          onDrop={handleDrop}
          onLeadClick={onLeadClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}
