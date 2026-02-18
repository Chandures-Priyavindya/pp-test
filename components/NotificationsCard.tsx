"use client";

import { useState } from "react";
import { Bell, Info } from "lucide-react";

interface NotificationSetting {
  id: string;
  label: string;
  detail: string;
  enabled: boolean;
  isOptOut?: boolean;
}

const defaultSettings: NotificationSetting[] = [
  {
    id: "sms",
    label: "SMS Notification",
    detail: "*** *** **5 678",
    enabled: false,
  },
  {
    id: "email",
    label: "Email Notification",
    detail: "am*****@gmail.com",
    enabled: true,
  },
  {
    id: "whatsapp",
    label: "WhatsApp Notification",
    detail: "*** *** **5 678",
    enabled: false,
  },
  {
    id: "optout",
    label: "Opt out of receiving notifications",
    detail: "You will stop receiving shipment updates through SMS, Email, or WhatsApp",
    enabled: false,
    isOptOut: true,
  },
];

export default function NotificationsCard() {
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  return (
    <div
      className="rounded-2xl p-5 sm:p-6 fade-in-up fade-in-up-delay-1"
      style={{ backgroundColor: "#243044" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#f97316" }}
        >
          <Bell size={20} className="text-white" />
        </div>
        <div>
          <p className="text-xs font-medium" style={{ color: "#64748b" }}>
            Current Notification Selection{" "}
            <Info size={12} className="inline-block ml-0.5" style={{ color: "#64748b" }} />
          </p>
          <p className="text-base font-bold" style={{ color: "#f1f5f9" }}>
            SMS Notifications
          </p>
        </div>
      </div>

      {/* Settings List */}
      <div className="flex flex-col gap-4">
        {settings.map((setting) => (
          <div key={setting.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "#cbd5e1" }}>
                  {setting.label}
                </p>
                {!setting.isOptOut && (
                  <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                    {setting.detail}
                  </p>
                )}
                {setting.isOptOut && (
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#64748b" }}>
                    {setting.detail}
                  </p>
                )}
              </div>
              <label className="toggle-switch mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={setting.enabled}
                  onChange={() => toggleSetting(setting.id)}
                />
                <span className="toggle-slider" />
              </label>
            </div>
            {/* Divider except last */}
            {setting.id !== "optout" && (
              <div className="mt-4" style={{ borderBottom: "1px solid #2c3a52" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
