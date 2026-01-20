"use client";

import { useState, useEffect } from "react";
import { useDataFilter } from "@/contexts/DataFilterContext";
import { Settings, Database, Info, Check, UserPlus, Filter, Archive, Plus, Layers } from "lucide-react";
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
  const { dataSource, setDataSource } = useDataFilter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

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

      {/* Data Source Filter Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Filter className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Filtro Dati</h2>
              <p className="text-sm text-gray-600">
                Scegli quali dati visualizzare in tutta l&apos;applicazione
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {/* Option: All Data */}
            <label 
              className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                dataSource === "all" 
                  ? "border-amber-500 bg-amber-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="dataSource"
                value="all"
                checked={dataSource === "all"}
                onChange={() => setDataSource("all")}
                className="sr-only"
              />
              <div className={`p-2 rounded-lg ${dataSource === "all" ? "bg-amber-100" : "bg-gray-100"}`}>
                <Layers className={`w-5 h-5 ${dataSource === "all" ? "text-amber-600" : "text-gray-500"}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Tutti i Dati</p>
                <p className="text-sm text-gray-500">Mostra sia i dati importati che quelli nuovi</p>
              </div>
              {dataSource === "all" && (
                <Check className="w-5 h-5 text-amber-600" />
              )}
            </label>

            {/* Option: Legacy Only */}
            <label 
              className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                dataSource === "legacy" 
                  ? "border-amber-500 bg-amber-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="dataSource"
                value="legacy"
                checked={dataSource === "legacy"}
                onChange={() => setDataSource("legacy")}
                className="sr-only"
              />
              <div className={`p-2 rounded-lg ${dataSource === "legacy" ? "bg-amber-100" : "bg-gray-100"}`}>
                <Archive className={`w-5 h-5 ${dataSource === "legacy" ? "text-amber-600" : "text-gray-500"}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Solo Dati Legacy</p>
                <p className="text-sm text-gray-500">Mostra solo i dati importati da Excel</p>
              </div>
              {dataSource === "legacy" && (
                <Check className="w-5 h-5 text-amber-600" />
              )}
            </label>

            {/* Option: New Only */}
            <label 
              className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                dataSource === "new" 
                  ? "border-amber-500 bg-amber-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="dataSource"
                value="new"
                checked={dataSource === "new"}
                onChange={() => setDataSource("new")}
                className="sr-only"
              />
              <div className={`p-2 rounded-lg ${dataSource === "new" ? "bg-amber-100" : "bg-gray-100"}`}>
                <Plus className={`w-5 h-5 ${dataSource === "new" ? "text-amber-600" : "text-gray-500"}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Solo Dati Nuovi</p>
                <p className="text-sm text-gray-500">Mostra solo i lead creati manualmente o da campagne</p>
              </div>
              {dataSource === "new" && (
                <Check className="w-5 h-5 text-amber-600" />
              )}
            </label>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-medium text-amber-900 mb-1">Filtro Globale</p>
                <p className="text-amber-700">
                  Questa impostazione filtra i dati in tutte le dashboard, report e statistiche dell&apos;applicazione.
                </p>
              </div>
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
