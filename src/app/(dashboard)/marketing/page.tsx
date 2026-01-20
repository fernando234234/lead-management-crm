"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { StatCard } from "@/components/ui/StatCard";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";
import { Megaphone, Users, Euro, TrendingUp } from "lucide-react";
import { HelpIcon } from "@/components/ui/HelpIcon";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { marketingTourSteps } from "@/lib/tourSteps";
import toast from "react-hot-toast";

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget: number;
  totalSpent: number;
  leadCount: number;
  costPerLead: number;
  startDate?: string;
  createdAt?: string;
  course?: { id: string; name: string; price: number };
  createdBy?: { id: string; name: string };
  metrics?: {
    totalLeads: number;
    contactedLeads: number;
    enrolledLeads: number;
    costPerLead: string;
    conversionRate: string;
  };
}

const platformColors: Record<string, string> = {
  FACEBOOK: "bg-blue-100 text-blue-700",
  GOOGLE_ADS: "bg-red-100 text-red-700",
  LINKEDIN: "bg-sky-100 text-sky-700",
  INSTAGRAM: "bg-pink-100 text-pink-700",
  TIKTOK: "bg-gray-100 text-gray-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const platformLabels: Record<string, string> = {
  FACEBOOK: "Facebook",
  GOOGLE_ADS: "Google",
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  OTHER: "Altro",
};

const PLATFORM_CHART_COLORS: Record<string, string> = {
  FACEBOOK: "#1877f2",
  GOOGLE_ADS: "#ea4335",
  LINKEDIN: "#0077b5",
  INSTAGRAM: "#e4405f",
  TIKTOK: "#000000",
  OTHER: "#6b7280",
};

