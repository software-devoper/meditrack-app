/// <reference types="vite/client" />

declare const __APP_BUILD_TIME__: number;
declare const __APP_VERSION__: string;

declare module '*.glb' {
  const src: string;
  export default src;
}

declare module '*.gltf' {
  const src: string;
  export default src;
}
