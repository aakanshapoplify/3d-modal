declare global {
  interface Window {
    Autodesk: any;
  }
}

declare module 'forge-viewer' {
  export = Autodesk;
}
