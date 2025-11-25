"use client";

import { useEffect, useRef, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useCanvas } from "@/Context/context";
import { api } from "@/convex/_generated/api";
import { useConvexMutation } from "@/hooks/use-convex-query";
import { Canvas, FabricImage } from "fabric";

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

const CanvasEditor = ({ project }: CanvasProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null); // <-- single source of truth

  const { canvasEditor, setCanvasEditor, activeTool, onToolChange } = useCanvas();
  const { mutate: updateProject } = useConvexMutation(api.projects.updateProject);

  /** VIEWPORT SCALE */
  const calculateViewportScale = () => {
    if (!containerRef.current) return 1;

    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    const scaleX = cw / project.width;
    const scaleY = ch / project.height;

    return Math.min(scaleX, scaleY, 1);
  };

  /** INITIALIZE FABRIC CANVAS */
  useEffect(() => {
    if (!project || !canvasRef.current || !containerRef.current) return;

    const init = async () => {
      setIsLoading(true);

      const canvasEl = canvasRef.current!;
      const container = containerRef.current!;

      /** 1. DISPOSE EXISTING INSTANCE */
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
        setCanvasEditor(null);
      }

      // Prevent Fabric double-init bug
      // @ts-ignore
      canvasEl?.fabric && delete canvasEl.fabric;

      /** 2. CALCULATE SCALE */
      const viewportScale = calculateViewportScale();
      const logicalWidth = project.width;
      const logicalHeight = project.height;

      const cssWidth = Math.round(logicalWidth * viewportScale);
      const cssHeight = Math.round(logicalHeight * viewportScale);

      /** 3. SET CSS SIZE ONLY */
      canvasEl.style.width = `${cssWidth}px`;
      canvasEl.style.height = `${cssHeight}px`;

      /** Backstore = CSS size (RECOMMENDED) */
      canvasEl.width = cssWidth;
      canvasEl.height = cssHeight;

      /** 4. CREATE FABRIC CANVAS */
      const fabricCanvas = new Canvas(canvasEl, {
        width: cssWidth,
        height: cssHeight,
        backgroundColor: "#ffffff",
        selection: true,
        preserveObjectStacking: true,
      });

      fabricRef.current = fabricCanvas;
      setCanvasEditor(fabricCanvas);

      /** 5. SET ZOOM (map project coords → css coords) */
      const zoom = cssWidth / logicalWidth;
      fabricCanvas.setZoom(zoom);

      /** 6. LOAD IMAGE */
      try {
        const url = project.currentImageUrl || project.originalImageUrl;

        if (url) {
          const img = await FabricImage.fromURL(url, {
            crossOrigin: "anonymous",
          });

          img.scaleToWidth(logicalWidth);
          img.set({
            left: logicalWidth / 2,
            top: logicalHeight / 2,
            originX: "center",
            originY: "center",
            selectable: true,
          });

          fabricCanvas.add(img);
          fabricCanvas.centerObject(img);
        }
      } catch (err) {
        console.error("Image load error:", err);
      }

      /** 7. LOAD SAVED JSON */
      if (project.canvasState) {
        try {
          await fabricCanvas.loadFromJSON(project.canvasState);
          fabricCanvas.requestRenderAll();
        } catch (err) {
          console.error("Canvas JSON load error:", err);
        }
      }

      fabricCanvas.requestRenderAll();

      setTimeout(()=>{
        window.dispatchEvent(new Event("resize"));
      })
      setIsLoading(false);
    };

    init();

    /** CLEANUP */
    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
        setCanvasEditor(null);
      }
    };
  }, [project]);

  const saveCanvasState = async ()=>{
    if(!canvasEditor || !project) return;

    try {
      const canvasJSON = canvasEditor.toJSON();

      await updateProject({
        projectId: project._id,
        canvasState: canvasJSON,
      })
    } catch (error) {
      console.error("Error saving canvas state:", error);
    }
  }

  useEffect(()=>{
      if(!canvasEditor) return;
      
      let saveTimeout: NodeJS.Timeout;

      // debouncednsave function - wait 2 seconds after last change
      const handleCanvasChange = ()=>{
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(()=>{
           saveCanvasState();
        },2000)
      };

      // listen for canvas modification events
      canvasEditor.on("object:added", handleCanvasChange);
      canvasEditor.on("object:modified", handleCanvasChange);
      canvasEditor.on("object:removed", handleCanvasChange);

      return ()=>{
        clearTimeout(saveTimeout);
              // listen for canvas modification events
      canvasEditor.off("object:added", handleCanvasChange);
      canvasEditor.off("object:modified", handleCanvasChange);
      canvasEditor.off("object:removed", handleCanvasChange);

      }
  },[canvasEditor])

  useEffect(()=>{
     const handleResize = ()=>{
      if(!canvasEditor || !project) return;

      // recalculate optimal scale for new window size
      const newScale = calculateViewportScale();

      canvasEditor.setDimensions({
        width: project.width*newScale,
        height: project.height*newScale,
      },
      {backstoreOnly: false}
    );

    canvasEditor.setZoom(newScale);
    canvasEditor.calcOffset();
    canvasEditor.requestRenderAll();
  };

  window.addEventListener("resize", handleResize);
  return ()=>window.removeEventListener("resize", handleResize);
},[canvasEditor, project]);

  useEffect(() => {
    if (!canvasEditor) return;

    switch (activeTool) {
      case "crop":
        canvasEditor.defaultCursor = "crosshair";
        canvasEditor.hoverCursor = "crosshair";
        break;
      default:
        canvasEditor.defaultCursor = "default";
        canvasEditor.hoverCursor = "move";
    }
  }, [canvasEditor, activeTool]);

  useEffect(()=>{
     if(!canvasEditor || !onToolChange) return;

     const handleSelection = (e:any)=>{
      const selectedObject = e.selected?.[0];

      if(selectedObject && selectedObject.type === "i-text"){
        onToolChange("text");
      }
     };

     canvasEditor.on("selection:created", handleSelection);
     canvasEditor.on("selection:updated", handleSelection);

     return ()=>{
      canvasEditor.off("selection:created", handleSelection);
      canvasEditor.off("selection:updated", handleSelection);
     }
  },[canvasEditor, onToolChange])

  /** JSX */
  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center bg-secondary w-full h-full overflow-hidden"
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #64748b 25%, transparent 25%),
            linear-gradient(-45deg, #64748b 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #64748b 75%),
            linear-gradient(-45deg, transparent 75%, #64748b 75%)`,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="text-white/70 text-sm">Loading canvas...</p>
          </div>
        </div>
      )}

      <div className="w-full h-full flex items-center justify-center">
        <canvas ref={canvasRef} className="border" />
      </div>
    </div>
  );
};

export default CanvasEditor;
