"use client";
import { useState, useEffect } from "react";
import UploadForm from "@/components/UploadForm";
import Viewer3D from "@/components/Viewer3D";
import TwoDToThreeDConverter from "@/components/TwoDToThreeDConverter";
import axios from "axios";

export default function UploadPage() {
  const [urn, setUrn] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<string>("");
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [is2D, setIs2D] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");

  console.log("Current URN:", urn);

  // Fetch Forge access token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await axios.get("/api/forge-token");
        setAccessToken(res.data.access_token);
      } catch (err) {
        console.error("Failed to fetch Forge token:", err);
      }
    };
    fetchToken();
  }, []);

  useEffect(() => {
    if (!urn) return;

    const translateModel = async () => {
      setLoading(true);
      setConversionError(null);
      setConversionProgress("Starting conversion...");

      try {
        // Call convert API to start translation
        setConversionProgress("Initiating translation...");
        const res = await fetch(`/api/convert?urn=${urn}`, { method: "POST" });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Translation API failed");
        }

        const convertData = await res.json();
        console.log("Convert response:", convertData);

        // Poll manifest until translation is ready
        let translated = false;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max (60 * 5 seconds)
        const pollInterval = 5000; // 5 seconds

        while (!translated && attempts < maxAttempts) {
          attempts++;
          setConversionProgress(`Checking conversion status... (Attempt ${attempts}/${maxAttempts})`);

          try {
            const manifestRes = await fetch(`/api/manifest?urn=${urn}`);
            if (!manifestRes.ok) {
              throw new Error("Failed to check manifest");
            }

            const data = await manifestRes.json();
            console.log("Manifest data:", data);

            if (data.status === "success") {
              setConversionProgress("Conversion completed successfully!");
              translated = true;
            } else if (data.status === "failed") {
              throw new Error(data.message || "Translation failed");
            } else if (data.status === "pending") {
              setConversionProgress(`Conversion in progress... ${data.progress || ""}`);
            } else {
              setConversionProgress("Waiting for conversion to start...");
            }

            // Wait before next poll
            await new Promise((resolve) => setTimeout(resolve, pollInterval));

          } catch (pollError) {
            console.error("Polling error:", pollError);
            if (attempts >= maxAttempts) {
              throw new Error("Conversion timeout - please try again");
            }
            // Continue polling on error
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
          }
        }

        if (!translated) {
          throw new Error("Conversion timeout - the process took too long");
        }

      } catch (err: any) {
        console.error("Error during translation:", err);
        setConversionError(err.message || "Conversion failed");
      } finally {
        setLoading(false);
      }
    };

    translateModel();
  }, [urn]);

  const handleUploadSuccess = (newUrn: string, fileInfo?: { name: string; type: string }) => {
    setUrn(newUrn);
    if (fileInfo) {
      setFileName(fileInfo.name);
      setFileType(fileInfo.type);
    }
    setIs2D(false); // Reset 2D state for new upload
    setConversionError(null); // Reset error state
  };

  const handle2DDetection = () => {
    setIs2D(true);
  };

  const handleRetry = () => {
    setUrn(null);
    setIs2D(false);
    setFileName("");
    setFileType("");
    setConversionError(null);
    setConversionProgress("");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload & View 3D Models</h1>
          <p className="text-gray-600">
            Upload your CAD files, 3D models, or 2D drawings and view them in 3D
          </p>
        </div>

        {!urn && (
          <div className="mb-8">
            <UploadForm onSuccess={handleUploadSuccess} />
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium mb-2">Converting your file...</p>
            <p className="text-sm text-gray-500 mb-4">{conversionProgress}</p>
            <div className="max-w-md mx-auto">
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              This process can take 1-5 minutes depending on file size and complexity
            </p>
          </div>
        )}

        {conversionError && (
          <div className="mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Conversion Failed</h3>
              <p className="text-red-600 mb-4">{conversionError}</p>
              <div className="space-x-4">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setConversionError(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Upload Different File
                </button>
              </div>
            </div>
          </div>
        )}

        {urn && accessToken && !loading && !conversionError && is2D && (
          <div className="mb-8">
            <TwoDToThreeDConverter
              fileName={fileName}
              fileType={fileType}
              urn={urn}              // Base64 URN from Forge upload API
              onRetry={handleRetry}
            />


          </div>
        )}

        {urn && accessToken && !loading && !conversionError && !is2D && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">3D Model Viewer</h2>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
              >
                Upload New File
              </button>
            </div>
            <Viewer3D
              urn={urn}
              accessToken={accessToken}
              on2DDetected={handle2DDetection}
            />
          </div>
        )}
      </div>
    </div>
  );
}