"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface LeaveInPlaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeaveInPlaceModal({ isOpen, onClose }: LeaveInPlaceModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop with heavy blur as seen in screenshots */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center px-8 pt-8 pb-4">
          <h3 className="text-xl font-bold text-slate-900">Leave in Place</h3>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="px-8 pb-8 space-y-6">
          {/* Address Card (Navy Blue Style) */}
          <div className="bg-[#1e293b] p-6 rounded-2xl">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
              Delivery Address
            </p>
            <p className="font-bold text-sm text-white leading-relaxed">
              37 Vishwa, Katukurunda, 800, Sri Lanka
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            <div>
              <label className="block text-base font-bold text-slate-800 mb-3">
                Where Should We Place Your Shipment?
              </label>
              <div className="relative">
                <select className="w-full appearance-none border border-slate-200 rounded-xl p-4 text-sm text-slate-600 bg-white outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer">
                  <option>Location *</option>
                  <option>Front Door</option>
                  <option>Back Door</option>
                  <option>With Neighbor</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>

            <div className="relative">
              <textarea
                placeholder="Enter Additional Information"
                className="w-full border border-slate-200 rounded-xl p-4 text-sm h-32 resize-none outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-700 placeholder:text-slate-400"
                maxLength={300}
              />
              <span className="absolute bottom-4 right-4 text-[11px] font-medium text-slate-400">0/300</span>
            </div>
          </div>

          {/* Checkbox with custom style */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 checked:bg-orange-500 checked:border-orange-500 transition-all" 
              />
              <svg className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
              Change Estimated Delivery Date
            </span>
          </label>

          {/* Info Notes */}
          <div className="space-y-3">
            {[
              "Shipment too large to fit in letterbox may be left at front door",
              "Delivery without signature is only permitted at the original shipment address. Instruction to redirect to a different address will be disregarded."
            ].map((text, idx) => (
              <div key={idx} className="flex gap-3 text-xs text-slate-500 leading-snug">
                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-slate-400">i</span>
                </div>
                <p>{text}</p>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button 
              onClick={onClose}
              className="bg-[#ff6b35] hover:bg-[#e85a20] text-white font-bold py-3.5 px-10 rounded-full transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-orange-200"
            >
              Done <span className="text-xl">›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}