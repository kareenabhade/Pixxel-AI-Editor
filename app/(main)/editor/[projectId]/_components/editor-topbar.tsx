"use client";

import React, { useState, useEffect } from "react";
import { ToolId } from "@/hooks/use-plan-access";
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Crop,
  Expand,
  Sliders,
  Palette,
  Maximize2,
  ChevronDown,
  Text,
  RefreshCcw,
  Loader2,
  Eye,
  Save,
  Download,
  FileImage,
  Lock,
  Leaf,
} from "lucide-react";
import { Id } from '@/convex/_generated/dataModel';
import { useRouter } from "next/navigation";
import { useCanvas } from "@/Context/context";
import { Button } from "@/components/ui/button";
import { usePlanAccess } from "@/hooks/use-plan-access";
import UpgradeModal from "@/components/upgrade-modal";
import { useConvexMutation } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { FabricImage } from "fabric";


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


interface ToolItem {
  id: ToolId;
  label: string;
  icon: any;
  proOnly?: boolean;
  isActive?: boolean;
}


const TOOLS: ToolItem[] = [
  {
    id: "resize",
    label: "Resize",
    icon: Expand,
    isActive: true,
  },
  {
    id: "crop",
    label: "Crop",
    icon: Crop,
  },
  {
    id: "adjust",
    label: "Adjust",
    icon: Sliders,
  },
  {
    id: "text",
    label: "Text",
    icon: Text,
  },
  {
    id: "background",
    label: "AI Background",
    icon: Palette,
    proOnly: true,
  },
  {
    id: "ai_extender",
    label: "AI Image Extender",
    icon: Maximize2,
    proOnly: true,
  },
  {
    id: "ai_edit",
    label: "AI Editing",
    icon: Eye,
    proOnly: true,
  },
];


const EXPORT_FORMATS = [
  {
    format: "PNG",
    quality: 1.0,
    label: "PNG (High Quality)",
    extension: "png",
  },
  {
    format: "JPEG",
    quality: 0.9,
    label: "JPEG (90% Quality)",
    extension: "jpg",
  },
  {
    format: "JPEG",
    quality: 0.8,
    label: "JPEG (80% Quality)",
    extension: "jpg",
  },
  {
    format: "WEBP",
    quality: 0.9,
    label: "WebP (90% Quality)",
    extension: "webp",
  },
];


const EditorTopbar = ({project}:CanvasProps) => {
    const router = useRouter();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [restrictedTool, setRestrictedTool] = useState<ToolId | null>(null);

    const {activeTool, onToolChange, canvasEditor} = useCanvas();
    const {hasAccess, canExport, isFree} = usePlanAccess();
    const {mutate: updateProject, isLoading: isSaving} = useConvexMutation(api.projects.updateProject)

    const handleBackToDashboard = ()=>{
        router.push("/dashboard");
    }

    const handleToolChange = (toolId:any)=>{
         if(!hasAccess(toolId)){
            setRestrictedTool(toolId);
            setShowUpgradeModal(true);
            return;
         }

         onToolChange(toolId);
    }

   const handleResetToolOriginal = async()=>{
        if(!canvasEditor || !project || !project.originalImageUrl){
          toast.error("No original image found to resest to");
          return;
        }

        try {
          canvasEditor.clear();
          canvasEditor.backgroundColor = "#ffffff";
          canvasEditor.backgroundImage = undefined;

          const fabricImage = await FabricImage.fromURL(project.originalImageUrl,{
            crossOrigin: "anonymous",
          });

          const imgAspectRatio = fabricImage.width / fabricImage.height;
          const canvasAspectRatio = project.width / project.height;

          const scale = 
               imgAspectRatio > canvasAspectRatio
               ? project.width / fabricImage.width
               : project.height / fabricImage.height;

          fabricImage.set({
            left: project.width / 2,
            top: project.height / 2,
            originX: "center",
            originY: "center",
            scaleX: scale,
            scaleY: scale,
            selectable: true,
            evented: true,
          });
    
          fabricImage.filters = [];
          canvasEditor.add(fabricImage);
          canvasEditor.centerObject(fabricImage);
          canvasEditor.setActiveObject(fabricImage);
          canvasEditor.requestRenderAll();
    
          // Save the reset state
          const canvasJSON = canvasEditor.toJSON();
          await updateProject({
            projectId: project._id,
            canvasState: canvasJSON,
            currentImageUrl: project.originalImageUrl,
            activeTransformations: undefined,
            backgroundRemoved: false,
          });
    
          toast.success("Canvas reset to original image");
        } catch (error) {
          console.error("Error resetting canvas:", error);
          toast.error("Failed to reset canvas. Please try again.");
        }
   }

  return (
    <>
     <div className="border-b px-6 py-3 ">
        <div className="flex items-center justify-between mb-4">
            <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToDashboard}
                className="text-white hover:text-gray-300"
            >
                <ArrowLeft className="h-4 w-4 mr-2"/>
                All Projects
            </Button>

            <h1 className="font-extrabold capitalize">{project.title}</h1>


            <div className="fleex items-center gap-3">
              <Button 
                  variant="outline"
                  size="sm"
                  onClick={handleResetToolOriginal}
                  disabled={isSaving || !project.originalImageUrl}
                  className="gap-2"
                >
                <RefreshCcw className="h-4 w-4"/>
                Reset
              </Button>

            </div>
        </div>

        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {TOOLS.map((tool)=>{
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    const hasToolAccess = hasAccess(tool.id);

                    return(
                        <Button
                           key={tool.id}
                           variant={isActive ? "default" : "ghost"}
                           size="sm"
                           onClick={()=>handleToolChange(tool.id)}
                           className={`gap-2 relative ${
                             isActive
                             ? "bg-blue-600 text-white hover:bg-blue-700"
                             : "text-white hober:text-gray-300 hover:bg-gray-100"
                            } ${!hasToolAccess ? "opacity-60" : ""}`}
                        >
                            <Icon />
                            {tool.label}
                            {tool.proOnly && !hasToolAccess && (
                                <Lock className="h-3 w-3 text-amber-400"/>
                            )}
                        </Button>
                    );
                })}
            </div>

            <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-white">
                    <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-white">
                    <RotateCw className="h-4 w-4" />
                </Button>
            </div>
        </div>
     </div>


     <UpgradeModal 
            isOpen={showUpgradeModal} 
            onClose={()=>{
                setShowUpgradeModal(false);
                setRestrictedTool(null);
            }}
            restrictedTool={restrictedTool}
            reason={
                restrictedTool === "export"
                ? "Free plan is limited to 20 exports per month. Upgrade to Pro for unlimited exports."
                : undefined
            }
     />
    </>
  )
}

export default EditorTopbar