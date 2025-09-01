"use client";

interface DebugInfoProps {
  urn: string | null;
  accessToken: string | null;
  loading: boolean;
  conversionProgress: string;
  conversionError: string | null;
  fileName: string;
  fileType: string;
}

export default function DebugInfo({
  urn,
  accessToken,
  loading,
  conversionProgress,
  conversionError,
  fileName,
  fileType
}: DebugInfoProps) {
  if (process.env.NODE_ENV === "production") {
    return null; // Don't show debug info in production
  }

  return (
    <div className="bg-gray-100 border rounded-lg p-4 mb-4 text-xs">
      <h4 className="font-semibold mb-2">Debug Information</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <strong>URN:</strong> {urn ? `${urn.substring(0, 20)}...` : "None"}
        </div>
        <div>
          <strong>Access Token:</strong> {accessToken ? "✅" : "❌"}
        </div>
        <div>
          <strong>Loading:</strong> {loading ? "✅" : "❌"}
        </div>
        <div>
          <strong>File:</strong> {fileName || "None"}
        </div>
        <div>
          <strong>Type:</strong> {fileType || "None"}
        </div>
        <div>
          <strong>Error:</strong> {conversionError || "None"}
        </div>
      </div>
      {conversionProgress && (
        <div className="mt-2">
          <strong>Progress:</strong> {conversionProgress}
        </div>
      )}
      
      <div className="mt-3 space-y-1">
        <button
          onClick={() => {
            if (urn) {
              fetch(`/api/manifest?urn=${urn}`)
                .then(res => res.json())
                .then(data => console.log("Manual manifest check:", data))
                .catch(err => console.error("Manual manifest error:", err));
            }
          }}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
        >
          Check Manifest
        </button>
        
        <button
          onClick={() => {
            console.log("Current state:", {
              urn,
              accessToken: accessToken ? "Present" : "Missing",
              loading,
              conversionProgress,
              conversionError,
              fileName,
              fileType
            });
          }}
          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 ml-2"
        >
          Log State
        </button>
      </div>
    </div>
  );
}