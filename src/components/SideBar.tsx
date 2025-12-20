/**
 * @component SideBar
 * @module components/SideBar
 *
 * @description
 * Application sidebar navigation component.
 * Provides tab-based navigation between different functional areas:
 * - Filters, Routing, Nodes, Case Search, Outliers, Settings
 *
 * Supports collapsed/expanded modes with smooth animations.
 * When collapsed, shows tooltips on hover.
 *
 * @example
 * ```tsx
 * <SideBar
 *   activeTab="Filter"
 *   onClickTab={handleTabClick}
 *   isCollapsed={false}
 *   onToggle={toggleSidebar}
 * />
 * ```
 */

import { memo, useCallback } from "react";
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
import { Tooltip } from "@heroui/tooltip";
import { Button } from "@heroui/button";

import type { SidebarTab } from "../types/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * SideBar component props
 */
interface SideBarProps {
  /** Currently active tab */
  activeTab: SidebarTab;
  /** Callback when a tab is clicked */
  onClickTab: (name: SidebarTab) => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether the sidebar is in collapsed mode */
  isCollapsed: boolean;
  /** Callback to toggle collapsed state */
  onToggle: () => void;
}

/**
 * Configuration for a sidebar tab
 */
interface TabConfig {
  /** Display title (Persian) */
  title: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Tab identifier */
  name: SidebarTab;
}

/**
 * SideBarButton internal component props
 */
interface SideBarButtonProps {
  /** Button title text */
  title: string;
  /** Lucide icon component */
  Icon?: LucideIcon;
  /** Tab name for identification */
  name: SidebarTab;
  /** Whether this tab is currently active */
  isActive: boolean;
  /** Whether the sidebar is collapsed */
  isCollapsed: boolean;
  /** Click handler */
  onClick: (name: SidebarTab) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Tab configuration array defining all sidebar tabs
 */
const TABS: TabConfig[] = [
  { title: "فیلتر ها", icon: SlidersHorizontal, name: "Filter" },
  { title: "مسیریابی", icon: LineSquiggle, name: "Routing" },
  { title: "گره ها", icon: Workflow, name: "Nodes" },
  { title: "بررسی تک پرونده", icon: FolderSearch, name: "SearchCaseIds" },
  { title: "فرآیندکاوی", icon: RouteOff, name: "Outliers" },
  { title: "تنظیمات", icon: Settings, name: "Settings" },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Individual sidebar button with active state styling.
 * Shows tooltip when sidebar is collapsed.
 */
const SideBarButton = memo(function SideBarButton({
  title,
  Icon,
  name,
  isActive,
  isCollapsed,
  onClick,
}: SideBarButtonProps): React.ReactElement {
  const handleClick = useCallback(() => onClick(name), [onClick, name]);

  const buttonContent = (
    <Button
      onPress={handleClick}
      variant={isActive ? "flat" : "light"}
      color={isActive ? "primary" : "default"}
      radius="lg"
      size="lg"
      disableAnimation={false}
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
      {/* Active indicator */}
      {isActive && (
        <span
          className={`
            absolute bg-blue-500 rounded-full shadow-sm transition-all duration-300 z-10
            ${
              isCollapsed
                ? "right-1.5 top-1/2 -translate-y-1/2 w-1 h-1"
                : "right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full"
            }
          `}
        />
      )}

      {/* Icon */}
      <div
        className={`
          relative transition-transform duration-300 shrink-0 z-10
          ${isActive ? "text-blue-600 drop-shadow-sm" : "text-slate-400 group-hover:text-slate-600"}
          ${!isCollapsed && "group-hover:scale-110"}
        `}
      >
        {Icon && <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />}
      </div>

      {/* Label (hidden when collapsed) */}
      {!isCollapsed && (
        <span
          className={`
            text-[11px] font-medium tracking-wide font-vazir 
            transition-all duration-300 whitespace-nowrap z-10
            ${isActive ? "font-bold" : ""}
          `}
        >
          {title}
        </span>
      )}
    </Button>
  );

  // Show tooltip when collapsed
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
        <div className="w-full flex justify-center">{buttonContent}</div>
      </Tooltip>
    );
  }

  return buttonContent;
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * SideBar navigation component.
 */
function SideBar({
  activeTab,
  onClickTab,
  className = "",
  isCollapsed,
  onToggle,
}: SideBarProps): React.ReactElement {
  return (
    <aside
      className={`
        ${className}
        h-full flex flex-col gap-y-2 px-2 py-4
        bg-white/80 backdrop-blur-xl border-l border-slate-200/80
        shadow-[-4px_0_20px_-10px_rgba(0,0,0,0.05)]
        overflow-y-auto scrollbar-hide 
        transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
      `}
    >
      {/* Header with collapse toggle */}
      <div
        className={`
          flex mb-2 items-center transition-all duration-300
          ${isCollapsed ? "justify-center" : "justify-between px-1"}
        `}
      >
        <p
          className={`
            xl:font-bold xl:text-lg text-xs text-nowrap
            ${isCollapsed ? "hidden" : ""}
          `}
        >
          سامانه فرآیندکاوی
        </p>
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

      {/* Divider */}
      <div
        className={`
          mb-2 mx-auto bg-slate-200 rounded-full transition-all duration-300
          ${isCollapsed ? "w-4 h-0.5" : "w-16 h-0.5"}
        `}
      />

      {/* Navigation tabs */}
      <nav className="flex flex-col gap-2">
        {TABS.map((tab) => (
          <SideBarButton
            key={tab.name}
            Icon={tab.icon}
            title={tab.title}
            name={tab.name}
            isActive={activeTab === tab.name}
            isCollapsed={isCollapsed}
            onClick={onClickTab}
          />
        ))}
      </nav>
    </aside>
  );
}

export default memo(SideBar);