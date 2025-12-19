import {
  SlidersHorizontal,
  LineSquiggle,
  Settings,
  Workflow,
  RouteOff,
  FolderSearch,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SidebarTab } from "../types/types";
import { Tooltip } from "@heroui/tooltip";
import { Button } from "@heroui/button"; // ایمپورت Button

interface SideBarProps {
  activeTab: SidebarTab;
  onClickTab: (name: SidebarTab) => void;
  className?: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function SideBar({
  activeTab,
  onClickTab,
  className,
  isCollapsed,
  onToggle,
}: SideBarProps) {
  
  const SideBarButton = ({
    title,
    Icon,
    name,
  }: {
    Icon?: LucideIcon;
    title: string;
    name: SidebarTab;
  }) => {
    const isActive = activeTab === name;

    const ButtonContent = (
      <Button
        onPress={() => onClickTab(name)}
        // تنظیمات ظاهری HeroUI
        variant={isActive ? "flat" : "light"}
        color={isActive ? "primary" : "default"}
        radius="lg" 
        size="lg" // سایز دکمه برای داشتن ارتفاع مناسب
        disableAnimation={false} // انیمیشن‌های خود HeroUI فعال باشند
        className={`
          group relative w-full flex items-center gap-3 px-3
          transition-all duration-300 ease-out
          ${isCollapsed ? "justify-center min-w-0 px-0" : "justify-start"}
          ${
            isActive
              ? "bg-blue-50/80 shadow-[0_4px_12px_-4px_rgba(59,130,246,0.2)] text-blue-700"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          }
        `}
      >
        {/* نشانگر فعال بودن (Custom Indicator) */}
        {isActive && (
            <span className={`absolute bg-blue-500 rounded-full shadow-sm transition-all duration-300 z-10
              ${isCollapsed ? "right-1.5 top-1/2 -translate-y-1/2 w-1 h-1" : "right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full"}
            `} />
        )}

        {/* آیکون */}
        <div 
          className={`
            relative transition-transform duration-300 shrink-0 z-10
            ${isActive ? "text-blue-600 drop-shadow-sm" : "text-slate-400 group-hover:text-slate-600"}
            ${!isCollapsed && "group-hover:scale-110"}
          `}
        >
            {Icon && <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />}
        </div>

        {/* متن (فقط وقتی باز است) */}
        {!isCollapsed && (
          <span
            className={`
              text-[11px] font-medium tracking-wide font-vazir transition-all duration-300 whitespace-nowrap z-10
              ${isActive ? "font-bold" : ""}
            `}
          >
            {title}
          </span>
        )}
      </Button>
    );

    // اگر بسته است، تولتیپ نشان بده
    if (isCollapsed) {
      return (
        <Tooltip 
            content={title} 
            placement="left" 
            className="text-xs font-vazir text-slate-700 font-medium" 
            closeDelay={0} 
            radius="sm" 
            showArrow
            offset={15}
        >
          {/* برای اینکه تولتیپ روی باتن کار کنه معمولا باید مستقیم دور باتن باشه */}
          <div className="w-full flex justify-center">
             {ButtonContent}
          </div>
        </Tooltip>
      );
    }

    return ButtonContent;
  };

  const Tabs: { title: string; icon: LucideIcon; name: SidebarTab }[] = [
    { title: "فیلتر ها", icon: SlidersHorizontal, name: "Filter" },
    { title: "مسیریابی", icon: LineSquiggle, name: "Routing" },
    { title: "گره ها", icon: Workflow, name: "Nodes" },
    { title: "فرآیندکاوی", icon: RouteOff, name: "Outliers" },
    { title: "جستجوی پرونده", icon: FolderSearch, name: "SearchCaseIds" },
    { title: "تنظیمات", icon: Settings, name: "Settings" },
  ];

  return (
    <aside
      className={`
        ${className} 
        h-full flex flex-col gap-y-2 px-2 py-4
        bg-white/80 backdrop-blur-xl border-l border-slate-200/80
        shadow-[-4px_0_20px_-10px_rgba(0,0,0,0.05)]
        overflow-y-auto scrollbar-hide transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
      `}
    >
      {/* دکمه باز و بسته کردن با HeroUI Button */}
      <div className={`flex mb-2 items-center transition-all duration-300 ${isCollapsed ? "justify-center" : "justify-between px-1"}`}>
        <p className={`xl:font-bold xl:text-lg text-xs text-nowrap ${isCollapsed ? "hidden" : ""}`}>سامانه فرآیندکاوی</p>
        <Button 
          isIconOnly
          variant="light"
          radius="lg"
          size="sm"
          onPress={onToggle}
          className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 min-w-8 w-8 h-8"
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </Button>
        
      </div>

      {/* جداکننده */}
      <div className={`mb-2 mx-auto bg-slate-200 rounded-full transition-all duration-300 ${isCollapsed ? "w-4 h-0.5" : "w-16 h-0.5"}`} />

      <div className="flex flex-col gap-2">
        {Tabs.map((tab, index) => (
          <SideBarButton
            key={index}
            Icon={tab.icon}
            title={tab.title}
            name={tab.name}
          />
        ))}
      </div>
    </aside>
  );
}