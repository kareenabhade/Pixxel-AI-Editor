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
} from "lucide-react";
import { Id } from '@/convex/_generated/dataModel';
import { useRouter } from "next/navigation";
import { useCanvas } from "@/Context/context";
import { Button } from "@/components/ui/button";
import { usePlanAccess } from "@/hooks/use-plan-access";
import UpgradeModal from "@/components/upgrade-modal";


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


const EditorTopbar = ({project}:CanvasProps) => {
    const router = useRouter();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [restrictedTool, setRestrictedTool] = useState<ToolId | null>(null);

    const {activeTool, onToolChange, canvasEditor} = useCanvas();
    const {hasAccess, canExport, isFree} = usePlanAccess();

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


            <div>Right Actions</div>
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