import { Button } from "@heroui/button";
import { Form } from "@heroui/form";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { NumberInput } from "@heroui/number-input";
import { useState } from "react";
import TimeFilterSection from "./TimeFilterSection";
import { DateValue } from "@internationalized/date";
import { FilterTypes } from "../../types/types";
import { Select, SelectItem } from "@heroui/select";
import PersianRangeDatePicker from "./RangeDatePicker";

// ... (تایپ‌ها و اینترفیس‌های قبلی بدون تغییر)
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
  // ... (لاجیک‌های قبلی بدون تغییر)
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [caseIdRange, setCaseIdRange] = useState<{ min: number; max: number } | null>(null);
  const [meanTimeRange, setMeanTimeRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [weightFilter, setWeightFilter] = useState<"cases" | "mean_time">("mean_time");
  const [timeUnitFilter, setTimeUnitFilter] = useState<"s" | "m" | "h" | "d" | "w">("d");
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const handleDateChange = (value: DateRange | null) => {
      setDateRange(value);
      if (value?.start && value?.end) setDateRangeError(null);
  };
  
  const getISOStringRange = (dateValue: DateRange) => {
      if (!dateValue?.start || !dateValue?.end) return null;
      const startDate = new Date(dateValue.start.year, dateValue.start.month - 1, dateValue.start.day).toISOString().split("T")[0];
      const endDate = new Date(dateValue.end.year, dateValue.end.month - 1, dateValue.end.day).toISOString().split("T")[0];
      return { start: startDate, end: endDate };
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!dateRange?.start || !dateRange?.end) {
      setDateRangeError("لطفا بازه زمانی را مشخص کنید");
      return;
    }
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
        className={`h-full flex flex-col justify-between ${className}`}
        onSubmit={onSubmit}
      >
        <div className="w-full space-y-4" dir="rtl">
          {/* آکاردئون با استایل مدرن و بدون کادر */}
          <Accordion 
            selectionMode='multiple' 
            defaultSelectedKeys={['dateRangeFilter']} 
            variant="light" // تغییر به light برای حذف کادر پیش‌فرض
            itemClasses={{
                base: 'group px-0', // حذف پدینگ اضافی
                trigger: 'px-3 py-3 rounded-xl hover:bg-slate-100 transition-colors data-[hover=true]:bg-slate-100',
                title: 'text-slate-700 font-bold text-sm',
                content: 'pb-4 px-2',
                indicator: 'text-slate-400'
            }}
          >
            <AccordionItem title="بازه زمانی" key='dateRangeFilter' subtitle={<span className="text-xs text-slate-400">محدوده تاریخ داده‌ها</span>}>
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
            
            <AccordionItem title="تعداد پرونده‌ها" subtitle={<span className="text-xs text-slate-400">فیلتر بر اساس حجم</span>}>
              <div className="pt-2">
                <NumberInput
                  label="حداقل"
                  placeholder="0"
                  variant="flat"
                  labelPlacement="outside"
                  classNames={{ inputWrapper: "bg-slate-50 hover:bg-slate-100 transition-colors" }}
                  value={caseIdRange?.min}
                  minValue={0}
                  onChange={(value) => setCaseIdRange((prev) => ({ max: prev?.max, min: Number(value) }))}
                />
                <NumberInput
                  label="حداکثر"
                  placeholder="∞"
                  variant="flat"
                  labelPlacement="outside"
                  classNames={{ inputWrapper: "bg-slate-50 hover:bg-slate-100 transition-colors mt-4" }}
                  value={caseIdRange?.max}
                  minValue={0}
                  onChange={(value) => setCaseIdRange((prev) => ({ max: Number(value), min: prev?.min }))}
                />
              </div>
            </AccordionItem>
            
            <AccordionItem title="زمان رسیدگی" subtitle={<span className="text-xs text-slate-400">مدت زمان فرآیندها</span>}>
              <div className="space-y-4 pt-2">
                <TimeFilterSection
                  title="حداقل زمان:"
                  setTime={(time) => setMeanTimeRange((prev) => ({ min: time, max: prev.max }))}
                />
                <TimeFilterSection
                  title="حداکثر زمان:"
                  setTime={(time) => setMeanTimeRange((prev) => ({ min: prev.min, max: time }))}
                />
                
                <div className="bg-slate-50 p-3 rounded-xl space-y-3">
                    <p className="text-xs font-bold text-slate-500">تنظیمات وزن گراف</p>
                    <Select
                        label="معیار وزن"
                        variant="flat"
                        size="sm"
                        selectedKeys={new Set([weightFilter])}
                        onSelectionChange={(keys) => setWeightFilter(Array.from(keys)[0] as "cases" | "mean_time")}
                    >
                        {weightFilters.map((item) => (
                        <SelectItem key={item.key}>{item.label}</SelectItem>
                        ))}
                    </Select>
                    {weightFilter === "mean_time" && (
                        <Select
                        label="واحد نمایش"
                        variant="flat"
                        size="sm"
                        selectedKeys={new Set([timeUnitFilter])}
                        onSelectionChange={(keys) => setTimeUnitFilter(Array.from(keys)[0] as any)}
                        >
                        {timeUnits.map((item) => (
                            <SelectItem key={item.key}>{item.label}</SelectItem>
                        ))}
                        </Select>
                    )}
                </div>
              </div>
            </AccordionItem>
          </Accordion>
        </div>
        
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
    </>
  );
}