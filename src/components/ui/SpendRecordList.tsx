"use client";

import { Pencil, Trash2, Calendar, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpendRecord {
  id: string;
  campaignId: string;
  startDate: string;
  endDate: string | null;
  amount: number | string;
  notes: string | null;
  createdAt: string;
}

interface SpendRecordListProps {
  records: SpendRecord[];
  isLoading?: boolean;
  onEdit?: (record: SpendRecord) => void;
  onDelete?: (id: string) => void;
  readonly?: boolean;
  emptyStateText?: string;
}

export default function SpendRecordList({
  records,
  isLoading = false,
  onEdit,
  onDelete,
  readonly = false,
  emptyStateText = "Nessun record di spesa",
}: SpendRecordListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(num);
  };

  const totalSpent = records.reduce((sum, record) => {
    const amount = typeof record.amount === "string" ? parseFloat(record.amount) : record.amount;
    return sum + amount;
  }, 0);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText size={32} className="mx-auto mb-2 opacity-50" />
        <p>{emptyStateText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Records list */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3 font-medium">Periodo</th>
              <th className="text-right p-3 font-medium">Importo</th>
              <th className="text-left p-3 font-medium">Note</th>
              {!readonly && <th className="text-right p-3 font-medium w-24">Azioni</th>}
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr 
                key={record.id} 
                className={cn(
                  "border-t hover:bg-gray-50 transition",
                  index === 0 && "border-t-0"
                )}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar size={14} className="text-gray-400" />
                    <span>{formatDate(record.startDate)}</span>
                    {record.endDate && (
                      <>
                        <span className="text-gray-400">-</span>
                        <span>{formatDate(record.endDate)}</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right font-medium text-gray-900">
                  {formatCurrency(record.amount)}
                </td>
                <td className="p-3 text-gray-500 truncate max-w-[200px]">
                  {record.notes || "-"}
                </td>
                {!readonly && (
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(record)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500 hover:text-blue-600"
                          title="Modifica"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(record.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500 hover:text-red-600"
                          title="Elimina"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
        <span className="font-medium text-gray-700">Totale</span>
        <span className="font-semibold text-lg text-gray-900">{formatCurrency(totalSpent)}</span>
      </div>
    </div>
  );
}
