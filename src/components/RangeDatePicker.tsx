// PersianRangeDatePicker.tsx
import React, { useState } from "react";
import { Button } from "@heroui/button";
import { Divider } from "@heroui/divider";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import { Select, SelectItem } from "@heroui/select";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment-jalaali";
import { CalendarDate } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";

// Configure moment-jalaali
moment.loadPersian({ dialect: "persian-modern", usePersianDigits: false });

interface DateRange {
  start: DateValue | null;
  end: DateValue | null;
}

interface PersianRangeDatePickerProps {
  value?: DateRange;
  onChange?: (range: {
    start: DateValue | null;
    end: DateValue | null;
  }) => void;
  placeholder?: { start?: string; end?: string };
}

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const PERSIAN_DAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

// Helper function to convert Date to DateValue
const dateToDateValue = (date: Date): DateValue => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return new CalendarDate(year, month, day);
};

// Helper function to convert DateValue to Date
const dateValueToDate = (dateValue: DateValue): Date => {
  return new Date(dateValue.year, dateValue.month - 1, dateValue.day);
};

const PersianRangeDatePicker: React.FC<PersianRangeDatePickerProps> = ({
  value,
  onChange,
  placeholder = { start: "از تاریخ", end: "تا تاریخ" },
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange>({
    start: value?.start || null,
    end: value?.end || null,
  });
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isSelectingStart, setIsSelectingStart] = useState(true);
  const [tooltipDate, setTooltipDate] = useState<Date | null>(null);

  // Generate years array (last 100 years)
  const currentJYear = moment().jYear();
  const years = Array.from({ length: 100 }, (_, i) => ({
    value: String(currentJYear - i),
    label: String(currentJYear - i),
  }));

  // Generate months array
  const months = PERSIAN_MONTHS.map((name, index) => ({
    value: String(index),
    label: name,
  }));

  // Generate calendar days
  const generateCalendarDays = (month: Date) => {
    const jMonth = moment(month).jMonth();
    const jYear = moment(month).jYear();

    // First day of the month
    const firstDay = moment(`${jYear}/${jMonth + 1}/1`, "jYYYY/jM/jD");
    const startDayOfWeek = (firstDay.day() + 1) % 7; // Adjust for Saturday start

    // Days in month
    const daysInMonth = moment.jDaysInMonth(jYear, jMonth);

    // Previous month days to fill
    const prevMonthDays = startDayOfWeek;
    const prevMonth = moment(firstDay).subtract(1, "jMonth");
    const daysInPrevMonth = moment.jDaysInMonth(
      prevMonth.jYear(),
      prevMonth.jMonth()
    );

    const days: Date[] = [];

    // Add previous month days
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const day = moment(
        `${prevMonth.jYear()}/${prevMonth.jMonth() + 1}/${daysInPrevMonth - i}`,
        "jYYYY/jM/jD"
      ).toDate();
      days.push(day);
    }

    // Add current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const day = moment(`${jYear}/${jMonth + 1}/${i}`, "jYYYY/jM/jD").toDate();
      days.push(day);
    }

    // Add next month days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    const nextMonth = moment(firstDay).add(1, "jMonth");
    for (let i = 1; i <= remainingDays; i++) {
      const day = moment(
        `${nextMonth.jYear()}/${nextMonth.jMonth() + 1}/${i}`,
        "jYYYY/jM/jD"
      ).toDate();
      days.push(day);
    }

    return days;
  };

  const days = generateCalendarDays(currentMonth);

  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Disable future dates
    if (date > today) return;

    const dateValue = dateToDateValue(date);

    if (!selectedRange.start || (selectedRange.start && selectedRange.end)) {
      // Start new selection
      setSelectedRange({ start: dateValue, end: null });
      setIsSelectingStart(false);
    } else {
      // Complete the range
      const startDate = dateValueToDate(selectedRange.start);

      if (date < startDate) {
        // If selected date is before start, make it the new start
        setSelectedRange({ start: dateValue, end: null });
        setIsSelectingStart(false);
      } else {
        // Complete the range
        setSelectedRange({ start: selectedRange.start, end: dateValue });
        setIsSelectingStart(true);

        // Call onChange with DateValue objects
        onChange?.({
          start: selectedRange.start,
          end: dateValue,
        });

        // Close popover after selection
        setTimeout(() => setIsOpen(false), 300);
      }
    }
  };

  const isDateInRange = (date: Date) => {
    if (!selectedRange.start) return false;
    if (!selectedRange.end && !hoveredDate) return false;

    const startDate = dateValueToDate(selectedRange.start);
    const end = selectedRange.end
      ? dateValueToDate(selectedRange.end)
      : hoveredDate;
    if (!end) return false;

    return date >= startDate && date <= end;
  };

  const isDateSelected = (date: Date) => {
    if (!selectedRange.start) return false;
    const startDate = dateValueToDate(selectedRange.start);
    if (date.toDateString() === startDate.toDateString()) return true;
    if (selectedRange.end) {
      const endDate = dateValueToDate(selectedRange.end);
      if (date.toDateString() === endDate.toDateString()) return true;
    }
    return false;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
  };

  const formatPersianDate = (dateValue: DateValue | null) => {
    if (!dateValue) return "";
    const date = dateValueToDate(dateValue);
    return moment(date).format("jYYYY/jMM/jDD");
  };

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => moment(prev).subtract(1, "jMonth").toDate());
  };

  const goToNextMonth = () => {
    const nextMonth = moment(currentMonth).add(1, "jMonth");
    const today = moment();

    // Don't allow navigation beyond current month
    if (nextMonth.isAfter(today, "jMonth")) return;

    setCurrentMonth(nextMonth.toDate());
  };

  const handleYearChange = (keys: any) => {
    const selectedYear = parseInt(Array.from(keys)[0] as string);

    // Create moment object and set jYear, then convert to Date
    const currentMoment = moment(currentMonth);
    currentMoment.jYear(selectedYear);
    const newDate = currentMoment.toDate();

    // Check if the new date would be in the future
    if (moment(newDate).isAfter(moment(), "jMonth")) {
      // Set to current month if it would be in future
      setCurrentMonth(new Date());
    } else {
      setCurrentMonth(newDate);
    }
  };

  const handleMonthChange = (keys: any) => {
    const selectedMonth = parseInt(Array.from(keys)[0] as string);

    // Create moment object and set jMonth, then convert to Date
    const currentMoment = moment(currentMonth);
    currentMoment.jMonth(selectedMonth);
    const newDate = currentMoment.toDate();

    // Check if the new date would be in the future
    if (moment(newDate).isAfter(moment(), "jMonth")) {
      // Set to current month if it would be in future
      setCurrentMonth(new Date());
    } else {
      setCurrentMonth(newDate);
    }
  };

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days + 1);

    const startValue = dateToDateValue(start);
    const endValue = dateToDateValue(end);

    setSelectedRange({ start: startValue, end: endValue });
    onChange?.({
      start: startValue,
      end: endValue,
    });

    setTimeout(() => setIsOpen(false), 300);
  };

  const handleClearDates = () => {
    setSelectedRange({ start: null, end: null });
    setIsSelectingStart(true);
    onChange?.({ start: null, end: null });
  };

  const isCurrentMonth = moment(currentMonth).isSame(moment(), "jMonth");

  return (
    <div className="persian-range-datepicker" dir="rtl">
      <Popover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom-start"
        offset={8}
      >
        <PopoverTrigger>
          <div className="flex gap-2">
            {/* Start Date Input */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex-1"
            >
              <button
                type="button"
                className="w-full px-4 py-3 rounded-lg border-2 border-default-200 hover:border-default-400 focus:border-primary focus:outline-none transition-colors bg-default-100 text-right flex items-center justify-between group"
                onClick={(e) => {
                  e.preventDefault();
                  setIsOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-default-500 group-hover:text-default-700 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    {selectedRange.start
                      ? formatPersianDate(selectedRange.start)
                      : placeholder.start}
                  </span>
                </div>
                {selectedRange.start && (
                  <motion.button
                    type="button"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleClearDates();
                    }}
                    className="text-default-400 hover:text-danger transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </motion.button>
                )}
              </button>
            </motion.div>

            {/* End Date Input */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex-1"
            >
              <button
                type="button"
                className="w-full px-4 py-3 rounded-lg border-2 border-default-200 hover:border-default-400 focus:border-primary focus:outline-none transition-colors bg-default-100 text-right flex items-center justify-between group"
                onClick={(e) => {
                  e.preventDefault();
                  setIsOpen(true);
                }}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-default-500 group-hover:text-default-700 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    {selectedRange.end
                      ? formatPersianDate(selectedRange.end)
                      : placeholder.end}
                  </span>
                </div>
              </button>
            </motion.div>
          </div>
        </PopoverTrigger>

        <PopoverContent className="p-0 w-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key="calendar"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex"
            >
              {/* Presets Sidebar */}
              <div className="bg-default-50 p-3 border-l border-default-200 flex flex-col gap-2 min-w-[140px]">
                <p className="text-xs font-semibold text-default-600 mb-1">
                  میانبرها
                </p>
                <Button
                  size="sm"
                  variant="flat"
                  className="justify-start text-xs h-8"
                  onPress={() => handlePreset(7)}
                  type="button"
                >
                  هفته اخیر
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  className="justify-start text-xs h-8"
                  onPress={() => handlePreset(30)}
                  type="button"
                >
                  ماه اخیر
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  className="justify-start text-xs h-8"
                  onPress={() => handlePreset(90)}
                  type="button"
                >
                  ۳ ماه اخیر
                </Button>
                <Button
                  size="sm"
                  variant="flat"
                  className="justify-start text-xs h-8"
                  onPress={() => handlePreset(180)}
                  type="button"
                >
                  ۶ ماه اخیر
                </Button>
                <Divider className="my-1" />
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  className="justify-start text-xs h-8"
                  onPress={handleClearDates}
                  type="button"
                >
                  پاک کردن
                </Button>
              </div>

              {/* Calendar */}
              <div className="p-4">
                {/* Header with Year and Month Selectors */}
                <div className="flex items-center justify-between mb-4 gap-2">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    onPress={goToPreviousMonth}
                    type="button"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </Button>

                  <div className="flex gap-2 items-center">
                    {/* Month Selector */}
                    <Select
                      size="sm"
                      variant="flat"
                      selectedKeys={
                        new Set([String(moment(currentMonth).jMonth())])
                      }
                      onSelectionChange={handleMonthChange}
                      className="w-[120px]"
                      classNames={{
                        trigger: "h-8 min-h-8",
                        value: "text-xs font-bold",
                      }}
                      aria-label="انتخاب ماه"
                      disallowEmptySelection
                    >
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </Select>

                    {/* Year Selector */}
                    <Select
                      size="sm"
                      variant="flat"
                      selectedKeys={
                        new Set([String(moment(currentMonth).jYear())])
                      }
                      onSelectionChange={handleYearChange}
                      className="w-[100px]"
                      classNames={{
                        trigger: "h-8 min-h-8",
                        value: "text-xs font-bold",
                      }}
                      aria-label="انتخاب سال"
                      disallowEmptySelection
                    >
                      {years.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>

                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    onPress={goToNextMonth}
                    isDisabled={isCurrentMonth}
                    type="button"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Button>
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {PERSIAN_DAYS.map((day, index) => (
                    <div
                      key={index}
                      className="text-center text-xs font-semibold text-default-600 w-10 h-8 flex items-center justify-center"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((date, index) => {
                    const isCurrentMonthDay =
                      moment(date).jMonth() === moment(currentMonth).jMonth();
                    const isSelected = isDateSelected(date);
                    const isInRange = isDateInRange(date);
                    const isDisabled = isDateDisabled(date);
                    const isToday =
                      date.toDateString() === new Date().toDateString();

                    return (
                      <div key={index} className="relative">
                        <motion.button
                          type="button"
                          whileHover={!isDisabled ? { scale: 1.1 } : {}}
                          whileTap={!isDisabled ? { scale: 0.95 } : {}}
                          onClick={(e) => {
                            e.preventDefault();
                            handleDateClick(date);
                          }}
                          onMouseEnter={() => {
                            if (!isDisabled) {
                              setHoveredDate(date);
                              setTooltipDate(date);
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredDate(null);
                            setTooltipDate(null);
                          }}
                          disabled={isDisabled}
                          className={`
                            w-10 h-10 rounded-lg text-sm font-medium transition-all relative
                            ${!isCurrentMonthDay ? "text-default-300" : "text-default-700"}
                            ${isDisabled ? "text-default-200 cursor-not-allowed" : "hover:bg-default-100"}
                            ${isSelected ? "bg-primary text-primary-foreground font-bold" : ""}
                            ${isInRange && !isSelected ? "bg-primary-50" : ""}
                            ${isToday && !isSelected ? "border-2 border-primary" : ""}
                          `}
                        >
                          {moment(date).jDate()}

                          {/* Tooltip */}
                          <AnimatePresence>
                            {tooltipDate?.toDateString() ===
                              date.toDateString() &&
                              !isDisabled && (
                                <motion.div
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 5 }}
                                  className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-default-900 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none"
                                >
                                  {(() => {
                                    // اگه تاریخ شروع انتخاب شده و تاریخ hover شده قبل از اون باشه
                                    if (
                                      selectedRange.start &&
                                      !selectedRange.end
                                    ) {
                                      const startDate = dateValueToDate(
                                        selectedRange.start
                                      );
                                      if (date < startDate) {
                                        return "انتخاب تاریخ شروع";
                                      }
                                    }
                                    // در غیر این صورت بر اساس حالت فعلی
                                    return isSelectingStart
                                      ? "انتخاب تاریخ شروع"
                                      : "انتخاب تاریخ پایان";
                                  })()}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-default-900"></div>
                                </motion.div>
                              )}
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    );
                  })}
                </div>

                {/* Selection Status */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-center text-xs text-default-500"
                >
                  {selectedRange.start && !selectedRange.end && (
                    <p>تاریخ پایان را انتخاب کنید</p>
                  )}
                  {selectedRange.start && selectedRange.end && (
                    <p className="text-success">
                      بازه انتخاب شده: {formatPersianDate(selectedRange.start)}{" "}
                      تا {formatPersianDate(selectedRange.end)}
                    </p>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default PersianRangeDatePicker;
