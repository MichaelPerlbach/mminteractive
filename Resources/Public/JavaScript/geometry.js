/**
 * Pure geometry/data helpers for the imagemap editor (no DOM access, unit-testable).
 * Coordinates are always in pixels of the original image.
 *   rect:              [x1, y1, x2, y2]
 *   circle:            [cx, cy, r]
 *   poly | freeform:   [x1, y1, x2, y2, ...]
 */
export const SHAPES = ['rect', 'circle', 'poly', 'freeform'];
export const STATES = ['normal', 'hover', 'active'];
export const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'none'];
export const BACKGROUND_SIZES = ['stretch', 'contain', 'cover', 'auto', 'custom'];
export const SIZE_UNITS = ['px', '%'];
export const TOOLTIP_POSITION_MODES = ['dynamic', 'fixed', 'document'];
export const TOOLTIP_FIXED_RELATIVE_TO = ['area', 'image'];

export function defaultStates() {
  const empty = () => ({
    borderColor: '', borderStyle: 'solid', borderWidth: 0, backgroundColor: '', backgroundOpacity: null, backgroundImage: '',
    // "stretch" + preserveAspectRatio:false + repeat:false reproduce the original, only prior
    // behaviour (image stretched to exactly fill the area) - existing configurations without
    // these fields therefore keep looking exactly as before (see normalizeState()).
    backgroundSize: 'stretch',
    backgroundWidth: null, backgroundWidthUnit: 'px',
    backgroundHeight: null, backgroundHeightUnit: 'px',
    preserveAspectRatio: false,
    backgroundRepeat: false,
    repeatWidth: null, repeatHeight: null,
  });
  return { normal: { ...empty(), borderColor: '#ff8000', borderWidth: 2 }, hover: empty(), active: empty() };
}

export function newId() {
  return 'a' + Math.random().toString(36).slice(2, 9);
}

export function defaultTooltip() {
  return {
    borderColor: '', borderWidth: 0, borderRadius: 4, borderStyle: 'solid',
    backgroundColor: '#333333', backgroundOpacity: 90, backgroundImage: '',
    padding: 8,
    positionMode: 'dynamic',
    offsetX: 12, offsetY: 12,
    fixedX: 0, fixedY: 0,
    documentX: 0, documentY: 0,
    zIndex: 2147483647,
    fixedRelativeTo: 'area',
    width: null, height: null,
  };
}

export function createArea(shape, coords, name = '') {
  return { id: newId(), name, shape, coords, rotation: 0, link: '', title: '', tooltipContent: '', cssClass: '', ownStyle: '', states: defaultStates(), tooltip: defaultTooltip() };
}

const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const isColor = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v);

function normalizeState(src, fallback) {
  if (!src || typeof src !== 'object') return { ...fallback };
  const image = src.backgroundImage;
  const positiveOrNull = (v) => {
    const n = num(v, NaN);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
  };
  return {
    borderColor: isColor(src.borderColor) ? src.borderColor : '',
    borderStyle: BORDER_STYLES.includes(src.borderStyle) ? src.borderStyle : 'solid',
    borderWidth: Math.max(0, Math.min(50, Math.round(num(src.borderWidth)))),
    backgroundColor: isColor(src.backgroundColor) ? src.backgroundColor : '',
    // null = not set (normal: fully opaque, hover/active: unchanged)
    backgroundOpacity:
      src.backgroundOpacity === null || src.backgroundOpacity === undefined || src.backgroundOpacity === ''
        ? null
        : Math.max(0, Math.min(100, Math.round(num(src.backgroundOpacity, 100)))),
    // file identifier ("1:/mminteractive/x.png"); numbers = legacy file uids
    backgroundImage: typeof image === 'number' ? (image > 0 ? String(image) : '') : String(image || ''),
    backgroundSize: BACKGROUND_SIZES.includes(src.backgroundSize) ? src.backgroundSize : 'stretch',
    backgroundWidth: positiveOrNull(src.backgroundWidth),
    backgroundWidthUnit: SIZE_UNITS.includes(src.backgroundWidthUnit) ? src.backgroundWidthUnit : 'px',
    backgroundHeight: positiveOrNull(src.backgroundHeight),
    backgroundHeightUnit: SIZE_UNITS.includes(src.backgroundHeightUnit) ? src.backgroundHeightUnit : 'px',
    preserveAspectRatio: src.preserveAspectRatio === true,
    backgroundRepeat: src.backgroundRepeat === true,
    repeatWidth: positiveOrNull(src.repeatWidth),
    repeatHeight: positiveOrNull(src.repeatHeight),
  };
}

