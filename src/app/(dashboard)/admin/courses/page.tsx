"use client";

import { useState, useEffect } from "react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { mockCourses } from "@/lib/mockData";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, BookOpen, TestTube } from "lucide-react";
import Pagination from "@/components/ui/Pagination";

interface Course {
  id: string;
  name: string;
  description: string | null;
  price: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  _count: {
    leads: number;
    campaigns: number;
  };
}

export default function AdminCoursesPage() {
  const { isDemoMode } = useDemoMode();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    startDate: "",
    endDate: "",
    active: true,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Pagination calculations
  const totalPages = Math.ceil(courses.length / pageSize);
  const paginatedCourses = courses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    if (isDemoMode) {
      setCourses(mockCourses as Course[]);
      setLoading(false);
    } else {
      fetchCourses();
    }
  }, [isDemoMode]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      setCourses(data);
    } catch (error) {
      console.error("Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        name: course.name,
        description: course.description || "",
        price: String(course.price),
        startDate: course.startDate?.split("T")[0] || "",
        endDate: course.endDate?.split("T")[0] || "",
        active: course.active,
      });
    } else {
      setEditingCourse(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        startDate: "",
        endDate: "",
        active: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemoMode) {
      const newCourse: Course = {
        id: editingCourse?.id || String(Date.now()),
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        active: formData.active,
        _count: editingCourse?._count || { leads: 0, campaigns: 0 },
      };

      if (editingCourse) {
        setCourses(courses.map(c => c.id === editingCourse.id ? newCourse : c));
      } else {
        setCourses([newCourse, ...courses]);
      }
      setShowModal(false);
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      active: formData.active,
    };

    try {
      if (editingCourse) {
        await fetch(`/api/courses/${editingCourse.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      fetchCourses();
    } catch (error) {
      console.error("Failed to save course");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo corso?")) return;
    
    if (isDemoMode) {
      const course = courses.find(c => c.id === id);
      if (course && course._count.leads > 0) {
        toast.error("Impossibile eliminare: corso con lead associati");
        return;
      }
      setCourses(courses.filter(c => c.id !== id));
      return;
    }

    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Errore nell'eliminazione del corso");
        return;
      }
      toast.success("Corso eliminato");
      fetchCourses();
    } catch (error) {
      console.error("Failed to delete course");
    }
  };

  if (loading) {
    return <div className="p-8">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Corsi</h1>
          <p className="text-gray-500">Crea, modifica ed elimina i corsi disponibili</p>
        </div>
        <div className="flex items-center gap-3">
          {isDemoMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              <TestTube size={16} />
              Demo
            </div>
          )}
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-admin text-white rounded-lg hover:opacity-90 transition"
          >
            <Plus size={20} />
            Nuovo Corso
          </button>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="p-4 font-medium">Corso</th>
              <th className="p-4 font-medium">Prezzo</th>
              <th className="p-4 font-medium">Periodo</th>
              <th className="p-4 font-medium">Lead</th>
              <th className="p-4 font-medium">Campagne</th>
              <th className="p-4 font-medium">Stato</th>
              <th className="p-4 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCourses.map((course) => (
              <tr key={course.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-admin/10 rounded-lg">
                      <BookOpen size={20} className="text-admin" />
                    </div>
                    <div>
                      <p className="font-medium">{course.name}</p>
                      <p className="text-sm text-gray-500 truncate max-w-xs">
                        {course.description}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-medium">€{Number(course.price).toLocaleString()}</td>
                <td className="p-4 text-sm text-gray-500">
                  {course.startDate
                    ? new Date(course.startDate).toLocaleDateString("it-IT")
                    : "-"}
                </td>
                <td className="p-4">{course._count.leads}</td>
                <td className="p-4">{course._count.campaigns}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      course.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {course.active ? "Attivo" : "Inattivo"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(course)}
                      className="p-2 text-gray-500 hover:text-admin transition"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      className="p-2 text-gray-500 hover:text-red-600 transition"
                      disabled={course._count.leads > 0}
                      title={course._count.leads > 0 ? "Impossibile eliminare: corso con lead" : ""}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          totalItems={courses.length}
          showInfo={true}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingCourse ? "Modifica Corso" : "Nuovo Corso"}
              {isDemoMode && <span className="ml-2 text-sm font-normal text-purple-600">(Demo)</span>}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Corso *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:border-admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:border-admin"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prezzo (€) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:border-admin"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Inizio
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:border-admin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Fine
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-admin focus:border-admin"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-admin"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  Corso Attivo
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-admin text-white rounded-lg hover:opacity-90 transition"
                >
                  {editingCourse ? "Salva Modifiche" : "Crea Corso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
