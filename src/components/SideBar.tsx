import {
  SlidersHorizontal,
  LineSquiggle,
  Settings,
  Workflow,
  RouteOff
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SidebarTab } from "../types/types";
export default function SideBar({
  activeTab,
  onClickTab,
  className,
}: {
  activeTab: SidebarTab;
  onClickTab: (name: SidebarTab) => void;
  className?: string;
}) {
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
      <div
        onClick={() => {
          onClickTab(name);
        }}
        className={`group w-full flex flex-col items-center justify-center gap-y-1 p-2 rounded-xl border-1 shadow-lg cursor-pointer  transition-all
             ${isActive ? "bg-primary/80 border-black shadow-2xl" : "hover:bg-primary/20"}`}
      >
        {Icon && <Icon size={20} />}
        <p
          className={`text-xs py-1 px-3 rounded-full transition-all text-center
            ${isActive ? "bg-secondary/20" : "group-hover:bg-secondary/10"}`}
        >
          {title}
        </p>
      </div>
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
      title: "مسیر های پرت",
      icon: RouteOff,
      name: "Outliers",
    },
    {
      title: "تنظیمات",
      icon: Settings,
      name: "Settings",
    },
  ];

  return (
    <div className={`${className} h-screen w-full flex flex-col gap-y-4 px-2`}>
      {Tabs.map((tab, index) => (
        <SideBarButton
          key={index}
          Icon={tab.icon}
          title={tab.title}
          name={tab.name}
        />
      ))}
    </div>
  );
}
