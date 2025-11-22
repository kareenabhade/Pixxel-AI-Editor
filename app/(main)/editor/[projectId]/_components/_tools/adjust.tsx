"use client";

import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { filters } from "fabric";
import type { FabricImage, Canvas } from "fabric";
import { useCanvas } from "@/Context/context";

// --------------------------------------------
// TYPES
// --------------------------------------------

interface FilterConfig {
  key: keyof typeof DEFAULT_VALUES;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  filterClass: any; // Fabric filter class (Brightness, Contrast, etc.)
  valueKey: string;
  transform: (v: number) => number;
  suffix?: string;
}

type FilterState = Record<string, number>;

// --------------------------------------------
// FILTER CONFIGS (FULLY TYPED)
// --------------------------------------------

const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: "brightness",
    label: "Brightness",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    filterClass: filters.Brightness,
    valueKey: "brightness",
    transform: (value) => value / 100,
  },
  {
    key: "contrast",
    label: "Contrast",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    filterClass: filters.Contrast,
    valueKey: "contrast",
    transform: (value) => value / 100,
  },
  {
    key: "saturation",
    label: "Saturation",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    filterClass: filters.Saturation,
    valueKey: "saturation",
    transform: (value) => value / 100,
  },
  {
    key: "vibrance",
    label: "Vibrance",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    filterClass: filters.Vibrance,
    valueKey: "vibrance",
    transform: (value) => value / 100,
  },
  {
    key: "blur",
    label: "Blur",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    filterClass: filters.Blur,
    valueKey: "blur",
    transform: (value) => value / 100,
  },
  {
    key: "hue",
    label: "Hue",
    min: -180,
    max: 180,
    step: 1,
    defaultValue: 0,
    filterClass: filters.HueRotation,
    valueKey: "rotation",
    transform: (value) => value * (Math.PI / 180),
    suffix: "°",
  },
];

// --------------------------------------------
// DEFAULT VALUES
// --------------------------------------------

const DEFAULT_VALUES: FilterState = FILTER_CONFIGS.reduce((acc, cfg) => {
  acc[cfg.key] = cfg.defaultValue;
  return acc;
}, {} as FilterState);

// --------------------------------------------
// COMPONENT
// --------------------------------------------

export function AdjustControls() {
  const [filterValues, setFilterValues] = useState<FilterState>(DEFAULT_VALUES);
  const [isApplying, setIsApplying] = useState(false);

  const { canvasEditor } = useCanvas() as { canvasEditor: Canvas | null };

  // --------------------------------------------
  // HELPERS
  // --------------------------------------------

  const getActiveImage = (): FabricImage | null => {
    if (!canvasEditor) return null;

    const active = canvasEditor.getActiveObject();
    if (active && active.type === "image") return active as FabricImage;

    return canvasEditor.getObjects().find((o) => o.type === "image") as FabricImage || null;
  };

  // --------------------------------------------
  // APPLY FILTERS
  // --------------------------------------------

  const applyFilters = async (newValues: FilterState) => {
    const img = getActiveImage();
    if (!img || isApplying) return;

    setIsApplying(true);

    try {
      const filtersToApply = FILTER_CONFIGS.flatMap((cfg) => {
        const v = newValues[cfg.key];
        if (v === cfg.defaultValue) return [];

        return new cfg.filterClass({
          [cfg.valueKey]: cfg.transform(v),
        });
      });

      img.filters = filtersToApply;

      await new Promise((resolve) => {
        img.applyFilters();
        canvasEditor?.requestRenderAll();
        setTimeout(resolve, 30);
      });
    } catch (err) {
      console.error("Apply filter error:", err);
    } finally {
      setIsApplying(false);
    }
  };

  // --------------------------------------------
  // HANDLE SLIDER CHANGE
  // --------------------------------------------

  const handleValueChange = (key: string, val: number[]) => {
    const updated = {
      ...filterValues,
      [key]: val[0],
    };

    setFilterValues(updated);
    applyFilters(updated);
  };

  // --------------------------------------------
  // RESET FILTERS
  // --------------------------------------------

  const resetFilters = () => {
    setFilterValues(DEFAULT_VALUES);
    applyFilters(DEFAULT_VALUES);
  };

  // --------------------------------------------
  // EXTRACT EXISTING FILTERS FROM FABRIC IMAGE
  // --------------------------------------------

 const extractFilterValues = (img: FabricImage): FilterState => {
  if (!img.filters?.length) return DEFAULT_VALUES;

  const values = { ...DEFAULT_VALUES };

  img.filters.forEach((flt) => {
    const cfg = FILTER_CONFIGS.find(
      (c) => flt.constructor.name === c.filterClass.name
    );
    if (!cfg) return;

    // FIX HERE ↓
    const rawValue = (flt as any)[cfg.valueKey];

    if (cfg.key === "hue") {
      values[cfg.key] = Math.round(rawValue * (180 / Math.PI));
    } else {
      values[cfg.key] = Math.round(rawValue * 100);
    }
  });

  return values;
};


  // --------------------------------------------
  // Load existing filter values
  // --------------------------------------------

  useEffect(() => {
    const img = getActiveImage();
    if (img) {
      setFilterValues(extractFilterValues(img));
    }
  }, [canvasEditor]);

  // --------------------------------------------
  // UI STATES
  // --------------------------------------------

  if (!canvasEditor)
    return (
      <div className="p-4 text-white/70 text-sm">
        Load an image to start adjusting
      </div>
    );

  const img = getActiveImage();
  if (!img)
    return (
      <div className="p-4 text-white/70 text-sm">
        Select an image to adjust filters
      </div>
    );

  // --------------------------------------------
  // RENDER UI
  // --------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header + Reset */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-white">Image Adjustments</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="text-white/70 hover:text-white"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Individual Slider Controls */}
      {FILTER_CONFIGS.map((cfg) => (
        <div key={cfg.key} className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm text-white">{cfg.label}</label>
            <span className="text-xs text-white/70">
              {filterValues[cfg.key]}
              {cfg.suffix ?? ""}
            </span>
          </div>

          <Slider
            value={[filterValues[cfg.key]]}
            onValueChange={(v) => handleValueChange(cfg.key, v)}
            min={cfg.min}
            max={cfg.max}
            step={cfg.step}
            className="w-full"
          />
        </div>
      ))}

      {/* Info Message */}
      <div className="mt-6 p-3 bg-slate-700/50 rounded-lg text-xs text-white/70">
        Adjustments are applied in real-time. Use Reset to restore defaults.
      </div>

      {/* Applying Loader */}
      {isApplying && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
          <span className="ml-2 text-xs text-white/70">
            Applying filters...
          </span>
        </div>
      )}
    </div>
  );
}
