/**
 * One in-flight decode per URL so LOD low→high does not fetch/decode the same image twice.
 */
const imageByUrl = new Map<string, Promise<HTMLImageElement>>();

export function loadCachedImage(url: string): Promise<HTMLImageElement> {
  let p = imageByUrl.get(url);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const loadImage = (src: string, options?: { crossOrigin?: "" | "anonymous" | "use-credentials"; revoke?: () => void }) => {
        const img = new Image();
        if (options?.crossOrigin !== undefined) img.crossOrigin = options.crossOrigin;
        img.onload = () => {
          resolve(img);
          if (options?.revoke) window.setTimeout(options.revoke, 1000);
        };
        img.onerror = () => {
          options?.revoke?.();
          reject(new Error("Image load failed"));
        };
        img.src = src;
      };

      // Protected museum media is served from our own API and depends on the
      // holder's wallet session cookie. Load same-origin URLs directly so the
      // browser sends cookies naturally and CSP/blob URL edge cases cannot leave
      // every gallery frame stuck on the fallback material.
      const isSameOrigin =
        url.startsWith("/") ||
        (typeof window !== "undefined" && url.startsWith(window.location.origin));

      if (isSameOrigin) {
        loadImage(url);
        return;
      }

      loadImage(url, { crossOrigin: "anonymous" });
    });
    p.catch(() => {
      if (imageByUrl.get(url) === p) imageByUrl.delete(url);
    });
    imageByUrl.set(url, p);
  }
  return p;
}
