import fs from "fs";
import path from "path";
import svfUtils from "svf-utils";

// Set up authentication for svf-utils at module level
let authProvider: any = null;

// Create a proper authentication provider class
class AuthenticationProvider {
  private token: string = '';
  
  constructor(token: string) {
    this.token = token;
  }
  
  async getToken(): Promise<string> {
    return this.token;
  }
  
  async getAccessToken(): Promise<string> {
    return this.token;
  }
}

// Initialize authentication provider immediately
(async () => {
  try {
    const token = await getApsToken();
    authProvider = { 
      getToken: async () => token.access_token,
      getAccessToken: async () => token.access_token
    } as const;
    
    // Set environment variables for svf-utils
    process.env.FORGE_CLIENT_ID = process.env.FORGE_CLIENT_ID || "";
    process.env.FORGE_CLIENT_SECRET = process.env.FORGE_CLIENT_SECRET || "";
    process.env.FORGE_ACCESS_TOKEN = token.access_token;
    
    // Set authentication provider globally on svf-utils
    if ((svfUtils as any).setAuthenticationProvider) {
      (svfUtils as any).setAuthenticationProvider(authProvider);
    }
    
    // Also set it directly on the svf-utils object
    (svfUtils as any).authenticationProvider = authProvider;
    
    console.log("[svfConvert] Authentication provider initialized");
  } catch (error) {
    console.error("[svfConvert] Failed to initialize authentication:", error);
  }
})();

// Initialize authentication provider
async function initializeAuth() {
  if (!authProvider) {
    const token = await getApsToken();
    authProvider = { 
      getToken: async () => token.access_token,
      getAccessToken: async () => token.access_token
    } as const;
    
    // Set environment variables for svf-utils
    process.env.FORGE_CLIENT_ID = process.env.FORGE_CLIENT_ID || "";
    process.env.FORGE_CLIENT_SECRET = process.env.FORGE_CLIENT_SECRET || "";
    process.env.FORGE_ACCESS_TOKEN = token.access_token;
    
    // Set authentication provider globally
    if ((svfUtils as any).setAuthenticationProvider) {
      (svfUtils as any).setAuthenticationProvider(authProvider);
    }
    
    // Also set it directly on the svf-utils object
    (svfUtils as any).authenticationProvider = authProvider;
  }
  return authProvider;
}

type AuthToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

