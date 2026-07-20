/**
 * One in-flight decode per URL so LOD low→high does not fetch/decode the same image twice.
 */
const imageByUrl = new Map<string, Promise<HTMLImageElement>>();

export function loadCachedImage(url: string): Promise<HTMLImageElement> {
  let p = imageByUrl.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const loadImage = (src: string, revoke?: () => void) => {
        const img = new Image();
        img.onload = () => {
          resolve(img);
          if (revoke) window.setTimeout(revoke, 1000);
        };
        img.onerror = () => {
          revoke?.();
          reject(new Error("Image load failed"));
        };
        img.src = src;
      };

      // Protected museum media is served from our own API and depends on the
      // holder's wallet session cookie.  `crossOrigin="anonymous"` strips that
      // credential context, so fetch same-origin media explicitly and turn it
      // into a blob URL before creating the Three.js texture.
      const isSameOrigin =
        url.startsWith("/") ||
        (typeof window !== "undefined" && url.startsWith(window.location.origin));

      if (isSameOrigin) {
        fetch(url, { credentials: "include", cache: "force-cache" })
          .then((response) => {
            if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
            return response.blob();
          })
          .then((blob) => {
            const objectUrl = URL.createObjectURL(blob);
            loadImage(objectUrl, () => URL.revokeObjectURL(objectUrl));
          })
          .catch(reject);
        return;
      }

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
