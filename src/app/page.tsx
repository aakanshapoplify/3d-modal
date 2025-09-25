"use client";
import { useState, useEffect } from "react";
import UploadForm from "@/components/UploadForm";
import Viewer3D from "@/components/Viewer3D";
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
  const [showAlternativeFormats, setShowAlternativeFormats] = useState(false);

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
              const errorMessage = data.message || "Translation failed";
              const suggestions = data.suggestions || [];
              const details = data.details || "";
              
              // Check if this is a retryable error (error code -777)
              const isRetryableError = details.includes("error code -777") || details.includes("Extractor error");
              
              if (isRetryableError && attempts < 3) {
                // Retry with a delay for extractor errors
                setConversionProgress(`Retrying conversion due to extractor error... (Retry ${attempts}/3)`);
                await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds before retry
                continue; // Skip the normal wait and try again immediately
              }
              
              let fullErrorMessage = errorMessage;
              if (details) {
                fullErrorMessage += `\n\nDetails: ${details}`;
              }
              if (suggestions.length > 0) {
                fullErrorMessage += `\n\nSuggestions:\n${suggestions.map((s: string) => `• ${s}`).join('\n')}`;
              }
              
              // Add specific guidance for error -777
              if (details.includes("error code -777")) {
                fullErrorMessage += `\n\n🔧 For Error Code -777:\n• Export your RVT file as DWG/DXF from Revit\n• Try a different RVT file version\n• Simplify the model in Revit before uploading`;
              }
              
              throw new Error(fullErrorMessage);
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
        
        // Show alternative formats option for RVT errors
        if (err.message.includes("error code -777") || fileType.toLowerCase().includes('rvt')) {
          setShowAlternativeFormats(true);
        }
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

  const handleDownloadGLTF = async (format: 'gltf' | 'glb' = 'glb') => {
    if (!urn) return;
    try {
      const res = await fetch(`/api/download-gltf/${encodeURIComponent(urn)}?format=${format}&deduplicate=true`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      localStorage.setItem('lastConvertedModelUrl', url);
      // trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `model.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Navigate to R3F viewer to load it
      window.location.href = '/r3f-viewer';
    } catch (e: any) {
      console.error('Download failed:', e);
      alert(`Download failed: ${e?.message || e}`);
    }
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
              <p className="text-red-600 mb-4 whitespace-pre-line">{conversionError}</p>
              
              {showAlternativeFormats && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                  <h4 className="text-sm font-medium text-blue-800 mb-3">
                    💡 Alternative Solutions for RVT Files:
                  </h4>
                  <div className="text-sm text-blue-700 space-y-3">
                    <div>
                      <strong>1. Export as DWG/DXF:</strong>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li>• Open your RVT file in Revit</li>
                        <li>• Go to File → Export → CAD Formats</li>
                        <li>• Export as DWG or DXF</li>
                        <li>• Upload the exported file here</li>
                      </ul>
                    </div>
                    <div>
                      <strong>2. Try Different RVT Version:</strong>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li>• Save your RVT file as a newer version</li>
                        <li>• Use Revit 2022, 2023, or 2024</li>
                        <li>• Re-upload the newer version</li>
                      </ul>
                    </div>
                    <div>
                      <strong>3. Simplify the Model:</strong>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li>• Remove complex families or components</li>
                        <li>• Purge unused families and materials</li>
                        <li>• Delete unnecessary views</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-x-4 mt-4">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => {
                    setConversionError(null);
                    setShowAlternativeFormats(false);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Upload Different File
                </button>
              </div>
            </div>
          </div>
        )}

        {urn && accessToken && !loading && !conversionError && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Model Viewer</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownloadGLTF('glb')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  Download as GLB
                </button>
                <button
                  onClick={() => handleDownloadGLTF('gltf')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm"
                >
                  Download as GLTF
                </button>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
                >
                  Upload New File
                </button>
              </div>
            </div>
            {is2D && (
              <div className="mb-4 p-3 rounded bg-yellow-50 text-yellow-800 text-sm">
                Detected a 2D drawing. The viewer will display 2D sheets. Converting 2D to 3D requires manual modeling or external services.
              </div>
            )}
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