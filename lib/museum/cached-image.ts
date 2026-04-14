/**
 * One in-flight decode per URL so LOD low→high does not fetch/decode the same image twice.
 */
const imageByUrl = new Map<string, Promise<HTMLImageElement>>();

export function loadCachedImage(url: string): Promise<HTMLImageElement> {
  let p = imageByUrl.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = url;
    });
    imageByUrl.set(url, p);
  }
  return p;
}