export function normalizeArea(a) {
  const base = defaultStates();
  const states = {};
  STATES.forEach((s) => {
    states[s] = normalizeState(a.states && a.states[s], base[s]);
  });
  return {
    id: typeof a.id === 'string' && a.id ? a.id : newId(),
    name: String(a.name ?? '').trim().slice(0, 100),
    shape: SHAPES.includes(a.shape) ? a.shape : 'rect',
    coords: parseCoords(a.coords),
    rotation: Number.isFinite(num(a.rotation, NaN)) ? normalizeAngle(num(a.rotation)) : 0,
    link: String(a.link ?? ''),
    title: String(a.title ?? ''),
    tooltipContent: String(a.tooltipContent ?? ''),
    ownStyle: String(a.ownStyle ?? '').slice(0, 4000),
    cssClass: String(a.cssClass ?? '').replace(/[^A-Za-z0-9_\- ]/g, ''),
    states,
    tooltip: normalizeTooltip(a.tooltip),
  };
}

export function normalizeTooltip(src) {
  const base = defaultTooltip();
  if (!src || typeof src !== 'object') return base;

  const image = src.backgroundImage;
  const clampInt = (v, lo, hi, fallback) => {
    const n2 = num(v, NaN);
    return Number.isFinite(n2) ? Math.max(lo, Math.min(hi, Math.round(n2))) : fallback;
  };

  return {
    borderColor: isColor(src.borderColor) ? src.borderColor : '',
    borderWidth: clampInt(src.borderWidth, 0, 50, base.borderWidth),
    borderRadius: clampInt(src.borderRadius, 0, 200, base.borderRadius),
    borderStyle: BORDER_STYLES.includes(src.borderStyle) ? src.borderStyle : base.borderStyle,
    backgroundColor: isColor(src.backgroundColor) ? src.backgroundColor : '',
    backgroundOpacity: clampInt(src.backgroundOpacity, 0, 100, base.backgroundOpacity),
    backgroundImage: typeof image === 'number' ? (image > 0 ? String(image) : '') : String(image || ''),
    padding: clampInt(src.padding, 0, 100, base.padding),
    positionMode: TOOLTIP_POSITION_MODES.includes(src.positionMode) ? src.positionMode : base.positionMode,
    offsetX: clampInt(src.offsetX, -2000, 2000, base.offsetX),
    offsetY: clampInt(src.offsetY, -2000, 2000, base.offsetY),
    fixedX: clampInt(src.fixedX, -2000, 2000, base.fixedX),
    fixedY: clampInt(src.fixedY, -2000, 2000, base.fixedY),
    documentX: clampInt(src.documentX, -100000, 100000, base.documentX),
    documentY: clampInt(src.documentY, -100000, 100000, base.documentY),
    zIndex: clampInt(src.zIndex, -999999, 2147483647, base.zIndex),
    fixedRelativeTo: TOOLTIP_FIXED_RELATIVE_TO.includes(src.fixedRelativeTo) ? src.fixedRelativeTo : base.fixedRelativeTo,
    width: positiveIntOrNull(src.width),
    height: positiveIntOrNull(src.height),
  };
}

