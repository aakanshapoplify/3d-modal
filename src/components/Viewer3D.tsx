"use client";
import { useEffect, useRef, useState } from "react";

interface Viewer3DProps {
  urn: string;
  accessToken: string;
  on2DDetected?: () => void;
}

export default function Viewer3D({ urn, accessToken, on2DDetected }: Viewer3DProps) {
  const viewerDiv = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const Autodesk = (window as any).Autodesk;
    if (!Autodesk || !Autodesk.Viewing) {
      console.error("Autodesk Forge Viewer not loaded");
      return;
    }

    const options = {
      env: "AutodeskProduction",
      accessToken,
    };

    Autodesk.Viewing.Initializer(options, () => {
      const viewer = new Autodesk.Viewing.GuiViewer3D(viewerDiv.current!);
      viewer.start();

      const documentId = `urn:${urn}`;
      Autodesk.Viewing.Document.load(
        documentId,
        (doc: any) => {
          const defaultModel = doc.getRoot().getDefaultGeometry();
          viewer.loadDocumentNode(doc, defaultModel);

          // Detect 2D drawings
          const is2D =
            defaultModel.data?.type === "geometry" &&
            defaultModel.data?.role === "2d";

          if (is2D && on2DDetected) {
            on2DDetected();
          }

          setLoading(false);
        },
        (err: any) => {
          console.error("Document load error", err);
          setLoading(false);
        }
      );
    });
  }, [urn, accessToken, on2DDetected]);

  return (
    <div className="relative w-full h-[600px]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <span className="text-lg font-medium">Loading 3D Model...</span>
        </div>
      )}
      <div ref={viewerDiv} className="w-full h-full" />
    </div>
  );
}
