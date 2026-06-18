import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Minus,
  X,
  Save,
  Trash2,
  Copy,
  AlertTriangle,
  ChevronDown,
  RotateCcw,
  Check,
  FolderOpen,
  Stethoscope,
  Sparkles,
} from "lucide-react";

// ============================================================
// DATA — 2026 fee schedules (PT/PTA/OT/OTA xlsx, ingested 2026-06-18)
// Rate table is identical across all four provider-type files
// ============================================================

const FEE_SCHEDULE_PAYERS = [
  "Medicare",
  "BCBS Commercial",
  "VA CCN",
  "Humana Medicare",
  "BCBS Medicare",
  "BlueCare",
  "Amerigroup / WellPoint",
  "Amerivantage",
  "WellCare",
  "Tricare East",
  "Dept of Labor",
  "Aetna",
  "Ambetter",
];

const CONTRACT_PAYERS = {
  BARDAVON: 105,
  "CIGNA / ASH": 100,
  Keyscripts: 105,
  MEDRISK: 80,
  ONECALL: 80,
  "Self Pay": 125,
  SPNet: 80,
  UHSS: 60,
};

// Flat per-day payers — total is fixed regardless of which codes are billed.
// Codes can still be selected for documentation; individual rates are not displayed.
// strappingBonus (Workers Comp): if any strapping code (ST/SSH/SE/SHAND/SHIP/SK/SF/STOE)
// is in the selection, add this amount to the per-day flat rate.
const FLAT_RATE_PAYERS = {
  "Workers Comp": { perDay: 80, strappingBonus: 25 },
  "Web TPA": { perDay: 55 },
  Attorney: { perDay: 150 },
  "UHC (No Secondary)": { perDay: 100 }, // ASH rate when UHC Commercial has no secondary
  "UMR (No Secondary)": { perDay: 100 }, // UMR follows UHC rules — ASH $100/day
};

// Special-case payers — calc shows $0 and surfaces an explanatory banner.
const SPECIAL_PAYERS = {
  "UHC (W/ Secondary)": {
    message: "Bill the secondary insurance — UHC Commercial pays $0 when a secondary is present.",
  },
  "UMR (W/ Secondary)": {
    message: "Bill the secondary insurance — UMR follows UHC rules and pays $0 when a secondary is present.",
  },
};

