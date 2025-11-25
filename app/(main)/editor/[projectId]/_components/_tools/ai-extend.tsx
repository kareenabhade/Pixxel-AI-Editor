"use client";

import React, { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Wand2 } from "lucide-react";
import { useCanvas } from "@/Context/context";
import { useConvexMutation } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { FabricImage } from "fabric";
import { toast } from "sonner";

interface CanvasProps {
  currentImageUrl: any;
  originalImageUrl: any;
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

const DIRECTIONS = [
  { key: "top", label: "Top", icon: ArrowUp },
  { key: "bottom", label: "Bottom", icon: ArrowDown },
  { key: "left", label: "Left", icon: ArrowLeft },
  { key: "right", label: "Right", icon: ArrowRight },
];

const FOCUS_MAP: Record<string, string> = {
  left: "fo-right",
  right: "fo-left",
  top: "fo-bottom",
  bottom: "fo-top",
};

const AIExtendControls = ({ project }: CanvasProps) => {
  const { canvasEditor, setProcessingMessage } = useCanvas();
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null);
  const [extensionAmount, setExtensionAmount] = useState(200);

  const { mutate: updateProject } = useConvexMutation(api.projects.updateProject);

  const getMainImage = () =>
    canvasEditor?.getObjects().find((obj) => obj.type === "image") || null;

  const getImageSrc = (image: any) =>
    image?.getSrc?.() || image?._element?.src || image?.src;

  const hasBackgroundRemoval = () => {
    const imageSrc = getImageSrc(getMainImage());
    return (
      imageSrc?.includes("e-bgremove") ||
      imageSrc?.includes("e-removedotbg") ||
      imageSrc?.includes("e-changebg")
    );
  };

  if (hasBackgroundRemoval()) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
        <h3 className="text-amber-400 font-medium mb-2">Extension Not Available</h3>
        <p className="text-amber-300/80 text-sm">
          AI Extension cannot be used on images with removed backgrounds. Use
          extension first, then remove background.
        </p>
      </div>
    );
  }

  const calculateDimensions = () => {
    const image = getMainImage();
    if (!image || !selectedDirection) return { width: 0, height: 0 };

    const currentWidth = image.width * (image.scaleX || 1);
    const currentHeight = image.height * (image.scaleY || 1);

    const isHorizontal = ["left", "right"].includes(selectedDirection);
    const isVertical = ["top", "bottom"].includes(selectedDirection);

    return {
      width: Math.round(currentWidth + (isHorizontal ? extensionAmount : 0)),
      height: Math.round(currentHeight + (isVertical ? extensionAmount : 0)),
    };
  };

  const { width: newWidth, height: newHeight } = calculateDimensions();

  const selectDirection = (direction: string) => {
    setSelectedDirection((prev) => (prev === direction ? null : direction));
  };

  const buildExtensionUrl = (imageUrl: string): string => {
    const baseUrl = imageUrl.split("?")[0];
    const { width, height } = calculateDimensions();

    const transformations = [
      "bg-genfill",
      `w-${width}`,
      `h-${height}`,
      "cm-pad_resize",
    ];

    const focus = FOCUS_MAP[selectedDirection!];
    if (focus) transformations.push(focus);

    return `${baseUrl}?tr=${transformations.join(",")}`;
  };

  const applyExtension = async () => {
    const mainImage = getMainImage();
    if (!mainImage || !selectedDirection) return;

    setProcessingMessage("Extending image with AI...");

    try {
      const currentImageUrl = getImageSrc(mainImage);
      const extendedUrl = buildExtensionUrl(currentImageUrl);

      const extendedImage = await FabricImage.fromURL(extendedUrl, {
        crossOrigin: "anonymous",
      });

      const scale = Math.min(
        project.width / extendedImage.width,
        project.height / extendedImage.height,
        1
      );

      extendedImage.set({
        left: project.width / 2,
        top: project.height / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
      });

      canvasEditor?.remove(mainImage);
      canvasEditor?.add(extendedImage);
      canvasEditor?.setActiveObject(extendedImage);
      canvasEditor?.requestRenderAll();

      await updateProject({
        projectId: project._id,
        currentImageUrl: extendedUrl,
        canvasState: canvasEditor?.toJSON(),
      });

      toast.success("Image Extended Successfully");
      setSelectedDirection(null);
    } catch (error) {
      console.error("Error applying extension:", error);
      toast.error("Failed to extend image. Please try again.");
    } finally {
      setProcessingMessage(null);
    }
  };

  const currentImage = getMainImage();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-white mb-3">
          Select Extension Direction
        </h3>

        <p className="text-xs text-white/70 mb-3">
          Choose one direction to extend your image
        </p>

        <div className="grid grid-cols-2 gap-3">
          {DIRECTIONS.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              onClick={() => selectDirection(key)}
              variant={selectedDirection === key ? "default" : "outline"}
              className={`flex items-center gap-2 ${
                selectedDirection === key
                  ? "bg-cyan-500 hover:bg-cyan-600"
                  : ""
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-white">Extension Amount</label>
          <span className="text-xs text-white/70">{extensionAmount}px</span>
        </div>

        <Slider
          value={[extensionAmount]}
          onValueChange={([value]) => setExtensionAmount(value)}
          min={50}
          max={500}
          step={25}
          className="w-full"
          disabled={!selectedDirection}
        />
      </div>

      {selectedDirection && currentImage && (
        <div className="bg-slate-700/30 rounded-lg p-3">
          <h4 className="text-sm font-medium text-white mb-2">Extension Preview</h4>

          <div className="text-xs text-white/70 space-y-1">
            <div>
              Current:{" "}
              {Math.round(currentImage.width * (currentImage.scaleX || 1))} x{" "}
              {Math.round(currentImage.height * (currentImage.scaleY || 1))}px
            </div>

            <div className="text-cyan-400">
              Extended: {newWidth} x {newHeight}px
            </div>

            <div className="text-white/50">
              Canvas: {project.width} x {project.height}px (unchanged)
            </div>

            <div className="text-cyan-300">
              Direction:{" "}
              {DIRECTIONS.find((d) => d.key === selectedDirection)?.label}
            </div>
          </div>
        </div>
      )}

      <Button
        onClick={applyExtension}
        disabled={!selectedDirection}
        className="w-full"
        variant="primary"
      >
        <Wand2 className="h-4 w-4 mr-2" />
        Apply AI Extension
      </Button>

      <div className="bg-slate-700/30 rounded-lg p-3">
        <p className="text-xs text-white/70">
          <strong>How it works:</strong> Select one direction → Set amount →
          Apply extension. AI fills the new area intelligently.
        </p>
      </div>
    </div>
  );
};

export default AIExtendControls;