function positiveIntOrNull(value) {
  const n = num(value, NaN);
  return Number.isFinite(n) && n > 0 ? Math.round(Math.min(4000, n)) : null;
}

/**
 * The stored document: { image: {file, width, height}, areas: [...] }.
 * A plain array (older versions) is read as "areas only".
 */
/** Border around the whole image (imagemap-wide, not per area). width 0 or style "none" = no border. */
export function defaultImageBorder() {
  return { style: 'none', color: '#000000', width: 0 };
}

export function normalizeImageBorder(src) {
  const base = defaultImageBorder();
  if (!src || typeof src !== 'object') return base;
  const width = num(src.width, NaN);
  return {
    style: BORDER_STYLES.includes(src.style) ? src.style : base.style,
    color: isColor(src.color) ? src.color : base.color,
    width: Number.isFinite(width) ? Math.max(0, Math.min(50, Math.round(width))) : base.width,
  };
}

export function parseConfig(value) {
  const empty = { image: { file: '', width: 0, height: 0, border: defaultImageBorder(), link: '', alt: '' }, areas: [] };
  if (!value || typeof value !== 'string') return empty;
  let data;
  try {
    data = JSON.parse(value);
  } catch {
    return empty;
  }
  const list = Array.isArray(data) ? data : data && Array.isArray(data.areas) ? data.areas : [];
  const image = data && !Array.isArray(data) && data.image && typeof data.image === 'object' ? data.image : {};
  return {
    image: {
      file: String(image.file || ''),
      width: Math.max(0, Math.round(num(image.width))),
      height: Math.max(0, Math.round(num(image.height))),
      border: normalizeImageBorder(image.border),
      link: String(image.link || '').trim().slice(0, 2000), // link of the whole image (areas sit on top of it)
      alt: String(image.alt || '').trim().slice(0, 500), // alt text of the image
    },
    areas: list.filter((a) => a && typeof a === 'object').map(normalizeArea),
  };
}

export function serializeConfig(image, areas) {
  return JSON.stringify({
    image: { file: image.file, width: image.width, height: image.height, border: normalizeImageBorder(image.border), link: String(image.link || ''), alt: String(image.alt || '') },
    areas: areas.map((a) => ({
      id: a.id,
      name: a.name,
      shape: a.shape,
      coords: formatCoords(a.coords),
      rotation: Math.round(a.rotation * 100) / 100,
      link: a.link,
      title: a.title,
      tooltipContent: a.tooltipContent,
      ownStyle: a.ownStyle,
      cssClass: a.cssClass,
      states: a.states,
      tooltip: a.tooltip,
    })),
  });
}

/** "1,2,3" -> [1, 2, 3] (invalid parts are dropped) */
export function parseCoords(value) {
  return String(value ?? '')
    .split(',')
    .map((v) => parseFloat(v))
    .filter((n) => Number.isFinite(n));
}

export function formatCoords(coords) {
  return coords.map((n) => Math.round(n)).join(',');
}

