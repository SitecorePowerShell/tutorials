/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

declare module "*.yaml" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any;
  export default content;
}
