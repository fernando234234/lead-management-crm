"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Calendar,
  User,
  Loader2,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/ui/EmptyState";

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

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (taskId: string, completed: boolean) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  showGrouping?: boolean;
  isLoading?: boolean;
  onCreateTask?: () => void;
}

const priorityColors = {
  HIGH: "text-red-500",
  MEDIUM: "text-yellow-500",
  LOW: "text-green-500",
};

const priorityBgColors = {
  HIGH: "bg-red-50 border-red-200",
  MEDIUM: "bg-yellow-50 border-yellow-200",
  LOW: "bg-green-50 border-green-200",
};

const priorityLabels = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Bassa",
};

function getTaskGroup(dueDate: string, completed: boolean): string {
  if (completed) return "Completati";
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  
  const due = new Date(dueDate);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  
  if (dueDay < today) return "Scaduti";
  if (dueDay.getTime() === today.getTime()) return "Oggi";
  if (dueDay.getTime() === tomorrow.getTime()) return "Domani";
  if (dueDay < weekEnd) return "Questa Settimana";
  return "Prossimamente";
}

function groupTasks(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {
    "Scaduti": [],
    "Oggi": [],
    "Domani": [],
    "Questa Settimana": [],
    "Prossimamente": [],
    "Completati": [],
  };
  
  tasks.forEach((task) => {
    const group = getTaskGroup(task.dueDate, task.completed);
    if (groups[group]) {
      groups[group].push(task);
    }
  });
  
  return groups;
}

function TaskItem({
  task,
  onToggleComplete,
  onDelete,
}: {
  task: Task;
  onToggleComplete: (taskId: string, completed: boolean) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
}) {
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggleComplete(task.id, !task.completed);
    } finally {
      setIsToggling(false);
    }
  };
  
  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm("Sei sicuro di voler eliminare questo promemoria?")) return;
    
    setIsDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const isOverdue = !task.completed && new Date(task.dueDate) < new Date();
  
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border transition-all",
        task.completed
          ? "bg-gray-50 border-gray-200 opacity-60"
          : priorityBgColors[task.priority],
        isOverdue && !task.completed && "border-red-300 bg-red-50"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        disabled={isToggling}
        className="mt-0.5 flex-shrink-0"
      >
        {isToggling ? (
          <Loader2 size={20} className="animate-spin text-gray-400" />
        ) : task.completed ? (
          <CheckCircle size={20} className="text-green-500" />
        ) : (
          <Circle size={20} className={priorityColors[task.priority]} />
        )}
      </button>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium text-gray-900",
            task.completed && "line-through text-gray-500"
          )}
        >
          {task.title}
        </p>
        
        {task.description && (
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
          {/* Due Date */}
          <span className={cn("flex items-center gap-1", isOverdue && "text-red-600 font-medium")}>
            {isOverdue ? <AlertCircle size={12} /> : <Calendar size={12} />}
            {new Date(task.dueDate).toLocaleDateString("it-IT", {
              day: "numeric",
              month: "short",
              year: new Date(task.dueDate).getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
            })}
          </span>
          
          {/* Priority */}
          <span className={cn("flex items-center gap-1", priorityColors[task.priority])}>
            <Clock size={12} />
            {priorityLabels[task.priority]}
          </span>
          
          {/* Linked Lead */}
          {task.lead && (
            <Link
              href={`/commercial/leads?selected=${task.lead.id}`}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition"
            >
              <User size={12} />
              {task.lead.name}
            </Link>
          )}
        </div>
      </div>
      
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
          title="Elimina promemoria"
        >
          {isDeleting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
        </button>
      )}
    </div>
  );
}

export default function TaskList({
  tasks,
  onToggleComplete,
  onDelete,
  showGrouping = true,
  isLoading = false,
  onCreateTask,
}: TaskListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Nessun promemoria"
        description="Crea un promemoria per non dimenticare di seguire i tuoi lead."
        actionLabel={onCreateTask ? "Nuovo Promemoria" : undefined}
        onAction={onCreateTask}
        accentColor="commercial"
      />
    );
  }
  
  if (!showGrouping) {
    return (
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }
  
  const groups = groupTasks(tasks);
  const groupOrder = ["Scaduti", "Oggi", "Domani", "Questa Settimana", "Prossimamente", "Completati"];
  
  return (
    <div className="space-y-6">
      {groupOrder.map((groupName) => {
        const groupTasks = groups[groupName];
        if (!groupTasks || groupTasks.length === 0) return null;
        
        return (
          <div key={groupName}>
            <h3
              className={cn(
                "text-sm font-semibold mb-3 flex items-center gap-2",
                groupName === "Scaduti" && "text-red-600",
                groupName === "Oggi" && "text-blue-600",
                groupName === "Completati" && "text-gray-500"
              )}
            >
              {groupName === "Scaduti" && <AlertCircle size={16} />}
              {groupName}
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-normal">
                {groupTasks.length}
              </span>
            </h3>
            <div className="space-y-3">
              {groupTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