// Master rate table — code key -> { payer: rate }. 0 means not covered.
// Sourced from PT_Reimbursement_Calculator_-_2026.xlsx PRICING sheet
// (PTA/OT/OTA files share identical rates).
const RATES = {
  DN1: { Medicare: 22.51, "BCBS Commercial": 0, "VA CCN": 23.29, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 19.78, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  DN2: { Medicare: 32.9, "BCBS Commercial": 0, "VA CCN": 35.67, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 29.35, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  ST: { Medicare: 27.98, "BCBS Commercial": 0, "VA CCN": 25.13, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 20.39, Amerivantage: 29.27, WellCare: 0, "Tricare East": 22.76, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  SSH: { Medicare: 26.27, "BCBS Commercial": 0, "VA CCN": 23.07, "Humana Medicare": 11.06, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 19.73, Amerivantage: 26.51, WellCare: 0, "Tricare East": 21.36, "Dept of Labor": 0, Aetna: 0, Ambetter: 19.03 },
  SE: { Medicare: 25.77, "BCBS Commercial": 0, "VA CCN": 26.19, "Humana Medicare": 21.98, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 22.85, Amerivantage: 22.85, WellCare: 0, "Tricare East": 20.94, "Dept of Labor": 0, Aetna: 0, Ambetter: 26.95 },
  SHAND: { Medicare: 27.53, "BCBS Commercial": 0, "VA CCN": 27.98, "Humana Medicare": 23.1, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 23.1, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 14.24 },
  SHIP: { Medicare: 30.44, "BCBS Commercial": 0, "VA CCN": 27.72, "Humana Medicare": 11.89, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 21.5, Amerivantage: 0, WellCare: 0, "Tricare East": 21.04, "Dept of Labor": 0, Aetna: 0, Ambetter: 33.06 },
  SK: { Medicare: 26.16, "BCBS Commercial": 0, "VA CCN": 22.6, "Humana Medicare": 11.48, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 19.51, Amerivantage: 0, WellCare: 0, "Tricare East": 18.08, "Dept of Labor": 0, Aetna: 0, Ambetter: 25.78 },
  SF: { Medicare: 25.87, "BCBS Commercial": 0, "VA CCN": 21.77, "Humana Medicare": 10.56, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 17.21, Amerivantage: 0, WellCare: 0, "Tricare East": 20.48, "Dept of Labor": 0, Aetna: 0, Ambetter: 13.68 },
  STOE: { Medicare: 15.0, "BCBS Commercial": 0, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  CR: { Medicare: 38.37, "BCBS Commercial": 47.38, "VA CCN": 0, "Humana Medicare": 25.0, "BCBS Medicare": 30.0, BlueCare: 32.98, "Amerigroup / WellPoint": 26.79, Amerivantage: 0, WellCare: 0, "Tricare East": 31.19, "Dept of Labor": 0, Aetna: 42.53, Ambetter: 23.29 },
  TRX: { Medicare: 10.7, "BCBS Commercial": 10.64, "VA CCN": 0, "Humana Medicare": 7.26, "BCBS Medicare": 9.37, BlueCare: 13.48, "Amerigroup / WellPoint": 7.34, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 6.88, Ambetter: 9.5 },
  ES: { Medicare: 0, "BCBS Commercial": 11.74, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 12.25, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 18.44, Aetna: 0, Ambetter: 11.51 },
  VASO: { Medicare: 7.32, "BCBS Commercial": 8.57, "VA CCN": 7.19, "Humana Medicare": 5.63, "BCBS Medicare": 7.56, BlueCare: 10.93, "Amerigroup / WellPoint": 7.7, Amerivantage: 7.55, WellCare: 7.05, "Tricare East": 7.42, "Dept of Labor": 17.51, Aetna: 4.53, Ambetter: 7.87 },
  PB: { Medicare: 3.34, "BCBS Commercial": 7.87, "VA CCN": 3.85, "Humana Medicare": 0, "BCBS Medicare": 3.78, BlueCare: 5.59, "Amerigroup / WellPoint": 4.91, Amerivantage: 0, WellCare: 0, "Tricare East": 4.48, "Dept of Labor": 7.93, Aetna: 0, Ambetter: 0 },
  IONTO: { Medicare: 0, "BCBS Commercial": 16.24, "VA CCN": 0, "Humana Medicare": 5.0, "BCBS Medicare": 0, BlueCare: 15.64, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 40.0, Aetna: 0, Ambetter: 0 },
  "2IONTO": { Medicare: 0, "BCBS Commercial": 16.24, "VA CCN": 0, "Humana Medicare": 10.0, "BCBS Medicare": 0, BlueCare: 15.64, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 40.0, Aetna: 0, Ambetter: 0 },
  US: { Medicare: 9.85, "BCBS Commercial": 9.56, "VA CCN": 10.01, "Humana Medicare": 6.91, "BCBS Medicare": 9.81, BlueCare: 10.92, "Amerigroup / WellPoint": 7.76, Amerivantage: 0, WellCare: 0, "Tricare East": 10.45, "Dept of Labor": 0, Aetna: 0, Ambetter: 9.4 },
  TX: { Medicare: 18.15, "BCBS Commercial": 24.23, "VA CCN": 17.82, "Humana Medicare": 13.96, "BCBS Medicare": 20.99, BlueCare: 19.04, "Amerigroup / WellPoint": 15.07, Amerivantage: 15.07, WellCare: 20.54, "Tricare East": 18.5, "Dept of Labor": 43.58, Aetna: 11.2, Ambetter: 17.73 },
  "2TX": { Medicare: 41.25, "BCBS Commercial": 48.45, "VA CCN": 35.64, "Humana Medicare": 27.92, "BCBS Medicare": 36.28, BlueCare: 38.08, "Amerigroup / WellPoint": 30.14, Amerivantage: 30.14, WellCare: 41.08, "Tricare East": 37.0, "Dept of Labor": 87.16, Aetna: 22.4, Ambetter: 35.46 },
  "3TX": { Medicare: 61.87, "BCBS Commercial": 72.68, "VA CCN": 53.46, "Humana Medicare": 41.88, "BCBS Medicare": 54.42, BlueCare: 57.12, "Amerigroup / WellPoint": 45.21, Amerivantage: 45.21, WellCare: 61.62, "Tricare East": 55.5, "Dept of Labor": 130.74, Aetna: 33.6, Ambetter: 53.19 },
  "4TX": { Medicare: 80.02, "BCBS Commercial": 90.0, "VA CCN": 71.28, "Humana Medicare": 55.84, "BCBS Medicare": 72.56, BlueCare: 76.16, "Amerigroup / WellPoint": 60.28, Amerivantage: 60.28, WellCare: 82.16, "Tricare East": 74.0, "Dept of Labor": 174.32, Aetna: 44.8, Ambetter: 70.92 },
  NR: { Medicare: 20.19, "BCBS Commercial": 25.23, "VA CCN": 19.81, "Humana Medicare": 12.65, "BCBS Medicare": 20.1, BlueCare: 21.08, "Amerigroup / WellPoint": 20.17, Amerivantage: 17.14, WellCare: 22.84, "Tricare East": 24.21, "Dept of Labor": 48.5, Aetna: 12.98, Ambetter: 21.79 },
  "2NR": { Medicare: 40.38, "BCBS Commercial": 50.47, "VA CCN": 46.62, "Humana Medicare": 25.3, "BCBS Medicare": 40.2, BlueCare: 42.16, "Amerigroup / WellPoint": 40.34, Amerivantage: 34.28, WellCare: 45.68, "Tricare East": 48.42, "Dept of Labor": 96.99, Aetna: 25.96, Ambetter: 43.58 },
  "3NR": { Medicare: 60.57, "BCBS Commercial": 75.7, "VA CCN": 76.88, "Humana Medicare": 37.95, "BCBS Medicare": 60.3, BlueCare: 63.24, "Amerigroup / WellPoint": 60.51, Amerivantage: 51.42, WellCare: 68.52, "Tricare East": 72.62, "Dept of Labor": 145.5, Aetna: 38.94, Ambetter: 65.37 },
  "4NR": { Medicare: 80.76, "BCBS Commercial": 100.93, "VA CCN": 93.0, "Humana Medicare": 50.6, "BCBS Medicare": 80.4, BlueCare: 84.32, "Amerigroup / WellPoint": 80.68, Amerivantage: 68.56, WellCare: 91.36, "Tricare East": 96.84, "Dept of Labor": 194.0, Aetna: 51.92, Ambetter: 87.16 },
  AQ: { Medicare: 29.14, "BCBS Commercial": 31.86, "VA CCN": 25.0, "Humana Medicare": 20.0, "BCBS Medicare": 20.0, BlueCare: 21.53, "Amerigroup / WellPoint": 19.09, Amerivantage: 28.83, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 29.62, Ambetter: 25.57 },
  AQ2: { Medicare: 58.28, "BCBS Commercial": 63.73, "VA CCN": 50.0, "Humana Medicare": 40.0, "BCBS Medicare": 0, BlueCare: 44.14, "Amerigroup / WellPoint": 38.19, Amerivantage: 57.66, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 59.23, Ambetter: 51.14 },
  AQ3: { Medicare: 75.95, "BCBS Commercial": 95.59, "VA CCN": 75.0, "Humana Medicare": 50.0, "BCBS Medicare": 0, BlueCare: 66.2, "Amerigroup / WellPoint": 57.27, Amerivantage: 86.49, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 66.01, Ambetter: 76.72 },
  AQ4: { Medicare: 94.6, "BCBS Commercial": 127.45, "VA CCN": 100.0, "Humana Medicare": 70.0, "BCBS Medicare": 0, BlueCare: 88.27, "Amerigroup / WellPoint": 76.36, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 85.59, Ambetter: 102.28 },
  AQ5: { Medicare: 113.25, "BCBS Commercial": 159.32, "VA CCN": 125.0, "Humana Medicare": 80.0, "BCBS Medicare": 0, BlueCare: 110.34, "Amerigroup / WellPoint": 95.45, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 127.85 },
  GT: { Medicare: 18.15, "BCBS Commercial": 21.17, "VA CCN": 17.82, "Humana Medicare": 14.03, "BCBS Medicare": 18.07, BlueCare: 18.34, "Amerigroup / WellPoint": 14.91, Amerivantage: 26.75, WellCare: 17.46, "Tricare East": 21.76, "Dept of Labor": 42.78, Aetna: 11.39, Ambetter: 19.58 },
  "2GT": { Medicare: 41.25, "BCBS Commercial": 42.34, "VA CCN": 35.64, "Humana Medicare": 28.06, "BCBS Medicare": 36.14, BlueCare: 36.68, "Amerigroup / WellPoint": 29.82, Amerivantage: 53.5, WellCare: 34.92, "Tricare East": 43.52, "Dept of Labor": 85.56, Aetna: 0, Ambetter: 0 },
  "3GT": { Medicare: 61.87, "BCBS Commercial": 63.51, "VA CCN": 53.46, "Humana Medicare": 42.09, "BCBS Medicare": 54.21, BlueCare: 55.02, "Amerigroup / WellPoint": 44.73, Amerivantage: 80.25, WellCare: 52.38, "Tricare East": 65.28, "Dept of Labor": 128.34, Aetna: 0, Ambetter: 0 },
  MT: { Medicare: 17.72, "BCBS Commercial": 22.51, "VA CCN": 16.9, "Humana Medicare": 13.25, "BCBS Medicare": 17.15, BlueCare: 21.87, "Amerigroup / WellPoint": 16.21, Amerivantage: 16.21, WellCare: 16.56, "Tricare East": 20.54, "Dept of Labor": 39.76, Aetna: 10.37, Ambetter: 18.49 },
  "2MT": { Medicare: 35.44, "BCBS Commercial": 45.02, "VA CCN": 33.8, "Humana Medicare": 26.5, "BCBS Medicare": 34.3, BlueCare: 43.74, "Amerigroup / WellPoint": 32.42, Amerivantage: 32.42, WellCare: 33.12, "Tricare East": 41.09, "Dept of Labor": 79.52, Aetna: 20.74, Ambetter: 36.97 },
  "3MT": { Medicare: 53.16, "BCBS Commercial": 59.04, "VA CCN": 50.7, "Humana Medicare": 39.75, "BCBS Medicare": 51.45, BlueCare: 65.61, "Amerigroup / WellPoint": 48.64, Amerivantage: 48.63, WellCare: 49.68, "Tricare East": 61.62, "Dept of Labor": 119.28, Aetna: 31.11, Ambetter: 55.14 },
  "4MT": { Medicare: 70.88, "BCBS Commercial": 65.0, "VA CCN": 67.6, "Humana Medicare": 53.0, "BCBS Medicare": 68.6, BlueCare: 87.48, "Amerigroup / WellPoint": 64.84, Amerivantage: 64.84, WellCare: 66.24, "Tricare East": 82.16, "Dept of Labor": 159.04, Aetna: 41.48, Ambetter: 73.52 },
  GPT: { Medicare: 11.71, "BCBS Commercial": 13.05, "VA CCN": 11.08, "Humana Medicare": 8.98, "BCBS Medicare": 0, BlueCare: 15.67, "Amerigroup / WellPoint": 10.66, Amerivantage: 0, WellCare: 0, "Tricare East": 11.23, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  "EVAL-61": { Medicare: 91.06, "BCBS Commercial": 59.75, "VA CCN": 92.54, "Humana Medicare": 72.85, "BCBS Medicare": 90.99, BlueCare: 64.78, "Amerigroup / WellPoint": 48.48, Amerivantage: 48.48, WellCare: 75.99, "Tricare East": 74.03, "Dept of Labor": 146.22, Aetna: 58.55, Ambetter: 74.03 },
  "EVAL-62": { Medicare: 91.06, "BCBS Commercial": 59.75, "VA CCN": 92.54, "Humana Medicare": 72.85, "BCBS Medicare": 90.99, BlueCare: 64.78, "Amerigroup / WellPoint": 48.48, Amerivantage: 48.48, WellCare: 75.99, "Tricare East": 74.03, "Dept of Labor": 146.22, Aetna: 58.55, Ambetter: 74.03 },
  "EVAL-63": { Medicare: 91.06, "BCBS Commercial": 59.75, "VA CCN": 92.54, "Humana Medicare": 72.85, "BCBS Medicare": 90.99, BlueCare: 64.78, "Amerigroup / WellPoint": 48.48, Amerivantage: 48.48, WellCare: 75.99, "Tricare East": 74.03, "Dept of Labor": 146.22, Aetna: 58.55, Ambetter: 74.03 },
  "RE-EVAL-4": { Medicare: 63.09, "BCBS Commercial": 0, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 32.69, Amerivantage: 0, WellCare: 0, "Tricare East": 50.86, "Dept of Labor": 0, Aetna: 32.42, Ambetter: 0 },
  "EVAL-65": { Medicare: 93.34, "BCBS Commercial": 57.99, "VA CCN": 95.94, "Humana Medicare": 74.37, "BCBS Medicare": 93.26, BlueCare: 62.87, "Amerigroup / WellPoint": 52.18, Amerivantage: 52.18, WellCare: 93.26, "Tricare East": 75.89, "Dept of Labor": 152.03, Aetna: 56.84, Ambetter: 76.1 },
  "EVAL-66": { Medicare: 93.34, "BCBS Commercial": 57.99, "VA CCN": 95.94, "Humana Medicare": 74.37, "BCBS Medicare": 93.26, BlueCare: 62.87, "Amerigroup / WellPoint": 52.18, Amerivantage: 52.18, WellCare: 93.26, "Tricare East": 75.89, "Dept of Labor": 152.03, Aetna: 56.84, Ambetter: 76.1 },
  "EVAL-67": { Medicare: 93.34, "BCBS Commercial": 57.99, "VA CCN": 95.94, "Humana Medicare": 74.37, "BCBS Medicare": 93.26, BlueCare: 62.87, "Amerigroup / WellPoint": 52.18, Amerivantage: 52.18, WellCare: 93.26, "Tricare East": 75.89, "Dept of Labor": 152.03, Aetna: 56.84, Ambetter: 76.1 },
  "RE-EVAL-8": { Medicare: 63.99, "BCBS Commercial": 0, "VA CCN": 0, "Humana Medicare": 51.12, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 35.42, Amerivantage: 0, WellCare: 0, "Tricare East": 52.16, "Dept of Labor": 0, Aetna: 35.12, Ambetter: 0 },
  TA: { Medicare: 20.26, "BCBS Commercial": 26.07, "VA CCN": 23.39, "Humana Medicare": 21.57, "BCBS Medicare": 22.92, BlueCare: 18.56, "Amerigroup / WellPoint": 19.69, Amerivantage: 19.69, WellCare: 17.03, "Tricare East": 25.9, "Dept of Labor": 51.89, Aetna: 15.93, Ambetter: 22.15 },
  "2TA": { Medicare: 40.52, "BCBS Commercial": 52.14, "VA CCN": 46.78, "Humana Medicare": 37.36, "BCBS Medicare": 45.84, BlueCare: 37.12, "Amerigroup / WellPoint": 39.38, Amerivantage: 39.38, WellCare: 34.06, "Tricare East": 51.81, "Dept of Labor": 103.78, Aetna: 31.86, Ambetter: 44.3 },
  "3TA": { Medicare: 60.78, "BCBS Commercial": 78.2, "VA CCN": 70.17, "Humana Medicare": 52.99, "BCBS Medicare": 68.76, BlueCare: 55.68, "Amerigroup / WellPoint": 59.07, Amerivantage: 59.07, WellCare: 51.09, "Tricare East": 77.71, "Dept of Labor": 155.67, Aetna: 47.79, Ambetter: 66.45 },
  "4TA": { Medicare: 81.04, "BCBS Commercial": 104.27, "VA CCN": 93.56, "Humana Medicare": 68.62, "BCBS Medicare": 91.68, BlueCare: 74.24, "Amerigroup / WellPoint": 78.76, Amerivantage: 78.76, WellCare: 68.12, "Tricare East": 103.6, "Dept of Labor": 207.56, Aetna: 63.72, Ambetter: 88.6 },
  SI: { Medicare: 50.0, "BCBS Commercial": 22.04, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 21.44, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  SELFCARE: { Medicare: 22.05, "BCBS Commercial": 0, "VA CCN": 22.41, "Humana Medicare": 15.36, "BCBS Medicare": 0, BlueCare: 20.96, "Amerigroup / WellPoint": 19.87, Amerivantage: 19.87, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 15.97, Ambetter: 24.07 },
  WC: { Medicare: 87.26, "BCBS Commercial": 54.88, "VA CCN": 88.68, "Humana Medicare": 62.61, "BCBS Medicare": 77.08, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 72.93, Ambetter: 0 },
  WC2: { Medicare: 87.26, "BCBS Commercial": 36.41, "VA CCN": 79.9, "Humana Medicare": 29.43, "BCBS Medicare": 34.46, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 24.5, Ambetter: 0 },
  PPT: { Medicare: 22.62, "BCBS Commercial": 0, "VA CCN": 22.99, "Humana Medicare": 15.38, "BCBS Medicare": 0, BlueCare: 20.8, "Amerigroup / WellPoint": 0, Amerivantage: 30.75, WellCare: 19.15, "Tricare East": 25.0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  OM: { Medicare: 0, "BCBS Commercial": 0, "VA CCN": 0, "Humana Medicare": 30.0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 26.79, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 26.79, Ambetter: 0 },
  "2OM": { Medicare: 0, "BCBS Commercial": 0, "VA CCN": 0, "Humana Medicare": 50.0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 53.58, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 36.74, Ambetter: 0 },
  "3OM": { Medicare: 0, "BCBS Commercial": 0, "VA CCN": 0, "Humana Medicare": 70.0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 54.14, Ambetter: 0 },
  ESM: { Medicare: 7.58, "BCBS Commercial": 0, "VA CCN": 7.44, "Humana Medicare": 5.84, "BCBS Medicare": 8.57, BlueCare: 0, "Amerigroup / WellPoint": 9.01, Amerivantage: 8.85, WellCare: 7.28, "Tricare East": 7.82, "Dept of Labor": 17.9, Aetna: 6.31, Ambetter: 7.88 },
  RTM98984: { Medicare: 0, "BCBS Commercial": 0, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  RTM98985: { Medicare: 0, "BCBS Commercial": 44.76, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  RTM98976: { Medicare: 0, "BCBS Commercial": 0, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  RTM98977: { Medicare: 0, "BCBS Commercial": 0, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  RTM98978: { Medicare: 0, "BCBS Commercial": 0, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  RTM98975: { Medicare: 19.18, "BCBS Commercial": 16.75, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 16.81, BlueCare: 0, "Amerigroup / WellPoint": 12.76, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  RTM98979: { Medicare: 0, "BCBS Commercial": 0, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  RTM98980: { Medicare: 49.89, "BCBS Commercial": 48.67, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
  RTM98981: { Medicare: 0, "BCBS Commercial": 37.56, "VA CCN": 0, "Humana Medicare": 0, "BCBS Medicare": 0, BlueCare: 0, "Amerigroup / WellPoint": 0, Amerivantage: 0, WellCare: 0, "Tricare East": 0, "Dept of Labor": 0, Aetna: 0, Ambetter: 0 },
};


// Code metadata: CPT, description, max units (1 = no stepper).
// For unit-based codes, "TX" is the display key and the calculator
// auto-resolves to TX/2TX/3TX/4TX based on quantity selected.
const CODE_DETAILS = {
  // Evaluations
  "EVAL-61": { cpt: "97161", desc: "PT Eval – Low Complexity", maxUnits: 1, discipline: "PT" },
  "EVAL-62": { cpt: "97162", desc: "PT Eval – Moderate Complexity", maxUnits: 1, discipline: "PT" },
  "EVAL-63": { cpt: "97163", desc: "PT Eval – High Complexity", maxUnits: 1, discipline: "PT" },
  "RE-EVAL-4": { cpt: "97164", desc: "PT Re-Evaluation", maxUnits: 1, discipline: "PT" },
  "EVAL-65": { cpt: "97165", desc: "OT Eval – Low Complexity", maxUnits: 1, discipline: "OT" },
  "EVAL-66": { cpt: "97166", desc: "OT Eval – Moderate Complexity", maxUnits: 1, discipline: "OT" },
  "EVAL-67": { cpt: "97167", desc: "OT Eval – High Complexity", maxUnits: 1, discipline: "OT" },
  "RE-EVAL-8": { cpt: "97168", desc: "OT Re-Evaluation", maxUnits: 1, discipline: "OT" },
  // Therapeutic (unit codes)
  TX: { cpt: "97110", desc: "Therapeutic Exercise", maxUnits: 4 },
  NR: { cpt: "97112", desc: "Neuromuscular Re-Education", maxUnits: 4 },
  MT: { cpt: "97140", desc: "Manual Therapy", maxUnits: 4 },
  TA: { cpt: "97530", desc: "Therapeutic Activity", maxUnits: 4 },
  GT: { cpt: "97116", desc: "Gait Training", maxUnits: 3 },
  GPT: { cpt: "97150", desc: "Group Therapy", maxUnits: 1 },
  // Modalities
  ESM: { cpt: "G0283", desc: "E-Stim (Medicare)", maxUnits: 1 },
  ES: { cpt: "97014", desc: "E-Stim (Commercial)", maxUnits: 1 },
  VASO: { cpt: "97016", desc: "Vasopneumatic Device", maxUnits: 1 },
  US: { cpt: "97035", desc: "Ultrasound", maxUnits: 1 },
  TRX: { cpt: "97012", desc: "Mechanical Traction", maxUnits: 1 },
  PB: { cpt: "97018", desc: "Paraffin Bath", maxUnits: 1 },
  IONTO: { cpt: "97033", desc: "Iontophoresis", maxUnits: 2 },
  CR: { cpt: "95992", desc: "Canalith Repositioning", maxUnits: 1 },
  PPT: { cpt: "97750", desc: "Physical Performance Test", maxUnits: 1 },
  SELFCARE: { cpt: "97535", desc: "Self-Care / Home Mgmt Training", maxUnits: 1 },
  SI: { cpt: "97533", desc: "Sensory Integration", maxUnits: 1 },
  // Aquatic
  AQ: { cpt: "97113", desc: "Aquatic Therapy", maxUnits: 5 },
  // Strapping
  ST: { cpt: "29200", desc: "Strapping – Thorax", maxUnits: 1 },
  SSH: { cpt: "29240", desc: "Strapping – Shoulder", maxUnits: 1 },
  SE: { cpt: "29260", desc: "Strapping – Elbow/Wrist", maxUnits: 1 },
  SHAND: { cpt: "29280", desc: "Strapping – Hand/Finger", maxUnits: 1 },
  SHIP: { cpt: "29520", desc: "Strapping – Hip", maxUnits: 1 },
  SK: { cpt: "29530", desc: "Strapping – Knee", maxUnits: 1 },
  SF: { cpt: "29540", desc: "Strapping – Foot/Ankle", maxUnits: 1 },
  STOE: { cpt: "29550", desc: "Strapping – Toes", maxUnits: 1 },
  // Dry needling
  DN1: { cpt: "20560", desc: "Dry Needling – 1–2 muscles", maxUnits: 1 },
  DN2: { cpt: "20561", desc: "Dry Needling – 3+ muscles", maxUnits: 1 },
  // Wound care
  WC: { cpt: "97597", desc: "Wound Care – first 20 sq cm", maxUnits: 1 },
  WC2: { cpt: "97598", desc: "Wound Care – add'l 20 sq cm", maxUnits: 1 },
  // Orthotic
  OM: { cpt: "97760", desc: "Orthotic Mgmt & Training", maxUnits: 3 },
  // Remote Therapeutic Monitoring (new for 2026)
  RTM98975: { cpt: "98975", desc: "RTM – Initial Setup & Patient Education", maxUnits: 1 },
  RTM98976: { cpt: "98976", desc: "RTM – Respiratory Device Supply (16+ days)", maxUnits: 1 },
  RTM98977: { cpt: "98977", desc: "RTM – Musculoskeletal Device Supply (16+ days)", maxUnits: 1 },
  RTM98978: { cpt: "98978", desc: "RTM – Cognitive/Behavioral Device Supply (16+ days)", maxUnits: 1 },
  RTM98979: { cpt: "98979", desc: "RTM – 10–19 min Professional Time / Month", maxUnits: 1 },
  RTM98980: { cpt: "98980", desc: "RTM – First 20 min Treatment Mgmt / Month", maxUnits: 1 },
  RTM98981: { cpt: "98981", desc: "RTM – Each Add'l 20 min Treatment Mgmt", maxUnits: 1 },
  RTM98984: { cpt: "98984", desc: "RTM – MSK/Respiratory Device (2–15 days)", maxUnits: 1 },
  RTM98985: { cpt: "98985", desc: "RTM – MSK/Respiratory Device (16–30 days)", maxUnits: 1 },
};

// For unit-based codes: quantity -> rate-table key
const UNIT_KEY_MAP = {
  TX: { 1: "TX", 2: "2TX", 3: "3TX", 4: "4TX" },
  NR: { 1: "NR", 2: "2NR", 3: "3NR", 4: "4NR" },
  MT: { 1: "MT", 2: "2MT", 3: "3MT", 4: "4MT" },
  TA: { 1: "TA", 2: "2TA", 3: "3TA", 4: "4TA" },
  GT: { 1: "GT", 2: "2GT", 3: "3GT" },
  AQ: { 1: "AQ", 2: "AQ2", 3: "AQ3", 4: "AQ4", 5: "AQ5" },
  OM: { 1: "OM", 2: "2OM", 3: "3OM" },
  IONTO: { 1: "IONTO", 2: "2IONTO" },
};

const CODE_GROUPS = {
  Evaluations: ["EVAL-61", "EVAL-62", "EVAL-63", "RE-EVAL-4", "EVAL-65", "EVAL-66", "EVAL-67", "RE-EVAL-8"],
  Therapeutic: ["TX", "NR", "MT", "TA", "GT", "GPT"],
  Modalities: ["ESM", "ES", "VASO", "US", "TRX", "PB", "IONTO", "CR", "PPT", "SELFCARE", "SI"],
  Aquatic: ["AQ"],
  Strapping: ["ST", "SSH", "SE", "SHAND", "SHIP", "SK", "SF", "STOE"],
  "Dry Needling": ["DN1", "DN2"],
  "Wound Care": ["WC", "WC2"],
  Orthotic: ["OM"],
  "Remote Therapeutic Monitoring": ["RTM98975", "RTM98976", "RTM98977", "RTM98978", "RTM98979", "RTM98980", "RTM98981", "RTM98984", "RTM98985"],
};

// Provider rosters by discipline — pulled from per-clinician tabs in the
// four 2026 xlsx files (PT/PTA/OT/OTA). Eval availability and contract
// modifiers depend on discipline, not location.
const PROVIDERS = {
  PT: ["J Bentley", "K Bonk", "J Cook", "A Fowler", "L Harris", "R Harris", "K Kirk", "E Moucha", "C Neely", "D Newberry", "J Runions", "K Wright"],
  PTA: ["Bradley", "Brown", "Carpenter", "Cincebox", "Collis", "Cox", "G Durham", "L Durham", "Keener", "Lee", "Nelson", "Shultz", "Straquadine", "Warren", "B Brewer", "R Gibson"],
  OT: ["K Bowers", "S Hurd", "A McGlohon", "M Misenheimer", "E Patterson", "E Reece", "R Rich"],
  OTA: ["Collins", "Jones", "Miller"],
};

// Reverse lookup: provider name -> discipline. Built once at module load.
const PROVIDER_DISCIPLINE = Object.fromEntries(
  Object.entries(PROVIDERS).flatMap(([disc, names]) => names.map((n) => [n, disc]))
);

// Payer-specific billing rules: list of { test, message, severity? }.
// `test` receives the array of resolved rate-table keys currently selected
// (e.g. ["MT", "2TA", "EVAL-61"]) and returns true to surface the warning.
// The "_global" key runs against every payer.
// severity: "error" (red, hard rule) | "warn" (amber, soft preference). Default = "warn".
const STRAPPING_KEYS = ["ST", "SSH", "SE", "SHAND", "SHIP", "SK", "SF", "STOE"];
const PAYER_RULES = {
  _global: [
    {
      test: (keys) => keys.some((k) => /^[2-4]?MT$/.test(k)) && keys.includes("97124"),
      message: "97140 (Manual) and 97124 (Massage) cannot be billed together — all payers.",
      severity: "error",
    },
  ],
  Aetna: [
    {
      test: (keys) => keys.some((k) => /^[2-4]?MT$/.test(k)) && keys.some((k) => /^[2-4]?TA$/.test(k)),
      message: "TA and MT cannot be billed together.",
      severity: "error",
    },
    {
      test: (keys) => keys.length > 4,
      message: "Aetna pays only your 4 lowest-rate covered codes. Drop to 4 or pick your strongest 4.",
      severity: "warn",
    },
  ],
  "Humana Medicare": [
    {
      test: (keys) => keys.includes("GPT") && keys.some((k) => /^[2-4]?MT$/.test(k)),
      message: "Group therapy and Manual Therapy cannot be billed together.",
      severity: "error",
    },
    {
      test: (keys) => keys.some((k) => /^[2-4]/.test(k)),
      message: "No 97 modifier on multi-unit codes (codes beginning with 2/3/4).",
      severity: "error",
    },
  ],
  Medicare: [
    {
      test: (keys) => keys.some((k) => /^[2-4]/.test(k)) || keys.some((k) => /^DN/.test(k)) || keys.some((k) => /^S/.test(k) && k !== "SELFCARE" && k !== "SI"),
      message: "No 59 modifier on multi-unit codes, dry needling, or strapping codes.",
      severity: "error",
    },
    {
      test: (keys) => keys.some((k) => /^[2-4]?TA$/.test(k)) && !keys.some((k) => /^[2-4]?NR$/.test(k)),
      message: "Medicare prefers NR over TA. Consider swapping TA → NR to reduce denial risk.",
      severity: "warn",
    },
  ],
  "CIGNA / ASH": [
    {
      test: (keys) => keys.includes("VASO") || keys.some((k) => /^DN/.test(k)) || keys.some((k) => /^S/.test(k) && k !== "SELFCARE" && k !== "SI"),
      message: "Cigna does not reimburse for 97016-Vaso, dry needling, or strapping codes.",
      severity: "error",
    },
  ],
  // BCBS family — soft preferences (TX > MT, 2TA > 2NR). Apply to BCBS Commercial,
  // BCBS Medicare, and BlueCare. If BlueAdvantage / HG+ get their own entries later,
  // duplicate these rules under those keys.
  "BCBS Commercial": [
    {
      test: (keys) => keys.some((k) => /^[2-4]?MT$/.test(k)) && !keys.some((k) => /^[2-4]?TX$/.test(k)),
      message: "BCBS pays TX higher than MT — consider swapping MT → TX.",
      severity: "warn",
    },
    {
      test: (keys) => keys.includes("2NR") && !keys.includes("2TA"),
      message: "BCBS pays 2TA higher than 2NR — consider swapping 2NR → 2TA.",
      severity: "warn",
    },
  ],
  "BCBS Medicare": [
    {
      test: (keys) => keys.some((k) => /^[2-4]?MT$/.test(k)) && !keys.some((k) => /^[2-4]?TX$/.test(k)),
      message: "BCBS pays TX higher than MT — consider swapping MT → TX.",
      severity: "warn",
    },
    {
      test: (keys) => keys.includes("2NR") && !keys.includes("2TA"),
      message: "BCBS pays 2TA higher than 2NR — consider swapping 2NR → 2TA.",
      severity: "warn",
    },
  ],
  BlueCare: [
    {
      test: (keys) => keys.some((k) => /^[2-4]?MT$/.test(k)) && !keys.some((k) => /^[2-4]?TX$/.test(k)),
      message: "BlueCare pays TX higher than MT — consider swapping MT → TX.",
      severity: "warn",
    },
    {
      test: (keys) => keys.includes("2NR") && !keys.includes("2TA"),
      message: "BlueCare pays 2TA higher than 2NR — consider swapping 2NR → 2TA.",
      severity: "warn",
    },
  ],
};

// ============================================================
// HELPERS
// ============================================================

const fmtUSD = (n) => `$${n.toFixed(2)}`;

// Return rate for (displayKey, qty, payer).
// Handles fee-schedule, contract, flat-rate, and special-case payers.
// For flat-rate and special payers, individual lines have no per-code rate (the
// total comes from getPayerOverride); covered=true means the code is selectable.
function getLineRate(displayKey, qty, payer) {
  if (!payer) return { rate: 0, resolvedKey: displayKey, covered: false, billingMode: "none" };

  const resolvedKey = UNIT_KEY_MAP[displayKey]?.[qty] ?? displayKey;

  // Flat-rate payers: individual code rate is suppressed; total comes from override.
  if (Object.prototype.hasOwnProperty.call(FLAT_RATE_PAYERS, payer)) {
    return { rate: 0, resolvedKey, covered: true, billingMode: "flat" };
  }
  // Special payers (UHC W/Secondary etc): $0 from this insurer.
  if (Object.prototype.hasOwnProperty.call(SPECIAL_PAYERS, payer)) {
    return { rate: 0, resolvedKey, covered: true, billingMode: "special" };
  }

  const isContract = Object.prototype.hasOwnProperty.call(CONTRACT_PAYERS, payer);
  const codeRow = RATES[resolvedKey];

  if (!codeRow) return { rate: 0, resolvedKey, covered: false, billingMode: "perCode" };

  if (isContract) {
    // Contract payers = Medicare × FS%
    const medicareRate = codeRow.Medicare ?? 0;
    if (medicareRate === 0) return { rate: 0, resolvedKey, covered: false, billingMode: "perCode" };
    const pct = CONTRACT_PAYERS[payer];
    return {
      rate: +(medicareRate * (pct / 100)).toFixed(2),
      resolvedKey,
      covered: true,
      billingMode: "perCode",
    };
  }

  const rate = codeRow[payer] ?? 0;
  return { rate, resolvedKey, covered: rate > 0, billingMode: "perCode" };
}

// Return override total for flat-rate or special payers; null for per-code payers.
// resolvedKeys: array of resolved rate-table keys currently selected.
// Returns { total, label, banner } where banner is an optional info message.
function getPayerOverride(payer, resolvedKeys) {
  if (!payer) return null;

  if (Object.prototype.hasOwnProperty.call(FLAT_RATE_PAYERS, payer)) {
    const cfg = FLAT_RATE_PAYERS[payer];
    let total = cfg.perDay;
    let label = `Flat ${fmtUSD(cfg.perDay)}/day`;
    if (cfg.strappingBonus && resolvedKeys.some((k) => STRAPPING_KEYS.includes(k))) {
      total += cfg.strappingBonus;
      label += ` + ${fmtUSD(cfg.strappingBonus)} strapping`;
    }
    return { total, label, banner: null };
  }

  if (Object.prototype.hasOwnProperty.call(SPECIAL_PAYERS, payer)) {
    return {
      total: 0,
      label: "Bill secondary",
      banner: SPECIAL_PAYERS[payer].message,
    };
  }

  return null;
}

// Detect OT provider by name suffix
// Detect OT-discipline provider (OT or OTA) — drives eval prioritization
const isOT = (name) => {
  if (!name) return false;
  const disc = PROVIDER_DISCIPLINE[name];
  return disc === "OT" || disc === "OTA";
};

// Persistent storage helpers (graceful fallback)
async function storageGet(key) {
  try {
    const result = await window.storage.get(key);
    return result?.value ? JSON.parse(result.value) : null;
  } catch {
    return null;
  }
}
async function storageSet(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

function Header({ total, payer, providerName, overrideLabel }) {
  return (
    <div
      className="sticky top-0 z-20 border-b border-black/10"
      style={{ background: "linear-gradient(135deg, #FF8200 0%, #ff9d3d 100%)" }}
    >
      <div className="px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: "#000" }}
          >
            <Stethoscope className="h-5 w-5" style={{ color: "#FF8200" }} />
          </div>
          <div className="min-w-0">
            <div className="text-white font-bold text-base sm:text-lg leading-tight tracking-tight truncate">
              Tristar Reimbursement Calculator
            </div>
            <div className="text-white/85 text-[11px] sm:text-xs truncate">
              {payer ? payer : "No payer selected"}
              {providerName ? <> · {providerName}</> : null}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-white/80 text-[10px] sm:text-xs uppercase tracking-wider">
            {overrideLabel ? overrideLabel : "Estimated Reimb."}
          </div>
          <div
            className="text-white font-bold text-2xl sm:text-3xl tabular-nums leading-none"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {fmtUSD(total)}
          </div>
        </div>
      </div>
    </div>
  );
}

function PayerSelector({ payer, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label className="text-xs font-semibold text-black/70 uppercase tracking-wider mb-1 block">
        Payer
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-lg border border-black/15 bg-white px-3 py-2.5 text-left hover:border-black/30 transition-colors"
      >
        <span className={payer ? "text-black font-medium" : "text-black/40"}>
          {payer || "Select a payer…"}
        </span>
        <ChevronDown className={`h-4 w-4 text-black/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-lg border border-black/15 bg-white shadow-lg z-10">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black/50 bg-black/5">
            Fee Schedule
          </div>
          {FEE_SCHEDULE_PAYERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 ${
                payer === p ? "bg-orange-100 font-semibold" : ""
              }`}
            >
              {p}
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black/50 bg-black/5 border-t border-black/10">
            Contract (% of Medicare)
          </div>
          {Object.entries(CONTRACT_PAYERS).map(([p, pct]) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-orange-50 ${
                payer === p ? "bg-orange-100 font-semibold" : ""
              }`}
            >
              <span>{p}</span>
              <span className="text-xs text-black/60 tabular-nums">{pct}%</span>
            </button>
          ))}
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black/50 bg-black/5 border-t border-black/10">
            Flat-Rate Payers
          </div>
          {Object.entries(FLAT_RATE_PAYERS).map(([p, cfg]) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-orange-50 ${
                payer === p ? "bg-orange-100 font-semibold" : ""
              }`}
            >
              <span>{p}</span>
              <span className="text-xs text-black/60 tabular-nums">
                ${cfg.perDay}/day
                {cfg.strappingBonus ? ` +$${cfg.strappingBonus}` : ""}
              </span>
            </button>
          ))}
          {Object.keys(SPECIAL_PAYERS).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-orange-50 ${
                payer === p ? "bg-orange-100 font-semibold" : ""
              }`}
            >
              <span>{p}</span>
              <span className="text-xs text-black/60 tabular-nums">bill secondary</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderSelector({ providerName, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label className="text-xs font-semibold text-black/70 uppercase tracking-wider mb-1 block">
        Provider <span className="font-normal text-black/40 normal-case">(optional — sorts evals)</span>
      </label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-lg border border-black/15 bg-white px-3 py-2.5 text-left hover:border-black/30 transition-colors"
      >
        <span className={providerName ? "text-black font-medium" : "text-black/40"}>
          {providerName || "Select a provider…"}
        </span>
        <ChevronDown className={`h-4 w-4 text-black/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto rounded-lg border border-black/15 bg-white shadow-lg z-10">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-black/60 italic hover:bg-orange-50"
          >
            (Clear)
          </button>
          {Object.entries(PROVIDERS).map(([discipline, list]) => (
            <div key={discipline}>
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black/50 bg-black/5">
                {discipline}
              </div>
              {list.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    onChange(name);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 ${
                    providerName === name ? "bg-orange-100 font-semibold" : ""
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CodeChip({ codeKey, payer, qty, onAdd, onRemove, onQtyChange }) {
  const detail = CODE_DETAILS[codeKey];
  const selected = qty > 0;
  const { rate, covered, billingMode } = useMemo(
    () => getLineRate(codeKey, qty || 1, payer),
    [codeKey, qty, payer]
  );

  const hasStepper = detail.maxUnits > 1;

  return (
    <div
      className={`rounded-lg border p-2.5 transition-all ${
        selected
          ? "border-orange-500 bg-orange-50 shadow-sm"
          : "border-black/10 bg-white hover:border-black/25"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <div className="font-bold text-sm leading-tight">
            {codeKey}
            <span className="text-black/40 font-normal text-xs ml-1.5">{detail.cpt}</span>
          </div>
          <div className="text-xs text-black/70 leading-tight mt-0.5">{detail.desc}</div>
        </div>
        <div className="text-right shrink-0">
          {payer ? (
            billingMode === "flat" ? (
              <div className="text-[10px] uppercase tracking-wider text-black/50 font-semibold">Incl.</div>
            ) : billingMode === "special" ? (
              <div className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">$0</div>
            ) : covered ? (
              <div className="text-sm font-bold tabular-nums text-black">{fmtUSD(rate)}</div>
            ) : (
              <div className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">N/C</div>
            )
          ) : (
            <div className="text-[10px] uppercase tracking-wider text-black/30 font-semibold">—</div>
          )}
        </div>
      </div>
      {selected ? (
        <div className="flex items-center justify-between gap-2 mt-2">
          {hasStepper ? (
            <div className="flex items-center gap-1.5 bg-white rounded-md border border-black/10">
              <button
                type="button"
                onClick={() => onQtyChange(Math.max(1, qty - 1))}
                disabled={qty <= 1}
                className="h-7 w-7 flex items-center justify-center text-black hover:bg-black/5 disabled:opacity-30 rounded-l-md"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-bold tabular-nums w-5 text-center">{qty}u</span>
              <button
                type="button"
                onClick={() => onQtyChange(Math.min(detail.maxUnits, qty + 1))}
                disabled={qty >= detail.maxUnits}
                className="h-7 w-7 flex items-center justify-center text-black hover:bg-black/5 disabled:opacity-30 rounded-r-md"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-black/60 font-medium">Selected</span>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="h-7 px-2 text-xs font-semibold rounded-md hover:bg-red-50 text-red-600 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={!payer}
          className="w-full mt-1 h-8 rounded-md text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: payer ? "#000" : "#00000033",
            color: payer ? "#FF8200" : "#fff",
          }}
        >
          + Add
        </button>
      )}
    </div>
  );
}

function CombosManager({ combos, onLoad, onDelete, onSave, currentSummary }) {
  const [name, setName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const canSave = currentSummary.payer && currentSummary.codeCount > 0;

  return (
    <div className="rounded-lg border border-black/10 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold uppercase tracking-wider text-black/70 flex items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5" /> Saved Combos
        </div>
        <button
          type="button"
          onClick={() => setShowSave((v) => !v)}
          disabled={!canSave}
          className="text-xs font-semibold px-2 py-1 rounded-md disabled:opacity-30 hover:bg-orange-50 text-orange-700"
        >
          {showSave ? "Cancel" : "+ Save current"}
        </button>
      </div>
      {showSave && (
        <div className="flex gap-1.5 mb-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Combo name (e.g. Typical Eval)"
            className="flex-1 text-sm rounded-md border border-black/15 px-2 py-1.5 outline-none focus:border-orange-500"
          />
          <button
            type="button"
            onClick={() => {
              if (!name.trim()) return;
              onSave(name.trim());
              setName("");
              setShowSave(false);
            }}
            className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md bg-black text-orange-400 hover:opacity-90"
          >
            Save
          </button>
        </div>
      )}
      {combos.length === 0 ? (
        <div className="text-xs text-black/40 italic py-2 text-center">
          No saved combos yet. Build a combo and click "Save current."
        </div>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {combos.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-md hover:bg-orange-50 px-2 py-1.5 group"
            >
              <button
                type="button"
                onClick={() => onLoad(c)}
                className="flex-1 text-left min-w-0"
              >
                <div className="text-sm font-semibold truncate">{c.name}</div>
                <div className="text-[11px] text-black/60 truncate">
                  {c.payer} · {c.codes.length} {c.codes.length === 1 ? "code" : "codes"}
                  {c.providerName ? ` · ${c.providerName}` : ""}
                </div>
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 rounded-md hover:bg-red-100 flex items-center justify-center text-red-600"
                title="Delete combo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ReimbCalculator() {
  const [payer, setPayer] = useState("");
  const [providerName, setProviderName] = useState("");
  // selected: { displayKey: qty }
  const [selected, setSelected] = useState({});
  const [activeGroup, setActiveGroup] = useState("Evaluations");
  const [combos, setCombos] = useState([]);
  const [copied, setCopied] = useState(false);

  // Load combos from persistent storage on mount
  useEffect(() => {
    let cancelled = false;
    storageGet("combos:list").then((data) => {
      if (!cancelled && Array.isArray(data)) setCombos(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist combos whenever they change
  useEffect(() => {
    storageSet("combos:list", combos);
  }, [combos]);

  // ----- Selection actions -----
  const addCode = useCallback((key) => {
    setSelected((prev) => ({ ...prev, [key]: 1 }));
  }, []);
  const removeCode = useCallback((key) => {
    setSelected((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);
  const setQty = useCallback((key, qty) => {
    setSelected((prev) => ({ ...prev, [key]: qty }));
  }, []);
  const clearAll = useCallback(() => setSelected({}), []);

  // ----- Provider-driven eval ordering -----
  const orderedEvalKeys = useMemo(() => {
    const all = CODE_GROUPS.Evaluations;
    if (!providerName) return all;
    const providerIsOT = isOT(providerName);
    return [...all].sort((a, b) => {
      const ad = CODE_DETAILS[a].discipline === "OT" ? 1 : 0;
      const bd = CODE_DETAILS[b].discipline === "OT" ? 1 : 0;
      // OT-first if provider is OT, else PT-first
      return providerIsOT ? bd - ad : ad - bd;
    });
  }, [providerName]);

  // ----- Computed totals -----
  const lineItems = useMemo(() => {
    return Object.entries(selected).map(([key, qty]) => {
      const { rate, resolvedKey, covered, billingMode } = getLineRate(key, qty, payer);
      return {
        displayKey: key,
        resolvedKey,
        qty,
        rate,
        covered,
        billingMode,
        detail: CODE_DETAILS[key],
      };
    });
  }, [selected, payer]);

  // ----- Payer override (flat-rate / special) — computed before total so total uses it -----
  const resolvedKeysMemo = useMemo(
    () => lineItems.map((li) => li.resolvedKey),
    [lineItems]
  );
  const payerOverride = useMemo(
    () => getPayerOverride(payer, resolvedKeysMemo),
    [payer, resolvedKeysMemo]
  );

  const total = useMemo(() => {
    if (payerOverride) return payerOverride.total;
    return lineItems.reduce((sum, li) => sum + (li.covered ? li.rate : 0), 0);
  }, [lineItems, payerOverride]);

  // ----- Payer rule warnings (_global + payer-specific). Each entry: {message, severity} -----
  const warnings = useMemo(() => {
    if (!payer) return [];
    const rules = [...(PAYER_RULES._global || []), ...(PAYER_RULES[payer] || [])];
    return rules
      .filter((r) => r.test(resolvedKeysMemo))
      .map((r) => ({ message: r.message, severity: r.severity || "warn" }));
  }, [payer, resolvedKeysMemo]);

  // ----- Combos -----
  const saveCombo = useCallback(
    (name) => {
      const codes = Object.entries(selected).map(([key, qty]) => ({ key, qty }));
      const combo = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        payer,
        providerName,
        codes,
        createdAt: new Date().toISOString(),
      };
      setCombos((prev) => [combo, ...prev]);
    },
    [selected, payer, providerName]
  );

  const loadCombo = useCallback((combo) => {
    setPayer(combo.payer);
    setProviderName(combo.providerName || "");
    const next = {};
    combo.codes.forEach(({ key, qty }) => {
      next[key] = qty;
    });
    setSelected(next);
  }, []);

  const deleteCombo = useCallback((id) => {
    setCombos((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ----- Copy summary -----
  const summary = useMemo(() => {
    const isFlat = payerOverride && payerOverride.label !== "Bill secondary";
    const isSpecial = payerOverride && payerOverride.label === "Bill secondary";
    const lines = [
      `Tristar Reimbursement Estimate`,
      `Payer: ${payer || "(none)"}`,
      providerName ? `Provider: ${providerName}` : null,
      `Date: ${new Date().toLocaleDateString()}`,
      ``,
      ...lineItems.map((li) => {
        const cpt = li.detail.cpt;
        const desc = li.detail.desc;
        const qtyTxt = li.qty > 1 ? ` ×${li.qty}` : "";
        let rateTxt;
        if (isFlat) rateTxt = "Incl. in flat rate";
        else if (isSpecial) rateTxt = "$0 — bill secondary";
        else rateTxt = li.covered ? fmtUSD(li.rate) : "Not covered";
        return `  ${cpt} ${desc}${qtyTxt}  —  ${rateTxt}`;
      }),
      ``,
      payerOverride ? `${payerOverride.label.toUpperCase()}: ${fmtUSD(total)}` : `TOTAL: ${fmtUSD(total)}`,
      payerOverride?.banner ? `\nNOTE: ${payerOverride.banner}` : null,
    ].filter(Boolean);
    return lines.join("\n");
  }, [payer, providerName, lineItems, total, payerOverride]);

  const copySummary = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        },
        () => {}
      );
    }
  }, [summary]);

  const codeCount = lineItems.length;
  const groupNames = Object.keys(CODE_GROUPS);

  // For OT providers, also reorder the active group default
  useEffect(() => {
    if (providerName && activeGroup === "Evaluations") {
      // no-op; eval ordering is computed live
    }
  }, [providerName, activeGroup]);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "#FFEAD5",
        fontFamily:
          'Montserrat, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <Header
        total={total}
        payer={payer}
        providerName={providerName}
        overrideLabel={payerOverride?.label}
      />

      <div className="max-w-6xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 sm:gap-6">
        {/* LEFT: selectors + code groups */}
        <div className="space-y-4">
          {/* Selectors */}
          <div className="rounded-xl bg-white border border-black/10 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm">
            <PayerSelector payer={payer} onChange={setPayer} />
            <ProviderSelector providerName={providerName} onChange={setProviderName} />
          </div>

          {/* Group tabs */}
          <div className="rounded-xl bg-white border border-black/10 shadow-sm overflow-hidden">
            <div className="flex flex-wrap gap-1 p-2 border-b border-black/10 bg-black/[0.02]">
              {groupNames.map((g) => {
                const active = activeGroup === g;
                const groupCount = CODE_GROUPS[g].filter((k) => selected[k] > 0).length;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setActiveGroup(g)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors flex items-center gap-1.5 ${
                      active ? "text-white" : "text-black/70 hover:bg-black/5"
                    }`}
                    style={active ? { background: "#000" } : undefined}
                  >
                    {g}
                    {groupCount > 0 && (
                      <span
                        className="text-[10px] rounded-full px-1.5 min-w-[18px] text-center font-bold"
                        style={{
                          background: active ? "#FF8200" : "#FF8200",
                          color: active ? "#000" : "#fff",
                        }}
                      >
                        {groupCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(activeGroup === "Evaluations" ? orderedEvalKeys : CODE_GROUPS[activeGroup]).map((key) => {
                const qty = selected[key] || 0;
                return (
                  <CodeChip
                    key={key}
                    codeKey={key}
                    payer={payer}
                    qty={qty}
                    onAdd={() => addCode(key)}
                    onRemove={() => removeCode(key)}
                    onQtyChange={(q) => setQty(key, q)}
                  />
                );
              })}
            </div>
          </div>

          {/* Special-payer banner (UHC W/Secondary etc) */}
          {payerOverride?.banner && (
            <div
              className="rounded-xl border-2 p-3 sm:p-4 shadow-sm"
              style={{ background: "#EFF6FF", borderColor: "#3B82F6" }}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#1D4ED8" }} />
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#1E3A8A" }}>
                    Billing Notice
                  </div>
                  <div className="text-sm text-black/85">{payerOverride.banner}</div>
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div
              className="rounded-xl border-2 p-3 sm:p-4 shadow-sm"
              style={{ background: "#FFF8E7", borderColor: "#F59E0B" }}
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#B45309" }} />
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#92400E" }}>
                    {payer} Billing Rules
                  </div>
                  <ul className="space-y-1">
                    {warnings.map((w, i) => (
                      <li
                        key={i}
                        className="text-sm"
                        style={{ color: w.severity === "error" ? "#991B1B" : "rgba(0,0,0,0.85)" }}
                      >
                        <span className="font-semibold mr-1">
                          {w.severity === "error" ? "⛔" : "⚠"}
                        </span>
                        {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: cart / totals / combos */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* Cart */}
          <div className="rounded-xl bg-white border border-black/10 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-black/70">
                Visit Codes
                {codeCount > 0 && (
                  <span className="ml-1.5 text-orange-600">({codeCount})</span>
                )}
              </div>
              {codeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-semibold text-black/60 hover:text-red-600 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
            <div className="max-h-[40vh] lg:max-h-[50vh] overflow-y-auto">
              {codeCount === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Sparkles className="h-7 w-7 mx-auto mb-2 text-black/20" />
                  <div className="text-sm text-black/40 italic">
                    {payer ? "Add codes from the left to estimate this visit." : "Pick a payer to get started."}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-black/5">
                  {lineItems.map((li) => (
                    <div key={li.displayKey} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {li.displayKey}
                          {li.qty > 1 ? <span className="text-orange-600"> ×{li.qty}</span> : null}
                          <span className="text-black/40 font-normal text-xs ml-1.5">{li.detail.cpt}</span>
                        </div>
                        <div className="text-xs text-black/60 truncate">{li.detail.desc}</div>
                      </div>
                      <div className="text-right shrink-0">
                        {li.billingMode === "flat" ? (
                          <div className="text-[10px] uppercase tracking-wider text-black/50 font-semibold">
                            Incl.
                          </div>
                        ) : li.billingMode === "special" ? (
                          <div className="text-[10px] uppercase tracking-wider text-black/40 font-semibold">
                            $0
                          </div>
                        ) : li.covered ? (
                          <div className="text-sm font-bold tabular-nums">{fmtUSD(li.rate)}</div>
                        ) : (
                          <div className="text-[10px] uppercase tracking-wider text-red-600 font-bold">
                            Not covered
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-black/10 bg-black/[0.02] flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-black/70">Total</div>
              <div className="text-2xl font-extrabold tabular-nums" style={{ color: "#FF8200" }}>
                {fmtUSD(total)}
              </div>
            </div>
            {codeCount > 0 && (
              <div className="px-4 py-2.5 border-t border-black/10 flex gap-2">
                <button
                  type="button"
                  onClick={copySummary}
                  className="flex-1 h-9 rounded-md text-xs font-bold uppercase tracking-wider bg-black text-orange-400 hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy summary
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Combos */}
          <CombosManager
            combos={combos}
            onSave={saveCombo}
            onLoad={loadCombo}
            onDelete={deleteCombo}
            currentSummary={{ payer, codeCount }}
          />

          {/* Footnote */}
          <div className="text-[11px] text-black/50 leading-relaxed px-1">
            Estimates only. "N/C" means the payer doesn't cover that code on the rate
            table. Contract payers calculate as Medicare × FS%. Flat-rate payers pay a
            fixed per-day amount regardless of codes (Workers Comp adds $25 for any
            strapping code). Source: 2026 PT/PTA/OT/OTA fee schedules.
          </div>
        </div>
      </div>
    </div>
  );
}
