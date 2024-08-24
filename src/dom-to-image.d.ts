declare module 'dom-to-image' {
    export function toBlob(node: Node, options?: object): Promise<Blob>;
  }
  