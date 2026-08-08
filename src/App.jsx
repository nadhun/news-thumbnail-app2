import React, { useState, useRef } from "react";
import { Upload, Download, Image as ImageIcon } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";

export default function NewsThumbnailMaker() {
  const [image, setImage] = useState(null);
  const [brand, setBrand] = useState("BRAND");
  const [eyebrow, setEyebrow] = useState("EYEBROW TAG");
  const [headline, setHeadline] = useState("YOUR HEADLINE GOES HERE");
  const [author, setAuthor] = useState("by Author Name");
  const [accent, setAccent] = useState("#e0192d");
  const [exporting, setExporting] = useState(false);
  const [exportedUrl, setExportedUrl] = useState(null);
  const [statusMsg, setStatusMsg] = useState(null);
  const fileInputRef = useRef(null);

  const CANVAS_W = 1000;
  const CANVAS_H = 1250;
  const IMG_H = 800;

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const headlineLines = headline.split("\n").filter((l) => l.length > 0);

  const MIN_HEADLINE_FONT_SIZE = 20;

  const totalChars = headlineLines.join("").length;
  let headlineFontSize = 34;
  if (totalChars > 30) headlineFontSize = 30;
  if (totalChars > 50) headlineFontSize = 25;
  if (totalChars > 75) headlineFontSize = 22;
  if (totalChars > 100) headlineFontSize = 18;
  headlineFontSize = Math.max(headlineFontSize, MIN_HEADLINE_FONT_SIZE);

  const SCALE = CANVAS_W / 500;

  const wrapText = (ctx, text, maxWidth) => {
    const words = text.split(" ");
    const lines = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  // Converts a data URL (canvas.toDataURL output) into a bare base64 string,
  // which is what Capacitor's Filesystem.writeFile expects.
  const dataUrlToBase64 = (dataUrl) => dataUrl.split(",")[1];

  const saveOnNative = async (dataUrl, filename) => {
    const base64 = dataUrlToBase64(dataUrl);
    // Pictures directory shows up in the device's normal Gallery/Photos app.
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });
    return result.uri;
  };

  const handleExport = async () => {
    setExporting(true);
    setStatusMsg(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Image area
      ctx.fillStyle = "#262626";
      ctx.fillRect(0, 0, CANVAS_W, IMG_H);

      if (image) {
        const img = new window.Image();
        img.src = image;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        const targetRatio = CANVAS_W / IMG_H;
        const imgRatio = img.width / img.height;
        let sx, sy, sw, sh;
        if (imgRatio > targetRatio) {
          sh = img.height;
          sw = sh * targetRatio;
          sx = (img.width - sw) / 2;
          sy = 0;
        } else {
          sw = img.width;
          sh = sw / targetRatio;
          sx = 0;
          sy = (img.height - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CANVAS_W, IMG_H);
      } else {
        ctx.fillStyle = "#a3a3a3";
        ctx.font = "28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No photo uploaded", CANVAS_W / 2, IMG_H / 2);
      }

      // Brand tab (trapezoid, top-left corner)
      const tabW = 320;
      const tabH = 64;
      const tabX = 0;
      const tabRightInset = tabW * 0.16;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(tabX, 0);
      ctx.lineTo(tabX + tabW - tabRightInset, 0);
      ctx.lineTo(tabX + tabW - tabRightInset * 2, tabH);
      ctx.lineTo(tabX, tabH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "italic 900 34px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(brand, tabX + 32, tabH / 2 + 2);

      // Text area
      const padX = 48;
      let cursorY = IMG_H + 48;

      // Eyebrow
      ctx.fillStyle = accent;
      ctx.font = "900 24px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(eyebrow.toUpperCase(), padX, cursorY);
      cursorY += 36;

      // Headline
      const fontPx = headlineFontSize * SCALE * 1.0;
      ctx.font = `900 ${fontPx}px sans-serif`;
      ctx.fillStyle = "#ffffff";
      const maxTextWidth = CANVAS_W - padX * 2;

      const allRenderLines = [];
      headlineLines.forEach((line) => {
        const wrapped = wrapText(ctx, line.toUpperCase(), maxTextWidth);
        wrapped.forEach((wl) => allRenderLines.push(wl));
      });

      allRenderLines.forEach((line) => {
        cursorY += fontPx * 1.05;
        ctx.fillText(line, padX, cursorY);
      });

      // Byline pinned near bottom
      ctx.fillStyle = "#d4d4d4";
      ctx.font = "italic 22px sans-serif";
      ctx.fillText(author, padX, CANVAS_H - 36);

      const url = canvas.toDataURL("image/png");
      const filename = `${brand.toLowerCase().replace(/\s+/g, "-") || "thumbnail"}-${Date.now()}.png`;

      if (Capacitor.isNativePlatform()) {
        // Running inside the Android app — use the native filesystem so the
        // browser <a download> trick (which silently no-ops in a WebView)
        // isn't needed.
        const uri = await saveOnNative(url, filename);
        setStatusMsg(`Saved to ${uri}`);
      } else {
        // Running in a normal desktop/mobile browser during development.
        try {
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (downloadErr) {
          console.warn("Programmatic download blocked, falling back to preview:", downloadErr);
        }
      }

      setExportedUrl(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed — try again, or long-press the preview image and save it manually.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-8 px-4 gap-6">
      <div className="w-full max-w-md flex flex-col gap-4">
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
          News Thumbnail Layout Maker
        </h1>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 flex flex-col gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 border-2 border-dashed border-neutral-300 rounded-lg py-6 text-neutral-500 hover:border-neutral-400 hover:text-neutral-600 transition-colors"
          >
            {image ? <ImageIcon size={18} /> : <Upload size={18} />}
            <span className="text-sm font-medium">
              {image ? "Change photo" : "Upload photo"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />

          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mt-1">
            Brand / logo text
          </label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
          />

          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mt-1">
            Eyebrow (small tag above headline)
          </label>
          <input
            value={eyebrow}
            onChange={(e) => setEyebrow(e.target.value)}
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
          />

          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mt-1">
            Headline (use line breaks to control wrapping)
          </label>
          <textarea
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            rows={3}
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-none"
          />

          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mt-1">
            Byline
          </label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
          />

          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mt-1">
            Accent color
          </label>
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="w-16 h-8 border border-neutral-300 rounded-md cursor-pointer"
          />

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center justify-center gap-2 rounded-md py-3 mt-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ background: accent }}
          >
            <Download size={16} />
            {exporting ? "Exporting…" : "Download PNG (1000×1250)"}
          </button>

          {statusMsg && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
              {statusMsg}
            </p>
          )}

          {exportedUrl && (
            <div className="flex flex-col gap-2 border border-neutral-200 rounded-lg p-3 bg-neutral-50">
              <p className="text-xs text-neutral-600">
                {Capacitor.isNativePlatform()
                  ? "Saved on your device. You can also long-press the image below to save/share it again."
                  : "If the download didn't start automatically, open the full-size image below and save it manually."}
              </p>
              <img
                src={exportedUrl}
                alt="Exported thumbnail"
                className="w-full rounded-md border border-neutral-200"
              />
            </div>
          )}
        </div>
      </div>

      {/* Preview / exportable layout */}
      <div
        className="bg-black rounded-lg overflow-hidden flex flex-col shadow-lg"
        style={{ width: "500px", maxWidth: "100%", height: "625px", flexShrink: 0 }}
      >
        <div
          className="relative bg-neutral-800 flex items-center justify-center overflow-hidden"
          style={{ height: "400px" }}
        >
          {image ? (
            <img src={image} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-neutral-500 text-sm">
              Upload a photo to see it here
            </span>
          )}
          <div
            className="absolute top-0 left-0 px-6 py-2"
            style={{
              background: accent,
              clipPath: "polygon(0 0, 92% 0, 84% 100%, 0% 100%)",
            }}
          >
            <span className="text-white font-black italic text-lg tracking-tight">
              {brand}
            </span>
          </div>
        </div>

        <div
          className="bg-black px-6 py-5 flex flex-col justify-between overflow-hidden"
          style={{ height: "225px" }}
        >
          <div className="overflow-hidden">
            <p
              className="text-xs font-bold tracking-widest mb-2"
              style={{ color: accent }}
            >
              {eyebrow.toUpperCase()}
            </p>
            <div className="flex flex-col gap-1">
              {headlineLines.map((line, i) => (
                <h2
                  key={i}
                  className="text-white font-black leading-tight uppercase tracking-tight"
                  style={{ fontSize: `${headlineFontSize}px` }}
                >
                  {line}
                </h2>
              ))}
            </div>
          </div>
          <p className="text-neutral-300 text-sm italic mt-2 truncate">
            {author}
          </p>
        </div>
      </div>

      <p className="text-xs text-neutral-400 max-w-md text-center">
        Preview is 500×625px on screen. The Download button renders a sharp
        1000×1250px PNG (Facebook's recommended 4:5 portrait post size).
      </p>
    </div>
  );
}
