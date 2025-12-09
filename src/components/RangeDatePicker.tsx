// PersianRangeDatePicker.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@heroui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { Select, SelectItem } from "@heroui/select";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment-jalaali";
import { CalendarDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { cn } from "@heroui/theme";

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
    <div className="w-full">
      <label className="text-xs font-medium text-default-500 mb-1 block mr-1">
        {label} {isRequired && <span className="text-danger">*</span>}
      </label>
      <Popover isOpen={isOpen} onOpenChange={setIsOpen} placement="bottom" offset={4}>
        <PopoverTrigger>
          <Button
            variant="bordered"
            className={cn(
              "w-full justify-between bg-default-50 border-default-200 h-12 text-medium",
              !value && "text-default-400",
              isDisabled && "opacity-50 cursor-not-allowed",
              isInvalid && "border-danger text-danger"
            )}
            isDisabled={isDisabled}
            endContent={
              value ? (
                <span 
                  className="text-default-400 hover:text-danger cursor-pointer p-1 z-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault(); 
                    onChange(null);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  ✕
                </span>
              ) : (
                <svg className="w-5 h-5 text-default-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )
            }
          >
            {value ? formatPersianDate(value) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[300px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-3"
          >
            <div className="flex gap-2 mb-3 justify-center">
              <Select
                size="sm"
                className="w-28"
                selectedKeys={[String(moment(viewDate).jMonth())]}
                onChange={(e) => handleMonthChange(new Set([e.target.value]))}
                aria-label="ماه"
                disallowEmptySelection
              >
                {months.map((m) => <SelectItem key={m.value}>{m.label}</SelectItem>)}
              </Select>
              <Select
                size="sm"
                className="w-24"
                selectedKeys={[String(moment(viewDate).jYear())]}
                onChange={(e) => handleYearChange(new Set([e.target.value]))}
                aria-label="سال"
                disallowEmptySelection
              >
                {years.map((y) => <SelectItem key={y.value}>{y.label}</SelectItem>)}
              </Select>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {PERSIAN_DAYS.map((d, i) => (
                <span key={i} className="text-center text-xs font-bold text-default-400">
                  {d}
                </span>
              ))}
            </div>

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
                      "h-9 w-9 text-sm rounded-lg flex items-center justify-center transition-all relative",
                      !isCurrentMonth ? "text-default-300" : "text-default-700",
                      disabled 
                        ? "opacity-30 cursor-not-allowed bg-default-50" 
                        : "hover:bg-default-200 hover:scale-105 active:scale-95",
                      selected && "bg-primary text-primary-foreground font-bold shadow-md hover:bg-primary-600",
                      isToday && !selected && "ring-2 ring-primary ring-inset text-primary"
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

  // هندلر برای اعمال شورتکات‌ها
  const handlePresetClick = (days: number) => {
    const today = new Date();
    // محاسبه تاریخ شروع: امروز منهای X روز
    const startDate = moment().subtract(days, "days").toDate();
    
    const newRange = {
      start: dateToDateValue(startDate),
      end: dateToDateValue(today) // تاریخ پایان همون "امروز" تنظیم میشه
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
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-default-500 ml-1">میانبرها:</span>
        {PRESETS.map((preset) => (
          <Button
            key={preset.days}
            size="sm"
            variant="flat"
            className="h-7 text-xs px-3 bg-default-100 hover:bg-default-200 text-default-600"
            onPress={() => handlePresetClick(preset.days)}
          >
            {preset.label}
          </Button>
        ))}
        {/* دکمه پاک کردن کل بازه */}
        {(range.start || range.end) && (
          <Button
            size="sm"
            variant="flat"
            color="danger"
            className="h-7 text-xs px-2 mr-auto"
            onPress={handleClear}
          >
            پاک کردن همه
          </Button>
        )}
      </div>

      {/* بخش اینپوت‌ها */}
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="flex-1">
          <SinglePersianDatePicker
            label="تاریخ شروع"
            value={range.start}
            onChange={handleStartChange}
            placeholder={placeholder?.start || "از تاریخ..."}
            maxDate={range.end}
            isRequired={isRequired}
            isInvalid={isInvalid}
          />
        </div>
        
        {/* <div className="hidden sm:flex items-center justify-center pt-6 text-default-300 text-xs">
          <svg className="w-5 h-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div> */}

        <div className="flex-1">
          <SinglePersianDatePicker
            label="تاریخ پایان"
            value={range.end}
            onChange={handleEndChange}
            minDate={range.start}
            isDisabled={!range.start}
            placeholder={placeholder?.end || "تا تاریخ..."}
            isRequired={isRequired}
            isInvalid={isInvalid}
          />
        </div>
      </div>
      {isInvalid && errorMessage && (
        <div className="text-tiny text-danger">{errorMessage}</div>
      )}
    </div>
  );
};

export default PersianRangeDatePicker;