export function bbox(shape, c) {
  if (shape === 'rect') {
    return { minX: Math.min(c[0], c[2]), minY: Math.min(c[1], c[3]), maxX: Math.max(c[0], c[2]), maxY: Math.max(c[1], c[3]) };
  }
  if (shape === 'circle') {
    return { minX: c[0] - c[2], minY: c[1] - c[2], maxX: c[0] + c[2], maxY: c[1] + c[2] };
  }
  const xs = c.filter((_, i) => i % 2 === 0);
  const ys = c.filter((_, i) => i % 2 === 1);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

export function unionBox(boxes) {
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

export function boxesIntersect(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function translate(shape, c, dx, dy) {
  if (shape === 'rect') return [c[0] + dx, c[1] + dy, c[2] + dx, c[3] + dy];
  if (shape === 'circle') return [c[0] + dx, c[1] + dy, c[2]];
  return c.map((v, i) => v + (i % 2 === 0 ? dx : dy));
}

/** Limits a move so that the bounding box stays inside the image. */
export function clampDelta(box, dx, dy, W, H) {
  const clamp = (v, lo, hi) => (lo > hi ? v : Math.min(Math.max(v, lo), hi));
  return { dx: clamp(dx, -box.minX, W - box.maxX), dy: clamp(dy, -box.minY, H - box.maxY) };
}

export function normalizeRect(c) {
  return [Math.min(c[0], c[2]), Math.min(c[1], c[3]), Math.max(c[0], c[2]), Math.max(c[1], c[3])];
}

export function flatToPoints(c) {
  const pts = [];
  for (let i = 0; i + 1 < c.length; i += 2) pts.push({ x: c[i], y: c[i + 1] });
  return pts;
}

export function pointsToFlat(pts) {
  return pts.flatMap((p) => [p.x, p.y]);
}

/** Douglas-Peucker simplification of an open point list. */
export function simplifyPath(points, tolerance) {
  if (points.length < 3) return points;
  const sq = tolerance * tolerance;

  const distSq = (p, a, b) => {
    let { x, y } = a;
    let dx = b.x - x;
    let dy = b.y - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = b.x;
        y = b.y;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p.x - x;
    dy = p.y - y;
    return dx * dx + dy * dy;
  };

  const out = [points[0]];
  const walk = (first, last) => {
    let max = 0;
    let idx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = distSq(points[i], points[first], points[last]);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > sq) {
      walk(first, idx);
      out.push(points[idx]);
      walk(idx, last);
    }
  };
  walk(0, points.length - 1);
  out.push(points[points.length - 1]);
  return out;
}

export function dashFor(style) {
  if (style === 'dashed') return '10,6';
  if (style === 'dotted') return '2,4';
  return '';
}

/**
 * Effective look of an area in a given state. Mirrors the frontend CSS logic:
 * "normal" defines the base look; hover/active only override what is set
 * (active is applied on top of hover, like in the browser).
 */
export function effectiveStyle(area, stateName) {
  const n = area.states.normal;
  const out = { stroke: 'none', strokeWidth: 1, dash: '', bg: '', bgColor: '' };
  let bgSourceState = 'normal';

  if (n.borderWidth > 0 && n.borderColor && n.borderStyle !== 'none') {
    out.stroke = n.borderColor;
    out.strokeWidth = n.borderWidth;
    out.dash = dashFor(n.borderStyle);
  }
  let hasColor = false;
  let opacityExplicit = null;
  if (n.backgroundImage) out.bg = n.backgroundImage;
  if (n.backgroundColor) {
    out.bgColor = n.backgroundColor;
    hasColor = true;
  }
  if (n.backgroundOpacity !== null) opacityExplicit = n.backgroundOpacity;

  // In the browser the mouse is still over the area while it is pressed, so ":active"
  // is applied on top of ":hover" (which in turn is applied on top of "normal").
  const chain = { normal: [], hover: ['hover'], active: ['hover', 'active'] }[stateName] || [];
  chain.forEach((name) => {
    const s = area.states[name];
    if (s.borderStyle === 'none') {
      out.stroke = 'none';
    } else if (s.borderColor) {
      out.stroke = s.borderColor;
      if (s.borderWidth > 0) out.strokeWidth = s.borderWidth;
      out.dash = dashFor(s.borderStyle);
    } else if (s.borderWidth > 0) {
      out.strokeWidth = s.borderWidth;
    }
    if (s.backgroundImage) {
      out.bg = s.backgroundImage;
      // The image and "how to display it" (size/aspect/repeat) are configured together in one
      // state's fieldset, so they always travel as a pair: a state that inherits the image (has
      // none of its own) also inherits the placement options that came with it.
      bgSourceState = name;
    }
    if (s.backgroundColor) {
      out.bgColor = s.backgroundColor;
      hasColor = true;
    }
    if (s.backgroundOpacity !== null) opacityExplicit = s.backgroundOpacity;
  });

  // No explicit opacity anywhere up to this state: a color defaults to fully visible, no color
  // defaults to fully invisible - matches AreaViewHelper::resolveState() in the frontend so the
  // editor preview and the actual output always agree (and neither defaults to an "opaque flash").
  out.bgOpacity = (opacityExplicit === null ? (hasColor ? 100 : 0) : opacityExplicit) / 100;
  out.bgSourceState = bgSourceState;

  return out;
}

/**
 * Background-image placement for one state of an area, honouring inheritance: if this state
 * shows an image inherited from an earlier state (see effectiveStyle().bgSourceState above),
 * that earlier state's own size/aspect-ratio/repeat settings are used, since they were
 * configured together with the image itself.
 */
export function resolveAreaImagePlacement(area, stateName, bboxW, bboxH, naturalW, naturalH) {
  const es = effectiveStyle(area, stateName);
  const cfg = area.states[es.bgSourceState] || area.states.normal;

  return resolveImagePlacement(cfg, bboxW, bboxH, naturalW, naturalH);
}

/**
 * Resolves the "reference box" that background-size percentages/modes are relative to:
 * the tile size when repeating, otherwise the area's own bounding box.
 */
export function backgroundReferenceBox(state, bboxW, bboxH, naturalW, naturalH) {
  if (state.backgroundRepeat) {
    return {
      w: state.repeatWidth || naturalW || bboxW,
      h: state.repeatHeight || naturalH || bboxH,
    };
  }
  return { w: bboxW, h: bboxH };
}

/**
 * Resolves the box (in the same pixel-like unit as bboxW/bboxH) that the image is placed into,
 * for one of the five backgroundSize modes. Mirrors CSS background-size, but SVG-native.
 */
export function resolveImageBox(state, referenceW, referenceH, naturalW, naturalH) {
  switch (state.backgroundSize) {
    case 'auto':
      return { w: naturalW || referenceW, h: naturalH || referenceH };
    case 'custom': {
      const w = state.backgroundWidth ? pxOrPercent(state.backgroundWidth, state.backgroundWidthUnit, referenceW) : referenceW;
      const h = state.backgroundHeight ? pxOrPercent(state.backgroundHeight, state.backgroundHeightUnit, referenceH) : referenceH;
      return { w, h };
    }
    default: // stretch | contain | cover: the box is always the full reference area;
      // preserveAspectRatio (meet/slice/none, see below) decides how the image fits inside it.
      return { w: referenceW, h: referenceH };
  }
}

function pxOrPercent(value, unit, reference) {
  return unit === '%' ? (reference * value) / 100 : value;
}

/**
 * SVG <image preserveAspectRatio="..."> value for a state: "none" stretches to exactly fill the
 * box (ignores the image's own ratio); "xMidYMid meet"/"slice" keep the ratio, fitting entirely
 * inside the box (meet, like CSS background-size:contain) or filling+cropping it (slice, like
 * CSS background-size:cover).
 */
export function resolvePreserveAspectRatioAttr(state) {
  if (!state.preserveAspectRatio) return 'none';

  return state.backgroundSize === 'cover' || state.backgroundSize === 'stretch' ? 'xMidYMid slice' : 'xMidYMid meet';
}

/**
 * Full placement for one state's background image: the pattern tile size and, within it, the
 * <image> element's x/y/width/height/preserveAspectRatio. Used identically by the editor preview
 * and (mirrored in PHP) by the frontend output, so both always render the same result.
 */
export function resolveImagePlacement(state, bboxW, bboxH, naturalW, naturalH) {
  const ref = backgroundReferenceBox(state, bboxW, bboxH, naturalW, naturalH);
  const box = resolveImageBox(state, ref.w, ref.h, naturalW, naturalH);
  return {
    tileW: ref.w,
    tileH: ref.h,
    imgX: (ref.w - box.w) / 2,
    imgY: (ref.h - box.h) / 2,
    imgW: box.w,
    imgH: box.h,
    preserveAspectRatio: resolvePreserveAspectRatioAttr(state),
  };
}

/**
 * Center point an area rotates around: the shape's own geometric center for rect/circle,
 * the bounding-box center for poly/freeform (a true centroid would be nicer but the bbox
 * center is what most simple vector editors use and is good enough here).
 */
export function computeCenter(shape, coords) {
  if (shape === 'circle' && coords.length >= 3) return { cx: coords[0], cy: coords[1] };
  const box = bbox(shape, coords);
  return { cx: (box.minX + box.maxX) / 2, cy: (box.minY + box.maxY) / 2 };
}

export function normalizeAngle(deg) {
  const wrapped = deg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** Closest point to p on the segment a-b (used to insert a polygon/freeform point on an edge). */
export function closestPointOnSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return { x: a.x, y: a.y };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

/**
 * Top-left CSS page-position for a tooltip element:
 *  - "fixed": offset from the area's own screen bounding rect (top-left corner)
 *  - "dynamic": offset from the current mouse cursor position
 * Then clamped so the tooltip box (given its own measured size) stays fully inside the viewport.
 */
/**
 * Resolves where the tooltip goes and which CSS positioning scheme it needs:
 *  - "dynamic" / "fixed": viewport coordinates, CSS `position: fixed` (anchored to the cursor
 *    or to a screen rect; does not scroll with the page). For "fixed", anchorRect is the area's
 *    own rect or the whole image's rect, depending on tooltip.fixedRelativeTo - the CALLER picks
 *    which one to pass in (see resolveFixedAnchorRect() in the editor/frontend modules).
 *  - "document": absolute document coordinates, CSS `position: absolute` (an exact, author-
 *    chosen spot on the page that scrolls along with it, independent of area/cursor/viewport).
 * Only the viewport-relative modes are clamped to stay on-screen; an explicit document position
 * is respected as given, exactly like plain CSS `position: absolute` would.
 */
export function computeTooltipPosition(tooltip, anchorRect, cursor, tooltipSize, viewport) {
  if (tooltip.positionMode === 'document') {
    return { x: tooltip.documentX, y: tooltip.documentY, positioning: 'absolute' };
  }

  let x;
  let y;
  if (tooltip.positionMode === 'fixed') {
    x = anchorRect.left + tooltip.fixedX;
    y = anchorRect.top + tooltip.fixedY;
  } else {
    x = cursor.x + tooltip.offsetX;
    y = cursor.y + tooltip.offsetY;
  }

  const maxX = Math.max(0, viewport.width - tooltipSize.width);
  const maxY = Math.max(0, viewport.height - tooltipSize.height);

  return { x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)), positioning: 'fixed' };
}

/**
 * "#rgb" / "#rrggbb" + opacity percent -> "rgba(r, g, b, a)", so background transparency never
 * fades the tooltip's text/border too (which a plain CSS `opacity` on the whole box would do).
 * Returns null for an invalid/empty color.
 */
export function hexToRgba(hex, opacityPercent) {
  const match = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex || '');
  if (!match) return null;

  let h = match[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(100, opacityPercent)) / 100;

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * The effective tooltip content for an area: its rich-text tooltipContent (HTML, authored via
 * the small RTE), or - for areas created before that existed - the old plain "title" field,
 * escaped so it still displays correctly as HTML. Mirrors Area::getTooltipContent() in PHP.
 */
export function resolveTooltipContent(area) {
  if (area.tooltipContent) return area.tooltipContent;
  if (area.title) return escapeHtml(area.title);
  return '';
}

/** Plain-text version of the tooltip content, for contexts that cannot render HTML (aria-label). */
export function tooltipPlainText(area) {
  return resolveTooltipContent(area)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
