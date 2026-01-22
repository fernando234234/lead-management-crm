"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, AlertTriangle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function ChangePasswordPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = "La password attuale è obbligatoria";
    }

    if (!formData.newPassword) {
      newErrors.newPassword = "La nuova password è obbligatoria";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "La password deve avere almeno 8 caratteri";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Conferma la nuova password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Le password non corrispondono";
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = "La nuova password deve essere diversa dalla password attuale";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Errore durante il cambio password");
        return;
      }

      toast.success("Password cambiata con successo!");
      
      // Update the session to reflect mustChangePassword = false
      await update();
      
      // Redirect based on role
      const role = session?.user?.role;
      if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "MARKETING") {
        router.push("/marketing");
      } else {
        router.push("/commercial");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Errore durante il cambio password");
    } finally {
      setLoading(false);
    }
  };

  const isFirstLogin = session?.user?.mustChangePassword;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-commercial/10 rounded-full mb-4">
            <Lock className="w-8 h-8 text-commercial" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isFirstLogin ? "Cambia la tua password" : "Modifica Password"}
          </h1>
          {isFirstLogin && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-700 text-left">
                Per motivi di sicurezza, devi cambiare la password al primo accesso.
              </p>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password Attuale
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) =>
                  setFormData({ ...formData, currentPassword: e.target.value })
                }
                className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial ${
                  errors.currentPassword ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Inserisci la password attuale"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nuova Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) =>
                  setFormData({ ...formData, newPassword: e.target.value })
                }
                className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial ${
                  errors.newPassword ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Almeno 8 caratteri"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>
            )}
            {formData.newPassword.length > 0 && formData.newPassword.length >= 8 && (
              <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                <CheckCircle size={14} />
                Password valida
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conferma Nuova Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className={`w-full px-4 py-2.5 pr-10 border rounded-lg focus:ring-2 focus:ring-commercial focus:border-commercial ${
                  errors.confirmPassword ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Ripeti la nuova password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
            {formData.confirmPassword.length > 0 &&
              formData.newPassword === formData.confirmPassword && (
                <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                  <CheckCircle size={14} />
                  Le password corrispondono
                </p>
              )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-commercial text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cambio in corso...
              </>
            ) : (
              <>
                <Lock size={18} />
                Cambia Password
              </>
            )}
          </button>
        </form>

        {/* Help text */}
        <p className="text-xs text-gray-500 text-center mt-6">
          Scegli una password sicura con almeno 8 caratteri.
          <br />
          Consigliamo di usare una combinazione di lettere, numeri e simboli.
        </p>
      </div>
    </div>
  );
}
