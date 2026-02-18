"use client";

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "My Shipment", href: "#shipment" },
  { label: "Contact Hub", href: "#contact" },
  { label: "About Hub", href: "#about" },
  { label: "FAQs", href: "#faqs" },
];

interface NavBarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function NavBar({ activeTab = "My Shipment", onTabChange }: NavBarProps) {
  return (
    <nav
      className="w-full"
      style={{
        backgroundColor: "#1a2332",
        borderBottom: "1px solid #2c3a52",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = activeTab === item.label;
            return (
              <button
                key={item.label}
                onClick={() => onTabChange?.(item.label)}
                className="relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0"
                style={{
                  color: isActive ? "#f97316" : "#94a3b8",
                }}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: "#f97316" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
