"use client";

import { useState, useEffect } from "react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { mockCourses, mockLeads } from "@/lib/mockData";
import { BookOpen, Calendar, Users, TestTube, Euro } from "lucide-react";
import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

interface Course {
  id: string;
  name: string;
  description: string | null;
  price: number;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  _count?: {
    leads: number;
    campaigns: number;
  };
}

interface Lead {
  id: string;
  course: { id: string } | null;
  assignedTo: { id: string } | null;
}

export default function CommercialCoursesPage() {
  const { isDemoMode } = useDemoMode();
  const [courses, setCourses] = useState<Course[]>([]);
  const [myLeadCounts, setMyLeadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Demo user ID (simulating a commercial user)
  const demoUserId = "1"; // Marco Verdi in mockData

  useEffect(() => {
    if (isDemoMode) {
      setCourses(mockCourses as Course[]);

      // Calculate my lead count per course
      const counts: Record<string, number> = {};
      mockLeads
        .filter((lead) => lead.assignedTo?.id === demoUserId)
        .forEach((lead) => {
          if (lead.course?.id) {
            counts[lead.course.id] = (counts[lead.course.id] || 0) + 1;
          }
        });
      setMyLeadCounts(counts);
      setLoading(false);
    } else {
      fetchData();
    }
  }, [isDemoMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, leadsRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/leads?assignedToMe=true"),
      ]);

      const [coursesData, leadsData] = await Promise.all([
        coursesRes.json(),
        leadsRes.json(),
      ]);

      setCourses(coursesData);

      // Calculate my lead count per course
      const counts: Record<string, number> = {};
      leadsData.forEach((lead: Lead) => {
        if (lead.course?.id) {
          counts[lead.course.id] = (counts[lead.course.id] || 0) + 1;
        }
      });
      setMyLeadCounts(counts);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate && !endDate) return "Date non definite";
    if (startDate && !endDate) return `Dal ${formatDate(startDate)}`;
    if (!startDate && endDate) return `Fino al ${formatDate(endDate)}`;
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Corsi Disponibili</h1>
          <p className="text-gray-500">
            Visualizza i corsi e i tuoi lead per ciascun corso
          </p>
        </div>
        {isDemoMode && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            <TestTube size={16} />
            Demo
          </div>
        )}
      </div>

      {/* Courses Table */}
      <Card className="overflow-hidden">
        {courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nessun corso disponibile"
            description="Non ci sono corsi attivi in questo momento."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-enhanced w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b bg-gray-50/50">
                  <th className="p-4 font-medium">Corso</th>
                  <th className="p-4 font-medium">Descrizione</th>
                  <th className="p-4 font-medium">Prezzo</th>
                  <th className="p-4 font-medium">Periodo</th>
                  <th className="p-4 font-medium">I Miei Lead</th>
                  <th className="p-4 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <BookOpen size={20} className="text-emerald-600" />
                        </div>
                        <p className="font-medium">{course.name}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-500 max-w-xs truncate">
                        {course.description || "-"}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Euro size={16} className="text-gray-400" />
                        <span className="font-medium">
                          {Number(course.price).toLocaleString("it-IT")}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={16} className="text-gray-400" />
                        {getDateRange(course.startDate, course.endDate)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${
                            myLeadCounts[course.id]
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <Users size={14} />
                          {myLeadCounts[course.id] || 0}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          course.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {course.active ? "Attivo" : "Inattivo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Course Cards Summary */}
      {courses.filter((course) => course.active && myLeadCounts[course.id] > 0).length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900">I Tuoi Corsi con Lead</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses
              .filter((course) => course.active && myLeadCounts[course.id] > 0)
              .map((course) => (
                <Card
                  key={course.id}
                  variant="elevated"
                  hover
                  className="p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <BookOpen size={24} className="text-emerald-600" />
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Attivo
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{course.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {course.description}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Euro size={16} />
                      <span className="font-medium">
                        {Number(course.price).toLocaleString("it-IT")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Users size={16} />
                      <span className="font-medium">{myLeadCounts[course.id]} lead</span>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}

      {courses.filter((course) => course.active && myLeadCounts[course.id] > 0).length === 0 && (
        <Card className="p-8">
          <EmptyState
            icon={Users}
            title="Nessun lead assegnato"
            description="Non hai ancora lead assegnati per i corsi attivi. Controlla la sezione Lead per vedere le nuove assegnazioni."
          />
        </Card>
      )}
    </div>
  );
}
