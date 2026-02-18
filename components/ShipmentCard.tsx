"use client";

import { Copy, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ShipmentCardProps {
  estimatedDelivery: string;
  receiver: string;
  shippingNumber: string;
  numberOfPackages: number;
  deliveryAddress: string;
  currentDeliveryOption: string;
}

export default function ShipmentCard({
  estimatedDelivery,
  receiver,
  shippingNumber,
  numberOfPackages,
  deliveryAddress,
  currentDeliveryOption,
}: ShipmentCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shippingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="rounded-2xl p-5 sm:p-6 fade-in-up"
      style={{ backgroundColor: "#243044" }}
    >
      {/* Grid layout: 2 columns on desktop, 1 on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
        {/* Estimated Delivery */}
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>
            Estimated Delivery
          </p>
          <p className="text-lg font-bold" style={{ color: "#f1f5f9" }}>
            {estimatedDelivery}
          </p>
        </div>

        {/* Receiver */}
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>
            Receiver
          </p>
          <p className="text-lg font-bold" style={{ color: "#f1f5f9" }}>
            {receiver}
          </p>
        </div>

        {/* Shipping Number */}
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>
            Shipping Number
          </p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
              {shippingNumber}
            </p>
            <button
              onClick={handleCopy}
              className="p-1 rounded transition-all duration-200 hover:opacity-70"
              title="Copy shipping number"
            >
              <Copy size={14} style={{ color: copied ? "#22c55e" : "#94a3b8" }} />
            </button>
          </div>
        </div>

        {/* Number of Packages */}
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>
            Number of Packages
          </p>
          <p className="text-sm font-semibold" style={{ color: "#f1f5f9" }}>
            {numberOfPackages}
          </p>
        </div>

        {/* Delivery Address */}
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>
            Delivery Address
          </p>
          <p className="text-sm font-semibold leading-snug" style={{ color: "#f1f5f9" }}>
            {deliveryAddress}
          </p>
        </div>

        {/* Current Delivery Option */}
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>
            Current Delivery Option
          </p>
          <p className="text-sm font-bold" style={{ color: "#f97316" }}>
            {currentDeliveryOption}
          </p>
          <button
            className="text-xs mt-0.5 font-medium hover:opacity-70 transition-opacity"
            style={{ color: "#f97316" }}
          >
            See More
          </button>
        </div>
      </div>

      {/* Tracking Button */}
      <button
        className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
        style={{
          backgroundColor: "#f97316",
          color: "#ffffff",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#ea6c0a")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f97316")}
      >
        Tracking Info
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
