/**
 * Stats domain module
 * Pure functions for statistics and date calculations
 */

export {
  getMonthRange,
  getToday,
  isValidDateFormat,
  isValidMonthFormat,
} from "./date-range.js";

export {
  calculateAverage,
  getTopN,
  calculateRecapStats,
  normalizeDbAverage,
} from "./stats-calculator.js";
