"use client";

import React, { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { useCanvas } from "@/Context/context";
import { Button } from "@/components/ui/button";
import {
  Download,
  ImageIcon,
  Loader2,
  Palette,
  Search,
  Trash2,
} from "lucide-react";
import { FabricImage } from "fabric";
import { toast } from "sonner";
import { HexColorPicker } from "react-colorful";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

const UNSPLASH_ACCESS_KEY =
  process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = "https://api.unsplash.com";

interface UnsplashImage {
  user: {
    name: string;
  };
  id: string;
  urls: {
    small: string;
    regular: string;
  };
  alt_description?: string;
}

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

const BackgroundControls = ({ project }: CanvasProps) => {
  const [backgroundColor, setBackgroundColor] =
    useState<string>("#ffffff");
  const [searchQuery, setSearchQuery] = useState("");
  const [unsplashImages, setUnsplashImages] = useState<
    UnsplashImage[]
  >([]);
  const [isSearching, setIsSearching] =
    useState<boolean>(false);
  const [selectedImageId, setSelectedImageId] =
    useState<string | null>(null);

  const {
    canvasEditor,
    processingMessage,
    setProcessingMessage,
  } = useCanvas();

  const getMainImage = () => {
    if (!canvasEditor) return null;
    const objects = canvasEditor.getObjects();
    return (
      objects.find((obj) => obj.type === "image") ||
      null
    );
  };

  /* ---------------- AI BACKGROUND REMOVAL ---------------- */

  const handleBackgroundRemoval = async () => {
    const mainImage = getMainImage();
    if (!mainImage || !project) return;

    setProcessingMessage(
      "Removing background with AI..."
    );

    try {
      const currentImageUrl =
        project.currentImageUrl ||
        project.originalImageUrl;

      if (!currentImageUrl) {
        toast.error(
          "No image available for background removal."
        );
        return;
      }

      const bgRemovedUrl = currentImageUrl.includes(
        "ik.imagekit.io"
      )
        ? `${currentImageUrl.split("?")[0]}?tr=e-bgremove`
        : currentImageUrl;

      const processedImage =
        await FabricImage.fromURL(bgRemovedUrl, {
          crossOrigin: "anonymous",
        });

      const currentProps = {
        left: mainImage.left,
        top: mainImage.top,
        scaleX: mainImage.scaleX,
        scaleY: mainImage.scaleY,
        angle: mainImage.angle,
        originX: mainImage.originX,
        originY: mainImage.originY,
      };

      if(!canvasEditor) return;

      canvasEditor.remove(mainImage);
      processedImage.set(currentProps);
      canvasEditor.add(processedImage);

      processedImage.setCoords();
      canvasEditor.setActiveObject(processedImage);
      canvasEditor.calcOffset();
      canvasEditor.requestRenderAll();
    } catch (error) {
      console.error(
        "Error removing background:",
        error
      );
      toast.error(
        "Failed to remove background. Please try again."
      );
    } finally {
      setProcessingMessage(null);
    }
  };

  /* ---------------- COLOR BACKGROUND ---------------- */

  const handleColorBackground = () => {
    if (!canvasEditor) return;

    canvasEditor.backgroundImage = undefined;
    canvasEditor.backgroundColor =
      backgroundColor || "#ffffff";
    canvasEditor.requestRenderAll();
  };

  /* ---------------- UNSPLASH SEARCH ---------------- */

  const searchUnsplashImages = async () => {
    if (!searchQuery.trim() || !UNSPLASH_ACCESS_KEY)
      return;

    setIsSearching(true);

    try {
      const response = await fetch(
        `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(
          searchQuery
        )}&per_page=12`,
        {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      if (!response.ok)
        throw new Error("Search failed");

      const data = await response.json();
      setUnsplashImages(data.results || []);
    } catch (error) {
      console.error(
        "Error searching Unsplash:",
        error
      );
      toast.error(
        "Failed to search images. Please try again."
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      searchUnsplashImages();
    }
  };

  /* ---------------- IMAGE BACKGROUND ---------------- */

  const handleImageBackground = async (
    imageUrl: string,
    imageId: string
  ) => {
    if (!canvasEditor) return;

    setSelectedImageId(imageId);

    try {
      if (UNSPLASH_ACCESS_KEY) {
        fetch(
          `${UNSPLASH_API_URL}/photos/${imageId}/download`,
          {
            headers: {
              Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
            },
          }
        ).catch(() => {});
      }

      const fabricImage =
        await FabricImage.fromURL(imageUrl, {
          crossOrigin: "anonymous",
        });

      const canvasWidth = project.width;
      const canvasHeight = project.height;

      const scaleX =
        canvasWidth / fabricImage.width!;
      const scaleY =
        canvasHeight / fabricImage.height!;
      const scale = Math.max(scaleX, scaleY);

      fabricImage.set({
        scaleX: scale,
        scaleY: scale,
        originX: "center",
        originY: "center",
        left: canvasWidth / 2,
        top: canvasHeight / 2,
      });

      canvasEditor.backgroundImage = fabricImage;
      canvasEditor.requestRenderAll();
    } catch (error) {
      console.error(
        "Error setting background image:",
        error
      );
      toast.error(
        "Failed to set background image."
      );
    } finally {
      setSelectedImageId(null);
    }
  };

  /* ---------------- CLEAR BACKGROUND ---------------- */

  const handleRemoveBackground = () => {
    if (!canvasEditor) return;

    canvasEditor.backgroundColor = "transparent";
    canvasEditor.backgroundImage = undefined;
    canvasEditor.requestRenderAll();
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6 relative h-full">
      <Button
        className="w-full"
        variant="primary"
        onClick={handleBackgroundRemoval}
        disabled={
          !!processingMessage || !getMainImage()
        }
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Remove Image Background
      </Button>

      <Tabs defaultValue="color">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="color">
            <Palette className="h-4 w-4 mr-2" />
            Color
          </TabsTrigger>
          <TabsTrigger value="image">
            <ImageIcon className="h-4 w-4 mr-2" />
            Image
          </TabsTrigger>
        </TabsList>

        <TabsContent value="color">
          <HexColorPicker
            color={backgroundColor}
            onChange={setBackgroundColor}
            style={{ width: "100%" }}
          />
          <Button
            className="w-full mt-4"
            onClick={handleColorBackground}
          >
            Apply Color
          </Button>
        </TabsContent>

        <TabsContent value="image">
          <Input
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            onKeyPress={handleSearchKeyPress}
            placeholder="Search images..."
          />

          <Button
            className="w-full mt-2"
            onClick={searchUnsplashImages}
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Search />
            )}
          </Button>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {unsplashImages.map((image) => (
              <div
                key={image.id}
                onClick={() =>
                  handleImageBackground(
                    image.urls.regular,
                    image.id
                  )
                }
                className="relative cursor-pointer"
              >
                <img
                  src={image.urls.small}
                  className="rounded"
                  alt={image.alt_description}
                />
                {selectedImageId === image.id && (
                  <Loader2 className="absolute inset-0 m-auto animate-spin" />
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleRemoveBackground}
      >
        Clear Canvas Background
      </Button>
    </div>
  );
};

export default BackgroundControls;
