import React, { memo } from "react";
import { Home, Dumbbell, Calendar, Apple, History, Settings } from "lucide-react";
import { resolveTabForPath } from "@/hooks/useTabNavigator";

const TABS = [
  { tab: "Home",           Icon: Home,     label: "Home" },
  { tab: "Exercises",      Icon: Dumbbell, label: "Exercises" },
  { tab: "PresetPrograms", Icon: Calendar, label: "Programs" },
  { tab: "Nutrition",      Icon: Apple,    label: "Nutrition" },
  { tab: "History",        Icon: History,  label: "History" },
  { tab: "Settings",       Icon: Settings, label: "Settings" },
];

/**
 * BottomNav — accepts the resolved activeTab string (not the full location
 * object) so React.memo's shallow comparison actually bails out when the
 * active tab hasn't changed (e.g. during the 1-second workout-timer tick).
 */
const BottomNav = memo(function BottomNav({ activeTab, navigateToTab }) {

  return (
    <nav
      aria-label="Main navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a1628]/95 backdrop-blur-lg border-t border-brand-blue/30 z-50 select-none pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around px-1 py-1.5 pointer-events-auto">
        {TABS.map(({ tab, Icon, label }) => {
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
                } else {
                  navigateToTab(tab);
                }
              }}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[56px] py-2 px-2 rounded-lg transition-colors active:scale-95 focus-visible:outline-2 focus-visible:outline-[#00a9ff] ${
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
        })}
      </div>
    </nav>
  );
});

export default BottomNav;