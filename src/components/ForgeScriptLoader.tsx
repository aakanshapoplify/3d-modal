 "use client";

import { useEffect, useState } from "react";

interface ForgeScriptLoaderProps {
  onReady?: () => void;
}

export default function ForgeScriptLoader({ onReady }: ForgeScriptLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Check if script is already loaded
    if (typeof window !== "undefined" && (window as any).Autodesk) {
      setIsLoaded(true);
      onReady?.();
      return;
    }

    // Create and load script
    const script = document.createElement("script");
    script.src = "https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js";
    script.async = true;

    // Create and load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css";

    const handleScriptLoad = () => {
      console.log("Forge Viewer script loaded ✅");
      setIsLoaded(true);
      if (typeof window !== "undefined" && (window as any).Autodesk) {
        onReady?.();
      }
    };

    const handleScriptError = (error: Error | Event) => {
      console.error("Error loading Forge Viewer script:", error);
    };

    script.addEventListener("load", handleScriptLoad);
    script.addEventListener("error", handleScriptError);

    // Append elements to document
    document.head.appendChild(link);
    document.body.appendChild(script);

    // Cleanup function
    return () => {
      script.removeEventListener("load", handleScriptLoad);
      script.removeEventListener("error", handleScriptError);
      if (!isLoaded) {
        script.remove();
        link.remove();
      }
    };
  }, [onReady, isLoaded]); // Include isLoaded in dependencies

  return null;
}
