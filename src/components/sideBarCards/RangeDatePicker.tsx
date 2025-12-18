import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@heroui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { Select, SelectItem } from "@heroui/select";
import { motion } from "framer-motion";
import moment from "moment-jalaali";
import { CalendarDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { cn } from "@heroui/theme";
import { Calendar as CalendarIcon, X, ChevronLeft, CalendarDays } from "lucide-react";

// تنظیمات مومنت
moment.loadPersian({ dialect: "persian-modern", usePersianDigits: false });

// ------------------- Types & Constants -------------------

interface DateRange {
  start: DateValue | null;
  end: DateValue | null;
}

interface PersianRangeDatePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  className?: string;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  placeholder?: { start: string; end: string };
}

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const PERSIAN_DAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const PRESETS = [
  { label: "هفته اخیر", days: 7 },
  { label: "۱ ماه اخیر", days: 30 },
  { label: "۳ ماه اخیر", days: 90 },
  { label: "۶ ماه اخیر", days: 180 },
  { label: "یک سال اخیر", days: 365 },
];

// ------------------- Helpers -------------------

const dateToDateValue = (date: Date): DateValue => {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

const dateValueToDate = (dateValue: DateValue): Date => {
  return new Date(dateValue.year, dateValue.month - 1, dateValue.day);
};

const formatPersianDate = (dateValue: DateValue | null) => {
  if (!dateValue) return "";
  const date = dateValueToDate(dateValue);
  return moment(date).format("jYYYY/jMM/jDD");
};

// ------------------- Single Date Picker Component -------------------

interface SinglePersianDatePickerProps {
  label: string;
  value: DateValue | null;
  onChange: (date: DateValue | null) => void;
  minDate?: DateValue | null;
  maxDate?: DateValue | null;
  placeholder?: string;
  isDisabled?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
}

const SinglePersianDatePicker: React.FC<SinglePersianDatePickerProps> = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "انتخاب تاریخ",
  isDisabled = false,
  isRequired = false,
  isInvalid = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(new Date());

  useEffect(() => {
    if (isOpen && value) {
      setViewDate(dateValueToDate(value));
    }
  }, [isOpen, value]);

  const currentJYear = moment().jYear();
  const years = useMemo(() => Array.from({ length: 100 }, (_, i) => ({
    value: String(currentJYear - i + 1),
    label: String(currentJYear - i + 1),
  })), [currentJYear]);

  const months = useMemo(() => PERSIAN_MONTHS.map((name, index) => ({
    value: String(index),
    label: name,
  })), []);

  const calendarDays = useMemo(() => {
    const jMonth = moment(viewDate).jMonth();
    const jYear = moment(viewDate).jYear();
    const firstDay = moment(`${jYear}/${jMonth + 1}/1`, "jYYYY/jM/jD");
    const startDayOfWeek = (firstDay.day() + 1) % 7;
    const daysInMonth = moment.jDaysInMonth(jYear, jMonth);
    const days: Date[] = [];
    const prevMonth = moment(firstDay).subtract(1, "jMonth");
    const daysInPrevMonth = moment.jDaysInMonth(prevMonth.jYear(), prevMonth.jMonth());

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push(moment(`${prevMonth.jYear()}/${prevMonth.jMonth() + 1}/${daysInPrevMonth - i}`, "jYYYY/jM/jD").toDate());
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(moment(`${jYear}/${jMonth + 1}/${i}`, "jYYYY/jM/jD").toDate());
    }
    const remainingDays = 42 - days.length;
    const nextMonth = moment(firstDay).add(1, "jMonth");
    for (let i = 1; i <= remainingDays; i++) {
      days.push(moment(`${nextMonth.jYear()}/${nextMonth.jMonth() + 1}/${i}`, "jYYYY/jM/jD").toDate());
    }
    return days;
  }, [viewDate]);

  const handleDateSelect = (date: Date) => {
    onChange(dateToDateValue(date));
    setIsOpen(false);
  };

  const handleMonthChange = (keys: any) => {
    const selectedMonth = parseInt(Array.from(keys)[0] as string);
    const newDate = moment(viewDate).jMonth(selectedMonth).toDate();
    setViewDate(newDate);
  };

  const handleYearChange = (keys: any) => {
    const selectedYear = parseInt(Array.from(keys)[0] as string);
    const newDate = moment(viewDate).jYear(selectedYear).toDate();
    setViewDate(newDate);
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) return true;
    if (minDate) {
      const min = dateValueToDate(minDate);
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }
    if (maxDate) {
      const max = dateValueToDate(maxDate);
      max.setHours(23, 59, 59, 999);
      if (date > max) return true;
    }
    return false;
  };

  const isSameDay = (d1: Date, d2: DateValue | null) => {
    if (!d2) return false;
    const date2 = dateValueToDate(d2);
    return d1.getFullYear() === date2.getFullYear() &&
           d1.getMonth() === date2.getMonth() &&
           d1.getDate() === date2.getDate();
  };

  return (
    <div className="w-full group">
      <label className="text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1">
        {label} {isRequired && <span className="text-rose-500">*</span>}
      </label>
      <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement="bottom" offset={8}>
        <PopoverTrigger>
          <Button
            variant="flat"
            className={cn(
              "w-full justify-between bg-white border border-slate-200 h-11 text-sm rounded-xl transition-all duration-200",
              "hover:border-blue-300 hover:bg-slate-50",
              "data-[focus=true]:border-blue-500 data-[focus=true]:ring-1 data-[focus=true]:ring-blue-200", // استایل فوکوس
              !value && "text-slate-400 font-normal",
              value && "text-slate-800 font-medium",
              isDisabled && "opacity-50 cursor-not-allowed bg-slate-100",
              isInvalid && "border-rose-300 text-rose-600 bg-rose-50 hover:bg-rose-100"
            )}
            isDisabled={isDisabled}
            startContent={<CalendarIcon size={16} className={cn(
                "transition-colors",
                value ? "text-blue-500" : "text-slate-300",
                isInvalid && "text-rose-400"
            )} />}
            endContent={
              value && !isDisabled ? (
                <div 
                  className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-rose-500 cursor-pointer transition-colors z-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <X size={14} />
                </div>
              ) : null
            }
          >
            {value ? formatPersianDate(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px] border border-slate-100 shadow-xl rounded-2xl overflow-hidden bg-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="p-4"
          >
            {/* هدر تقویم (انتخاب سال و ماه) */}
            <div className="flex gap-2 mb-4 justify-between bg-slate-50 p-1 rounded-xl border border-slate-100">
              <Select
                size="sm"
                variant="flat"
                className="w-1/2"
                classNames={{ 
                    trigger: "bg-white shadow-sm min-h-8 h-8 rounded-lg",
                    value: "text-xs font-bold text-slate-700"
                }}
                selectedKeys={[String(moment(viewDate).jMonth())]}
                onChange={(e) => handleMonthChange(new Set([e.target.value]))}
                aria-label="ماه"
                disallowEmptySelection
              >
                {months.map((m) => <SelectItem key={m.value} textValue={m.label}>{m.label}</SelectItem>)}
              </Select>
              <Select
                size="sm"
                variant="flat"
                className="w-1/2"
                classNames={{ 
                    trigger: "bg-white shadow-sm min-h-8 h-8 rounded-lg",
                    value: "text-xs font-bold text-slate-700"
                }}
                selectedKeys={[String(moment(viewDate).jYear())]}
                onChange={(e) => handleYearChange(new Set([e.target.value]))}
                aria-label="سال"
                disallowEmptySelection
              >
                {years.map((y) => <SelectItem key={y.value} textValue={y.label}>{y.label}</SelectItem>)}
              </Select>
            </div>

            {/* روزهای هفته */}
            <div className="grid grid-cols-7 mb-2">
              {PERSIAN_DAYS.map((d, i) => (
                <span key={i} className="text-center text-[11px] font-bold text-slate-400">
                  {d}
                </span>
              ))}
            </div>

            {/* شبکه روزها */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                const isCurrentMonth = moment(date).jMonth() === moment(viewDate).jMonth();
                const disabled = isDateDisabled(date);
                const selected = isSameDay(date, value);
                const isToday = isSameDay(date, dateToDateValue(new Date()));

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleDateSelect(date)}
                    className={cn(
                      "h-8 w-8 text-xs rounded-lg flex items-center justify-center transition-all relative font-medium font-vazir",
                      // حالت پیش‌فرض و غیرفعال
                      !isCurrentMonth ? "text-slate-300" : "text-slate-600",
                      disabled 
                        ? "opacity-20 cursor-not-allowed bg-slate-50" 
                        : "hover:bg-blue-50 hover:text-blue-600",
                      
                      // حالت امروز
                      isToday && !selected && "ring-1 ring-blue-400 text-blue-600 bg-blue-50/50",
                      
                      // حالت انتخاب شده (باید بالاترین اولویت باشد)
                      selected && "bg-blue-500 text-white shadow-md shadow-blue-200 hover:bg-blue-600 ring-0",
                    )}
                  >
                    {moment(date).jDate()}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// ------------------- Main Component -------------------

const PersianRangeDatePicker: React.FC<PersianRangeDatePickerProps> = ({
  value,
  onChange,
  className,
  isRequired = false,
  isInvalid = false,
  errorMessage,
  placeholder,
}) => {
  const [range, setRange] = useState<DateRange>({
    start: value?.start || null,
    end: value?.end || null,
  });

  useEffect(() => {
    if (value) {
      setRange({
        start: value.start || null,
        end: value.end || null,
      });
    }
  }, [value]);

  const handleStartChange = (date: DateValue | null) => {
    let newRange = { ...range, start: date };
    if (date && range.end) {
      const startDate = dateValueToDate(date);
      const endDate = dateValueToDate(range.end);
      if (startDate > endDate) {
        newRange.end = null;
      }
    }
    setRange(newRange);
    onChange?.(newRange);
  };

  const handleEndChange = (date: DateValue | null) => {
    const newRange = { ...range, end: date };
    setRange(newRange);
    onChange?.(newRange);
  };

  const handlePresetClick = (days: number) => {
    const today = new Date();
    const startDate = moment().subtract(days, "days").toDate();
    
    const newRange = {
      start: dateToDateValue(startDate),
      end: dateToDateValue(today)
    };

    setRange(newRange);
    onChange?.(newRange);
  };

  const handleClear = () => {
    const newRange: DateRange = { start: null, end: null };
    setRange(newRange);
    onChange?.(newRange);
  };

  return (
    <div className={cn("flex flex-col gap-4 w-full", className)} dir="rtl">
      {/* بخش میانبرها (Shortcuts) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-50/80 border border-slate-100 rounded-xl">
        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 ml-1">
            <CalendarDays size={14} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500">فیلتر سریع:</span>
        </div>
        
        {PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => handlePresetClick(preset.days)}
            className="
                px-2.5 py-1 text-[10px] font-medium rounded-lg transition-colors
                bg-white border border-slate-200 text-slate-600
                hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200
                active:scale-95
            "
          >
            {preset.label}
          </button>
        ))}

        {/* دکمه پاک کردن کل بازه */}
        {(range.start || range.end) && (
          <button
            type="button"
            onClick={handleClear}
            className="
                mr-auto px-2 py-1 text-[10px] font-medium rounded-lg transition-colors flex items-center gap-1
                bg-rose-50 border border-rose-100 text-rose-500
                hover:bg-rose-100 hover:border-rose-200
            "
          >
            <X size={12} />
            حذف فیلتر
          </button>
        )}
      </div>

      {/* بخش اینپوت‌ها */}
      <div className="flex flex-col gap-2 relative">
        {/* خط اتصال بین دو اینپوت (فقط برای زیبایی در دسکتاپ) */}
        <div className="hidden sm:block absolute left-1/2 top-[60%] -translate-x-1/2 -translate-y-1/2 z-0 text-slate-300">
            <ChevronLeft size={16} />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full z-10">
            <div className="flex-1">
            <SinglePersianDatePicker
                label="از تاریخ"
                value={range.start}
                onChange={handleStartChange}
                placeholder={placeholder?.start || "شروع بازه..."}
                maxDate={range.end}
                isRequired={isRequired}
                isInvalid={isInvalid}
            />
            </div>

            <div className="flex-1">
            <SinglePersianDatePicker
                label="تا تاریخ"
                value={range.end}
                onChange={handleEndChange}
                minDate={range.start}
                isDisabled={!range.start}
                placeholder={placeholder?.end || "پایان بازه..."}
                isRequired={isRequired}
                isInvalid={isInvalid}
            />
            </div>
        </div>
      </div>

      {isInvalid && errorMessage && (
        <div className="text-[10px] font-medium text-rose-500 bg-rose-50 p-2 rounded-lg flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-rose-500" />
            {errorMessage}
        </div>
      )}
    </div>
  );
};

export default PersianRangeDatePicker;