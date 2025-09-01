import React, { useEffect, useRef, useState } from "react";

declare const Autodesk: any;

interface Props {
  fileName: string;
  fileType: string;
  urn: string; // Base64-encoded URN from Forge upload API
  onRetry: () => void;
}

const TwoDToThreeDConverter: React.FC<Props> = ({
  fileName,
  fileType,
  urn,
  onRetry,
}) => {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [viewer, setViewer] = useState<any>(null);

  // Fetch token from our Next.js API
  const fetchAccessToken = async () => {
    try {
      const res = await fetch("/api/forge-token");
      const data = await res.json();
      if (!data.access_token) {
        throw new Error("Failed to fetch access token");
      }
      return data.access_token;
    } catch (error) {
      console.error("Error fetching token:", error);
      return null;
    }
  };

  // Initialize Autodesk APS Viewer
  const initViewer = async () => {
    if (!urn) {
      console.error("URN missing, cannot load model.");
      return;
    }

    const token = await fetchAccessToken();
    if (!token) {
      console.error("Failed to get APS token");
      return;
    }

    const options = {
      env: "AutodeskProduction",
      api: "derivativeV2", // APS v2 API
      getAccessToken: (onTokenReady: any) => {
        onTokenReady(token, 3600);
      },
    };

    Autodesk.Viewing.Initializer(options, () => {
      if (viewerRef.current) {
        const newViewer = new Autodesk.Viewing.GuiViewer3D(viewerRef.current, {
          extensions: ["Autodesk.DocumentBrowser"],
        });
        setViewer(newViewer);

        newViewer.start();
        loadDocument(urn, newViewer);
      }
    });
  };

  // Load the document into the viewer
  const loadDocument = (urn: string, viewerInstance: any) => {
    const documentId = `urn:${urn}`; // URN must be prefixed with "urn:"

    Autodesk.Viewing.Document.load(
      documentId,
      (doc: any) => {
        const defaultModel = doc.getRoot().getDefaultGeometry();
        if (!defaultModel) {
          console.error("No viewable content found.");
          return;
        }
        viewerInstance.loadDocumentNode(doc, defaultModel);
      },
      (errCode: any) => {
        console.error("Document load failed:", errCode);
      }
    );
  };

  useEffect(() => {
    initViewer();

    // Cleanup viewer on unmount
    return () => {
      if (viewer) {
        viewer.finish();
        setViewer(null);
      }
    };
  }, [urn]);

  return (
    <div className="p-4 bg-gray-50 rounded-lg shadow-md">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-700">
          {fileName} ({fileType})
        </h3>
      </div>

      {/* Viewer Container */}
      <div
        ref={viewerRef}
        className="w-full h-[600px] border rounded-md bg-black"
      />

      {/* Retry Button */}
      <div className="mt-4 text-center">
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
};

export default TwoDToThreeDConverter;
