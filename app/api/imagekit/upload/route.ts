import { auth } from "@clerk/nextjs/server";
import ImageKit from "imagekit";
import { NextResponse } from "next/server";

function getImageKit() {
  const {
    NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    IMAGEKIT_PRIVATE_KEY,
    NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
  } = process.env;

  if (
    !NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ||
    !IMAGEKIT_PRIVATE_KEY ||
    !NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
  ) {
    return null;
  }

  return new ImageKit({
    publicKey: NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
  });
}

export async function POST(request: Request) {
  try {
    const imagekit = getImageKit();
    if (!imagekit) {
      return NextResponse.json(
        { error: "ImageKit environment variables not configured" },
        { status: 500 }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const fileName = formData.get("fileName");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const timestamp = Date.now();
    const sanitizedFileName =
      typeof fileName === "string"
        ? fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
        : "upload";

    const uniqueFileName = `${userId}/${timestamp}_${sanitizedFileName}`;

    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: uniqueFileName,
      folder: "/yt-projects",
    });

    const thumbnailUrl = imagekit.url({
      src: uploadResponse.url,
      transformation: [
        {
          width: 400,
          height: 300,
          cropMode: "maintain_ar",
          quality: 80,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      url: uploadResponse.url,
      thumbnailUrl,
      fileId: uploadResponse.fileId,
      width: uploadResponse.width,
      height: uploadResponse.height,
      size: uploadResponse.size,
      name: uploadResponse.name,
    });
  } catch (error: unknown) {
    console.error("ImageKit upload error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload image",
        details:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
