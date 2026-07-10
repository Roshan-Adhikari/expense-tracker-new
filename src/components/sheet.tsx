"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-150"
        onClick={onClose}
      />
      <div className={`fixed bottom-0 left-0 right-0 z-50 bottom-sheet bg-card pb-safe max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 ${className ?? ""}`}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="px-5 pb-6">
          <div className="flex items-center justify-between mb-5 mt-2">
            <h3 className="text-lg font-bold">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
