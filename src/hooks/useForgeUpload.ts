import axios from "axios";
import { useState } from "react";

export function useForgeUpload() {
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post("/api/upload", formData, {
      onUploadProgress: (e) => {
        setProgress(Math.round((e.loaded * 100) / e.total!));
      },
    });

    return res.data.urn;
  };

  return { uploadFile, progress };
}
