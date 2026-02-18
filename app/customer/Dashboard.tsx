"use client";

import { useState } from "react";
import TopBar from "@/components/TopBar";
import NavBar from "@/components/NavBar";
import ShipmentCard from "@/components/ShipmentCard";
import NotificationsCard from "@/components/NotificationsCard";
import DeliveryOptions from "@/components/DeliveryOptions";
import BottomBar from "@/components/BottomBar";

const shipmentData = {
  estimatedDelivery: "Mon, 21 Feb 2024",
  receiver: "Kasun Kalhara",
  shippingNumber: "1Z662F412GS535527",
  numberOfPackages: 2,
  deliveryAddress: "37 Vishwa, Katuka, 800, Sri Lanka",
  currentDeliveryOption: "Collect from Parcel",
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("My Shipment");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#1a2332" }}
    >
      {/* Top bar with logo + logout */}
      <TopBar onLogout={() => alert("Logged out")} />

      {/* Navigation tabs */}
      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {activeTab === "My Shipment" && (
          <>
            {/* Top section: shipment + notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <ShipmentCard {...shipmentData} />
              <NotificationsCard />
            </div>

            {/* Delivery options */}
            <DeliveryOptions managementDeadline="25/02/2024 11:59 PM" />
          </>
        )}

        {activeTab === "Contact Hub" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: "#243044" }}
            >
              📞
            </div>
            <h2 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>
              Contact Hub
            </h2>
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Our support team is available 24/7.
            </p>
          </div>
        )}

        {activeTab === "About Hub" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: "#243044" }}
            >
              🏢
            </div>
            <h2 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>
              About Parcel Hub
            </h2>
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Leading parcel delivery in Sri Lanka since 2020.
            </p>
          </div>
        )}

        {activeTab === "FAQs" && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: "#243044" }}
            >
              ❓
            </div>
            <h2 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>
              Frequently Asked Questions
            </h2>
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Find answers to common questions.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <BottomBar />
    </div>
  );
}
