import {
  SlidersHorizontal,
  LineSquiggle,
  Settings,
  Workflow,
  RouteOff,
  FolderSearch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SidebarTab } from "../types/types";

// تعریف پراپ‌ها
interface SideBarProps {
  activeTab: SidebarTab;
  onClickTab: (name: SidebarTab) => void;
  className?: string;
}

export default function SideBar({
  activeTab,
  onClickTab,
  className,
}: SideBarProps) {
  
  const SideBarButton = ({
    title,
    Icon,
    name,
  }: {
    Icon?: LucideIcon;
    title?: string;
    name: SidebarTab;
  }) => {
    const isActive = activeTab === name;

    return (
      <button
        onClick={() => onClickTab(name)}
        className={`
          group relative w-full flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-2xl transition-all duration-300 ease-out
          border
          ${
            isActive
              ? "bg-blue-50/80 border-blue-200 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.2)]"
              : "border-transparent hover:bg-slate-100 hover:border-slate-200/50"
          }
        `}
      >
        {/* نشانگر فعال بودن (نوار رنگی کوچک در کنار) */}
        {isActive && (
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-l-full shadow-sm" />
        )}

        {/* آیکون */}
        <div 
          className={`
            relative transition-transform duration-300 group-hover:scale-110 
            ${isActive ? "text-blue-600 drop-shadow-sm" : "text-slate-400 group-hover:text-slate-600"}
          `}
        >
            {Icon && <Icon size={24} strokeWidth={isActive ? 1.8 : 1.5} />}
        </div>

        {/* متن */}
        <span
          className={`
            text-[11px] font-medium tracking-wide font-vazir transition-colors duration-300
            ${isActive ? "text-blue-700 font-bold" : "text-slate-500 group-hover:text-slate-700"}
          `}
        >
          {title}
        </span>
      </button>
    );
  };

  const Tabs: {
    title: string;
    icon: LucideIcon;
    name: SidebarTab;
  }[] = [
    {
      title: "فیلتر ها",
      icon: SlidersHorizontal,
      name: "Filter",
    },
    {
      title: "مسیریابی",
      icon: LineSquiggle,
      name: "Routing",
    },
    {
      title: "گره ها",
      icon: Workflow,
      name: "Nodes",
    },
    {
      title: "فرآیندکاوی",
      icon: RouteOff,
      name: "Outliers",
    },
    {
      title: "جستجوی پرونده",
      icon: FolderSearch,
      name: "SearchCaseIds",
    },
    {
      title: "تنظیمات",
      icon: Settings,
      name: "Settings",
    },
  ];

  return (
    <aside
      className={`
        ${className} 
        h-screen flex flex-col gap-y-3 px-3 py-4
        bg-white/80 backdrop-blur-xl border-l border-slate-200/80
        shadow-[-4px_0_20px_-10px_rgba(0,0,0,0.05)]
        overflow-y-auto scrollbar-hide
      `}
    >
      {/* لوگو یا هدر کوچک تزئینی */}
      <div className="mb-2 flex justify-center opacity-30">
        <div className="w-8 h-1 bg-slate-400 rounded-full" />
      </div>

      {Tabs.map((tab, index) => (
        <SideBarButton
          key={index}
          Icon={tab.icon}
          title={tab.title}
          name={tab.name}
        />
      ))}
    </aside>
  );
}