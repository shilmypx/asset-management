declare module "jsbarcode" {
  function JsBarcode(element: SVGElement | HTMLCanvasElement | string, text: string, options?: Record<string, unknown>): void;
  export default JsBarcode;
}
