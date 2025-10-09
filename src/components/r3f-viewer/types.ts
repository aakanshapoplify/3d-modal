export interface FurnitureModel {
  id: string;
  name: string;
  filename: string;
  path: string;
}

export interface FurnitureItem {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

export interface TourWaypoint {
  position: [number, number, number];
  lookAt: [number, number, number];
  duration?: number;
}



