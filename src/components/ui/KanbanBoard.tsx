"use client";

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
  onLeadClick: (lead: Lead) => void;
}

const COLUMNS = [
  { status: "NUOVO", label: "Nuovo", color: "blue" },
  { status: "CONTATTATO", label: "Contattato", color: "yellow" },
  { status: "IN_TRATTATIVA", label: "In Trattativa", color: "purple" },
  { status: "ISCRITTO", label: "Iscritto", color: "green" },
  { status: "PERSO", label: "Perso", color: "red" },
];

export function KanbanBoard({ leads, onLeadClick }: KanbanBoardProps) {
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
          onLeadClick={onLeadClick}
        />
      ))}
    </div>
  );
}
