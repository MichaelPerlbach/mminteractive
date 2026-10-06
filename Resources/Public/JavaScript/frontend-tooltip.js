/**
 * Custom tooltip for imagemap areas. Replaces the browser's native title-attribute tooltip
 * (which cannot be styled) with one floating DOM element, shown/positioned/styled per area
 * from its "data-tooltip" (JSON config) and "data-tooltip-text" (sanitized rich-text HTML,
 * authored via the backend's small RTE - bold/italic/underline/link) attributes. This is why the
 * imagemap frontend now needs JavaScript for the tooltip specifically - everything else
 * (shapes, links, hover/mousedown border/background) still works without it, via CSS alone.
 */
import { normalizeTooltip, computeTooltipPosition, hexToRgba } from '@mikelmade/mminteractive/geometry.js';

let tooltipEl = null;

function ensureTooltipEl() {
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'mm-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.style.display = 'none';
    document.body.appendChild(tooltipEl);
  }
  return tooltipEl;
}

function applyStyle(el, tooltip) {
  el.style.zIndex = String(tooltip.zIndex);
  el.style.border = tooltip.borderWidth > 0 && tooltip.borderStyle !== 'none' && tooltip.borderColor
    ? `${tooltip.borderWidth}px ${tooltip.borderStyle} ${tooltip.borderColor}`
    : 'none';
  el.style.borderRadius = `${tooltip.borderRadius}px`;
  el.style.padding = `${tooltip.padding}px`;
  // Empty string reverts to the stylesheet's default (auto-sized, 280px max-width) - an explicit
  // width overrides that cap; an explicit height clips overflowing content instead of growing.
  el.style.width = tooltip.width ? `${tooltip.width}px` : '';
  el.style.height = tooltip.height ? `${tooltip.height}px` : '';
  el.style.maxWidth = tooltip.width ? 'none' : '';
  el.style.overflow = tooltip.height ? 'hidden' : '';
  el.style.backgroundColor = tooltip.backgroundColor ? hexToRgba(tooltip.backgroundColor, tooltip.backgroundOpacity) : 'transparent';
  if (tooltip.backgroundImage) {
    el.style.backgroundImage = `url("${tooltip.backgroundImage}")`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.backgroundRepeat = 'no-repeat';
  } else {
    el.style.backgroundImage = 'none';
  }
}

/**
 * For "fixed" mode: the rect fixedX/fixedY are relative to - the area's own wrapper, or the
 * whole image (the enclosing <svg>). Irrelevant for the other position modes.
 */
function resolveFixedAnchorRect(wrapper, tooltip) {
  if (tooltip.fixedRelativeTo === 'image') {
    const svg = wrapper.closest('svg');
    if (svg) return svg.getBoundingClientRect();
  }

  return wrapper.getBoundingClientRect();
}

function position(wrapper, tooltip, cursor, el) {
  const anchorRect = resolveFixedAnchorRect(wrapper, tooltip);
  const size = el.getBoundingClientRect();
  const pos = computeTooltipPosition(
    tooltip,
    anchorRect,
    cursor,
    { width: size.width, height: size.height },
    { width: window.innerWidth, height: window.innerHeight },
  );
  // "absolute" (document mode) vs "fixed" (dynamic/area-fixed modes) is the actual CSS mechanism
  // behind "scrolls with the page" vs "stays put in the viewport" - see computeTooltipPosition().
  el.style.position = pos.positioning;
  el.style.left = `${pos.x}px`;
  el.style.top = `${pos.y}px`;
}

function showTooltip(wrapper, tooltip, text, cursor) {
  const el = ensureTooltipEl();
  // "text" is the area's tooltip content: HTML authored via the backend's small rich-text
  // editor (bold/italic/underline/link), sanitized server-side (Area::getTooltipContent()) -
  // safe to render as markup here.
  el.innerHTML = text;
  applyStyle(el, tooltip);
  el.style.display = 'block';
  position(wrapper, tooltip, cursor, el);
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}

function init() {
  document.querySelectorAll('[data-tooltip]').forEach((wrapper) => {
    if (wrapper.dataset.tooltipReady) return;
    wrapper.dataset.tooltipReady = '1';

    const text = wrapper.getAttribute('data-tooltip-text') || '';
    if (!text) return;

    let tooltip;
    try {
      tooltip = normalizeTooltip(JSON.parse(wrapper.getAttribute('data-tooltip')));
    } catch {
      return;
    }

    wrapper.addEventListener('pointerenter', (evt) => {
      showTooltip(wrapper, tooltip, text, { x: evt.clientX, y: evt.clientY });
    });
    wrapper.addEventListener('pointermove', (evt) => {
      if (tooltipEl && tooltipEl.style.display !== 'none') {
        position(wrapper, tooltip, { x: evt.clientX, y: evt.clientY }, tooltipEl);
      }
    });
    wrapper.addEventListener('pointerleave', hideTooltip);
    wrapper.addEventListener('pointercancel', hideTooltip);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
