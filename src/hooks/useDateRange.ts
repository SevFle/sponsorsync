"use client";

import { useState } from "react";
import type { DateRangePreset } from "@/lib/analytics";

export function useDateRange(initial: DateRangePreset = "30d") {
  const [range, setRange] = useState<DateRangePreset>(initial);
  return { range, setRange };
}
