"use client";

import React, { useState, useEffect, JSX } from "react";
import { Button } from "@/components/ui/button";
import {
  Crop,
  CheckCheck,
  X,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Smartphone,
  Maximize,
} from "lucide-react";
import { useCanvas } from "@/Context/context";
import { FabricImage, Rect, FabricObject } from "fabric";

// =======================
// TYPES
// =======================

// Aspect ratio button type
interface AspectRatioOption {
  label: string;
  value: number | null; // null = free
  icon: React.ComponentType<{ className?: string }>;
  ratio?: string; // "1:1", "16:9", etc.
}

// Fabric image type
interface ImageWithProps extends FabricImage {
  _element: HTMLImageElement;
}

// For storing original image values
interface OriginalImageProps {
  left: number;
  top: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  selectable: boolean;
  evented: boolean;
}

interface CropRect extends Rect {
  isCropRectangle?: boolean;
}

// =======================
// CONSTANTS
// =======================

const ASPECT_RATIOS: AspectRatioOption[] = [
  { label: "Freeform", value: null, icon: Maximize },
  { label: "Square", value: 1, icon: Square, ratio: "1:1" },
  {
    label: "Widescreen",
    value: 16 / 9,
    icon: RectangleHorizontal,
    ratio: "16:9",
  },
  { label: "Portrait", value: 4 / 5, icon: RectangleVertical, ratio: "4:5" },
  { label: "Story", value: 9 / 16, icon: Smartphone, ratio: "9:16" },
];

// =======================
// MAIN COMPONENT
// =======================

