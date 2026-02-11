import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MobileHeader({ currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Define root tab pages
  const rootTabs = ['Home', 'Exercises', 'Nutrition', 'History', 'Settings'];
  const isRootTab = rootTabs.includes(currentPageName);

  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/d1545e30c_repsandsteps_main_logo_2.png";
  const bannerUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c0ea2d30925fc79e7bb2af/8866d855e_repsandSteps_name_banner.png";

  const handleBack = () => {
    navigate(-1, { state: { fromBack: true } });
  };

  return (
    <header className="md:hidden bg-[#0a1628]/95 backdrop-blur-lg border-b border-brand-blue/30 px-4 py-3 sticky top-0 z-50 select-none">
      <div className="flex items-center gap-4">
        {isRootTab ? (
          // Root tab: Show logo and banner
          <>
            <div className="w-10 h-10 flex items-center justify-center text-brand-blue text-xl">
              <span>☰</span>
            </div>
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate(createPageUrl("Home"))}>
              <img src={logoUrl} alt="RepsAndSteps Logo" className="w-8 h-8 rounded-lg" />
              <img src={bannerUrl} alt="RepsAndSteps" className="h-4" />
            </div>
          </>
        ) : (
          // Child page: Show back button and page title
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-white hover:text-brand-blue flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-bold truncate">{currentPageName}</h1>
            </div>
          </>
        )}
      </div>
    </header>
  );
}