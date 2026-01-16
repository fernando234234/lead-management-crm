"use client";

import { useState, useEffect } from "react";
import { useDemoMode } from "@/contexts/DemoModeContext";
import { mockCourses, mockCampaigns, mockUsers } from "@/lib/mockData";
import { Settings, Database, TestTube, Info, Check, UserPlus } from "lucide-react";
import AssignmentRules from "@/components/ui/AssignmentRules";

interface Course {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
}

interface Commercial {
  id: string;
  name: string;
}

export default function AdminSettingsPage() {
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const [courses, setCourses] = useState<Course[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      setCourses(mockCourses.map(c => ({ id: c.id, name: c.name })));
      setCampaigns(mockCampaigns.map(c => ({ id: c.id, name: c.name })));
      setCommercials(mockUsers.filter(u => u.role === "COMMERCIAL").map(u => ({ id: u.id, name: u.name })));
      setLoading(false);
    } else {
      fetchData();
    }
  }, [isDemoMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, campaignsRes, usersRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/campaigns"),
        fetch("/api/users"),
      ]);
      
      const [coursesData, campaignsData, usersData] = await Promise.all([
        coursesRes.json(),
        campaignsRes.json(),
        usersRes.json(),
      ]);

      setCourses(coursesData.map((c: Course) => ({ id: c.id, name: c.name })));
      setCampaigns(campaignsData.map((c: Campaign) => ({ id: c.id, name: c.name })));
      setCommercials(
        usersData
          .filter((u: { role: string }) => u.role === "COMMERCIAL")
          .map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }))
      );
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
        <p className="text-gray-500">Configura le preferenze del sistema</p>
      </div>

      {/* Assignment Rules Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Regole di Assegnazione</h2>
              <p className="text-sm text-gray-600">
                Configura l&apos;assegnazione automatica dei lead ai commerciali
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Caricamento...
            </div>
          ) : (
            <AssignmentRules
              commercials={commercials}
              campaigns={campaigns}
              courses={courses}
            />
          )}
        </div>
      </div>

      {/* Demo Mode Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <TestTube className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Modalità Demo</h2>
              <p className="text-sm text-gray-600">
                Attiva per mostrare dati di esempio durante le presentazioni
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${isDemoMode ? "bg-purple-100" : "bg-gray-100"}`}>
                {isDemoMode ? (
                  <TestTube className="w-6 h-6 text-purple-600" />
                ) : (
                  <Database className="w-6 h-6 text-gray-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {isDemoMode ? "Dati Demo Attivi" : "Dati Reali Attivi"}
                </p>
                <p className="text-sm text-gray-500">
                  {isDemoMode
                    ? "Stai visualizzando dati di esempio per showcase"
                    : "Stai visualizzando dati reali da Supabase"}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={toggleDemoMode}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                isDemoMode ? "bg-purple-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                  isDemoMode ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Info Box */}
          <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
            isDemoMode ? "bg-purple-50 border border-purple-200" : "bg-blue-50 border border-blue-200"
          }`}>
            <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDemoMode ? "text-purple-600" : "text-blue-600"}`} />
            <div className="text-sm">
              {isDemoMode ? (
                <>
                  <p className="font-medium text-purple-900 mb-1">Modalità Demo Attiva</p>
                  <ul className="text-purple-700 space-y-1">
                    <li className="flex items-center gap-2">
                      <Check size={14} /> Dashboard mostra statistiche di esempio
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} /> Lead, Corsi e Campagne sono dati fittizi
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} /> Ideale per presentazioni e demo
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} /> Le modifiche non vengono salvate nel database
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="font-medium text-blue-900 mb-1">Dati Reali da Supabase</p>
                  <ul className="text-blue-700 space-y-1">
                    <li className="flex items-center gap-2">
                      <Check size={14} /> Connesso al database Supabase
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} /> Tutte le modifiche vengono salvate
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} /> Dati aggiornati in tempo reale
                    </li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Other Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Altre Impostazioni</h2>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-500 text-sm">
            Altre configurazioni saranno disponibili in futuro.
          </p>
        </div>
      </div>

      {/* Database Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Informazioni Database</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Provider</p>
              <p className="font-medium">Supabase (PostgreSQL)</p>
            </div>
            <div>
              <p className="text-gray-500">Regione</p>
              <p className="font-medium">EU West (Ireland)</p>
            </div>
            <div>
              <p className="text-gray-500">ORM</p>
              <p className="font-medium">Prisma</p>
            </div>
            <div>
              <p className="text-gray-500">Stato</p>
              <p className="font-medium text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Connesso
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