// --- APS Token ---
export async function getApsToken(): Promise<AuthToken> {
  const params = new URLSearchParams({
    client_id: process.env.FORGE_CLIENT_ID || "",
    client_secret: process.env.FORGE_CLIENT_SECRET || "",
    grant_type: "client_credentials",
    scope: "data:read data:write data:create bucket:create bucket:read viewables:read",
  });

  const res = await fetch("https://developer.api.autodesk.com/authentication/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`APS token failed: ${res.status} ${res.statusText}`);
  return res.json();
}

// --- Output dir ---
export async function ensureConvertedDir(): Promise<string> {
  const outDir = path.join(process.cwd(), "converted");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

// --- Output path ---
export function getOutputFilePath(outDir: string, urn: string, guid: string, format: "gltf" | "glb") {
  const safeUrn = urn.replace(/[^a-zA-Z0-9_=.-]/g, "_");
  const safeGuid = (guid || "default").replace(/[^a-zA-Z0-9_=.-]/g, "_");
  return path.join(outDir, `${safeUrn}.${safeGuid}.${format}`);
}

// --- Detect default GUID ---
export async function detectDefaultGuid(urn: string): Promise<string | null> {
  const token = await getApsToken();
  const res = await fetch(
    `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodeURIComponent(urn)}/manifest`,
    { headers: { Authorization: `Bearer ${token.access_token}` } }
  );

  if (!res.ok) return null;
  const data = await res.json();
  const derivatives = data?.derivatives || [];

  function findGuid(node: any): string | null {
    if (!node) return null;
    if (node.guid && (node.type === "geometry" || node.role === "3d" || node.role === "2d")) return node.guid;
    const children = node.children || [];
    for (const child of children) {
      const g = findGuid(child);
      if (g) return g;
    }
    return null;
  }

  for (const d of derivatives) {
    const g = findGuid(d);
    if (g) return g;
  }
  return null;
}

// --- List candidate GUIDs ---
export async function listCandidateGuids(
  urn: string
): Promise<{ guid: string; type: "svf2" | "svf" | "unknown" }[]> {
  const token = await getApsToken();
  const res = await fetch(
    `https://developer.api.autodesk.com/modelderivative/v2/designdata/${encodeURIComponent(urn)}/manifest`,
    { headers: { Authorization: `Bearer ${token.access_token}` } }
  );

  if (!res.ok) return [];
  const data = await res.json();
  const candidates: { guid: string; type: "svf2" | "svf" | "unknown" }[] = [];

  function collect(node: any, parentFormatType: "svf2" | "svf" | "unknown") {
    if (!node) return;
    const isGeom = node.type === "geometry" || node.role === "graphics" || node.role === "3d" || node.role === "2d";
    if (node.guid && isGeom) candidates.push({ guid: node.guid, type: parentFormatType });
    const children = node.children || [];
    for (const c of children) collect(c, parentFormatType);
  }

  const derivatives = data?.derivatives || [];
  for (const d of derivatives) {
    const fmt = d?.outputType === "svf2" ? "svf2" : d?.outputType === "svf" ? "svf" : "unknown";
    collect(d, fmt);
  }

  // Deduplicate
  const unique: Record<string, boolean> = {};
  return candidates.filter((c) => (unique[c.guid] ? false : (unique[c.guid] = true)));
}

// --- StaticAuthProvider class for svf-utils ---
  // --- Convert SVF/SVF2 to GLTF/GLB ---
interface ConvertOptions {
  readerType?: "svf" | "svf2";
  writerOptions?: any;
}

export async function convertSvfToGltf(
  urn: string,
  guid: string,
  outputPath: string,
  options?: ConvertOptions
) {
  // Ensure authentication is initialized
  await initializeAuth();
  
  // Wait a bit to ensure authentication is properly set up
  await new Promise(resolve => setTimeout(resolve, 100));

  const { SVF2Reader, SVFReader, GLTFWriter } = svfUtils;

  let reader: any;

  try {
    // Try to create readers using static methods with authentication provider
    if (options?.readerType === "svf2") {
      console.log("[convertSvfToGltf] Forcing SVF2Reader...");
      try {
        // @ts-ignore
        reader = await SVF2Reader.FromDerivativeService(urn, guid, authProvider);
      } catch (error) {
        console.error("[convertSvfToGltf] SVF2Reader failed:", error);
        // Try without auth provider as fallback
        try {
          reader = await SVF2Reader.FromDerivativeService(urn, guid);
        } catch (fallbackError) {
          console.error("[convertSvfToGltf] SVF2Reader fallback failed:", fallbackError);
          throw error;
        }
      }
    } else if (options?.readerType === "svf") {
      console.log("[convertSvfToGltf] Forcing SVFReader...");
      try {
        // @ts-ignore
        reader = await SVFReader.FromDerivativeService(urn, guid, authProvider);
      } catch (error) {
        console.error("[convertSvfToGltf] SVFReader failed:", error);
        // Try without auth provider as fallback
        try {
          reader = await SVFReader.FromDerivativeService(urn, guid);
        } catch (fallbackError) {
          console.error("[convertSvfToGltf] SVFReader fallback failed:", fallbackError);
          throw error;
        }
      }
    } else {
      try {
        // @ts-ignore
        reader = await SVF2Reader.FromDerivativeService(urn, guid, authProvider);
        console.log("[convertSvfToGltf] Using SVF2Reader ✅");
      } catch {
        console.warn("[convertSvfToGltf] SVF2Reader failed, falling back to SVFReader ❌");
        try {
          // @ts-ignore
          reader = await SVFReader.FromDerivativeService(urn, guid, authProvider);
        } catch {
          // Final fallback without auth provider
          reader = await SVFReader.FromDerivativeService(urn, guid);
        }
      }
    }

    // Ensure reader is properly initialized
    if (!reader) {
      throw new Error("Failed to create reader");
    }

    // Wait for reader to be fully initialized
    if (reader.init) {
      await reader.init();
    }

    console.log(`[convertSvfToGltf] Reader initialized successfully`);

    const writer = new GLTFWriter({
      ...(options?.writerOptions || {}),
      // Writer expects it nested under authenticationProvider
      authenticationProvider: authProvider,
    });

    console.log(`[convertSvfToGltf] Writing output to ${outputPath} ...`);
    await writer.write(reader, outputPath);
    console.log(`[convertSvfToGltf] Conversion complete 🎉 -> ${outputPath}`);
  } catch (err) {
    console.error(`[convertSvfToGltf] Conversion failed for GUID ${guid}:`, err);
    throw err;
  }
}

