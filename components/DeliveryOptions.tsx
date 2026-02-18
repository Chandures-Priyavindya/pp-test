"use client";

interface DeliveryOption {
  id: string;
  label: string;
  emoji: string;
}

const deliveryOptions: DeliveryOption[] = [
  { id: "parcelpoint", label: "Collect from ParcelPoint", emoji: "🏠" },
  { id: "change-date", label: "Change Delivery Date", emoji: "👍" },
  { id: "leave-place", label: "Leave in Place", emoji: "📦" },
  { id: "trusted-person", label: "Leave with Trusted Person", emoji: "🏡" },
  { id: "alternate", label: "Alternate Address", emoji: "😊" },
  { id: "hold", label: "Hold For Collectionn", emoji: "📦" },
];

interface DeliveryOptionsProps {
  managementDeadline?: string;
  onOptionSelect?: (optionId: string) => void;
}

export default function DeliveryOptions({
  managementDeadline = "[DD/MM/YYYY Time]",
  onOptionSelect,
}: DeliveryOptionsProps) {
  return (
    <section className="fade-in-up fade-in-up-delay-2">
      <h2 className="text-lg font-bold mb-1" style={{ color: "#f1f5f9" }}>
        Manage Your Delivery Options
      </h2>
      <div className="flex items-center gap-2 mb-5">
        <div
          className="h-0.5 w-10 rounded-full"
          style={{ backgroundColor: "#f97316" }}
        />
        <p className="text-xs" style={{ color: "#94a3b8" }}>
          You can manage your delivery preferences until{" "}
          <span style={{ color: "#cbd5e1" }}>{managementDeadline}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {deliveryOptions.map((option) => (
          <DeliveryOptionButton
            key={option.id}
            option={option}
            onSelect={() => onOptionSelect?.(option.id)}
          />
        ))}
      </div>
    </section>
  );
}

function DeliveryOptionButton({
  option,
  onSelect,
}: {
  option: DeliveryOption;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-medium text-left transition-all duration-200 group active:scale-95"
      style={{
        backgroundColor: "#243044",
        color: "#cbd5e1",
        border: "1px solid #2c3a52",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#2c3a52";
        e.currentTarget.style.borderColor = "#f97316";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#243044";
        e.currentTarget.style.borderColor = "#2c3a52";
      }}
    >
      <span>{option.label}</span>
      <span
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ml-2 text-base"
        style={{ backgroundColor: "#f97316" }}
      >
        {option.emoji}
      </span>
    </button>
  );
}
