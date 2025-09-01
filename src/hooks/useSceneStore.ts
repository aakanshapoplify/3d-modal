import { create } from "zustand";

interface SceneState {
  selectedObject: any;
  setSelectedObject: (obj: any) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  selectedObject: null,
  setSelectedObject: (obj) => set({ selectedObject: obj }),
}));
