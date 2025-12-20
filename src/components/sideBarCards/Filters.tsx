/**
 * @component Filters
 * @module components/sideBarCards/Filters
 *
 * @description
 * Filter configuration card for the sidebar.
 * Allows users to set various filters before processing data:
 * - Date range (required)
 * - Case count range
 * - Mean time range
 * - Weight metric (cases vs mean time)
 * - Time unit display
 *
 * @example
 * ```tsx
 * <Filters
 *   submit={handleFilterSubmit}
 *   isLoading={isProcessing}
 * />
 * ```
 */

import { useState, useCallback, memo } from "react";
import { Button } from "@heroui/button";
import { Form } from "@heroui/form";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { NumberInput } from "@heroui/number-input";
import { Select, SelectItem } from "@heroui/select";
import { DateValue } from "@internationalized/date";

import type { FilterTypes } from "../../types/types";
import TimeFilterSection from "./TimeFilterSection";
import PersianRangeDatePicker from "./RangeDatePicker";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Component props
 */
interface FiltersProps {
  /** Additional CSS classes */
  className?: string;
  /** Loading state during processing */
  isLoading?: boolean;
  /** Callback when filters are submitted */
  submit: (filters: FilterTypes) => void;
}

/**
 * Date range value from the date picker
 */
interface DateRange {
  start: DateValue;
  end: DateValue;
}

/**
 * Weight filter options
 */
type WeightFilter = "cases" | "mean_time";

/**
 * Time unit options
 */
type TimeUnit = "s" | "m" | "h" | "d" | "w";

// ============================================================================
// CONSTANTS
// ============================================================================

const WEIGHT_FILTERS = [
  { key: "cases", label: "تعداد پرونده ها" },
  { key: "mean_time", label: "میانگین زمان طی شده" },
] as const;

const TIME_UNITS = [
  { key: "s", label: "ثانیه" },
  { key: "m", label: "دقیقه" },
  { key: "h", label: "ساعت" },
  { key: "d", label: "روز" },
  { key: "w", label: "هفته" },
] as const;

// ============================================================================
// COMPONENT
// ============================================================================

