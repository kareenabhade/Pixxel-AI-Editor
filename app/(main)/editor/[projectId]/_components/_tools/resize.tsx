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

interface AspectPreset {
  name: string | null;
  ratio: [number, number];
  label?: string; // optional, since you don't use it here
}


// Common aspect ratios
const ASPECT_RATIOS = [
  { name: "Instagram Story", ratio: [9, 16], label: "9:16" },
  { name: "Instagram Post", ratio: [1, 1], label: "1:1" },
  { name: "Youtube Thumbnail", ratio: [16, 9], label: "16:9" },
  { name: "Portrait", ratio: [2, 3], label: "2:3" },
  { name: "Facebook Cover", ratio: [851, 315], label: "2.7:1" },
  { name: "Twitter Header", ratio: [3, 1], label: "3:1" },
];

export function ResizeControls({ project }:CanvasProps) {
  const { canvasEditor, processingMessage, setProcessingMessage } = useCanvas();
  const [newWidth, setNewWidth] = useState(project?.width || 800);
  const [newHeight, setNewHeight] = useState(project?.height || 600);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const {
    mutate: updateProject,
    data,
    isLoading,
  } = useConvexMutation(api.projects.updateProject);

  // ✅ FIXED useEffect syntax
  useEffect(() => {
    if (!isLoading && data) {
      window.location.reload();
    }
  }, [data, isLoading]);

  // Calculate dimensions for preset aspect ratio
 const calculateAspectRatioDimensions = (ratio: [number, number]): { width: number; height: number } => {
  if (!project) return { width: 800, height: 600 };

  const [ratioW, ratioH] = ratio;
  const area = project.width * project.height;
  const aspectRatio = ratioW / ratioH;

  const height = Math.sqrt(area / aspectRatio);
  const width = height * aspectRatio;

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
};


  // Handle width change
  const handleWidthChange = (value: string) => {
    const width = parseInt(value) || 0;
    setNewWidth(width);

    if (lockAspectRatio && project) {
      const ratio = project.height / project.width;
      setNewHeight(Math.round(width * ratio));
    }

    setSelectedPreset(null);
  };

  // Handle height change
  const handleHeightChange = (value: string) => {
    const height = parseInt(value) || 0;
    setNewHeight(height);

    if (lockAspectRatio && project) {
      const ratio = project.width / project.height;
      setNewWidth(Math.round(height * ratio));
    }

    setSelectedPreset(null);
  };

  // Apply preset
 const applyAspectRatio = (preset: AspectPreset): void => {
  const dim = calculateAspectRatioDimensions(preset.ratio);
  setNewWidth(dim.width);
  setNewHeight(dim.height);
  setSelectedPreset(preset.name);
};


  // Viewport scale calculation
 const calculateViewportScale = (): number => {
  if (!canvasEditor) return 1;

  const parent = canvasEditor.getElement()?.parentNode;

  if (!parent || !(parent instanceof HTMLElement)) return 1;

  const cW = parent.clientWidth - 40;
  const cH = parent.clientHeight - 40;

  const scaleX = cW / newWidth;
  const scaleY = cH / newHeight;

  return Math.min(scaleX, scaleY, 1);
};


  // Apply resize to canvas
  const handleApplyResize = async () => {
    if (!canvasEditor || !project) return;
    if (newWidth === project.width && newHeight === project.height) return;

    setProcessingMessage("Resizing canvas...");

    try {
      canvasEditor.setWidth(newWidth);
      canvasEditor.setHeight(newHeight);

      const viewportScale = calculateViewportScale();

      canvasEditor.setDimensions(
        {
          width: newWidth * viewportScale,
          height: newHeight * viewportScale,
        },
        { backstoreOnly: false }
      );

      canvasEditor.setZoom(viewportScale);
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

  if (!canvasEditor || !project) {
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
            className="text-white/70 hover:text-white p-1"
          >
            {lockAspectRatio ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/70 mb-1 block">Width</label>
            <Input
              type="number"
              value={newWidth}
              onChange={(e) => handleWidthChange(e.target.value)}
              min="100"
              max="5000"
              className="bg-slate-700 border-white/20 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-white/70 mb-1 block">Height</label>
            <Input
              type="number"
              value={newHeight}
              onChange={(e) => handleHeightChange(e.target.value)}
              min="100"
              max="5000"
              className="bg-slate-700 border-white/20 text-white"
            />
          </div>
        </div>

        <div className="text-xs text-white/70">
          {lockAspectRatio ? "Aspect ratio locked" : "Free resize"}
        </div>
      </div>

      {/* Aspect Ratio Presets */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-white">Aspect Ratios</h3>
        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
          {ASPECT_RATIOS.map((ratio) => {
            const dimensions = calculateAspectRatioDimensions(ratio.ratio);
            return (
              <Button
                key={ratio.name}
                variant={selectedPreset === ratio.name ? "default" : "outline"}
                size="sm"
                onClick={() => applyAspectRatio(ratio)}
                className={`justify-between h-auto py-2 ${
                  selectedPreset === ratio.name
                    ? "bg-cyan-500 hover:bg-cyan-600"
                    : ""
                }`}
              >
                <div>
                  <div className="font-medium">{ratio.name}</div>
                  <div className="text-xs opacity-70">
                    {dimensions.width} × {dimensions.height} ({ratio.label})
                  </div>
                </div>
                <Monitor className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      {hasChanges && (
        <div className="bg-slate-700/30 rounded-lg p-3">
          <h4 className="text-sm font-medium text-white mb-2">New Size Preview</h4>
          <div className="text-xs text-white/70">
            <div>
              New Canvas: {newWidth} × {newHeight} pixels
            </div>
            <div className="text-cyan-400">
              {newWidth > project.width || newHeight > project.height
                ? "Canvas will be expanded"
                : "Canvas will be cropped"}
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={handleApplyResize}
        disabled={!hasChanges || processingMessage}
        className="w-full"
      >
        <Expand className="h-4 w-4 mr-2" />
        Apply Resize
      </Button>
    </div>
  );
}
