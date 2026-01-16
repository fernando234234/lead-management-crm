"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import TaskList from "@/components/ui/TaskList";
import TaskModal from "@/components/ui/TaskModal";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  lead: {
    id: string;
    name: string;
    status: string;
  } | null;
}

interface Lead {
  id: string;
  name: string;
  status: string;
}

type FilterType = "all" | "overdue" | "today" | "completed";

const filterOptions: { value: FilterType; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "Tutte", icon: Clock },
  { value: "overdue", label: "Scadute", icon: AlertCircle },
  { value: "today", label: "Oggi", icon: Calendar },
  { value: "completed", label: "Completate", icon: CheckCircle },
];

// Demo tasks
const demoTasks: Task[] = [
  {
    id: "demo-1",
    title: "Richiamare Marco per preventivo",
    description: "Ha richiesto info sul corso di marketing",
    dueDate: new Date().toISOString(),
    completed: false,
    completedAt: null,
    priority: "HIGH",
    lead: { id: "lead-1", name: "Marco Rossi", status: "CONTATTATO" },
  },
  {
    id: "demo-2",
    title: "Inviare brochure a Laura",
    description: null,
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    completed: false,
    completedAt: null,
    priority: "MEDIUM",
    lead: { id: "lead-2", name: "Laura Bianchi", status: "IN_TRATTATIVA" },
  },
  {
    id: "demo-3",
    title: "Follow-up corso web design",
    description: "Verificare interesse dopo call di ieri",
    dueDate: new Date(Date.now() - 86400000).toISOString(),
    completed: false,
    completedAt: null,
    priority: "HIGH",
    lead: { id: "lead-3", name: "Giovanni Verdi", status: "CONTATTATO" },
  },
  {
    id: "demo-4",
    title: "Preparare offerta speciale",
    description: "Sconto 10% per iscrizione anticipata",
    dueDate: new Date(Date.now() + 172800000).toISOString(),
    completed: false,
    completedAt: null,
    priority: "LOW",
    lead: null,
  },
  {
    id: "demo-5",
    title: "Chiamata completata con successo",
    description: "Il lead ha confermato interesse",
    dueDate: new Date(Date.now() - 172800000).toISOString(),
    completed: true,
    completedAt: new Date(Date.now() - 86400000).toISOString(),
    priority: "MEDIUM",
    lead: { id: "lead-4", name: "Anna Neri", status: "ISCRITTO" },
  },
];

const demoLeads: Lead[] = [
  { id: "lead-1", name: "Marco Rossi", status: "CONTATTATO" },
  { id: "lead-2", name: "Laura Bianchi", status: "IN_TRATTATIVA" },
  { id: "lead-3", name: "Giovanni Verdi", status: "CONTATTATO" },
  { id: "lead-4", name: "Anna Neri", status: "ISCRITTO" },
  { id: "lead-5", name: "Paolo Gialli", status: "NUOVO" },
];

export default function TasksPage() {
  const { isDemoMode } = useDemoMode();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (isDemoMode) {
      let filteredTasks = [...demoTasks];
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      
      if (filter === "overdue") {
        filteredTasks = filteredTasks.filter(
          (t) => !t.completed && new Date(t.dueDate) < todayStart
        );
      } else if (filter === "today") {
        filteredTasks = filteredTasks.filter((t) => {
          const due = new Date(t.dueDate);
          return !t.completed && due >= todayStart && due <= todayEnd;
        });
      } else if (filter === "completed") {
        filteredTasks = filteredTasks.filter((t) => t.completed);
      }
      
      setTasks(filteredTasks);
      setLeads(demoLeads);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/tasks?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode, filter]);

  const fetchLeads = useCallback(async () => {
    if (isDemoMode) {
      setLeads(demoLeads);
      return;
    }

    try {
      const res = await fetch("/api/leads?assignedToId=current");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.map((l: Lead & { name: string }) => ({
          id: l.id,
          name: l.name,
          status: l.status,
        })));
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  }, [isDemoMode]);

  useEffect(() => {
    setIsLoading(true);
    fetchTasks();
    fetchLeads();
  }, [fetchTasks, fetchLeads]);

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    if (isDemoMode) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null }
            : t
        )
      );
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (res.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (isDemoMode) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      return;
    }

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleSaveTask = async (taskData: {
    title: string;
    description: string | null;
    dueDate: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    leadId: string | null;
  }) => {
    if (isDemoMode) {
      const newTask: Task = {
        id: `demo-${Date.now()}`,
        ...taskData,
        completed: false,
        completedAt: null,
        lead: taskData.leadId
          ? leads.find((l) => l.id === taskData.leadId) || null
          : null,
      };
      setTasks((prev) => [newTask, ...prev]);
      return;
    }

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });

    if (!res.ok) {
      throw new Error("Failed to create task");
    }

    await fetchTasks();
  };

  // Stats
  const stats = {
    total: tasks.filter((t) => !t.completed).length,
    overdue: tasks.filter(
      (t) =>
        !t.completed &&
        new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
    ).length,
    today: tasks.filter((t) => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const due = new Date(t.dueDate);
      return !t.completed && due >= todayStart && due <= todayEnd;
    }).length,
    completed: tasks.filter((t) => t.completed).length,
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promemoria</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gestisci i tuoi promemoria e follow-up
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-commercial text-white rounded-lg hover:bg-commercial/90 transition shadow-sm"
        >
          <Plus size={20} />
          Nuovo Promemoria
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Clock size={16} />
            Attivi
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-red-500 text-sm mb-1">
            <AlertCircle size={16} />
            Scaduti
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-blue-500 text-sm mb-1">
            <Calendar size={16} />
            Oggi
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-green-500 text-sm mb-1">
            <CheckCircle size={16} />
            Completati
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtra per:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition",
                  filter === option.value
                    ? "bg-commercial text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <Icon size={16} />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-lg border p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <TaskList
            tasks={tasks}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
            showGrouping={filter === "all"}
            onCreateTask={() => setIsModalOpen(true)}
          />
        )}
      </div>

      {/* Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        leads={leads}
      />

      {/* Demo Mode Indicator */}
      {isDemoMode && (
        <div className="fixed bottom-4 right-4 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg text-sm">
          Modalita Demo Attiva
        </div>
      )}
    </div>
  );
}
