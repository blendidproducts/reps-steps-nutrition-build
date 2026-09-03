import React, { memo } from "react";
import { Home, Calendar, Apple, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Exercises and History moved to the hamburger (☰) menu in Layout.jsx.
// The centre slot is AiRTP — an ACTION, not a tab (no selected state).
const TABS_LEFT = [
  { tab: "Home",           Icon: Home,     label: "Home" },
  { tab: "PresetPrograms", Icon: Calendar, label: "Programs" },
];
const TABS_RIGHT = [
  { tab: "Nutrition",      Icon: Apple,    label: "Nutrition" },
  { tab: "Settings",       Icon: Settings, label: "Settings" },
];

/**
 * AiRTP icon — viewfinder corners around a solid head-and-shoulders figure.
 * Solid shapes + 2px strokes so it stays readable at 19px inside the pill
 * (a thin stick figure turns to mush at this size).
 */
function AirtpIcon({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#04140A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.4V5.8A2.8 2.8 0 0 1 5.8 3h2.6" />
      <path d="M15.6 3h2.6A2.8 2.8 0 0 1 21 5.8v2.6" />
      <path d="M21 15.6v2.6a2.8 2.8 0 0 1-2.8 2.8h-2.6" />
      <path d="M8.4 21H5.8A2.8 2.8 0 0 1 3 18.2v-2.6" />
      <circle cx="12" cy="9.6" r="2.3" fill="#04140A" stroke="none" />
      <path d="M7.9 17.6c0-2.3 1.8-3.9 4.1-3.9s4.1 1.6 4.1 3.9z" fill="#04140A" stroke="none" />
    </svg>
  );
}

/**
 * BottomNav — accepts the resolved activeTab string (not the full location
 * object) so React.memo's shallow comparison actually bails out when the
 * active tab hasn't changed (e.g. during the 1-second workout-timer tick).
 */
const BottomNav = memo(function BottomNav({ activeTab, navigateToTab }) {
  const navigate = useNavigate();

  const renderTab = ({ tab, Icon, label }) => {
    const isActive = activeTab === tab;
    return (
      <button
        key={tab}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isActive) {
            document.getElementById("main-content")?.scrollTo({ top: 0, behavior: "smooth" });
            // Round 17: also reset this tab's stack and return to its root
            navigateToTab(tab);
          } else {
            navigateToTab(tab);
          }
        }}
        className={`no-press-feedback tap-target flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[56px] py-2 px-1 rounded-lg transition-all active:scale-95 active:opacity-70 active:bg-[#00a9ff]/20 focus-visible:outline-2 focus-visible:outline-[#00a9ff] ${
          isActive ? "text-[#00a9ff] bg-[#00a9ff]/10" : "text-gray-400"
        }`}
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <Icon className="w-5 h-5" aria-hidden="true" />
        <span className={`text-[9px] font-medium ${isActive ? "text-[#00a9ff]" : "text-gray-400"}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Main navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a1628]/95 backdrop-blur-lg border-t border-[#00a9ff]/30 z-50 select-none"
      style={{ paddingBottom: "var(--safe-bottom, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="grid grid-cols-5 items-center px-1 py-1.5">
        {TABS_LEFT.map(renderTab)}

        {/* AiRTP — flush green pill. Action, not a tab: no aria-current, no active state. */}
        <button
          aria-label="Start AiRTP rep tracking"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate(createPageUrl("ARTPWorkout"));
          }}
          className="no-press-feedback tap-target flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[56px] py-2 px-1 rounded-lg transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-[#3DDC7A]"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{
              width: 58,
              height: 31,
              background: "linear-gradient(160deg, #3DDC7A, #12923F)",
              boxShadow: "0 3px 12px -3px rgba(34,197,94,0.6)",
            }}
          >
            <AirtpIcon className="w-[19px] h-[19px]" />
          </span>
          <span className="text-[9px] font-bold text-[#3DDC7A]">AiRTP</span>
        </button>

        {TABS_RIGHT.map(renderTab)}
      </div>
    </nav>
  );
});

export default BottomNav;
