import { Group } from "three";

export interface FurnitureModel {
  id: string;
  name: string;
  filename: string;
  path: string;
}

export interface FurnitureItem {
  id: string;
  type: string; // model path
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}

export interface TourState {
  mode: "none" | "exterior" | "interior" | "full";
  playing: boolean;
  interiorFloorIdx: number;
  cycleFloors: boolean;
  speed: number; // rpm
  fullStage: number; // 0 exterior then 1..n floors
}

export interface TourController extends TourState {
  startExterior: () => void;
  startInterior: (floor: number) => void;
  startFull: () => void;
  stop: () => void;
  setSpeed: (v: number) => void;
  setInteriorFloor: (i: number) => void;
  setCycleFloors: (v: boolean) => void;
}

export interface FurnitureRefsMap {
  [id: string]: Group;
}
