"use strict";
const ExportKit = (() => {
  const integer = (n, fallback, min, max) =>
    Number.isFinite(Number(n))
      ? Math.max(min, Math.min(max, Math.trunc(Number(n))))
      : fallback;
  function plan(entries, options = {}) {
    if (!entries.length)
      throw Error("Choose a skill with available frames first.");
    const mode = options.mode || "frame",
      scale = integer(options.scale, 1, 1, 4),
      padding = mode === "frame" ? 0 : integer(options.padding, 8, 0, 64);
    const selected = mode === "frame" ? entries.slice(0, 1) : entries;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const e of selected) {
      if (!e.width || !e.height)
        throw Error("A frame is unavailable. Try a smaller range.");
      const o =
        e.origin && !e.origin.isEmpty
          ? e.origin
          : { x: e.width / 2, y: e.height / 2 };
      minX = Math.min(minX, -o.x);
      minY = Math.min(minY, -o.y);
      maxX = Math.max(maxX, e.width - o.x);
      maxY = Math.max(maxY, e.height - o.y);
    }
    minX = Math.floor(minX);
    minY = Math.floor(minY);
    maxX = Math.ceil(maxX);
    maxY = Math.ceil(maxY);
    const worldWidth = maxX - minX,
      worldHeight = maxY - minY,
      columns =
        mode === "frame"
          ? 1
          : Math.min(selected.length, integer(options.columns, 4, 1, 16)),
      rows = Math.ceil(selected.length / columns),
      labelHeight = mode === "contact" ? 26 * scale : 0,
      headerHeight = mode === "contact" ? 40 * scale : 0;
    const cellWidth =
        (mode === "frame" ? selected[0].width : worldWidth + padding * 2) *
        scale,
      cellHeight =
        (mode === "frame" ? selected[0].height : worldHeight + padding * 2) *
          scale +
        labelHeight,
      width = cellWidth * columns,
      height = cellHeight * rows + headerHeight;
    if (width > 8192 || height > 8192 || width * height > 24000000)
      throw Error(
        "This sheet is too large. Use a smaller frame range, lower scale, or different column count.",
      );
    return {
      mode,
      scale,
      padding,
      columns,
      rows,
      cellWidth,
      cellHeight,
      labelHeight,
      headerHeight,
      width,
      height,
      minX,
      minY,
      worldWidth,
      worldHeight,
      count: selected.length,
      flip: !!options.flip,
    };
  }
  function originFor(entry) {
    return entry.origin && !entry.origin.isEmpty
      ? entry.origin
      : { x: entry.width / 2, y: entry.height / 2 };
  }
  function metadata(entries, p, info = {}) {
    return {
      format: "maple-skills-sheet-v1",
      ...info,
      layout: p,
      frames: entries.slice(0, p.count).map((e, i) => {
        const o = originFor(e),
          x = (i % p.columns) * p.cellWidth,
          y = Math.floor(i / p.columns) * p.cellHeight + p.headerHeight;
        return {
          frame: e.frameNumber ?? i + 1,
          file: e.file,
          delay: e.delay ?? 90,
          sourceSize: { width: e.width, height: e.height },
          sourceOrigin: o,
          cell: { x, y, width: p.cellWidth, height: p.cellHeight },
          origin:
            p.mode === "frame"
              ? {
                  x: (p.flip ? e.width - o.x : o.x) * p.scale,
                  y: o.y * p.scale,
                }
              : {
                  x:
                    x +
                    (p.padding + (p.flip ? p.worldWidth + p.minX : -p.minX)) *
                      p.scale,
                  y: y + (p.padding - p.minY) * p.scale,
                },
        };
      }),
    };
  }
  function draw(canvas, entries, p, title = "Maple Skills") {
    canvas.width = p.width;
    canvas.height = p.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Could not create the export canvas.");
    ctx.imageSmoothingEnabled = false;
    if (p.mode === "contact") {
      ctx.fillStyle = "#fffdf5";
      ctx.fillRect(0, 0, p.width, p.height);
      ctx.fillStyle = "#395b61";
      ctx.font = `600 ${14 * p.scale}px sans-serif`;
      ctx.fillText(
        title,
        12 * p.scale,
        25 * p.scale,
        Math.max(1, p.width - 24 * p.scale),
      );
    }
    entries.slice(0, p.count).forEach((e, i) => {
      const x = (i % p.columns) * p.cellWidth,
        y = Math.floor(i / p.columns) * p.cellHeight + p.headerHeight,
        o = originFor(e);
      ctx.save();
      if (p.mode === "frame") {
        if (p.flip) ctx.translate(p.width, 0);
        ctx.scale(p.flip ? -p.scale : p.scale, p.scale);
        ctx.drawImage(e.image, 0, 0);
      } else {
        if (p.mode === "contact") {
          ctx.fillStyle = i % 2 ? "#edf5f1" : "#f5f6ef";
          ctx.fillRect(x, y, p.cellWidth, p.cellHeight - p.labelHeight);
        }
        ctx.translate(x + p.padding * p.scale, y + p.padding * p.scale);
        if (p.flip) ctx.translate(p.worldWidth * p.scale, 0);
        ctx.scale(p.flip ? -p.scale : p.scale, p.scale);
        ctx.translate(-p.minX, -p.minY);
        ctx.drawImage(e.image, -o.x, -o.y);
      }
      ctx.restore();
      if (p.mode === "contact") {
        ctx.fillStyle = "#536d70";
        ctx.font = `${11 * p.scale}px sans-serif`;
        ctx.fillText(
          `Frame ${e.frameNumber ?? i + 1} · ${e.delay ?? 90} ms`,
          x + 8 * p.scale,
          y + p.cellHeight - 8 * p.scale,
          Math.max(1, p.cellWidth - 16 * p.scale),
        );
      }
    });
    return canvas;
  }
  return { plan, metadata, draw };
})();
if (typeof module !== "undefined") module.exports = ExportKit;
