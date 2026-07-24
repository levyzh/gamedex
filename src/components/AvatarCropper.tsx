// AvatarCropper.tsx — the "position your photo" dialog, the way big
// sites do profile pictures: drag the image around, zoom with a slider,
// and a circle shows what the final avatar will look like.
//
// THE TRICK, up front: we never edit the image while you drag. There is
// a fixed square window (the "viewport") with overflow:hidden, and the
// full image simply moves and scales BEHIND it. The entire editor state
// is three numbers: zoom, and an x/y offset from center. Only when you
// hit Save does a <canvas> copy the exact rectangle you can see into a
// small square file — that one drawImage call IS the crop.

import { useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useT, display } from "../lib/theme";

// The on-screen window you position the photo in.
const VIEW = 280;
// The saved file's size. 512px is generous for something displayed at
// 56px — it stays crisp on high-DPI screens without being a big upload.
const OUTPUT = 512;

export default function AvatarCropper({
  imageUrl,
  onCancel,
  onSave,
}: {
  imageUrl: string;                 // object URL of the picked file
  onCancel: () => void;             // user backed out
  onSave: (file: File) => void;     // here's the cropped image, upload it
}) {
  const T = useT();

  // The image's real pixel size — unknown until the browser loads it,
  // and every calculation below needs it, so nothing works before onLoad.
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // zoom is a multiplier ON TOP of "cover" scale: 1 = the photo exactly
  // fills the window, 3 = three times closer.
  const [zoom, setZoom] = useState(1);

  // How far (in screen pixels) the image center sits from the window
  // center. {0,0} = perfectly centered.
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // While a drag is in progress: where the pointer started and what the
  // offset was at that moment. null = not dragging.
  const [drag, setDrag] = useState<{ pointerX: number; pointerY: number; baseX: number; baseY: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // "Cover" scale: the smallest scale at which the image fills the whole
  // window with no gaps (same idea as CSS object-fit: cover). Using max()
  // of the two ratios is what guarantees BOTH dimensions reach the edges.
  const baseScale = dims ? Math.max(VIEW / dims.w, VIEW / dims.h) : 1;
  const scale = baseScale * zoom;

  // How far may you zoom? Until one pixel of the ORIGINAL photo equals
  // one pixel on screen (that's 1 / baseScale) — past that point there's
  // no more detail, only manufactured blur. Big photos therefore get
  // deep zoom, small ones modest zoom, with a floor of 3x so even tiny
  // images allow some reframing.
  const maxZoom = dims ? Math.max(3, 1 / baseScale) : 3;

  // Keep the offset small enough that the photo's edges can never enter
  // the window — otherwise the avatar would have blank corners. The
  // furthest the image may shift is half of however much bigger than the
  // window it currently is.
  function clampOffset(x: number, y: number, atScale: number) {
    if (!dims) return { x: 0, y: 0 };
    const maxX = Math.max(0, (dims.w * atScale - VIEW) / 2);
    const maxY = Math.max(0, (dims.h * atScale - VIEW) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Pointer capture = keep receiving move events even if the pointer
    // leaves the window mid-drag. Without it, drags "drop" at the edges.
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ pointerX: e.clientX, pointerY: e.clientY, baseX: offset.x, baseY: offset.y });
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    // New offset = where it was when the drag started, plus how far the
    // pointer has traveled since. Clamped, always.
    setOffset(clampOffset(
      drag.baseX + (e.clientX - drag.pointerX),
      drag.baseY + (e.clientY - drag.pointerY),
      scale,
    ));
  }

  function handlePointerUp() {
    setDrag(null);
  }

  function handleZoomChange(newZoom: number) {
    setZoom(newZoom);
    // Zooming OUT shrinks how far the image may legally sit off-center,
    // so the current offset might suddenly be out of bounds — re-clamp it
    // against the new scale or blank edges would creep in.
    setOffset(prev => clampOffset(prev.x, prev.y, baseScale * newZoom));
  }

  async function handleSave() {
    if (!dims) return;
    setErrorMessage("");
    setSaving(true);

    try {
      // Load the image again for drawing. It's the same object URL the
      // <img> below is already showing, so this is instant (memory, not
      // network) — just cleaner than reaching into the DOM for the tag.
      const image = new Image();
      image.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Couldn't read the image."));
      });

      // THE CROP. Reverse the on-screen math to find which rectangle of
      // the ORIGINAL image is visible in the window right now:
      // - the window shows VIEW screen pixels; divide by scale to get how
      //   many ORIGINAL pixels that is.
      // - offset is in screen pixels too, so it also divides by scale.
      //   Pushing the image right (+x) means the window looks at a point
      //   LEFT of the image's center — hence the minus.
      const srcSize = VIEW / scale;
      const srcX = dims.w / 2 - offset.x / scale - srcSize / 2;
      const srcY = dims.h / 2 - offset.y / scale - srcSize / 2;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Couldn't create the cropped image (no canvas support).");
      }

      // One call: take that source rectangle, draw it filling the canvas.
      ctx.drawImage(image, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT, OUTPUT);

      // canvas.toBlob is callback-style; wrap it so we can await it.
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          b => (b ? resolve(b) : reject(new Error("Couldn't create the cropped image."))),
          "image/jpeg",
          0.9, // quality: visually indistinguishable, much smaller file
        );
      });

      // Hand the parent a normal File — the same thing a file input gives
      // — so uploadAvatar doesn't know or care that a cropper exists.
      onSave(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  const buttonBase: CSSProperties = {
    padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none",
  };

  return (
    // Same modal pattern as the login form: dark backdrop closes,
    // clicks inside the card don't bubble up to it.
    <div
      // Close only when the PRESS itself lands on the backdrop. A plain
      // onClick here has a trap: press inside the card, release outside
      // (easy to do overshooting the zoom slider), and the browser fires
      // the click on the backdrop — closing the dialog and eating your
      // crop. Checking the pointerdown's target avoids that entirely.
      onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 120,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
          padding: "22px", boxShadow: T.shadowH, width: VIEW + 44,
        }}
      >
        <h2 style={{ margin: "0 0 14px", fontFamily: display, fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: T.text }}>
          Position your photo
        </h2>

        {/* The viewport: a fixed square window the image moves behind.
            touchAction:none tells phones "this drag is mine, don't
            scroll the page with it". */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: "relative", width: VIEW, height: VIEW, margin: "0 auto",
            overflow: "hidden", borderRadius: 10, background: "#000",
            touchAction: "none", cursor: drag ? "grabbing" : "grab",
          }}
        >
          {dims && (
            <img
              src={imageUrl}
              alt="Photo being positioned"
              draggable={false} /* the browser's own image-drag would fight ours */
              style={{
                position: "absolute",
                width: dims.w * scale,
                height: dims.h * scale,
                left: (VIEW - dims.w * scale) / 2 + offset.x,
                top: (VIEW - dims.h * scale) / 2 + offset.y,
                maxWidth: "none", /* some global styles cap img width — don't */
                userSelect: "none",
                pointerEvents: "none", /* let the viewport get the pointer events */
              }}
            />
          )}

          {/* The invisible <img> whose only job is telling us the photo's
              real size. Rendered until dims is known, then replaced by
              the positioned one above. */}
          {!dims && (
            <img
              src={imageUrl}
              alt=""
              onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              style={{ opacity: 0, position: "absolute", maxWidth: "none" }}
            />
          )}

          {/* The circle mask: a transparent circle whose ENORMOUS shadow
              darkens everything outside it. One div, no clipping math —
              a classic CSS trick worth knowing. */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            pointerEvents: "none",
          }} />
        </div>

        {/* Zoom: 1 = photo exactly fills the circle, 3 = 3x closer. */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 2px 18px" }}>
          <span style={{ fontSize: 12, color: T.meta, fontWeight: 600 }}>Zoom</span>
          <input
            type="range"
            min={1}
            max={maxZoom}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: T.accent }}
          />
        </div>

        {errorMessage && (
          <p style={{ margin: "0 0 12px", color: "#EF4444", fontSize: 12.5, lineHeight: 1.5 }}>
            {errorMessage}
          </p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ ...buttonBase, background: T.surface, border: `1px solid ${T.borderH}`, color: T.text }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!dims || saving}
            style={{ ...buttonBase, background: T.accent, color: "#fff", opacity: !dims || saving ? 0.6 : 1 }}
          >
            {saving ? "Saving..." : "Save photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
