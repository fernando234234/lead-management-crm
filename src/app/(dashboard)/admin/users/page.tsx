"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, User, Shield, TrendingUp, Megaphone, Users } from "lucide-react";
import Pagination from "@/components/ui/Pagination";
import ExportButton from "@/components/ui/ExportButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Skeleton";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "COMMERCIAL" | "MARKETING";
  createdAt: string;
  _count: {
    assignedLeads: number;
  };
}

const roleConfig = {
  ADMIN: { label: "Admin", color: "bg-red-100 text-red-700", icon: Shield },
  COMMERCIAL: { label: "Commerciale", color: "bg-emerald-100 text-emerald-700", icon: TrendingUp },
  MARKETING: { label: "Marketing", color: "bg-orange-100 text-orange-700", icon: Megaphone },
};

// Export columns configuration
const userExportColumns = [
  { key: "name", label: "Nome" },
  { key: "email", label: "Email" },
  { key: "role", label: "Ruolo" },
  { key: "_count.assignedLeads", label: "Lead Assegnati" },
  { key: "createdAt", label: "Data Creazione" },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "COMMERCIAL" as "ADMIN" | "COMMERCIAL" | "MARKETING",
  });
  const [error, setError] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Pagination calculations
  const totalPages = Math.ceil(users.length / pageSize);
  const paginatedUsers = users.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user?: UserData) => {
    setError("");
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: "", // Don't show password
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "COMMERCIAL",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!editingUser && !formData.password) {
      setError("La password è obbligatoria per i nuovi utenti");
      return;
    }

    const payload: any = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      const res = editingUser
        ? await fetch(`/api/users/${editingUser.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Errore durante il salvataggio");
        return;
      }

      setShowModal(false);
      fetchUsers();
    } catch (error) {
      setError("Errore di connessione");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo utente?")) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error);
        return;
      }
      fetchUsers();
    } catch (error) {
      console.error("Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Utenti</h1>
          <p className="text-gray-500">Crea e gestisci account Commerciali e Marketing</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton
            data={users}
            columns={userExportColumns}
            filename="utenti_export"
          />
          <Button onClick={() => openModal()} leftIcon={<Plus size={18} />}>
            Nuovo Utente
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Admin"
          value={users.filter((u) => u.role === "ADMIN").length}
          icon={Shield}
          className="border-l-4 border-l-red-500"
        />
        <StatCard
          title="Commerciali"
          value={users.filter((u) => u.role === "COMMERCIAL").length}
          icon={TrendingUp}
          className="border-l-4 border-l-emerald-500"
        />
        <StatCard
          title="Marketing"
          value={users.filter((u) => u.role === "MARKETING").length}
          icon={Megaphone}
          className="border-l-4 border-l-orange-500"
        />
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nessun utente"
            description="Non ci sono utenti registrati nel sistema."
            actionLabel="Crea il primo utente"
            onAction={() => openModal()}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-enhanced w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b bg-gray-50/50">
                    <th className="p-4 font-medium">Utente</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Ruolo</th>
                    <th className="p-4 font-medium">Lead Assegnati</th>
                    <th className="p-4 font-medium">Creato il</th>
                    <th className="p-4 font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => {
                    const config = roleConfig[user.role];
                    const Icon = config.icon;
                    return (
                      <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-full">
                              <User size={20} className="text-gray-600" />
                            </div>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-600">{user.email}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                            <Icon size={14} />
                            {config.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-gray-100 rounded-full text-sm font-medium">
                            {user._count.assignedLeads}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString("it-IT")}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <button
                              onClick={() => openModal(user)}
                              className="p-2 text-gray-500 hover:text-admin hover:bg-red-50 rounded-lg transition-colors"
                              title="Modifica utente"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={user._count.assignedLeads > 0}
                              title={
                                user._count.assignedLeads > 0
                                  ? "Riassegna i lead prima di eliminare"
                                  : "Elimina utente"
                              }
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              totalItems={users.length}
              showInfo={true}
            />
          </>
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 rounded-lg">
                <User className="text-red-600" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? "Modifica Utente" : "Nuovo Utente"}
              </h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  placeholder="es. Mario Rossi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  placeholder="es. mario.rossi@azienda.it"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password {editingUser && <span className="text-gray-400 font-normal">(lascia vuoto per non modificare)</span>}
                  {!editingUser && " *"}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                  minLength={6}
                  placeholder="Minimo 6 caratteri"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ruolo *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as "ADMIN" | "COMMERCIAL" | "MARKETING",
                    })
                  }
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-colors"
                >
                  <option value="COMMERCIAL">Commerciale</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  fullWidth
                >
                  Annulla
                </Button>
                <Button type="submit" fullWidth>
                  {editingUser ? "Salva Modifiche" : "Crea Utente"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
