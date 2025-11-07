import { Button } from "@heroui/button";
import { Form } from "@heroui/form";
import { DateRangePicker } from "@heroui/date-picker";
import { NumberInput } from "@heroui/number-input";
import { useState } from "react";
import TimeFilterSection from "./TimeFilterSection";
import { DateValue } from "@internationalized/date";
import { FilterTypes } from "../types/types";
import { Select, SelectItem } from "@heroui/select";
interface FiltersProps {
  className?: string;
  isLoading?: boolean;
  submit: (filters: FilterTypes) => void;
}
interface DateRange {
  start: DateValue;
  end: DateValue;
}

export default function Filters({
  className,
  submit,
  isLoading,
}: FiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [caseIdRange, setCaseIdRange] = useState<{
    min: number;
    max: number;
  } | null>(null);
  const [meanTimeRange, setMeanTimeRange] = useState<{
    min: number | null;
    max: number | null;
  }>({ min: null, max: null });
  const [weightFilter, setWeightFilter] = useState<"cases" | "mean_time">(
    "cases"
  );
  const [timeUnitFilter, setTimeUnitFilter] = useState<
    "s" | "m" | "h" | "d" | "w"
  >("d");
  const handleDateChange = (value: DateRange | null) => {
    setDateRange(value);
  };

  const getISOStringRange = (dateValue: DateRange) => {
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
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const filters: FilterTypes = {
      dateRange: getISOStringRange(dateRange),
      minCaseCount: caseIdRange?.min,
      maxCaseCount: caseIdRange?.max,
      meanTimeRange: meanTimeRange,
      weightFilter: weightFilter,
      timeUnitFilter: timeUnitFilter,
    };
    submit(filters);
  };

  const weightFilters = [
    { key: "cases", label: "تعداد پرونده ها" },
    { key: "mean_time", label: "میانگین زمان طی شده" },
  ];
  const timeUnits = [
    { key: "s", label: "ثانیه" },
    { key: "m", label: "دقیقه" },
    { key: "h", label: "ساعت" },
    { key: "d", label: "روز" },
    { key: "w", label: "هفته" },
  ];

  return (
    <>
      <Form
        className="h-full flex- flex-col justify-between"
        onSubmit={onSubmit}
      >
        <div className="w-full space-y-4" dir="ltr">
          <DateRangePicker
            dir="ltr"
            label="انتخاب بازه زمانی"
            labelPlacement="inside"
            // visibleMonths={3}
            showMonthAndYearPickers
            isRequired
            classNames={{
              label: "text-right",
            }}
            value={dateRange}
            onChange={handleDateChange}
          />
          <div className="space-y-4" dir="rtl">
            <NumberInput
              label="حداقل تعداد پرونده ها را وارد کنید"
              value={caseIdRange?.min}
              onChange={(value) =>
                setCaseIdRange((prev) => ({
                  max: prev?.max,
                  min: Number(value),
                }))
              }
            />
            <NumberInput
              label="حداکثر تعداد پرونده ها را وارد کنید"
              value={caseIdRange?.max}
              onChange={(value) =>
                setCaseIdRange((prev) => ({
                  max: Number(value),
                  min: prev?.min,
                }))
              }
            />
            <TimeFilterSection
              title="حداقل زمان رسیدگی به پرونده ها:"
              setTime={(time) => {
                setMeanTimeRange((prev) => ({
                  min: time,
                  max: prev.max,
                }));
              }}
            />
            <TimeFilterSection
              title="حداکثر زمان رسیدگی به پرونده ها:"
              setTime={(time) => {
                setMeanTimeRange((prev) => ({
                  min: prev.min,
                  max: time,
                }));
              }}
            />
            <div className="flex gap-x-2 w-full">
              <Select
                label="فیلتر وزن یال ها"
                selectedKeys={new Set([weightFilter])}
                onSelectionChange={(keys) => {
                  const key = Array.from(keys)[0] as "cases" | "mean_time";
                  setWeightFilter(key);
                }}
              >
                {weightFilters.map((item) => (
                  <SelectItem key={item.key}>{item.label}</SelectItem>
                ))}
              </Select>
              {weightFilter === "mean_time" && (
                <Select
                  label="واحد زمان"
                  selectedKeys={new Set([timeUnitFilter])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as
                      | "s"
                      | "m"
                      | "h"
                      | "d"
                      | "w";
                    setTimeUnitFilter(key);
                  }}
                >
                  {timeUnits.map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  ))}
                </Select>
              )}
            </div>
          </div>
        </div>
        <div className="w-full">
          <Button fullWidth color="primary" type="submit" isLoading={isLoading}>
            اعمال فیلتر ها و پردازش داده
          </Button>
        </div>
      </Form>
    </>
  );
}
