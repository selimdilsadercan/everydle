"use client";

import { ReactNode } from "react";
import { X, AlertTriangle, Info, CheckCircle, HelpCircle, Loader2 } from "lucide-react";

type ModalVariant = "danger" | "warning" | "info" | "success" | "question";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  isLoading?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<ModalVariant, {
  iconBg: string;
  iconColor: string;
  confirmBg: string;
  confirmHover: string;
  icon: ReactNode;
}> = {
  danger: {
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    confirmBg: "bg-red-600 hover:bg-red-500",
    confirmHover: "hover:bg-red-500",
    icon: <AlertTriangle className="w-8 h-8" />,
  },
  warning: {
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-400",
    confirmBg: "bg-yellow-600 hover:bg-yellow-500",
    confirmHover: "hover:bg-yellow-500",
    icon: <AlertTriangle className="w-8 h-8" />,
  },
  info: {
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    confirmBg: "bg-blue-600 hover:bg-blue-500",
    confirmHover: "hover:bg-blue-500",
    icon: <Info className="w-8 h-8" />,
  },
  success: {
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    confirmBg: "bg-emerald-600 hover:bg-emerald-500",
    confirmHover: "hover:bg-emerald-500",
    icon: <CheckCircle className="w-8 h-8" />,
  },
  question: {
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-400",
    confirmBg: "bg-purple-600 hover:bg-purple-500",
    confirmHover: "hover:bg-purple-500",
    icon: <HelpCircle className="w-8 h-8" />,
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Onayla",
  cancelText = "İptal",
  variant = "question",
  isLoading = false,
  icon,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const styles = variantStyles[variant];

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-999 flex items-center justify-center p-4"
      onClick={handleBackgroundClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Close Button */}
        {!isLoading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-700/50 transition-colors z-10"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        )}

        {/* Content */}
        <div className="p-6 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className={`w-16 h-16 rounded-full ${styles.iconBg} ${styles.iconColor} flex items-center justify-center`}>
              {icon || styles.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-2">{title}</h2>

          {/* Message */}
          <div className="text-slate-400 text-sm mb-6">{message}</div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBg}`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
