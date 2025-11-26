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
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { FabricImage, TMat2D } from "fabric";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
    
    const [isExporting, setIsExporting] = useState(false);
    const [exportFormat, setExportFormat] = useState(null);

    const {mutate: updateProject, isLoading: isSaving} = useConvexMutation(api.projects.updateProject)

    const {data:user} = useConvexQuery(api.users.getCurrentUser);

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

  const handleManualSave = async()=>{
    try {
      await updateProject({
        projectId : project._id,
        canvasState: canvasEditor?.toJSON(),
      })

      toast.success("Project saved successfully!");
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Failed to save project. Please try again.");
    }
  }

const handleExport = async (exportConfig: any) => {
  if (!canvasEditor || !project) {
    toast.error("Canvas not ready for export");
    return;
  }

  if (!canExport(user?.exportsThisMonth || 0)) {
    setRestrictedTool("export");
    setShowUpgradeModal(true);
    return;
  }

  setIsExporting(true);
  setExportFormat(exportConfig.format);

  try {
    // Store current canvas state
    const currentZoom = canvasEditor.getZoom();

    // ⭐ FIX: Safe cloning of viewport transform
    const currentViewportTransform: TMat2D = canvasEditor.viewportTransform
      ? ([...canvasEditor.viewportTransform] as TMat2D)
      : [1, 0, 0, 1, 0, 0];

    // Reset for export
    canvasEditor.setZoom(1);
    canvasEditor.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvasEditor.setDimensions({
      width: project.width,
      height: project.height,
    });
    canvasEditor.requestRenderAll();

    const dataURL = canvasEditor.toDataURL({
      format: exportConfig.format.toLowerCase(),
      quality: exportConfig.quality,
      multiplier: 1,
    });

    // Restore original view
    canvasEditor.setZoom(currentZoom);
    canvasEditor.setViewportTransform(currentViewportTransform);
    canvasEditor.setDimensions({
      width: project.width * currentZoom,
      height: project.height * currentZoom,
    });
    canvasEditor.requestRenderAll();

    // Download
    const link = document.createElement("a");
    link.download = `${project.title}.${exportConfig.extension}`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Image exported as ${exportConfig.format}!`);
  } catch (error) {
    console.error("Error exporting image:", error);
    toast.error("Failed to export image. Please try again.");
  } finally {
    setIsExporting(false);
    setExportFormat(null);
  }
};


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


            <div className="flex items-center gap-3">
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


              <Button
                 variant="primary"
                 size="sm"
                 onClick={handleManualSave}
                 disabled={isSaving || !canvasEditor}
                 className="gap-2"
              >
                {
                  isSaving ? (
                    <>
                    <Loader2 className="h-4 w-4 animate-spin"/>
                    Saving...
                    </>
                  ):(
                    <>
                    <Save className="h-4 w-4"/>
                    Save
                    </>
                  )
                }
              </Button>


              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                      variant="glass"
                      size="sm"
                      disabled={isExporting || !canvasEditor}
                      className="gap-2"
                  >
                    {isExporting ? (
                      <>
                      <Loader2 className="h-4 w-4 animate-spin"/>
                      Exporting {exportFormat}
                      </>
                    ):(
                      <>
                      <Download className="h-4 w-4"/>
                      Export 
                      <ChevronDown className="h-4 w-4"/>
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                      align="end"
                      className="w-56 bg-slate-800 border-slate-700"
                >
                  <DropdownMenuLabel className="px-3 py-2 text-sm text-white/70">
                    Export Resolution: {project.width} x {project.height}px
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-700" />
                  {
                    EXPORT_FORMATS.map((config, index)=>(
                      <DropdownMenuItem
                          key={index}
                          onClick={()=>handleExport(config)}
                          className="text-white hover:bg-slate-700 cursor-pointer flex items-center gap-2"
                      >
                        <FileImage className="h-4 w-4"/>
                        <div className="flex-1">
                          <div className="font-medium">{config.label}</div>
                          <div className="text-xs text-white/50">
                            {config.format}.{Math.round(config.quality*100)}%
                            quality
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  }

                 {isFree &&
                 <div className="px-3 py-2 text-xs text-white/50">
                  <DropdownMenuSeparator className="bg-slate-700"/>
                    Free Plan : {user?.exportsThisMonth || 0 }/20 exports this month
                    {(user?.exportsThisMonth || 0) >= 20 && (
                      <div className="text-amber-400 mt-1">
                        Upgrade to Pro for unlimited exports
                      </div>
                    )}
                  </div>
                  }
                </DropdownMenuContent>
              </DropdownMenu>

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