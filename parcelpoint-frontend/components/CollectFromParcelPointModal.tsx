"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface CollectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "SELECT" | "AUTHORIZE";

export default function CollectFromParcelPointModal({ isOpen, onClose }: CollectModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>("SELECT");
  const [name, setName] = useState("Hiru Amarajeewa");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset to first step when reopening
  useEffect(() => {
    if (isOpen) setStep("SELECT");
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const StepOne = (
    <div className="p-8">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Collect From Parcel Point</h3>

      {/* Select Dropdown with floating label design */}
      <div className="relative mb-4">
        <label className="absolute -top-2.5 left-4 bg-white px-1 text-[11px] text-orange-600 font-bold uppercase tracking-wide z-10">
          Select a Parcel Point *
        </label>
        <div className="flex items-center justify-between w-full border-2 border-slate-200 rounded-2xl p-4 text-slate-700 bg-white">
          <span className="font-medium">Galle Parcel Point</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      {/* Search Radius */}
      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mb-6 ml-1">
        <span>Search Radius</span>
        {[2, 3, 4, 5].map((km) => (
          <label key={km} className="flex items-center gap-2 cursor-pointer group">
            <input 
              type="radio" 
              name="radius" 
              defaultChecked={km === 2}
              className="w-4 h-4 accent-orange-500 border-slate-300" 
            />
            <span className="group-hover:text-slate-800 transition-colors">{km}km</span>
          </label>
        ))}
      </div>

      {/* Map and List Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Dark List Sidebar (Matches Sidebar Dark Blue) */}
        <div className="bg-[#1e293b] rounded-[24px] overflow-hidden flex flex-col h-[260px] shadow-inner">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {[1, 2].map((i) => (
              <div key={i} className="pb-4 border-b border-slate-700/50 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 bg-orange-500/20 flex items-center justify-center rounded-md">
                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm rotate-45" />
                  </div>
                  <span className="text-[12px] font-bold text-white tracking-tight">Sri Lanka Exprees - Parcel Point</span>
                </div>
                <p className="text-[10px] text-slate-400 ml-7 font-medium">Galle town hall Parcel Point</p>
                <div className="flex items-center gap-1.5 ml-7 mt-1.5 text-[10px] text-slate-300">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-orange-500"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                   <span>284/3 Mawatha, Galle... 2.3km</span>
                </div>
                <div className="flex justify-between items-center ml-7 mt-3">
                  <span className="text-[10px] text-blue-400 font-bold underline cursor-pointer hover:text-blue-300">Get Direction</span>
                  <span className="text-[10px] text-white font-bold flex items-center gap-1 cursor-pointer hover:bg-white/10 px-2 py-1 rounded-md transition-all">
                    Details <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="m9 18 6-6-6-6"/></svg>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Placeholder Map (Styled to match image) */}
        <div className="bg-slate-200 rounded-[24px] overflow-hidden relative border border-slate-100">
          <div className="absolute inset-0 bg-[#cbd5e1] opacity-50 flex items-center justify-center">
            <span className="text-slate-400 font-black text-xs uppercase tracking-[0.2em] -rotate-12 opacity-20">Map Integration Required</span>
          </div>
          <div className="absolute top-1/2 left-1/3 w-4 h-4 bg-red-500 rounded-full border-[3px] border-white shadow-xl animate-bounce" />
          <div className="absolute top-1/4 left-2/3 w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-lg" />
        </div>
      </div>

      {/* Footer Textarea */}
      <div className="relative mb-6">
        <textarea 
          className="w-full border-2 border-slate-100 rounded-[20px] p-5 text-sm h-32 outline-none focus:border-orange-400/50 focus:ring-4 focus:ring-orange-500/5 transition-all bg-slate-50/50 text-slate-400"
          placeholder="Enter Additional Information"
        />
        <span className="absolute bottom-4 right-5 text-[11px] font-bold text-slate-300">0/300</span>
      </div>

      <label className="flex items-center gap-3 mb-8 cursor-pointer group w-fit">
        <div className="relative flex items-center">
          <input type="checkbox" className="peer w-5 h-5 rounded-[6px] border-2 border-slate-200 appearance-none checked:bg-orange-500 checked:border-orange-500 transition-all cursor-pointer" />
          <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900">Change Estimated Delivery Date</span>
      </label>

      {/* Action Button - Orange Theme */}
     <button 
        onClick={() => setStep("AUTHORIZE")}
        className="w-full bg-[#ff6b35] hover:bg-[#e85a20] text-white font-bold py-3.5 px-10 rounded-full transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-orange-200"
        >
        Continue 
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
        </svg>
    </button>
    </div>
  );

  const StepTwo = (
    <div className="p-8">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Collect from Parcel Point</h3>

      {/* Review Header */}
      <div className="flex items-center gap-2 mb-5 text-slate-700 ml-1">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-orange-500"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
        <span className="text-base font-bold">Review and Authorize</span>
      </div>

      {/* Dark Info Card */}
      <div className="bg-[#1e293b] rounded-[24px] p-7 mb-8 text-white shadow-lg border border-white/5">
        <div className="mb-5">
          <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-2">Collection Location</p>
          <p className="text-base font-bold leading-tight">Galle, Mawatha 123/3, Galle, Sri Lanka</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mb-2">Estimated Delivery</p>
          <p className="text-base font-bold leading-tight text-orange-400">Fri, 29 Feb 2026</p>
        </div>
      </div>

      {/* Authorization Section */}
      <div className="flex items-center gap-2 mb-4 text-slate-800 ml-1">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-orange-500"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span className="text-sm font-black uppercase tracking-tight">Authorize this Delivery Changes</span>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border-2 border-slate-100 rounded-[18px] p-5 text-slate-700 mb-6 font-bold focus:border-orange-400/50 focus:ring-4 focus:ring-orange-500/5 transition-all outline-none"
        placeholder="Full Name"
      />

      <label className="flex items-start gap-4 cursor-pointer mb-10 px-1 group">
        <div className="relative flex items-center mt-0.5">
          <input type="checkbox" defaultChecked className="peer w-5 h-5 rounded-[6px] border-2 border-slate-200 appearance-none checked:bg-orange-500 checked:border-orange-500 transition-all cursor-pointer" />
          <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span className="text-[12px] text-slate-500 font-medium leading-relaxed group-hover:text-slate-800 transition-colors">
          I accept UPS's <span className="text-blue-600 font-bold underline">Terms and Conditions</span> and <span className="text-blue-600 font-bold underline">Privacy Notice</span>, and release UPS from liability for any loss or damage.
        </span>
      </label>

      {/* Step Two Buttons */}
     <div className="flex gap-4">
        {/* Previous Button (Already centered) */}
        <button 
            onClick={() => setStep("SELECT")}
            className="flex-1 border-2 border-slate-100 text-slate-500 font-black py-4 rounded-full hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-1 active:scale-95"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="m15 18-6-6 6-6"/></svg> 
            Previous
        </button>

        {/* Done Button (Added justify-center) */}
        <button 
            className="flex-[1.5] bg-[#ff6b35] hover:bg-[#e85a20] text-white font-bold py-3.5 px-10 rounded-full transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-orange-200"
        >
            Done 
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
            </svg>
        </button>
        </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative bg-white rounded-[40px] w-full max-w-[660px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute right-8 top-8 text-slate-300 hover:text-slate-600 transition-colors z-20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {step === "SELECT" ? StepOne : StepTwo}
      </div>
    </div>,
    document.body
  );
}