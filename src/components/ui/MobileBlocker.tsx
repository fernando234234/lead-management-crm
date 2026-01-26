"use client";

import { Monitor, Smartphone } from "lucide-react";

interface MobileBlockerProps {
  role: "commercial" | "marketing";
}

const roleConfig = {
  commercial: {
    title: "Area Commerciale",
    color: "from-blue-600 to-blue-700",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
  },
  marketing: {
    title: "Area Marketing", 
    color: "from-emerald-600 to-emerald-700",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
  },
};

export function MobileBlocker({ role }: MobileBlockerProps) {
  const config = roleConfig[role];

  return (
    <div className="md:hidden fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-10`} />
      
      {/* Content */}
      <div className="relative z-10 max-w-sm">
        {/* Icon */}
        <div className={`mx-auto w-20 h-20 ${config.iconBg} rounded-2xl flex items-center justify-center mb-6`}>
          <Monitor size={40} className={config.iconColor} />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Accesso Desktop Richiesto
        </h1>

        {/* Description */}
        <p className="text-gray-400 mb-8 leading-relaxed">
          L&apos;{config.title} del CRM richiede uno schermo pi&ugrave; grande per funzionare correttamente.
        </p>

        {/* Visual hint */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-2">
              <Smartphone size={24} className="text-red-400" />
            </div>
            <span className="text-xs text-red-400">Mobile</span>
          </div>
          
          <div className="text-gray-600 text-2xl">→</div>
          
          <div className="flex flex-col items-center">
            <div className={`w-12 h-12 ${config.iconBg} rounded-xl flex items-center justify-center mb-2`}>
              <Monitor size={24} className={config.iconColor} />
            </div>
            <span className={`text-xs ${config.iconColor}`}>Desktop</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-sm text-gray-300">
            Per favore, accedi da un computer desktop o laptop per utilizzare tutte le funzionalit&agrave;.
          </p>
        </div>
      </div>

      {/* Footer branding */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-1 h-5 bg-red-500 rounded-full" />
          <span className="text-sm text-gray-500">Job Formazione CRM</span>
        </div>
      </div>
    </div>
  );
}