export default function MarketingDashboard() {
  const { data: session } = useSession();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchCampaigns();
    }
  }, [session?.user?.id]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns?createdById=${session?.user?.id}`);
      const data = await res.json();
      setCampaigns(data.campaigns || data || []);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      toast.error("Errore nel caricamento delle campagne");
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats dynamically
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");
  const totalLeads = campaigns.reduce((sum, c) => sum + (c.leadCount || 0), 0);
  const totalCost = campaigns.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const costPerLead = totalLeads > 0 ? totalCost / totalLeads : 0;

  // Calculate ROI (estimated based on enrolled leads and course prices)
  const totalRevenue = campaigns.reduce((sum, c) => {
    const enrolled = c.metrics?.enrolledLeads || 0;
    const price = c.course?.price || 0;
    return sum + (enrolled * price);
  }, 0);
  const profit = totalRevenue - totalCost;
  const roi = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(1) : "0";

  // Stats for costs breakdown
  const totalContacted = campaigns.reduce(
    (sum, c) => sum + (c.metrics?.contactedLeads || 0),
    0
  );
  const totalEnrolled = campaigns.reduce(
    (sum, c) => sum + (c.metrics?.enrolledLeads || 0),
    0
  );
  const costPerConsulenza = totalContacted > 0 ? totalCost / totalContacted : 0;
  const costPerContract = totalEnrolled > 0 ? totalCost / totalEnrolled : 0;

  // Platform spend distribution for pie chart
  const platformSpendData = useMemo(() => {
    const platforms = ["FACEBOOK", "GOOGLE_ADS", "LINKEDIN", "INSTAGRAM", "TIKTOK", "OTHER"];
    return platforms
      .map((platform) => {
        const platformCampaigns = campaigns.filter((c) => c.platform === platform);
        const totalSpent = platformCampaigns.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
        return {
          name: platformLabels[platform],
          value: totalSpent,
          platform,
        };
      })
      .filter((p) => p.value > 0);
  }, [campaigns]);

  // Campaign comparison for bar chart
  const campaignBarData = useMemo(() => {
    return activeCampaigns.slice(0, 6).map((c) => ({
      nome: c.name.length > 12 ? c.name.substring(0, 12) + "..." : c.name,
      lead: c.leadCount || 0,
    }));
  }, [activeCampaigns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-marketing/30 border-t-marketing rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Marketing</h1>
          <p className="text-gray-500">Campagne, costi e performance</p>
        </div>
      </div>

      {/* Onboarding Tour */}
      <OnboardingTour steps={marketingTourSteps} tourKey="marketing-dashboard" />

      {/* Stats Grid */}
      <div data-tour="stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Campagne Attive"
          value={activeCampaigns.length}
          icon={Megaphone}
        />
        <StatCard
          title="Lead Generati"
          value={totalLeads}
          icon={Users}
          subtitle="Totale"
        />
        <StatCard
          title="Spesa Totale"
          value={`€${totalCost.toLocaleString()}`}
          icon={Euro}
        />
        <StatCard
          title="Costo per Lead"
          value={`€${costPerLead.toFixed(2)}`}
          icon={TrendingUp}
        />
      </div>

      {/* Charts Section */}
      <div data-tour="campaigns-overview" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Spend Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-2">Distribuzione Spesa per Piattaforma</h2>
          <p className="text-sm text-gray-500 mb-4">Mostra come il budget e distribuito tra le diverse piattaforme pubblicitarie</p>
          {platformSpendData.length > 0 ? (
            <PieChart
              data={platformSpendData}
              nameKey="name"
              valueKey="value"
              colors={platformSpendData.map((p) => PLATFORM_CHART_COLORS[p.platform] || "#6b7280")}
              height={280}
              formatValue={(value) => `€${value.toLocaleString("it-IT")}`}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Nessun dato disponibile
            </div>
          )}
        </div>

        {/* Campaign Comparison */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-2">Confronto Campagne (Lead)</h2>
          <p className="text-sm text-gray-500 mb-4">Numero di lead generati per ciascuna campagna attiva</p>
          {campaignBarData.length > 0 ? (
            <BarChart
              data={campaignBarData}
              xKey="nome"
              yKey="lead"
              color="#10b981"
              height={280}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Nessuna campagna attiva
            </div>
          )}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Campagne Attive</h2>
          <p className="text-sm text-gray-500">Le tue campagne in corso</p>
        </div>
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="pb-3 font-medium">Campagna</th>
                <th className="pb-3 font-medium">Sorgente</th>
                <th className="pb-3 font-medium">Corso</th>
                <th className="pb-3 font-medium">Costo</th>
                <th className="pb-3 font-medium">Lead</th>
                <th className="pb-3 font-medium">Costo/Lead</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {activeCampaigns.length > 0 ? (
                activeCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b">
                    <td className="py-4 font-medium">{campaign.name}</td>
                    <td className="py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          platformColors[campaign.platform] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {platformLabels[campaign.platform] || campaign.platform}
                      </span>
                    </td>
                    <td className="py-4">{campaign.course?.name || "-"}</td>
                    <td className="py-4">€{(campaign.totalSpent || 0).toLocaleString()}</td>
                    <td className="py-4">{campaign.leadCount || 0}</td>
                    <td className="py-4">
                      €{campaign.leadCount > 0
                        ? ((campaign.totalSpent || 0) / campaign.leadCount).toFixed(2)
                        : "0.00"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Nessuna campagna attiva
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROI Summary */}
      <div data-tour="roi-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Ricavo vs Spesa</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Ricavo</span>
              <span className="font-semibold text-green-600">
                €{totalRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Spesa</span>
              <span className="font-semibold text-red-600">
                €{totalCost.toLocaleString()}
              </span>
            </div>
            <hr />
            <div className="flex justify-between">
              <span className="text-gray-500">Profitto</span>
              <span className={`font-bold ${profit >= 0 ? "text-gray-900" : "text-red-600"}`}>
                €{profit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Costi per Tipo</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Costo per Lead</span>
              <span className="font-semibold">€{costPerLead.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Costo per Consulenza</span>
              <span className="font-semibold">€{costPerConsulenza.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Costo per Contratto</span>
              <span className="font-semibold">€{costPerContract.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            ROI
            <HelpIcon text="Return on Investment: (Ricavi - Costi) / Costi × 100. Misura la redditivita delle campagne marketing." size="sm" />
          </h3>
          <div className="text-center py-4">
            <p className={`text-4xl font-bold ${Number(roi) >= 0 ? "text-marketing" : "text-red-600"}`}>
              {roi}%
            </p>
            <p className="text-gray-500 mt-2">Return on Investment</p>
          </div>
        </div>
      </div>
    </div>
  );
}
