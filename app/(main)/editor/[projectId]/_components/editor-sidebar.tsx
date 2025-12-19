import React from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
  Crop,
  Expand,
  Sliders,
  Palette,
  Maximize2,
  Text,
  Eye,
} from "lucide-react";
import { useCanvas } from "@/Context/context";
import { CropContent } from "./_tools/crop";
import { ResizeControls } from "./_tools/resize";
import { AdjustControls } from "./_tools/adjust";
import BackgroundControls from "./_tools/ai-background";
import TextControls from "./_tools/text";
import AIExtendControls from "./_tools/ai-extend";
import { AIEdit } from "./_tools/ai-edit";

/* -------------------------------------
   TYPES
------------------------------------- */

interface Project {
  _id: Id<"projects">;
  title: string;
  currentImageUrl?: string;
  originalImageUrl?: string;
  createdAt: number;
  updatedAt: number;
  width: number;
  height: number;
  canvasState?: string;
  activeTransformations?: any;
}

interface EditorSidebarProps {
  project: Project;
}

/* -------------------------------------
   TOOL CONFIG
------------------------------------- */

const TOOL_CONFIGS = {
  resize: {
    title: "Resize",
    icon: Expand,
    description: "Change project dimensions",
  },
  crop: {
    title: "Crop",
    icon: Crop,
    description: "Crop and trim your image",
  },
  adjust: {
    title: "Adjust",
    icon: Sliders,
    description: "Brightness, contrast, and more (Manual saving required)",
  },
  background: {
    title: "Background",
    icon: Palette,
    description: "Remove or change background",
  },
  ai_extender: {
    title: "AI Image Extender",
    icon: Maximize2,
    description: "Extend image boundaries with AI",
  },
  text: {
    title: "Add Text",
    icon: Text,
    description: "Customize in Various Fonts",
  },
  ai_edit: {
    title: "AI Editing",
    icon: Eye,
    description: "Enhance image quality with AI",
  },
} as const;

export type ToolId = keyof typeof TOOL_CONFIGS;

/* -------------------------------------
   MAIN COMPONENT
------------------------------------- */

const EditorSidebar = ({ project }: EditorSidebarProps) => {
  const { activeTool } = useCanvas() as {
    activeTool: ToolId | null;
  };

  const toolConfig = activeTool ? TOOL_CONFIGS[activeTool] : null;
  if (!toolConfig) return null;

  const Icon = toolConfig.icon;

  return (
    <div className="min-w-96 border-r flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-white" />
          <h2 className="text-lg font-semibold text-white">
            {toolConfig.title}
          </h2>
        </div>
        <p className="text-sm text-white mt-1">
          {toolConfig.description}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-scroll">
        {renderToolContent(activeTool, project)}
      </div>
    </div>
  );
};

/* -------------------------------------
   TOOL RENDERER
------------------------------------- */

function renderToolContent(
  activeTool: ToolId | null,
  project: Project
) {
  // Common props for canvas-aware tools
  const canvasToolProps = {
    project,
    currentImageUrl: project.currentImageUrl,
    originalImageUrl: project.originalImageUrl,
  };

  switch (activeTool) {
    case "crop":
      return <CropContent />;

    case "resize":
      return <ResizeControls project={project} />;

    case "adjust":
      return <AdjustControls />;

    case "background":
      return <BackgroundControls {...canvasToolProps} />;

    case "text":
      return <TextControls />;

    case "ai_extender":
      return <AIExtendControls {...canvasToolProps} />;

    case "ai_edit":
      return <AIEdit {...canvasToolProps} />;

    default:
      return (
        <div className="text-white">
          Select a tool to get started
        </div>
      );
  }
}

export default EditorSidebar;