export function CropContent(): JSX.Element {
  const { canvasEditor, activeTool } = useCanvas();

  const [selectedImage, setSelectedImage] = useState<ImageWithProps | null>(null);
  const [isCropMode, setIsCropMode] = useState<boolean>(false);
  const [selectedRatio, setSelectedRatio] = useState<number | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [originalProps, setOriginalProps] = useState<OriginalImageProps | null>(null);

  // ======================
  // Fabric Helpers
  // ======================

  const getActiveImage = (): ImageWithProps | null => {
    if (!canvasEditor) return null;

    const active = canvasEditor.getActiveObject() as FabricObject | undefined;

    if (active && active.type === "image") {
      return active as ImageWithProps;
    }

    const objects = canvasEditor.getObjects();
    const image = objects.find((obj) => obj.type === "image");

    return (image as ImageWithProps) ?? null;
  };

  const removeAllCropRectangles = (): void => {
    if (!canvasEditor) return;

    const rects = canvasEditor
      .getObjects()
      .filter((obj) => (obj as CropRect).isCropRectangle === true);

    rects.forEach((rect) => canvasEditor.remove(rect));

    canvasEditor.requestRenderAll();
  };

  // ======================
  // Crop Mode Controls
  // ======================

  const initializeCropMode = (image: ImageWithProps): void => {
    if (!canvasEditor || isCropMode) return;

    removeAllCropRectangles();

    const original: OriginalImageProps = {
      left: image.left ?? 0,
      top: image.top ?? 0,
      width: image.width ?? 0,
      height: image.height ?? 0,
      scaleX: image.scaleX ?? 1,
      scaleY: image.scaleY ?? 1,
      angle: image.angle ?? 0,
      selectable: image.selectable ?? true,
      evented: image.evented ?? true,
    };

    setOriginalProps(original);
    setSelectedImage(image);
    setIsCropMode(true);

    image.set({
      selectable: false,
      evented: false,
    });

    createCropRectangle(image);
    canvasEditor.requestRenderAll();
  };

  const createCropRectangle = (image: ImageWithProps): void => {
    if (!canvasEditor) return;

    const bounds = image.getBoundingRect();

    const rect = new Rect({
      left: bounds.left + bounds.width * 0.1,
      top: bounds.top + bounds.height * 0.1,
      width: bounds.width * 0.8,
      height: bounds.height * 0.8,
      fill: "transparent",
      stroke: "#00bcd4",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: true,
      evented: true,
      cornerColor: "#00bcd4",
      cornerSize: 12,
      transparentCorners: false,
      cornerStyle: "circle",
      borderColor: "#00bcd4",
      borderScaleFactor: 1,
    }) as CropRect;

    rect.isCropRectangle = true;

    rect.on("scaling", (e) => {
      const r = e.target as CropRect;

      if (selectedRatio !== null) {
        const width = r.width * r.scaleX;
        const newHeight = width / selectedRatio;

        r.set({
          height: newHeight / r.scaleY,
        });
      }

      canvasEditor.requestRenderAll();
    });

    canvasEditor.add(rect);
    canvasEditor.setActiveObject(rect);
    setCropRect(rect);
  };

  const exitCropMode = (): void => {
    if (!canvasEditor || !isCropMode) return;

    removeAllCropRectangles();

    if (selectedImage && originalProps) {
      selectedImage.set({
        left: originalProps.left,
        top: originalProps.top,
        scaleX: originalProps.scaleX,
        scaleY: originalProps.scaleY,
        angle: originalProps.angle,
        selectable: originalProps.selectable,
        evented: originalProps.evented,
      });

      canvasEditor.setActiveObject(selectedImage);
    }

    setIsCropMode(false);
    setSelectedImage(null);
    setOriginalProps(null);
    setSelectedRatio(null);
    setCropRect(null);

    canvasEditor.requestRenderAll();
  };

  const applyAspectRatio = (ratio: number | null): void => {
    setSelectedRatio(ratio);

    if (!cropRect || ratio === null) return;

    const currentWidth = cropRect.width * cropRect.scaleX;
    const newHeight = currentWidth / ratio;

    cropRect.set({
      height: newHeight / cropRect.scaleY,
    });

    canvasEditor?.requestRenderAll();
  };

  const applyCrop = async (): Promise<void> => {
    if (!canvasEditor || !selectedImage || !cropRect) return;

    try {
      const cropBounds = cropRect.getBoundingRect();
      const imageBounds = selectedImage.getBoundingRect();

      const cropX = Math.max(0, cropBounds.left - imageBounds.left);
      const cropY = Math.max(0, cropBounds.top - imageBounds.top);
      const cropW = Math.min(cropBounds.width, imageBounds.width - cropX);
      const cropH = Math.min(cropBounds.height, imageBounds.height - cropY);

      const imgScaleX = selectedImage.scaleX ?? 1;
      const imgScaleY = selectedImage.scaleY ?? 1;

      const actualX = cropX / imgScaleX;
      const actualY = cropY / imgScaleY;
      const actualW = cropW / imgScaleX;
      const actualH = cropH / imgScaleY;

      const cropped = new FabricImage(selectedImage._element, {
        left: cropBounds.left + cropBounds.width / 2,
        top: cropBounds.top + cropBounds.height / 2,
        originX: "center",
        originY: "center",
        selectable: true,
        evented: true,
        cropX: actualX,
        cropY: actualY,
        width: actualW,
        height: actualH,
        scaleX: imgScaleX,
        scaleY: imgScaleY,
      });

      canvasEditor.remove(selectedImage);
      canvasEditor.add(cropped);
      canvasEditor.setActiveObject(cropped);
      canvasEditor.requestRenderAll();

      exitCropMode();
    } catch (e) {
      console.error("Crop failed:", e);
      alert("Failed to crop image.");
      exitCropMode();
    }
  };

  // ======================
  // Effects
  // ======================

  useEffect(() => {
    if (activeTool === "crop" && canvasEditor && !isCropMode) {
      const img = getActiveImage();
      if (img) initializeCropMode(img);
    } else if (activeTool !== "crop" && isCropMode) {
      exitCropMode();
    }
  }, [activeTool, canvasEditor]);

  useEffect(() => {
    return () => {
      if (isCropMode) exitCropMode();
    };
  }, []);

  // ======================
  // Render UI
  // ======================

  if (!canvasEditor) {
    return (
      <div className="p-4">
        <p className="text-white/70 text-sm">Canvas not ready</p>
      </div>
    );
  }

  const activeImage = getActiveImage();
  if (!activeImage && !isCropMode) {
    return (
      <div className="p-4">
        <p className="text-white/70 text-sm">Select an image to crop</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Crop Mode Banner */}
      {isCropMode && (
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
          <p className="text-cyan-400 text-sm font-medium">✂️ Crop Mode Active</p>
          <p className="text-cyan-300/80 text-xs">Use the blue box to crop</p>
        </div>
      )}

      {/* Start Crop Button */}
      {!isCropMode && activeImage && (
        <Button onClick={() => initializeCropMode(activeImage)} className="w-full">
          <Crop className="h-4 w-4 mr-2" />
          Start Cropping
        </Button>
      )}

      {/* Aspect Ratios */}
      {isCropMode && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3">Crop Aspect Ratios</h3>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIOS.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.label}
                  onClick={() => applyAspectRatio(r.value)}
                  className={`p-3 border rounded-lg ${
                    selectedRatio === r.value
                      ? "border-cyan-400 bg-cyan-400/10"
                      : "border-white/20 hover:border-white/40"
                  }`}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2 text-white" />
                  <div className="text-xs text-white">{r.label}</div>
                  {r.ratio && <div className="text-xs text-white/60">{r.ratio}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Apply / Cancel */}
      {isCropMode && (
        <div className="space-y-3 pt-4 border-t border-white/10">
          <Button onClick={applyCrop} className="w-full">
            <CheckCheck className="h-4 w-4 mr-2" />
            Apply Crop
          </Button>

          <Button onClick={exitCropMode} variant="outline" className="w-full">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
