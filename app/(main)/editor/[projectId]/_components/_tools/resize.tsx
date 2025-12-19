"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Expand, Lock, Unlock, Monitor } from "lucide-react";
import { useCanvas } from "@/Context/context";
import { useConvexMutation } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface CanvasProps {
  project: {
    _id: Id<"projects">;
    title: string;
    currentImageUrl?: string;
    originalImageUrl?: string;
    createdAt: number;
    updatedAt: number;
    width: number;
    height: number;
    canvasState?: string;
  };
}

type AspectRatioPreset = {
  name: string;
  label: string;
  ratio: [number, number]; // ✅ tuple
};

const ASPECT_RATIOS: AspectRatioPreset[] = [
  { name: "Square", label: "1:1", ratio: [1, 1] },
  { name: "Landscape", label: "16:9", ratio: [16, 9] },
  { name: "Portrait", label: "9:16", ratio: [9, 16] },
  { name: "Classic", label: "4:3", ratio: [4, 3] },
];

export function ResizeControls({ project }: CanvasProps) {
  const { canvasEditor, processingMessage, setProcessingMessage } = useCanvas();

  const [newWidth, setNewWidth] = useState(project.width);
  const [newHeight, setNewHeight] = useState(project.height);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const { mutate: updateProject, data, isLoading } =
    useConvexMutation(api.projects.updateProject);

  useEffect(() => {
    if (!isLoading && data) {
      window.location.reload();
    }
  }, [data, isLoading]);

  /* ---------------- Aspect Ratio Calculation ---------------- */

  const calculateAspectRatioDimensions = (
    ratio: [number, number]
  ): { width: number; height: number } => {
    const [rw, rh] = ratio;
    const area = project.width * project.height;
    const aspect = rw / rh;

    const height = Math.sqrt(area / aspect);
    const width = height * aspect;

    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  };

  /* ---------------- Input Handlers ---------------- */

  const handleWidthChange = (value: string) => {
    const width = parseInt(value) || 0;
    setNewWidth(width);

    if (lockAspectRatio) {
      const ratio = project.height / project.width;
      setNewHeight(Math.round(width * ratio));
    }

    setSelectedPreset(null);
  };

  const handleHeightChange = (value: string) => {
    const height = parseInt(value) || 0;
    setNewHeight(height);

    if (lockAspectRatio) {
      const ratio = project.width / project.height;
      setNewWidth(Math.round(height * ratio));
    }

    setSelectedPreset(null);
  };

  /* ---------------- Apply Preset ---------------- */

  const applyAspectRatio = (preset: AspectRatioPreset): void => {
    const dim = calculateAspectRatioDimensions(preset.ratio);
    setNewWidth(dim.width);
    setNewHeight(dim.height);
    setSelectedPreset(preset.name);
  };

  /* ---------------- Viewport Scale ---------------- */

  const calculateViewportScale = (): number => {
    if (!canvasEditor) return 1;

    const parent = canvasEditor.getElement()?.parentNode;
    if (!(parent instanceof HTMLElement)) return 1;

    const cW = parent.clientWidth - 40;
    const cH = parent.clientHeight - 40;

    return Math.min(cW / newWidth, cH / newHeight, 1);
  };

  /* ---------------- Apply Resize ---------------- */

  const handleApplyResize = async () => {
    if (!canvasEditor) return;
    if (newWidth === project.width && newHeight === project.height) return;

    setProcessingMessage("Resizing canvas...");

    try {
      canvasEditor.setWidth(newWidth);
      canvasEditor.setHeight(newHeight);

      const scale = calculateViewportScale();

      canvasEditor.setDimensions(
        { width: newWidth * scale, height: newHeight * scale },
        { backstoreOnly: false }
      );

      canvasEditor.setZoom(scale);
      canvasEditor.calcOffset();
      canvasEditor.requestRenderAll();

      await updateProject({
        projectId: project._id,
        width: newWidth,
        height: newHeight,
        canvasState: canvasEditor.toJSON(),
      });
    } catch (err) {
      console.error(err);
      alert("Failed to resize canvas.");
    } finally {
      setProcessingMessage(null);
    }
  };

  if (!canvasEditor) {
    return (
      <div className="p-4">
        <p className="text-white/70 text-sm">Canvas not ready</p>
      </div>
    );
  }

  const hasChanges =
    newWidth !== project.width || newHeight !== project.height;

  return (
    <div className="space-y-6">
      {/* Current Size */}
      <div className="bg-slate-700/30 rounded-lg p-3">
        <h4 className="text-sm font-medium text-white mb-2">Current Size</h4>
        <div className="text-xs text-white/70">
          {project.width} × {project.height} pixels
        </div>
      </div>

      {/* Custom Size */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-white">Custom Size</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLockAspectRatio(!lockAspectRatio)}
          >
            {lockAspectRatio ? <Lock /> : <Unlock />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            value={newWidth}
            onChange={(e) => handleWidthChange(e.target.value)}
          />
          <Input
            type="number"
            value={newHeight}
            onChange={(e) => handleHeightChange(e.target.value)}
          />
        </div>
      </div>

      {/* Aspect Presets */}
      <div className="space-y-3">
        {ASPECT_RATIOS.map((ratio) => {
          const dim = calculateAspectRatioDimensions(ratio.ratio);
          return (
            <Button
              key={ratio.name}
              variant={selectedPreset === ratio.name ? "default" : "outline"}
              onClick={() => applyAspectRatio(ratio)}
              className="justify-between"
            >
              <div>
                <div>{ratio.name}</div>
                <div className="text-xs opacity-70">
                  {dim.width} × {dim.height} ({ratio.label})
                </div>
              </div>
              <Monitor />
            </Button>
          );
        })}
      </div>

      <Button
        onClick={handleApplyResize}
        disabled={!hasChanges || Boolean(processingMessage)}
        className="w-full"
      >
        <Expand className="mr-2" /> Apply Resize
      </Button>
    </div>
  );
}
