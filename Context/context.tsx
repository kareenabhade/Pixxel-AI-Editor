import { createContext, useContext } from "react";
import type { Canvas } from "fabric";

export interface CanvasContextType {
  canvasEditor: Canvas | null;
  setCanvasEditor: (canvas: Canvas | null) => void;

  activeTool: string;
  onToolChange: (tool: string) => void;

  processingMessage: string | null;
  setProcessingMessage: (msg: string | null) => void;
}

export const CanvasContext = createContext<CanvasContextType | undefined>(
  undefined
);

export const useCanvas = (): CanvasContextType => {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used inside CanvasContext.Provider");
  }
  return context;
};