function Filters({ className = "", submit, isLoading = false }: FiltersProps) {
  // Form state
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [caseIdRange, setCaseIdRange] = useState<{ min?: number; max?: number }>({});
  const [meanTimeRange, setMeanTimeRange] = useState<{
    min: number | null;
    max: number | null;
  }>({ min: null, max: null });
  const [weightFilter, setWeightFilter] = useState<WeightFilter>("mean_time");
  const [timeUnitFilter, setTimeUnitFilter] = useState<TimeUnit>("d");
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  /**
   * Handles date range changes from the picker
   */
  const handleDateChange = useCallback((value: DateRange | null) => {
    setDateRange(value);
    if (value?.start && value?.end) {
      setDateRangeError(null);
    }
  }, []);

  /**
   * Converts DateRange to ISO string format
   */
  const getISOStringRange = useCallback(
    (dateValue: DateRange): { start: string; end: string } | null => {
      if (!dateValue?.start || !dateValue?.end) return null;

      const startDate = new Date(
        dateValue.start.year,
        dateValue.start.month - 1,
        dateValue.start.day
      )
        .toISOString()
        .split("T")[0];

      const endDate = new Date(
        dateValue.end.year,
        dateValue.end.month - 1,
        dateValue.end.day
      )
        .toISOString()
        .split("T")[0];

      return { start: startDate, end: endDate };
    },
    []
  );

  /**
   * Form submission handler
   */
  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!dateRange?.start || !dateRange?.end) {
        setDateRangeError("لطفا بازه زمانی را مشخص کنید");
        return;
      }

      const isoDateRange = getISOStringRange(dateRange);
      if (!isoDateRange) return;

      const filters: FilterTypes = {
        dateRange: isoDateRange,
        minCaseCount: caseIdRange.min ?? null,
        maxCaseCount: caseIdRange.max ?? null,
        meanTimeRange,
        weightFilter,
        timeUnitFilter,
      };

      submit(filters);
    },
    [dateRange, caseIdRange, meanTimeRange, weightFilter, timeUnitFilter, getISOStringRange, submit]
  );

  return (
    <Form className={`h-full flex flex-col justify-between ${className}`} onSubmit={onSubmit}>
      <div className="w-full space-y-4" dir="rtl">
        <Accordion
          keepContentMounted
          selectionMode="multiple"
          defaultSelectedKeys={["dateRangeFilter"]}
          variant="light"
          itemClasses={{
            base: "group px-0",
            trigger:
              "px-3 py-3 rounded-xl hover:bg-slate-100 transition-colors data-[hover=true]:bg-slate-100",
            title: "text-slate-700 font-bold text-sm",
            content: "pb-4 px-2",
            indicator: "text-slate-400",
          }}
        >
          {/* Date Range Filter */}
          <AccordionItem
            title="بازه زمانی"
            key="dateRangeFilter"
            subtitle={<span className="text-xs text-slate-400">محدوده تاریخ داده‌ها</span>}
          >
            <div className="pt-2">
              <PersianRangeDatePicker
                onChange={handleDateChange}
                placeholder={{ start: "از تاریخ", end: "تا تاریخ" }}
                isRequired
                isInvalid={!!dateRangeError}
                errorMessage={dateRangeError || undefined}
              />
            </div>
          </AccordionItem>

          {/* Case Count Filter */}
          <AccordionItem
            title="تعداد پرونده‌ها"
            subtitle={<span className="text-xs text-slate-400">فیلتر بر اساس حجم</span>}
          >
            <div className="pt-2">
              <NumberInput
                label="حداقل"
                placeholder="0"
                variant="flat"
                labelPlacement="outside"
                classNames={{
                  inputWrapper: "bg-slate-50 hover:bg-slate-100 transition-colors",
                }}
                value={caseIdRange.min}
                minValue={0}
                onChange={(value) =>
                  setCaseIdRange((prev) => ({ ...prev, min: Number(value) }))
                }
              />
              <NumberInput
                label="حداکثر"
                placeholder="∞"
                variant="flat"
                labelPlacement="outside"
                classNames={{
                  inputWrapper: "bg-slate-50 hover:bg-slate-100 transition-colors mt-4",
                }}
                value={caseIdRange.max}
                minValue={0}
                onChange={(value) =>
                  setCaseIdRange((prev) => ({ ...prev, max: Number(value) }))
                }
              />
            </div>
          </AccordionItem>

          {/* Time Filter */}
          <AccordionItem
            title="زمان رسیدگی"
            subtitle={<span className="text-xs text-slate-400">مدت زمان فرآیندها</span>}
          >
            <div className="space-y-4 pt-2">
              <TimeFilterSection
                title="حداقل زمان:"
                setTime={(time) => setMeanTimeRange((prev) => ({ ...prev, min: time }))}
              />
              <TimeFilterSection
                title="حداکثر زمان:"
                setTime={(time) => setMeanTimeRange((prev) => ({ ...prev, max: time }))}
              />

              {/* Weight Settings */}
              <div className="bg-slate-50 p-3 rounded-xl space-y-3">
                <p className="text-xs font-bold text-slate-500">تنظیمات وزن گراف</p>
                <Select
                  label="معیار وزن"
                  variant="flat"
                  size="sm"
                  selectedKeys={new Set([weightFilter])}
                  onSelectionChange={(keys) =>
                    setWeightFilter(Array.from(keys)[0] as WeightFilter)
                  }
                >
                  {WEIGHT_FILTERS.map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  ))}
                </Select>

                {weightFilter === "mean_time" && (
                  <Select
                    label="واحد نمایش"
                    variant="flat"
                    size="sm"
                    selectedKeys={new Set([timeUnitFilter])}
                    onSelectionChange={(keys) =>
                      setTimeUnitFilter(Array.from(keys)[0] as TimeUnit)
                    }
                  >
                    {TIME_UNITS.map((item) => (
                      <SelectItem key={item.key}>{item.label}</SelectItem>
                    ))}
                  </Select>
                )}
              </div>
            </div>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Submit Button */}
      <div className="w-full pt-4 mt-auto">
        <Button
          fullWidth
          color="primary"
          size="lg"
          className="shadow-lg shadow-blue-500/30 font-bold rounded-xl"
          type="submit"
          isLoading={isLoading}
        >
          پردازش و نمایش گراف
        </Button>
      </div>
    </Form>
  );
}

export default memo(Filters);