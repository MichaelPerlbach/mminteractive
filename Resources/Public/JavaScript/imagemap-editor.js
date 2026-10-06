/**
 * <mm-imagemap-editor>
 *
 * WYSIWYG editor for the image and the areas of one imagemap, all on one page:
 *  - the main image and background images are uploaded with the buttons where they are used
 *    (stored in fileadmin/mminteractive by an AJAX endpoint),
 *  - all areas are drawn / selected (also multiple) / moved / resized on the image,
 *  - name, link (TYPO3 link browser), title, CSS class and the three states (normal / hover /
 *    mousedown) of the selected area are edited in the panel below the image.
 * Everything is stored as one JSON document in the textarea inside this element, which is
 * saved with the normal "Save" button of the record.
 */
import {
  STATES,
  BORDER_STYLES,
  createArea,
  parseConfig,
  serializeConfig,
  bbox,
  unionBox,
  boxesIntersect,
  translate,
  clampDelta,
  normalizeRect,
  simplifyPath,
  flatToPoints,
  pointsToFlat,
  effectiveStyle,
  resolveAreaImagePlacement,
  BACKGROUND_SIZES,
  SIZE_UNITS,
  computeCenter,
  normalizeAngle,
  closestPointOnSegment,
  normalizeTooltip,
  TOOLTIP_POSITION_MODES,
  TOOLTIP_FIXED_RELATIVE_TO,
  computeTooltipPosition,
  hexToRgba,
  resolveTooltipContent,
  normalizeImageBorder,
} from '@mikelmade/mminteractive/geometry.js';

const NS = 'http://www.w3.org/2000/svg';

const I18N = {
  de: {
    select: 'Auswählen / Verschieben',
    rect: 'Rechteck',
    circle: 'Kreis',
    poly: 'Polygon',
    freeform: 'Freihand',
    remove: 'Bereich löschen',
    preview: 'Vorschau',
    states: { normal: 'Normal', hover: 'Hover', active: 'Mousedown' },
    areas: 'Bereiche',
    noAreas: 'Noch keine Bereiche. Werkzeug wählen und auf dem Bild zeichnen.',
    noSelection: 'Bereich auf dem Bild oder in der Liste auswählen.',
    noImage: 'Noch kein Bild. Mit „Bild hochladen“ ein Bild auswählen.',
    uploadImage: 'Bild hochladen',
    replaceImage: 'Bild ersetzen',
    imageInfo: 'Gespeichert in fileadmin/mminteractive',
    hintSelect: 'Klicken zum Auswählen (Shift/Strg = mehrere, Aufziehen = Auswahlrahmen), ziehen zum Verschieben, Ziehpunkte zum Skalieren. Entf löscht, Pfeiltasten verschieben.',
    hintRect: 'Rechteck aufziehen (Maustaste gedrückt halten).',
    hintCircle: 'Vom Mittelpunkt aus den Radius aufziehen.',
    hintPoly: 'Punkte anklicken; Doppelklick, Enter oder Klick auf den Startpunkt schließt das Polygon ab.',
    hintFreeform: 'Maustaste gedrückt halten und den Umriss nachziehen.',
    hintRotate: 'Griff über der Form dreht sie (Shift = 15°-Schritte).',
    hintEditPoints: 'Doppelklick auf die Kontur fügt einen Punkt hinzu.',
    name: 'Bezeichner',
    nameHelp: 'Eigener Name des Bereichs, unabhängig vom Titel (wird als data-name ausgegeben).',
    rotation: 'Drehung (Grad)',
    rotationHelp: 'Auch über den Griff oberhalb der Form ziehbar (Shift = 15°-Schritte).',
    link: 'Link',
    linkHelp: 'Über den Button den TYPO3-Link-Dialog öffnen (Seite, Datei, URL, E-Mail …).',
    title: 'Titel / Tooltip',
    imageTab: 'Bild',
    imageReplace: 'Bild ersetzen',
    imageAlt: 'Alt-Text',
    imageAltPlaceholder: 'Kurze Beschreibung des Bildes',
    imageAltHelp: 'alt-Attribut des Bildes: Beschreibung für Screenreader und Suchmaschinen. Ohne Angabe wird der Titel der Imagemap verwendet.',
    imageInfoTitle: 'Bild-Info',
    infoFile: 'Datei',
    infoSize: 'Abmessungen',
    infoStorage: 'Speicherort',
    imageBorder: 'Rahmen um das Bild',
    imageLink: 'Link für das gesamte Bild',
    imageLinkHelp: 'Gilt für Klicks auf das Bild außerhalb der Bereiche – die Bereiche liegen darüber und behalten ihren eigenen Link.',
    imageBorderThickness: 'Rahmendicke (px)',
    ownStyle: 'Own Style',
    ownStyleHelp: 'Eigene CSS-Deklarationen (z. B. opacity: 0.8;), gelten für diesen Bereich als Ganzes.',
    ownStylePlaceholder: 'z. B.\nopacity: 0.8;\ntransform: rotate(2deg);',
    multi: 'Bereiche ausgewählt. Gemeinsam verschieben (ziehen oder Pfeiltasten) oder löschen.',
    color: 'Rahmenfarbe',
    style: 'Rahmenstil',
    width: 'Rahmenbreite (px)',
    bgColor: 'Hintergrundfarbe',
    bgOpacity: 'Deckkraft (%)',
    bgImage: 'Hintergrundbild',
    bgSize: 'Bildgröße',
    bgSizeStretch: 'Strecken (auf Bereichsgröße)',
    bgSizeContain: 'Enthalten (contain)',
    bgSizeCover: 'Ausfüllen (cover)',
    bgSizeAuto: 'Original (auto)',
    bgSizeCustom: 'Benutzerdefiniert',
    bgWidth: 'Breite',
    bgHeight: 'Höhe',
    preserveAspectRatio: 'Seitenverhältnis beibehalten',
    bgRepeat: 'Wiederholen (Kachel)',
    bgRepeatWidth: 'Kachelbreite (px)',
    bgRepeatHeight: 'Kachelhöhe (px)',
    bgRepeatHelp: 'Leer = Bildgröße wird verwendet.',
    upload: 'Hochladen',
    removeImage: 'Entfernen',
    styles: { solid: 'Durchgezogen', dashed: 'Gestrichelt', dotted: 'Gepunktet', none: 'Kein Rahmen' },
    inheritHint: 'Leer/0 = Wert des vorherigen Zustands bleibt erhalten.',
    uploading: 'Lade hoch …',
    uploaded: 'Hochgeladen.',
    empty: '(leer)',
    defaultName: 'Bereich',
    tooltip: 'Tooltip',
    tooltipText: 'Tooltip-Text',
    rteBold: 'Fett',
    rteItalic: 'Kursiv',
    rteUnderline: 'Unterstrichen',
    rteLink: 'Link einfügen',
    rteLinkPrompt: 'Link-Adresse (URL):',
    rteClear: 'Formatierung entfernen',
    rteFormat: 'Absatzformat',
    rteFormatNormal: 'Normal',
    rteFontFamily: 'Schriftart',
    rteFontFamilyDefault: 'Standard-Schriftart',
    rteFontColor: 'Schriftfarbe',
    rteImage: 'Bild einfügen',
    rteTable: 'Tabelle einfügen',
    rteTableRowsPrompt: 'Anzahl Zeilen:',
    rteTableColsPrompt: 'Anzahl Spalten:',
    rteTableDelete: 'Tabelle löschen',
    rteTableDeleteNone: 'Cursor steht in keiner Tabelle.',
    rteTableMenuTitle: 'Tabelle bearbeiten',
    rteTableWidth: 'Tabellenbreite (px)',
    rteTableBorderWidth: 'Rahmenbreite (px)',
    rteTableBorderColor: 'Rahmenfarbe',
    rteTableColumn: 'Spalte',
    rteTableSizeAuto: 'Automatisch',
    rteClose: 'Schließen',
    rteImageMenuTitle: 'Bild bearbeiten',
    rteImageBorderStyle: 'Rahmenstil',
    rteImagePadding: 'Abstand Rahmen–Bild (px)',
    rteImageMargin: 'Außenabstand (px)',
    rteSource: 'Quelltext',
    tooltipRadius: 'Eckenradius (px)',
    tooltipPadding: 'Innenabstand (px)',
    tooltipWidth: 'Breite (px)',
    tooltipHeight: 'Höhe (px)',
    tooltipSizeAuto: 'Automatisch',
    tooltipPosition: 'Positionierung',
    tooltipPositionFixed: 'Fest',
    tooltipPositionDynamic: 'Dynamisch (folgt dem Mauszeiger)',
    tooltipPositionDocument: 'Fest zum Dokument (scrollt mit der Seite)',
    tooltipDocumentX: 'X-Wert (px, ab Dokumentanfang)',
    tooltipDocumentY: 'Y-Wert (px, ab Dokumentanfang)',
    tooltipDocumentHelp: 'Fester Punkt auf der Seite, unabhängig von Bereich und Mauszeiger; scrollt mit der Seite (im Gegensatz zu „Fest“, das am Bildschirm hängen bleibt).',
    tooltipZIndex: 'z-index',
    tooltipZIndexHelp: 'Normalerweise nicht nötig zu ändern (Standard: immer ganz oben). Niedrigere Werte lassen andere Elemente der Seite darüber liegen.',
    tooltipRelativeTo: 'Bezugspunkt',
    tooltipRelativeToArea: 'Bereich',
    tooltipRelativeToImage: 'Bild (gesamtes Bild)',
    tooltipFixedX: 'X-Wert (px, ab oben links)',
    tooltipFixedY: 'Y-Wert (px, ab oben links)',
    tooltipOffsetX: 'X-Abstand vom Mauszeiger (px)',
    tooltipOffsetY: 'Y-Abstand vom Mauszeiger (px)',
  },
  en: {
    select: 'Select / move',
    rect: 'Rectangle',
    circle: 'Circle',
    poly: 'Polygon',
    freeform: 'Freeform',
    remove: 'Delete area',
    preview: 'Preview',
    states: { normal: 'Normal', hover: 'Hover', active: 'Mousedown' },
    areas: 'Areas',
    noAreas: 'No areas yet. Pick a tool and draw on the image.',
    noSelection: 'Select an area on the image or in the list.',
    noImage: 'No image yet. Use "Upload image" to choose one.',
    uploadImage: 'Upload image',
    replaceImage: 'Replace image',
    imageInfo: 'Stored in fileadmin/mminteractive',
    hintSelect: 'Click to select (Shift/Ctrl = multiple, drag = selection box), drag to move, drag handles to resize. Del deletes, arrow keys nudge.',
    hintRect: 'Drag out a rectangle (hold the mouse button).',
    hintCircle: 'Drag the radius out from the center.',
    hintPoly: 'Click points; double-click, Enter or a click on the start point closes the polygon.',
    hintFreeform: 'Hold the mouse button and trace the outline.',
    hintRotate: 'The handle above the shape rotates it (Shift = 15° steps).',
    hintEditPoints: 'Double-click the outline to add a point.',
    name: 'Identifier',
    nameHelp: 'Own name of the area, independent of the title (output as data-name).',
    rotation: 'Rotation (degrees)',
    rotationHelp: 'Can also be dragged via the handle above the shape (Shift = 15° steps).',
    link: 'Link',
    linkHelp: 'Use the button to open the TYPO3 link dialog (page, file, URL, email …).',
    title: 'Title / tooltip',
    imageTab: 'Image',
    imageReplace: 'Replace image',
    imageAlt: 'Alt text',
    imageAltPlaceholder: 'Short description of the image',
    imageAltHelp: 'The image\'s alt attribute: a description for screen readers and search engines. If empty, the imagemap\'s title is used.',
    imageInfoTitle: 'Image info',
    infoFile: 'File',
    infoSize: 'Dimensions',
    infoStorage: 'Storage',
    imageBorder: 'Border around the image',
    imageLink: 'Link for the whole image',
    imageLinkHelp: 'Applies to clicks on the image outside the areas - the areas sit on top and keep their own link.',
    imageBorderThickness: 'Border thickness (px)',
    ownStyle: 'Own Style',
    ownStyleHelp: 'Your own CSS declarations (e.g. opacity: 0.8;), applied to this area as a whole.',
    ownStylePlaceholder: 'e.g.\nopacity: 0.8;\ntransform: rotate(2deg);',
    multi: 'areas selected. Move them together (drag or arrow keys) or delete.',
    color: 'Border color',
    style: 'Border style',
    width: 'Border width (px)',
    bgColor: 'Background color',
    bgOpacity: 'Opacity (%)',
    bgImage: 'Background image',
    bgSize: 'Image size',
    bgSizeStretch: 'Stretch (to area size)',
    bgSizeContain: 'Contain',
    bgSizeCover: 'Cover',
    bgSizeAuto: 'Original (auto)',
    bgSizeCustom: 'Custom',
    bgWidth: 'Width',
    bgHeight: 'Height',
    preserveAspectRatio: 'Preserve aspect ratio',
    bgRepeat: 'Repeat (tile)',
    bgRepeatWidth: 'Tile width (px)',
    bgRepeatHeight: 'Tile height (px)',
    bgRepeatHelp: 'Empty = the image size is used.',
    upload: 'Upload',
    removeImage: 'Remove',
    styles: { solid: 'Solid', dashed: 'Dashed', dotted: 'Dotted', none: 'No border' },
    inheritHint: 'Empty/0 = value of the previous state is kept.',
    uploading: 'Uploading …',
    uploaded: 'Uploaded.',
    empty: '(empty)',
    defaultName: 'Area',
    tooltip: 'Tooltip',
    tooltipText: 'Tooltip text',
    rteBold: 'Bold',
    rteItalic: 'Italic',
    rteUnderline: 'Underline',
    rteLink: 'Insert link',
    rteLinkPrompt: 'Link address (URL):',
    rteClear: 'Clear formatting',
    rteFormat: 'Paragraph format',
    rteFormatNormal: 'Normal',
    rteFontFamily: 'Font family',
    rteFontFamilyDefault: 'Default font',
    rteFontColor: 'Font color',
    rteImage: 'Insert image',
    rteTable: 'Insert table',
    rteTableRowsPrompt: 'Number of rows:',
    rteTableColsPrompt: 'Number of columns:',
    rteTableDelete: 'Delete table',
    rteTableDeleteNone: 'The cursor is not inside a table.',
    rteTableMenuTitle: 'Edit table',
    rteTableWidth: 'Table width (px)',
    rteTableBorderWidth: 'Border width (px)',
    rteTableBorderColor: 'Border color',
    rteTableColumn: 'Column',
    rteTableSizeAuto: 'Automatic',
    rteClose: 'Close',
    rteImageMenuTitle: 'Edit image',
    rteImageBorderStyle: 'Border style',
    rteImagePadding: 'Border-to-image gap (px)',
    rteImageMargin: 'Outer margin (px)',
    rteSource: 'Source code',
    tooltipRadius: 'Corner radius (px)',
    tooltipPadding: 'Padding (px)',
    tooltipWidth: 'Width (px)',
    tooltipHeight: 'Height (px)',
    tooltipSizeAuto: 'Automatic',
    tooltipPosition: 'Positioning',
    tooltipPositionFixed: 'Fixed',
    tooltipPositionDynamic: 'Dynamic (follows the mouse cursor)',
    tooltipPositionDocument: 'Fixed to the document (scrolls with the page)',
    tooltipDocumentX: 'X (px, from the top of the document)',
    tooltipDocumentY: 'Y (px, from the top of the document)',
    tooltipDocumentHelp: 'A fixed spot on the page, independent of the area and the cursor; scrolls with the page (unlike "Fixed", which stays put on screen).',
    tooltipZIndex: 'z-index',
    tooltipZIndexHelp: 'Usually fine to leave as-is (default: always on top). Lower values let other page elements appear above it.',
    tooltipRelativeTo: 'Relative to',
    tooltipRelativeToArea: 'Area',
    tooltipRelativeToImage: 'Image (whole image)',
    tooltipFixedX: 'X (px, from the top-left)',
    tooltipFixedY: 'Y (px, from the top-left)',
    tooltipOffsetX: 'X offset from the cursor (px)',
    tooltipOffsetY: 'Y offset from the cursor (px)',
  },
};

function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === false || v === null || v === undefined) return;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  });
  [].concat(children).forEach((c) => c && node.append(c));
  return node;
}

function s(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== null && v !== undefined) node.setAttribute(k, String(v));
  });
  if (parent) parent.appendChild(node);
  return node;
}

class MmImageMapEditor extends HTMLElement {
  connectedCallback() {
    if (this.initialized) return;
    if (!this.querySelector('textarea[data-mm-json]')) {
      // children not parsed yet (element upgraded while the HTML was still streaming)
      this.retries = (this.retries || 0) + 1;
      if (this.retries < 50) setTimeout(() => this.connectedCallback(), 20);
      return;
    }
    this.initialized = true;

    try {
      this.cfg = JSON.parse(this.dataset.config || '{}');
    } catch {
      this.cfg = {};
    }
    this.t = I18N[(document.documentElement.lang || 'en').toLowerCase().startsWith('de') ? 'de' : 'en'];
    this.uid = 'mm' + Math.random().toString(36).slice(2, 7);
    this.field = this.querySelector('textarea[data-mm-json]');

    const parsed = parseConfig(this.field.value);
    this.image = parsed.image;
    this.areas = parsed.areas;
    this.fileUrls = { ...(this.cfg.fileUrls || {}) };
    this.mainUrl = this.cfg.imageUrl || '';
    this.W = this.image.width || 800;
    this.H = this.image.height || 600;

    this.selection = this.areas.length ? [this.areas[0].id] : [];
    this.tool = 'select';
    this.previewState = 'normal';
    this.drag = null;
    this.draft = null;
    this.polyActive = false;
    this.nodes = new Map();
    this.patternIds = new Map();
    this.naturalSizes = new Map();
    this.openStates = new Set(['normal', 'tooltip']); // which state sections are unfolded (kept across panel re-renders)

    this.setupNativeLink();
    this.build();
    this.renderAll();

    if (this.mainUrl && !this.image.width) {
      const probe = new Image();
      probe.onload = () => {
        this.image.width = this.W = probe.naturalWidth || this.W;
        this.image.height = this.H = probe.naturalHeight || this.H;
        this.applyViewBox();
        this.renderAll();
      };
      probe.src = this.mainUrl;
    }

    this.linkTimer = setInterval(() => this.syncNativeLink(), 300);
  }

  disconnectedCallback() {
    clearInterval(this.linkTimer);
  }

  /* ------------------------------------------------------------- persistence */

  commit() {
    this.field.value = serializeConfig(this.image, this.areas);
    this.field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  setStatus(text, isError = false) {
    this.status.textContent = text;
    this.status.classList.toggle('mm-ime__status--error', isError);
  }

  /* ---------------------------------------------------------------- uploads */

  uploadUrl() {
    let settings = window.TYPO3 && window.TYPO3.settings;
    if (!settings || !settings.ajaxUrls) {
      try { settings = window.top.TYPO3.settings; } catch { settings = null; }
    }
    return settings && settings.ajaxUrls ? settings.ajaxUrls.mminteractive_upload : undefined;
  }

  async upload(file) {
    const base = this.uploadUrl();
    if (!base) throw new Error('Upload endpoint not available (TYPO3.settings.ajaxUrls).');
    const body = new FormData();
    body.append('file', file);
    this.setStatus(this.t.uploading);
    const res = await fetch(new URL(base, window.location.href), { method: 'POST', body, credentials: 'same-origin', headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.message || `HTTP ${res.status}`);
    this.fileUrls[data.identifier] = data.url;
    this.setStatus(this.t.uploaded);
    return data;
  }

  async uploadMainImage(file) {
    try {
      const data = await this.upload(file);
      this.image = { file: data.identifier, width: data.width, height: data.height, border: this.image.border, link: this.image.link, alt: this.image.alt };
      this.mainUrl = data.url;
      this.W = data.width || this.W;
      this.H = data.height || this.H;
      this.applyViewBox();
      this.commit();
      this.renderAll();
      this.updateImageBar();
    } catch (e) {
      this.setStatus(e.message || String(e), true);
    }
  }

  async uploadBackground(area, state, file) {
    try {
      const data = await this.upload(file);
      area.states[state].backgroundImage = data.identifier;
      this.commit();
      this.renderPatterns();
      this.renderShapes();
      this.renderPanel();
    } catch (e) {
      this.setStatus(e.message || String(e), true);
    }
  }

  /* -------------------------------------------------------------- link field */

  /**
   * Finds the embedded TYPO3 link fields (rendered by the PHP element): one that follows the selected
   * area, one for the whole image. Each is a record { box, hidden, visible, has, last }; "has" is
   * false if TYPO3 could not render it (the editor then falls back to a plain text input).
   */
  setupNativeLink() {
    this.nl = {
      area: this.findNativeLink('[data-mm-native-link]', 'mm_link_helper'),
      image: this.findNativeLink('[data-mm-native-link-image]', 'mm_link_helper_image'),
    };
  }

  findNativeLink(selector, helperName) {
    const box = this.querySelector(selector);
    const hidden = box ? box.querySelector(`input[name="${helperName}"]`) : null;
    const visible = box ? box.querySelector(`[data-formengine-input-name="${helperName}"]`) || hidden : null;
    const rec = { box, hidden, visible, has: !!(box && visible), last: '' };
    if (box) {
      this.hideBorrowedLabel(box);
      box.hidden = false; // delivered hidden (no flash before upgrade); it is shown where it gets re-attached
      box.remove(); // re-attached inside the panel / image link block
    }
    return rec;
  }

  /**
   * The nested TYPO3 link field can show the label of the column it was created for ("Image and
   * areas") as a caption - wrong for a link. Hide every element whose whole text is that label.
   */
  hideBorrowedLabel(box) {
    const labels = (this.cfg.fieldLabels || []).map((l) => String(l).trim()).filter(Boolean);
    if (!labels.length) return;
    box.querySelectorAll('*').forEach((el) => {
      if (el.matches('input, textarea, select, button, option, script, style')) return;
      if (el.children.length === 0 && labels.includes((el.textContent || '').trim())) el.hidden = true;
    });
  }

  setNativeLink(rec, value) {
    if (rec.hidden) rec.hidden.value = value;
    if (rec.visible) rec.visible.value = value;
    rec.last = value;
  }

  /** Reads what the TYPO3 link browser wrote into an embedded field; returns the new value or null if unchanged. */
  readNativeLink(rec) {
    if (!rec.has || !rec.box.isConnected) return null;
    const hidden = rec.hidden ? rec.hidden.value : '';
    const visible = rec.visible ? rec.visible.value : '';
    const current = hidden !== rec.last ? hidden : visible;
    if (current === rec.last) return null;
    rec.last = current;
    return current.trim();
  }

  /**
   * The TYPO3 link browser writes the chosen link into the embedded field. Depending on the TYPO3
   * version that is announced by an event or not, so the fields are also checked periodically.
   */
  syncNativeLink() {
    const area = this.selected;
    if (area) {
      const value = this.readNativeLink(this.nl.area);
      if (value !== null) {
        area.link = value;
        this.commit();
      }
    }
    const imageValue = this.readNativeLink(this.nl.image);
    if (imageValue !== null) {
      this.image.link = imageValue;
      this.commit();
    }
  }

  /** "Link for the whole image": sits directly below the image; the areas are drawn on top of it. */
  renderImageLink() {
    const t = this.t;
    const rec = this.nl.image;
    if (rec.box && rec.box.parentNode) rec.box.remove();
    let control;
    if (rec.has) {
      this.setNativeLink(rec, this.image.link || '');
      control = h('div', { class: 'mm-ime__nativelink' }, [rec.box]);
    } else {
      control = this.bindText(h('input', { type: 'text', class: 'form-control', value: this.image.link || '', placeholder: 't3://page?uid=12' }), (v) => { this.image.link = v.trim(); });
    }
    this.imageLinkBlock.replaceChildren(
      h('strong', { text: t.imageLink }),
      h('div', { class: 'mm-ime__row mm-ime__imagelinkrow' }, [control, h('small', { class: 'mm-ime__muted', text: t.imageLinkHelp })]),
    );
  }

  /* ------------------------------------------------------------------ build */

  build() {
    const t = this.t;
    this.ui = h('div', { class: 'mm-ime' });

    // main image
    this.imageBar = h('div', { class: 'mm-ime__imagebar' });
    this.imageLabel = h('span', { class: 'mm-ime__muted' });
    const mainInput = h('input', { type: 'file', accept: '.jpg,.jpeg,.png,.gif,.webp,image/*', hidden: true });
    mainInput.addEventListener('change', () => {
      if (mainInput.files && mainInput.files[0]) this.uploadMainImage(mainInput.files[0]);
      mainInput.value = '';
    });
    this.mainButton = h('button', { type: 'button', class: 'btn btn-primary btn-sm', 'data-action': 'upload-main' });
    this.mainButton.addEventListener('click', () => mainInput.click());
    this.imageBar.append(this.mainButton, mainInput);
    this.imageLabel = h('div', { class: 'mm-ime__imageinfo' }); // "Image info" block, filled by updateImageBar()

    // imagemap-wide border around the whole image (CSS border on the frame in the frontend too)
    this.borderBar = h('div', { class: 'mm-ime__borderbar' });
    const borderStyle = h('select', { class: 'form-select form-control mm-ime__borderstyle', title: t.style }, BORDER_STYLES.map((v) => h('option', { value: v, text: t.styles[v] })));
    const borderColor = h('input', { type: 'color', class: 'mm-ime__bordercolor', title: t.color, value: '#000000' });
    const borderWidth = h('input', { type: 'number', class: 'form-control mm-ime__borderwidth', min: 0, max: 50, title: t.imageBorderThickness });
    this.borderControls = { borderStyle, borderColor, borderWidth };
    const applyBorder = () => {
      this.image.border = normalizeImageBorder({ style: borderStyle.value, color: borderColor.value, width: parseInt(borderWidth.value, 10) || 0 });
      this.applyImageBorder();
      this.commit();
    };
    borderStyle.addEventListener('input', applyBorder);
    borderColor.addEventListener('input', applyBorder);
    borderWidth.addEventListener('input', applyBorder);
    this.borderBar.append(
      h('strong', { text: t.imageBorder }),
      h('label', { class: 'mm-ime__inline' }, [h('span', { text: t.style }), borderStyle]),
      h('label', { class: 'mm-ime__inline' }, [h('span', { text: t.color }), borderColor]),
      h('label', { class: 'mm-ime__inline' }, [h('span', { text: t.imageBorderThickness }), borderWidth]),
    );
    this.imageFrame = h('div', { class: 'mm-ime__imageframe' }); // the svg is added below, once it exists
    this.imageLinkBlock = h('div', { class: 'mm-ime__imagelink' });

    this.altInput = h('input', { type: 'text', class: 'form-control mm-ime__imagealt', maxlength: 500, placeholder: t.imageAltPlaceholder });
    this.altInput.addEventListener('input', () => {
      this.image.alt = this.altInput.value.trim();
      this.commit();
    });

    // Everything that edits the image as a whole lives in this one accordion ("tab")
    const imageSection = (title, ...content) => h('div', { class: 'mm-ime__imagesection' }, [h('strong', { text: title }), ...content]);
    this.imageTab = h('details', { class: 'mm-ime__imagetab', open: true }, [
      h('summary', { text: t.imageTab }),
      imageSection(t.imageReplace, this.imageBar),
      imageSection(t.imageAlt, this.altInput, h('small', { class: 'mm-ime__muted', text: t.imageAltHelp })),
      this.imageLinkBlock,
      this.borderBar,
      imageSection(t.imageInfoTitle, this.imageLabel),
    ]);

    // toolbar
    this.toolbar = h('div', { class: 'mm-ime__toolbar' });
    [
      ['select', '⇱', t.select],
      ['rect', '▭', t.rect],
      ['circle', '◯', t.circle],
      ['poly', '⬠', t.poly],
      ['freeform', '✎', t.freeform],
    ].forEach(([tool, icon, label]) => {
      this.toolbar.append(h('button', { type: 'button', class: 'btn btn-default btn-sm', 'data-tool': tool, title: label, text: `${icon} ${label}` }));
    });
    this.toolbar.append(h('button', { type: 'button', class: 'btn btn-default btn-sm', 'data-action': 'remove', text: `🗑 ${t.remove}` }));
    const previewWrap = h('span', { class: 'mm-ime__preview' }, [h('span', { text: `${t.preview}: ` })]);
    STATES.forEach((st) => {
      previewWrap.append(h('button', { type: 'button', class: 'btn btn-default btn-sm', 'data-preview': st, text: t.states[st] }));
    });
    this.toolbar.append(previewWrap);
    this.toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.tool) this.setTool(btn.dataset.tool);
      else if (btn.dataset.action === 'remove') this.deleteSelected();
      else if (btn.dataset.preview) {
        this.previewState = btn.dataset.preview;
        this.renderShapes();
        this.updateToolbar();
      }
    });

    this.hint = h('div', { class: 'mm-ime__hint' });
    this.status = h('div', { class: 'mm-ime__status', 'aria-live': 'polite' });

    this.svg = s('svg', { class: 'mm-ime__svg', preserveAspectRatio: 'xMidYMid meet', tabindex: '0' });
    this.defs = s('defs', {}, this.svg);
    this.bgImage = s('image', { x: 0, y: 0 }, this.svg);
    this.bgRect = s('rect', { x: 0, y: 0, fill: '#e9e9e9' }, this.svg);
    this.shapesLayer = s('g', {}, this.svg);
    this.overlay = s('g', {}, this.svg);
    this.applyViewBox();

    this.svg.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.svg.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.svg.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.svg.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    this.svg.addEventListener('dblclick', (evt) => {
      if (this.polyActive) { this.finishPoly(); return; }
      if (this.tool === 'select') this.tryInsertPoint(evt);
    });
    this.svg.addEventListener('keydown', (e) => this.onKeyDown(e));
    if (window.ResizeObserver) new ResizeObserver(() => this.renderOverlay()).observe(this.svg);

    this.list = h('div', { class: 'mm-ime__list' });
    this.panel = h('div', { class: 'mm-ime__panel' });

    // The actual field TYPO3 saves - not shown in the UI, but has to stay in the DOM.
    this.field.hidden = true;
    this.field.addEventListener('change', (e) => {
      if (!e.isTrusted) return;
      const parsed = parseConfig(this.field.value);
      this.image = parsed.image;
      this.areas = parsed.areas;
      this.selection = this.areas.length ? [this.areas[0].id] : [];
      this.updateImageBar();
      this.renderImageLink();
      this.renderAll();
    });

    this.imageFrame.append(this.svg);
    this.ui.append(this.imageTab, this.toolbar, this.hint, h('div', { class: 'mm-ime__canvas' }, [this.imageFrame]), this.status, this.list, this.panel, this.field);
    this.append(this.ui);
    this.renderImageLink();
    this.updateImageBar();
  }

  /** Syncs the border controls and the preview frame with this.image.border (also after a reload from the raw field). */
  applyImageBorder() {
    const b = (this.image.border = normalizeImageBorder(this.image.border));
    const { borderStyle, borderColor, borderWidth } = this.borderControls;
    if (document.activeElement !== borderWidth) borderWidth.value = b.width;
    borderStyle.value = b.style;
    borderColor.value = b.color;
    this.imageFrame.style.border = b.width > 0 && b.style !== 'none' ? `${b.width}px ${b.style} ${b.color}` : 'none';
  }

  updateImageBar() {
    this.applyImageBorder();
    this.mainButton.textContent = `📷 ${this.mainUrl ? this.t.replaceImage : this.t.uploadImage}`;
    if (document.activeElement !== this.altInput) this.altInput.value = this.image.alt || '';
    const info = this.mainUrl
      ? [[this.t.infoFile, this.image.file], [this.t.infoSize, `${this.image.width} × ${this.image.height} px`], [this.t.infoStorage, this.t.imageInfo]]
      : [];
    this.imageLabel.replaceChildren(...(info.length
      ? info.map(([k, v]) => h('div', { class: 'mm-ime__infoline' }, [h('span', { class: 'mm-ime__muted', text: `${k}: ` }), h('span', { text: v })]))
      : [h('span', { class: 'mm-ime__muted', text: this.t.noImage })]));
  }

  applyViewBox() {
    this.svg.setAttribute('viewBox', `0 0 ${this.W} ${this.H}`);
    this.bgRect.setAttribute('width', this.W);
    this.bgRect.setAttribute('height', this.H);
    this.bgImage.setAttribute('width', this.W);
    this.bgImage.setAttribute('height', this.H);
    if (this.mainUrl) {
      this.bgImage.setAttribute('href', this.mainUrl);
      this.bgRect.setAttribute('display', 'none');
    }
  }

  /* ---------------------------------------------------------------- state */

  get selectedAreas() {
    return this.areas.filter((a) => this.selection.includes(a.id));
  }

  /** The selected area if exactly one is selected, otherwise null. */
  get selected() {
    return this.selection.length === 1 ? this.areas.find((a) => a.id === this.selection[0]) || null : null;
  }

  get k() {
    // svg units per screen pixel (keeps handles the same visual size at any zoom)
    const w = this.svg.getBoundingClientRect().width;
    return w > 0 ? this.W / w : 1;
  }

  setSelection(ids) {
    this.selection = ids.filter((id) => this.areas.some((a) => a.id === id));
    this.renderOverlay();
    this.renderList();
    this.renderPanel();
    this.updateToolbar();
  }

  toggleSelection(id) {
    this.setSelection(this.selection.includes(id) ? this.selection.filter((i) => i !== id) : [...this.selection, id]);
  }

  setTool(tool) {
    if (this.polyActive) this.finishPoly();
    this.tool = tool;
    this.hideCanvasTooltip();
    this.updateToolbar();
  }

  /* ------------------------------------------------------------- rendering */

  renderAll() {
    this.renderPatterns();
    this.renderShapes();
    this.renderOverlay();
    this.renderList();
    this.renderPanel();
    this.updateToolbar();
  }

  updateToolbar() {
    this.toolbar.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === this.tool));
    this.toolbar.querySelectorAll('[data-preview]').forEach((b) => b.classList.toggle('active', b.dataset.preview === this.previewState));
    const hints = { select: 'hintSelect', rect: 'hintRect', circle: 'hintCircle', poly: 'hintPoly', freeform: 'hintFreeform' };
    let hint = this.t[hints[this.tool]];
    const single = this.tool === 'select' ? this.selected : null;
    if (single) {
      hint += ' ' + this.t.hintRotate;
      if (single.shape === 'poly' || single.shape === 'freeform') hint += ' ' + this.t.hintEditPoints;
    }
    this.hint.textContent = hint;
    this.svg.classList.toggle('is-drawing', this.tool !== 'select');
  }

  renderPatterns() {
    this.defs.replaceChildren();
    this.patternIds.clear();
    this.areas.forEach((area) => {
      if (!area.coords.length) return;
      const box = bbox(area.shape, area.coords);
      const bboxW = box.maxX - box.minX || 1;
      const bboxH = box.maxY - box.minY || 1;

      STATES.forEach((state) => {
        const es = effectiveStyle(area, state);
        if (!es.bg || !this.fileUrls[es.bg]) return;
        const url = this.fileUrls[es.bg];
        const key = `${area.id}:${state}`;

        const natural = this.naturalSizeOf(url);
        const placement = resolveAreaImagePlacement(area, state, bboxW, bboxH, natural.w, natural.h);
        const id = `${this.uid}-p-${this.patternIds.size}`;
        this.patternIds.set(key, id);

        const cfg = area.states[es.bgSourceState];
        const pattern = cfg.backgroundRepeat
          ? s('pattern', { id, patternUnits: 'userSpaceOnUse', patternContentUnits: 'userSpaceOnUse', width: placement.tileW, height: placement.tileH }, this.defs)
          : s('pattern', { id, patternUnits: 'objectBoundingBox', patternContentUnits: 'userSpaceOnUse', width: 1, height: 1, viewBox: `0 0 ${placement.tileW} ${placement.tileH}`, preserveAspectRatio: 'none' }, this.defs);
        s('image', { href: url, x: placement.imgX, y: placement.imgY, width: placement.imgW, height: placement.imgH, preserveAspectRatio: placement.preserveAspectRatio }, pattern);
      });
    });
  }

  /** Natural pixel size of an image URL, probed once and cached; triggers a re-render when it arrives. */
  naturalSizeOf(url) {
    const cached = this.naturalSizes.get(url);
    if (cached) return cached;
    if (!this.naturalSizes.has(url)) {
      this.naturalSizes.set(url, null); // marks "loading" so we do not probe twice
      const probe = new Image();
      probe.onload = () => {
        this.naturalSizes.set(url, { w: probe.naturalWidth || 1, h: probe.naturalHeight || 1 });
        this.renderPatterns();
        this.renderShapes();
      };
      probe.src = url;
    }
    // Fallback while the natural size is still loading: behaves like "stretch" until it arrives.
    return { w: 0, h: 0 };
  }

  makeShape(shape) {
    return s({ rect: 'rect', circle: 'circle', poly: 'polygon', freeform: 'polygon' }[shape] || 'rect');
  }

  /** One group per area: color layer, image layer and the top layer (border + hit area). */
  createShapeNode(area) {
    const g = s('g', { 'data-id': area.id, class: 'mm-ime__shape' });
    const layers = { color: this.makeShape(area.shape), image: this.makeShape(area.shape), top: this.makeShape(area.shape) };
    layers.color.setAttribute('pointer-events', 'none');
    layers.image.setAttribute('pointer-events', 'none');
    layers.top.setAttribute('class', 'mm-ime__top');
    layers.top.setAttribute('pointer-events', 'all');
    g.append(layers.color, layers.image, layers.top);
    return { g, layers };
  }

  applyGeometry(node, area) {
    const c = area.coords;
    if (area.shape === 'rect' && c.length >= 4) {
      node.setAttribute('x', Math.min(c[0], c[2]));
      node.setAttribute('y', Math.min(c[1], c[3]));
      node.setAttribute('width', Math.abs(c[2] - c[0]));
      node.setAttribute('height', Math.abs(c[3] - c[1]));
    } else if (area.shape === 'circle' && c.length >= 3) {
      node.setAttribute('cx', c[0]);
      node.setAttribute('cy', c[1]);
      node.setAttribute('r', Math.max(0, c[2]));
    } else if (c.length >= 2) {
      node.setAttribute('points', flatToPoints(c).map((p) => `${p.x},${p.y}`).join(' '));
    }
  }

  /** Rotates a node (shape group or overlay group) around the area's own center. */
  applyRotation(node, area) {
    if (area.rotation) {
      const { cx, cy } = computeCenter(area.shape, area.coords);
      node.setAttribute('transform', `rotate(${area.rotation} ${cx} ${cy})`);
    } else {
      node.removeAttribute('transform');
    }
  }

  applyStyle(entry, area) {
    const st = effectiveStyle(area, this.previewState);
    const { color, image, top } = entry.layers;

    color.setAttribute('fill', st.bgColor || 'none');
    color.setAttribute('fill-opacity', st.bgOpacity);

    const pattern = st.bg && this.patternIds.get(`${area.id}:${this.previewState}`);
    image.setAttribute('fill', pattern ? `url(#${pattern})` : 'none');

    const hasColor = st.bgColor && st.bgOpacity > 0;
    if (st.stroke === 'none') {
      // editor-only helper outline so that borderless areas stay visible/selectable
      top.setAttribute('stroke', '#ff8000');
      top.setAttribute('stroke-width', 1.5);
      top.setAttribute('stroke-dasharray', '4 3');
      top.setAttribute('vector-effect', 'non-scaling-stroke');
      top.setAttribute('stroke-opacity', 0.6);
      top.setAttribute('fill', hasColor || pattern ? 'transparent' : 'rgba(255,128,0,0.10)');
    } else {
      top.setAttribute('stroke', st.stroke);
      top.setAttribute('stroke-width', st.strokeWidth);
      top.setAttribute('stroke-opacity', 1);
      top.removeAttribute('vector-effect');
      if (st.dash) top.setAttribute('stroke-dasharray', st.dash);
      else top.removeAttribute('stroke-dasharray');
      top.setAttribute('fill', 'transparent');
    }
  }

  renderShapes() {
    this.shapesLayer.replaceChildren();
    this.nodes.clear();
    this.areas.forEach((area) => {
      if (!area.coords.length) return;
      const entry = this.createShapeNode(area);
      Object.values(entry.layers).forEach((el) => this.applyGeometry(el, area));
      this.applyRotation(entry.g, area);
      this.applyStyle(entry, area);
      this.shapesLayer.appendChild(entry.g);
      this.nodes.set(area.id, entry);

      entry.layers.top.addEventListener('pointerenter', (evt) => this.showCanvasTooltip(area, evt));
      entry.layers.top.addEventListener('pointermove', (evt) => this.moveCanvasTooltip(area, evt));
      entry.layers.top.addEventListener('pointerleave', () => this.hideCanvasTooltip());
    });
    this.draftNode = null;
    this.renderDraft();
  }

  renderDraft() {
    if (this.draftNode) this.draftNode.remove();
    this.draftNode = null;
    if (!this.draft || !this.draft.coords.length) return;
    const el = this.makeShape(this.draft.shape);
    el.setAttribute('class', 'mm-ime__draft');
    el.setAttribute('pointer-events', 'none');
    this.applyGeometry(el, this.draft);
    this.shapesLayer.appendChild(el);
    this.draftNode = el;
  }

  updateShapeNode(area) {
    const entry = this.nodes.get(area.id);
    if (entry) {
      Object.values(entry.layers).forEach((el) => this.applyGeometry(el, area));
      this.applyRotation(entry.g, area);
    }
    this.renderOverlay();
  }

  handlePoints(area) {
    const c = area.coords;
    if (area.shape === 'rect' && c.length >= 4) {
      const [x1, y1, x2, y2] = normalizeRect(c);
      return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    }
    if (area.shape === 'circle' && c.length >= 3) return [[c[0] + c[2], c[1]]];
    const pts = flatToPoints(c);
    return pts.length > 80 ? [] : pts.map((p) => [p.x, p.y]);
  }

  renderOverlay() {
    this.overlay.replaceChildren();

    this.selectedAreas.forEach((area) => {
      if (area.coords.length < 2) return;
      const g = s('g', {}, this.overlay);
      this.applyRotation(g, area);
      const outline = this.makeShape(area.shape);
      outline.setAttribute('class', 'mm-ime__outline');
      outline.setAttribute('fill', 'none');
      outline.setAttribute('pointer-events', 'none');
      this.applyGeometry(outline, area);
      g.appendChild(outline);
    });

    const single = this.selected;
    if (single && single.coords.length >= 2) {
      const size = 9 * this.k;
      const handleGroup = s('g', {}, this.overlay);
      this.applyRotation(handleGroup, single);
      this.handlePoints(single).forEach(([x, y], i) => {
        s('rect', { class: 'mm-ime__handle', 'data-handle': i, x: x - size / 2, y: y - size / 2, width: size, height: size }, handleGroup);
      });

      // Rotation handle: sits above the shape's (unrotated) top edge, connected by a line; both
      // are inside the same rotated group, so they always stay attached to the shape's top.
      const { cx } = computeCenter(single.shape, single.coords);
      const box = bbox(single.shape, single.coords);
      const handleDistance = 26 * this.k;
      const topY = box.minY - handleDistance;
      s('line', { class: 'mm-ime__rotate-line', x1: cx, y1: box.minY, x2: cx, y2: topY }, handleGroup);
      s('circle', { class: 'mm-ime__rotate-handle', 'data-rotate-handle': 'true', cx, cy: topY, r: size / 1.6 }, handleGroup);
    }

    if (this.drag && this.drag.type === 'marquee' && this.drag.rect) {
      const r = this.drag.rect;
      s('rect', { class: 'mm-ime__marquee', x: r.minX, y: r.minY, width: r.maxX - r.minX, height: r.maxY - r.minY }, this.overlay);
    }
  }

  areaLabel(area, index) {
    return area.name || `${this.t[area.shape]} ${index + 1}`;
  }

  renderList() {
    const t = this.t;
    this.list.replaceChildren(h('strong', { text: `${t.areas}: ` }));
    if (!this.areas.length) {
      this.list.append(h('span', { class: 'mm-ime__muted', text: t.noAreas }));
      return;
    }
    this.areas.forEach((a, i) => {
      const label = `${this.areaLabel(a, i)}${a.coords.length ? '' : ' ' + t.empty}`;
      const b = h('button', { type: 'button', class: 'btn btn-sm ' + (this.selection.includes(a.id) ? 'btn-primary' : 'btn-default'), text: label, title: t[a.shape] });
      b.addEventListener('click', (e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) this.toggleSelection(a.id);
        else this.setSelection([a.id]);
      });
      this.list.append(b, ' ');
    });
  }

  /* ---------------------------------------------------------------- panel */

  row(label, input, help = '') {
    return h('label', { class: 'mm-ime__row' }, [h('span', { class: 'mm-ime__label', text: label }), input, help ? h('small', { class: 'mm-ime__muted', text: help }) : null]);
  }

  bindText(input, apply, rerenderList = false) {
    input.addEventListener('input', () => {
      apply(input.value);
      this.commit();
      if (rerenderList) this.renderList();
    });
    return input;
  }

  colorControl(current, onChange) {
    const text = h('input', { type: 'text', class: 'form-control', value: current, placeholder: '#rrggbb', maxlength: 9 });
    const pick = h('input', { type: 'color', value: /^#[0-9a-fA-F]{6}$/.test(current) ? current : '#ff8000' });
    pick.addEventListener('input', () => {
      text.value = pick.value;
      onChange(pick.value);
    });
    text.addEventListener('input', () => {
      const v = text.value.trim();
      if (v === '' || /^#[0-9a-fA-F]{3,8}$/.test(v)) {
        if (/^#[0-9a-fA-F]{6}$/.test(v)) pick.value = v;
        onChange(v);
      }
    });
    return h('span', { class: 'mm-ime__color' }, [pick, text]);
  }

  renderPanel() {
    const t = this.t;
    const area = this.selected;
    if (this.nl.area.box && this.nl.area.box.parentNode) this.nl.area.box.remove();
    this.panel.replaceChildren();

    if (!area) {
      const count = this.selection.length;
      this.panel.append(h('p', { class: 'mm-ime__muted', text: count > 1 ? `${count} ${t.multi}` : t.noSelection }));
      return;
    }

    // link: the embedded TYPO3 link field, or a plain text input if it could not be rendered
    let linkControl;
    if (this.nl.area.has) {
      this.setNativeLink(this.nl.area, area.link);
      linkControl = h('div', { class: 'mm-ime__nativelink' }, [this.nl.area.box]);
    } else {
      linkControl = this.bindText(h('input', { type: 'text', class: 'form-control', value: area.link, placeholder: 't3://page?uid=12' }), (v) => { area.link = v.trim(); });
    }

    const rotationInput = h('input', { type: 'number', class: 'form-control', min: 0, max: 359, step: 1, value: Math.round(area.rotation) });
    rotationInput.addEventListener('input', () => {
      area.rotation = normalizeAngle(parseFloat(rotationInput.value) || 0);
      this.updateShapeNode(area);
      this.commit();
    });

    this.panel.append(
      h('div', { class: 'mm-ime__general' }, [
        this.row(t.name, this.bindText(h('input', { type: 'text', class: 'form-control', value: area.name, maxlength: 100 }), (v) => { area.name = v.trim(); }, true), t.nameHelp),
        this.row(t.rotation, rotationInput, t.rotationHelp),
      ]),
      h('div', { class: 'mm-ime__row mm-ime__linkrow' }, [h('span', { class: 'mm-ime__label', text: t.link }), linkControl, h('small', { class: 'mm-ime__muted', text: t.linkHelp })]),
    );

    this.panel.append(this.renderTooltipSection(area));

    STATES.forEach((state) => {
      const cfg = area.states[state];
      const d = h('details', { class: 'mm-ime__state', open: this.openStates.has(state) }, [h('summary', { text: t.states[state] })]);
      d.addEventListener('toggle', () => (d.open ? this.openStates.add(state) : this.openStates.delete(state)));
      if (state !== 'normal') d.append(h('small', { class: 'mm-ime__muted', text: t.inheritHint }));
      const refresh = () => {
        this.commit();
        this.applyStyle(this.nodes.get(area.id), area);
      };

      const style = h('select', { class: 'form-select form-control' }, BORDER_STYLES.map((v) => h('option', { value: v, text: t.styles[v], selected: v === cfg.borderStyle })));
      style.addEventListener('input', () => { cfg.borderStyle = style.value; refresh(); });

      const width = h('input', { type: 'number', class: 'form-control', min: 0, max: 50, value: cfg.borderWidth });
      width.addEventListener('input', () => { cfg.borderWidth = Math.max(0, Math.min(50, parseInt(width.value, 10) || 0)); refresh(); });

      // opacity 0-100 %; empty = not set (normal: 100 %, hover/mousedown: unchanged)
      const opacity = h('input', { type: 'number', class: 'form-control', min: 0, max: 100, step: 5, value: cfg.backgroundOpacity === null ? '' : cfg.backgroundOpacity, placeholder: state === 'normal' ? '100' : '–' });
      opacity.addEventListener('input', () => {
        cfg.backgroundOpacity = opacity.value === '' ? null : Math.max(0, Math.min(100, parseInt(opacity.value, 10) || 0));
        refresh();
      });

      // background image: preview + upload + remove, right here
      const fileInput = h('input', { type: 'file', accept: '.jpg,.jpeg,.png,.gif,.webp,image/*', hidden: true });
      fileInput.addEventListener('change', () => {
        if (fileInput.files && fileInput.files[0]) this.uploadBackground(area, state, fileInput.files[0]);
      });
      const uploadBtn = h('button', { type: 'button', class: 'btn btn-default btn-sm', 'data-action': `upload-${state}`, text: `📷 ${t.upload}` });
      uploadBtn.addEventListener('click', () => fileInput.click());
      const bgWrap = h('span', { class: 'mm-ime__bg' });
      const ref = cfg.backgroundImage;
      if (ref && this.fileUrls[ref]) bgWrap.append(h('img', { class: 'mm-ime__thumb', src: this.fileUrls[ref], alt: '' }));
      bgWrap.append(uploadBtn, fileInput);
      if (ref) {
        const removeBtn = h('button', { type: 'button', class: 'btn btn-default btn-sm', 'data-action': `remove-${state}`, text: t.removeImage });
        removeBtn.addEventListener('click', () => {
          cfg.backgroundImage = '';
          this.commit();
          this.renderShapes();
          this.renderPanel();
        });
        bgWrap.append(removeBtn);
      }

      // background-image placement options (only meaningful once an image is set for this state)
      let imageOptions = null;
      if (ref) {
        const refreshImage = (rerenderPanel = false) => {
          this.commit();
          this.renderPatterns();
          this.renderShapes();
          if (rerenderPanel) this.renderPanel();
        };

        const sizeSelect = h(
          'select',
          { class: 'form-select form-control' },
          BACKGROUND_SIZES.map((v) => h('option', { value: v, text: t['bgSize' + v[0].toUpperCase() + v.slice(1)], selected: v === cfg.backgroundSize })),
        );
        sizeSelect.addEventListener('input', () => { cfg.backgroundSize = sizeSelect.value; refreshImage(true); });

        const preserveAR = h('input', { type: 'checkbox', checked: cfg.preserveAspectRatio || false });
        preserveAR.addEventListener('change', () => { cfg.preserveAspectRatio = preserveAR.checked; refreshImage(); });

        const repeatCheckbox = h('input', { type: 'checkbox', checked: cfg.backgroundRepeat || false });
        repeatCheckbox.addEventListener('change', () => { cfg.backgroundRepeat = repeatCheckbox.checked; refreshImage(true); });

        const sizeAndAspect = h('div', { class: 'mm-ime__grid' }, [
          this.row(t.bgSize, sizeSelect),
          h('label', { class: 'mm-ime__row mm-ime__checkbox-row' }, [preserveAR, h('span', { text: t.preserveAspectRatio })]),
          h('label', { class: 'mm-ime__row mm-ime__checkbox-row' }, [repeatCheckbox, h('span', { text: t.bgRepeat })]),
        ]);

        const dimensionControl = (labelText, value, unit, onChange) => {
          const num = h('input', { type: 'number', class: 'form-control', min: 0, step: 1, value: value === null ? '' : value });
          const unitSelect = h('select', { class: 'form-select form-control' }, SIZE_UNITS.map((u) => h('option', { value: u, text: u, selected: u === unit })));
          const apply = () => onChange(num.value === '' ? null : Math.max(0, parseFloat(num.value)), unitSelect.value);
          num.addEventListener('input', apply);
          unitSelect.addEventListener('input', apply);
          return this.row(labelText, h('span', { class: 'mm-ime__dimension' }, [num, unitSelect]));
        };

        const customFields = cfg.backgroundSize === 'custom'
          ? h('div', { class: 'mm-ime__grid' }, [
              dimensionControl(t.bgWidth, cfg.backgroundWidth, cfg.backgroundWidthUnit, (v, u) => { cfg.backgroundWidth = v; cfg.backgroundWidthUnit = u; refreshImage(); }),
              dimensionControl(t.bgHeight, cfg.backgroundHeight, cfg.backgroundHeightUnit, (v, u) => { cfg.backgroundHeight = v; cfg.backgroundHeightUnit = u; refreshImage(); }),
            ])
          : null;

        const repeatSizeControl = (labelText, value, onChange) => {
          const num = h('input', { type: 'number', class: 'form-control', min: 0, step: 1, placeholder: '–', value: value === null ? '' : value });
          num.addEventListener('input', () => onChange(num.value === '' ? null : Math.max(0, parseFloat(num.value))));
          return this.row(labelText, num);
        };

        const repeatFields = cfg.backgroundRepeat
          ? h('div', { class: 'mm-ime__grid' }, [
              repeatSizeControl(t.bgRepeatWidth, cfg.repeatWidth, (v) => { cfg.repeatWidth = v; refreshImage(); }),
              repeatSizeControl(t.bgRepeatHeight, cfg.repeatHeight, (v) => { cfg.repeatHeight = v; refreshImage(); }),
              h('small', { class: 'mm-ime__muted', text: t.bgRepeatHelp }),
            ])
          : null;

        imageOptions = h('div', { class: 'mm-ime__image-options' }, [sizeAndAspect, customFields, repeatFields]);
      }

      d.append(
        ...[
          h('div', { class: 'mm-ime__grid' }, [
            this.row(t.color, this.colorControl(cfg.borderColor, (v) => { cfg.borderColor = v; refresh(); })),
            this.row(t.style, style),
            this.row(t.width, width),
            this.row(t.bgColor, this.colorControl(cfg.backgroundColor, (v) => { cfg.backgroundColor = v; refresh(); })),
            this.row(t.bgOpacity, opacity),
            h('div', { class: 'mm-ime__row' }, [h('span', { class: 'mm-ime__label', text: t.bgImage }), bgWrap]),
          ]),
          imageOptions,
        ].filter(Boolean),
      );
      this.panel.append(d);
    });
    this.panel.append(this.renderOwnStyleSection(area));
  }

  /**
   * "Own Style": a free-text CSS textarea for anything the structured controls above don't
   * cover. The declarations apply to this one area as a whole (not per Normal/Hover/Mousedown),
   * which is why it sits as its own accordion after all three per-state sections rather than
   * inside one of them.
   */
  renderOwnStyleSection(area) {
    const t = this.t;
    const textarea = h('textarea', { class: 'mm-ime__own-style form-control', rows: 4, placeholder: t.ownStylePlaceholder });
    textarea.value = area.ownStyle || '';
    textarea.addEventListener('input', () => { area.ownStyle = textarea.value; this.commit(); });

    const section = h('details', { class: 'mm-ime__state', open: this.openStates.has('ownStyle') }, [h('summary', { text: t.ownStyle })]);
    section.addEventListener('toggle', () => (section.open ? this.openStates.add('ownStyle') : this.openStates.delete('ownStyle')));
    section.append(
      h('small', { class: 'mm-ime__muted', text: t.ownStyleHelp }),
      textarea,
    );
    return section;
  }

  /**
   * A small, dependency-free rich-text editor (contenteditable + document.execCommand) for the
   * tooltip text: headings, font color/family, bold/italic/underline, link, image, table, source
   * view. Paste is forced to plain text to avoid pulling in arbitrary markup/styles from external
   * sources (Word, websites, ...).
   */
  createMiniRte(value, onChange) {
    const t = this.t;
    const rteRoot = h('div', { class: 'mm-ime__rte' });
    const editable = h('div', { class: 'mm-ime__rte-editable', contenteditable: 'true' });
    editable.innerHTML = value || '';

    // Interacting with anything outside the editable (a toolbar select, the native color/file
    // picker, ...) blurs it, which can silently collapse or clear its text selection depending on
    // the browser - most noticeably with the color picker, a heavier native/OS dialog. Capturing
    // the selection on blur and restoring it before every command keeps formatting commands
    // working regardless of which control triggered them (this previously made font color
    // appear to do nothing: foreColor ran against an empty/lost selection).
    let savedRange = null;
    editable.addEventListener('blur', () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editable.contains(selection.anchorNode)) {
        savedRange = selection.getRangeAt(0).cloneRange();
      }
    });

    const run = (name, arg) => {
      editable.focus();
      if (savedRange) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedRange);
        }
        savedRange = null; // consume once - a later command without an intervening blur should
        // use the (still valid) live selection, not this now possibly-stale range
      }
      // "styleWithCSS" has to be ON only for foreColor/fontName, so they produce
      // "<span style="color:...">"/"<span style="font-family:...">" (which the server-side
      // sanitizer's style allowlist - color/font-family only - can keep). Left on for bold/
      // italic/underline too, it would instead produce "<span style="font-weight:bold">" etc,
      // which that same allowlist would then strip entirely, silently losing the formatting.
      try { document.execCommand('styleWithCSS', false, name === 'foreColor' || name === 'fontName'); } catch { /* not supported, ignore */ }
      document.execCommand(name, false, arg);
      onChange(editable.innerHTML);
    };

    const btn = (label, title, action) => {
      const b = h('button', { type: 'button', class: 'btn btn-default btn-sm', text: label, title });
      // mousedown (not click) would lose the current text selection before execCommand runs
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => action());
      return b;
    };

    // Same as btn(), but with a small inline SVG icon instead of a text label - used where a
    // text glyph (emoji) would render inconsistently across platforms/fonts.
    const iconBtn = (svg, title, action) => {
      const b = h('button', { type: 'button', class: 'btn btn-default btn-sm mm-ime__rte-iconbtn', title });
      b.innerHTML = svg;
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => action());
      return b;
    };
    const ICON_GRID = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1.5" y="1.5" width="13" height="13" rx="1"/><line x1="1.5" y1="6" x2="14.5" y2="6"/><line x1="1.5" y1="10.5" x2="14.5" y2="10.5"/><line x1="6" y1="1.5" x2="6" y2="14.5"/><line x1="10.5" y1="1.5" x2="10.5" y2="14.5"/></svg>';
    const ICON_IMAGE = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1.5" y="2.5" width="13" height="11" rx="1"/><circle cx="5.3" cy="6.3" r="1.1" fill="currentColor" stroke="none"/><path d="M2 12 L6 8 L8.5 10.3 L11 7.8 L14 11"/></svg>';
    const ICON_TABLE_DELETE = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1.5" y="1.5" width="13" height="13" rx="1"/><line x1="1.5" y1="6" x2="14.5" y2="6"/><line x1="6" y1="1.5" x2="6" y2="14.5"/><line x1="10.5" y1="1.5" x2="10.5" y2="14.5"/><line x1="3" y1="8.5" x2="8.5" y2="14" stroke="#c00"/><line x1="8.5" y1="8.5" x2="3" y2="14" stroke="#c00"/></svg>';

    const formatSelect = h('select', { class: 'form-select form-control mm-ime__rte-select', title: t.rteFormat }, [
      h('option', { value: 'p', text: t.rteFormatNormal }),
      h('option', { value: 'h1', text: 'H1' }),
      h('option', { value: 'h2', text: 'H2' }),
      h('option', { value: 'h3', text: 'H3' }),
      h('option', { value: 'h4', text: 'H4' }),
    ]);
    // Native <select>/<input type=color> need the click to actually open their picker, so (unlike
    // the buttons above) their mousedown must NOT be prevented; run() re-focuses + restores the
    // editable's last selection before executing the command, which happens after the pick anyway.
    formatSelect.addEventListener('change', () => { run('formatBlock', `<${formatSelect.value}>`); formatSelect.value = 'p'; });

    const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma', 'Trebuchet MS'];
    const fontSelect = h(
      'select',
      { class: 'form-select form-control mm-ime__rte-select', title: t.rteFontFamily },
      [h('option', { value: '', text: t.rteFontFamilyDefault }), ...FONTS.map((f) => h('option', { value: f, text: f }))],
    );
    fontSelect.addEventListener('change', () => { if (fontSelect.value) run('fontName', fontSelect.value); fontSelect.value = ''; });

    const colorInput = h('input', { type: 'color', class: 'mm-ime__rte-color', title: t.rteFontColor, value: '#000000' });
    colorInput.addEventListener('input', () => run('foreColor', colorInput.value));

    // Image insertion: reuses the same upload endpoint as area/tooltip background images. By the
    // time the upload finishes and insertHTML runs, "run()"'s own selection-restore (above)
    // already puts the cursor back where the user actually clicked before opening the file dialog.
    const imageFileInput = h('input', { type: 'file', accept: '.jpg,.jpeg,.png,.gif,.webp,image/*', hidden: true });
    imageFileInput.addEventListener('change', async () => {
      const file = imageFileInput.files && imageFileInput.files[0];
      imageFileInput.value = '';
      if (!file) return;
      try {
        const data = await this.upload(file);
        run('insertHTML', `<img src="${data.url}" alt="">`);
      } catch (e) {
        this.setStatus(e.message || String(e), true);
      }
    });
    const imageBtn = iconBtn(ICON_IMAGE, t.rteImage, () => imageFileInput.click());

    const tableBtn = iconBtn(ICON_GRID, t.rteTable, () => {
      const rows = Math.max(1, Math.min(10, parseInt(window.prompt(t.rteTableRowsPrompt, '2'), 10) || 0) || 2);
      const cols = Math.max(1, Math.min(10, parseInt(window.prompt(t.rteTableColsPrompt, '2'), 10) || 0) || 2);
      const row = `<tr>${'<td>\u00a0</td>'.repeat(cols)}</tr>`;
      run('insertHTML', `<table>${row.repeat(rows)}</table><p></p>`);
    });

    // Deletes the table the current selection/cursor is inside (if any). Clicking it elsewhere
    // does nothing harmful - a status message explains why instead of silently failing.
    const deleteTableBtn = iconBtn(ICON_TABLE_DELETE, t.rteTableDelete, () => {
      editable.focus();
      const selection = window.getSelection();
      const anchor = selection && selection.rangeCount ? selection.getRangeAt(0).startContainer : null;
      const node = anchor instanceof Element ? anchor : anchor?.parentElement;
      const table = node ? node.closest('table') : null;
      if (table && editable.contains(table)) {
        table.remove();
        onChange(editable.innerHTML);
      } else {
        this.setStatus(t.rteTableDeleteNone, true);
      }
    });

    // Right-click on a table or an image: a small floating panel of live-updating fields. Edits
    // apply via direct style mutation (not execCommand, which has no concept of "this table"/
    // "this column"/"this image") and go through the same onChange() as everything else, so
    // they are saved exactly like any other formatting.
    let floatingMenuEl = null;
    let floatingMenuCloseListener = null;
    const closeFloatingMenu = () => {
      if (floatingMenuEl) { floatingMenuEl.remove(); floatingMenuEl = null; }
      if (floatingMenuCloseListener) { document.removeEventListener('mousedown', floatingMenuCloseListener, true); floatingMenuCloseListener = null; }
    };

    /** Builds, positions (near the right-click), and wires up the close behaviour for a floating menu. */
    const openFloatingMenu = (titleText, rows, evt) => {
      closeFloatingMenu();
      const closeBtn = h('button', { type: 'button', class: 'btn btn-default btn-sm', text: '✕', title: t.rteClose });
      closeBtn.addEventListener('click', closeFloatingMenu);

      floatingMenuEl = h('div', { class: 'mm-ime__table-menu' }, [
        h('div', { class: 'mm-ime__table-menu-header' }, [h('strong', { text: titleText }), closeBtn]),
        ...rows,
      ]);
      document.body.appendChild(floatingMenuEl);

      const rect = floatingMenuEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(evt.clientX, window.innerWidth - rect.width - 10));
      const y = Math.max(0, Math.min(evt.clientY, window.innerHeight - rect.height - 10));
      floatingMenuEl.style.left = `${x}px`;
      floatingMenuEl.style.top = `${y}px`;

      floatingMenuCloseListener = (e) => { if (floatingMenuEl && !floatingMenuEl.contains(e.target)) closeFloatingMenu(); };
      document.addEventListener('mousedown', floatingMenuCloseListener, true);
    };

    const menuRow = (label, control) => h('div', { class: 'mm-ime__row' }, [h('span', { class: 'mm-ime__label', text: label }), control]);

    const toHexColor = (value) => {
      if (!value) return '#000000';
      if (/^#[0-9a-f]{6}$/i.test(value)) return value;
      const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value);
      if (!m) return '#000000';
      const toHex = (n) => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, '0');
      return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
    };

    const applyTableBorder = (table, widthPx, color) => {
      [table, ...table.querySelectorAll('td, th')].forEach((el) => {
        if (widthPx > 0) {
          el.style.borderWidth = `${widthPx}px`;
          el.style.borderStyle = 'solid';
          el.style.borderColor = color;
        } else {
          el.style.borderWidth = '';
          el.style.borderStyle = '';
          el.style.borderColor = '';
        }
      });
      table.style.borderCollapse = 'collapse';
      onChange(editable.innerHTML);
    };

    const applyColumnWidth = (table, colIndex, widthPx) => {
      Array.from(table.rows).forEach((row) => {
        const cell = row.cells[colIndex];
        if (cell) cell.style.width = widthPx !== null ? `${widthPx}px` : '';
      });
      onChange(editable.innerHTML);
    };

    const sizeInput = (currentPx, onApply) => {
      const input = h('input', { type: 'number', class: 'form-control', min: 0, placeholder: t.rteTableSizeAuto, value: currentPx === null ? '' : currentPx });
      input.addEventListener('input', () => onApply(input.value === '' ? null : Math.max(0, parseInt(input.value, 10) || 0)));
      return input;
    };

    editable.addEventListener('contextmenu', (evt) => {
      if (evt.target.tagName === 'IMG') {
        evt.preventDefault();
        openImageContextMenu(evt.target, evt);
        return;
      }

      const table = evt.target.closest('table');
      if (!table || !editable.contains(table)) return; // not on a table/image - let the normal browser menu show
      evt.preventDefault();

      const firstRow = table.rows[0];
      const colCount = firstRow ? firstRow.cells.length : 0;
      const currentTableWidth = table.style.width ? parseInt(table.style.width, 10) : null;
      const currentBorderWidth = table.style.borderWidth ? parseInt(table.style.borderWidth, 10) : 0;
      const currentBorderColor = toHexColor(table.style.borderColor);

      const widthInput = sizeInput(currentTableWidth, (v) => { table.style.width = v !== null ? `${v}px` : ''; onChange(editable.innerHTML); });

      const borderWidthInput = h('input', { type: 'number', class: 'form-control', min: 0, value: currentBorderWidth });
      const borderColorInput = h('input', { type: 'color', class: 'mm-ime__rte-color', value: currentBorderColor });
      const applyBorder = () => applyTableBorder(table, parseInt(borderWidthInput.value, 10) || 0, borderColorInput.value);
      borderWidthInput.addEventListener('input', applyBorder);
      borderColorInput.addEventListener('input', applyBorder);

      const columnRows = [];
      for (let i = 0; i < colCount; i++) {
        const cell = firstRow.cells[i];
        const current = cell.style.width ? parseInt(cell.style.width, 10) : null;
        const input = sizeInput(current, (v) => applyColumnWidth(table, i, v));
        columnRows.push(menuRow(`${t.rteTableColumn} ${i + 1}`, input));
      }

      openFloatingMenu(t.rteTableMenuTitle, [
        menuRow(t.rteTableWidth, widthInput),
        menuRow(t.rteTableBorderWidth, borderWidthInput),
        menuRow(t.rteTableBorderColor, borderColorInput),
        ...columnRows,
      ], evt);
    });

    /**
     * Right-click on an image: border style/width/color, the gap between the image and its
     * border ("padding" - border and image content stay visually separated), and the image's
     * own outer spacing from surrounding content ("margin").
     */
    const openImageContextMenu = (img, evt) => {
      const currentStyle = BORDER_STYLES.includes(img.style.borderStyle) ? img.style.borderStyle : 'solid';
      const currentWidth = img.style.borderWidth ? parseInt(img.style.borderWidth, 10) : 0;
      const currentColor = toHexColor(img.style.borderColor);
      const currentPadding = img.style.padding ? parseInt(img.style.padding, 10) : 0;
      const currentMargin = img.style.margin ? parseInt(img.style.margin, 10) : 0;

      const styleSelect = h('select', { class: 'form-select form-control' }, BORDER_STYLES.map((v) => h('option', { value: v, text: t.styles[v], selected: v === currentStyle })));
      const widthInput = h('input', { type: 'number', class: 'form-control', min: 0, value: currentWidth });
      const colorInput = h('input', { type: 'color', class: 'mm-ime__rte-color', value: currentColor });
      const applyBorder = () => {
        const w = parseInt(widthInput.value, 10) || 0;
        if (w > 0 && styleSelect.value !== 'none') {
          img.style.borderWidth = `${w}px`;
          img.style.borderStyle = styleSelect.value;
          img.style.borderColor = colorInput.value;
        } else {
          img.style.borderWidth = '';
          img.style.borderStyle = '';
          img.style.borderColor = '';
        }
        onChange(editable.innerHTML);
      };
      styleSelect.addEventListener('input', applyBorder);
      widthInput.addEventListener('input', applyBorder);
      colorInput.addEventListener('input', applyBorder);

      const paddingInput = h('input', { type: 'number', class: 'form-control', min: 0, value: currentPadding });
      paddingInput.addEventListener('input', () => {
        const v = parseInt(paddingInput.value, 10) || 0;
        img.style.padding = v > 0 ? `${v}px` : '';
        onChange(editable.innerHTML);
      });

      const marginInput = h('input', { type: 'number', class: 'form-control', min: 0, value: currentMargin });
      marginInput.addEventListener('input', () => {
        const v = parseInt(marginInput.value, 10) || 0;
        img.style.margin = v > 0 ? `${v}px` : '';
        onChange(editable.innerHTML);
      });

      openFloatingMenu(t.rteImageMenuTitle, [
        menuRow(t.rteImageBorderStyle, styleSelect),
        menuRow(t.rteTableBorderWidth, widthInput),
        menuRow(t.rteTableBorderColor, colorInput),
        menuRow(t.rteImagePadding, paddingInput),
        menuRow(t.rteImageMargin, marginInput),
      ], evt);
    };

    const sourceTextarea = h('textarea', { class: 'mm-ime__rte-source form-control', hidden: true });
    let sourceMode = false;
    const sourceBtn = btn('</>', t.rteSource, () => {
      clearImageSelection();
      if (!sourceMode) {
        sourceTextarea.value = editable.innerHTML;
        editable.hidden = true;
        sourceTextarea.hidden = false;
        sourceTextarea.focus();
      } else {
        editable.innerHTML = sourceTextarea.value;
        sourceTextarea.hidden = true;
        editable.hidden = false;
        onChange(editable.innerHTML);
      }
      sourceMode = !sourceMode;
      sourceBtn.classList.toggle('active', sourceMode);
    });
    sourceTextarea.addEventListener('input', () => onChange(sourceTextarea.value));

    const toolbar = h('div', { class: 'mm-ime__rte-toolbar' }, [
      formatSelect,
      fontSelect,
      colorInput,
      btn('B', t.rteBold, () => run('bold')),
      btn('I', t.rteItalic, () => run('italic')),
      btn('U', t.rteUnderline, () => run('underline')),
      btn('🔗', t.rteLink, () => {
        const url = window.prompt(t.rteLinkPrompt, 'https://');
        if (url) run('createLink', url);
      }),
      imageBtn,
      imageFileInput,
      tableBtn,
      deleteTableBtn,
      btn('✕', t.rteClear, () => run('removeFormat')),
      sourceBtn,
    ]);

    editable.addEventListener('input', () => onChange(editable.innerHTML));
    editable.addEventListener('paste', (evt) => {
      evt.preventDefault();
      const text = (evt.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    // --- draggable / resizable images -----------------------------------------------------
    // Moving an image is the browser's native contenteditable drag-and-drop: images are
    // draggable by default inside a contenteditable, and the browser relocates the actual <img>
    // node in the DOM to wherever the cursor drops it - including into a table cell - the same
    // way dragging text around within the editable already works. We never preventDefault on
    // that, so it is never intercepted; the resulting DOM change fires a normal "input" event
    // (handled below already), which is what actually saves it like any other edit.
    // Resizing is the one thing contenteditable has no native equivalent for: four corner
    // handles appear while an image is selected; dragging one changes its width/height, anchored
    // at the diagonally opposite corner (matching how area resize handles work elsewhere in this
    // editor) - purely a width/height change, no positioning, since the image stays inline
    // exactly where the surrounding content places it. Shift while dragging a corner locks the
    // aspect ratio.
    let selectedImage = null;
    let imageHandles = null;
    let resizeDrag = null;

    const clearImageSelection = () => {
      if (imageHandles) { imageHandles.remove(); imageHandles = null; }
      selectedImage = null;
    };

    const positionImageHandles = () => {
      if (!selectedImage || !imageHandles) return;
      const size = 9;
      // imageHandles lives in rteRoot (a sibling of editable, not inside it - so it never ends up
      // in editable.innerHTML / the saved content); its coordinates need editable's own offset
      // within rteRoot added on top of the image's offset within editable.
      const left = editable.offsetLeft + selectedImage.offsetLeft;
      const top = editable.offsetTop + selectedImage.offsetTop;
      const w = selectedImage.offsetWidth;
      const hgt = selectedImage.offsetHeight;
      const corners = { nw: [left, top], ne: [left + w, top], sw: [left, top + hgt], se: [left + w, top + hgt] };
      imageHandles.querySelectorAll('[data-corner]').forEach((el) => {
        const [x, y] = corners[el.dataset.corner];
        el.style.left = `${x - size / 2}px`;
        el.style.top = `${y - size / 2}px`;
      });
    };

    const selectImage = (img) => {
      clearImageSelection();
      selectedImage = img;
      imageHandles = h('div', { class: 'mm-ime__img-handles' }, ['nw', 'ne', 'sw', 'se'].map((corner) => h('div', { class: 'mm-ime__img-handle', 'data-corner': corner })));
      rteRoot.appendChild(imageHandles);
      positionImageHandles();
    };

    document.addEventListener('click', (evt) => {
      if (evt.target.tagName === 'IMG' && editable.contains(evt.target)) {
        selectImage(evt.target);
      } else if (!(imageHandles && imageHandles.contains(evt.target))) {
        clearImageSelection();
      }
    });

    // A native drag relocates the image elsewhere in the content; handles drawn for its old spot
    // would be left stale (and are only meaningful while actually selected via a click anyway).
    editable.addEventListener('dragstart', (evt) => {
      if (evt.target.tagName === 'IMG') clearImageSelection();
    });

    document.addEventListener('mousedown', (evt) => {
      if (evt.target.dataset && evt.target.dataset.corner && selectedImage) {
        evt.preventDefault();
        const ratio = selectedImage.naturalWidth && selectedImage.naturalHeight
          ? selectedImage.naturalWidth / selectedImage.naturalHeight
          : selectedImage.offsetWidth / selectedImage.offsetHeight;
        resizeDrag = {
          corner: evt.target.dataset.corner, startX: evt.clientX, startY: evt.clientY,
          origW: selectedImage.offsetWidth, origH: selectedImage.offsetHeight, ratio,
        };
      }
    });

    document.addEventListener('mousemove', (evt) => {
      if (!resizeDrag || !selectedImage) return;
      const dx = evt.clientX - resizeDrag.startX;
      const dy = evt.clientY - resizeDrag.startY;
      const MIN = 10;
      const { corner, origW, origH, ratio } = resizeDrag;
      let w = origW;
      let hgt = origH;
      if (corner === 'se') { w = origW + dx; hgt = origH + dy; }
      else if (corner === 'sw') { w = origW - dx; hgt = origH + dy; }
      else if (corner === 'ne') { w = origW + dx; hgt = origH - dy; }
      else { w = origW - dx; hgt = origH - dy; } // nw
      w = Math.max(MIN, w);
      hgt = Math.max(MIN, hgt);
      if (evt.shiftKey && ratio) {
        if (Math.abs(w - origW) >= Math.abs(hgt - origH)) hgt = w / ratio;
        else w = hgt * ratio;
      }
      selectedImage.style.width = `${Math.round(w)}px`;
      selectedImage.style.height = `${Math.round(hgt)}px`;
      positionImageHandles();
    });

    document.addEventListener('mouseup', () => {
      if (resizeDrag) {
        resizeDrag = null;
        onChange(editable.innerHTML);
      }
    });

    rteRoot.append(toolbar, editable, sourceTextarea);
    return rteRoot;
  }

  renderTooltipSection(area) {
    const t = this.t;
    const tt = area.tooltip;
    const refresh = () => {
      this.commit();
    };

    const rte = this.createMiniRte(resolveTooltipContent(area), (html) => {
      area.tooltipContent = html;
      refresh();
    });

    const style = h('select', { class: 'form-select form-control' }, BORDER_STYLES.map((v) => h('option', { value: v, text: t.styles[v], selected: v === tt.borderStyle })));
    style.addEventListener('input', () => { tt.borderStyle = style.value; refresh(); });

    const width = h('input', { type: 'number', class: 'form-control', min: 0, max: 50, value: tt.borderWidth });
    width.addEventListener('input', () => { tt.borderWidth = Math.max(0, Math.min(50, parseInt(width.value, 10) || 0)); refresh(); });

    const radius = h('input', { type: 'number', class: 'form-control', min: 0, max: 200, value: tt.borderRadius });
    radius.addEventListener('input', () => { tt.borderRadius = Math.max(0, Math.min(200, parseInt(radius.value, 10) || 0)); refresh(); });

    const opacity = h('input', { type: 'number', class: 'form-control', min: 0, max: 100, step: 5, value: tt.backgroundOpacity });
    opacity.addEventListener('input', () => { tt.backgroundOpacity = Math.max(0, Math.min(100, parseInt(opacity.value, 10) || 0)); refresh(); });

    const padding = h('input', { type: 'number', class: 'form-control', min: 0, max: 100, value: tt.padding });
    padding.addEventListener('input', () => { tt.padding = Math.max(0, Math.min(100, parseInt(padding.value, 10) || 0)); refresh(); });

    const fileInput = h('input', { type: 'file', accept: '.jpg,.jpeg,.png,.gif,.webp,image/*', hidden: true });
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) this.uploadTooltipImage(area, fileInput.files[0]);
    });
    const uploadBtn = h('button', { type: 'button', class: 'btn btn-default btn-sm', text: `📷 ${t.upload}` });
    uploadBtn.addEventListener('click', () => fileInput.click());
    const bgWrap = h('span', { class: 'mm-ime__bg' });
    if (tt.backgroundImage && this.fileUrls[tt.backgroundImage]) bgWrap.append(h('img', { class: 'mm-ime__thumb', src: this.fileUrls[tt.backgroundImage], alt: '' }));
    bgWrap.append(uploadBtn, fileInput);
    if (tt.backgroundImage) {
      const removeBtn = h('button', { type: 'button', class: 'btn btn-default btn-sm', text: t.removeImage });
      removeBtn.addEventListener('click', () => { tt.backgroundImage = ''; this.commit(); this.renderPanel(); });
      bgWrap.append(removeBtn);
    }

    const positionSelect = h('select', { class: 'form-select form-control' }, TOOLTIP_POSITION_MODES.map((v) => h('option', { value: v, text: t['tooltipPosition' + v[0].toUpperCase() + v.slice(1)], selected: v === tt.positionMode })));
    positionSelect.addEventListener('input', () => { tt.positionMode = positionSelect.value; this.commit(); this.renderPanel(); });

    const posField = (labelText, value, onChange) => {
      const input = h('input', { type: 'number', class: 'form-control', step: 1, value });
      input.addEventListener('input', () => { onChange(parseInt(input.value, 10) || 0); this.commit(); });
      return this.row(labelText, input);
    };

    const positionFields = (() => {
      if (tt.positionMode === 'fixed') {
        const relativeToSelect = h(
          'select',
          { class: 'form-select form-control' },
          TOOLTIP_FIXED_RELATIVE_TO.map((v) => h('option', { value: v, text: t['tooltipRelativeTo' + v[0].toUpperCase() + v.slice(1)], selected: v === tt.fixedRelativeTo })),
        );
        relativeToSelect.addEventListener('input', () => { tt.fixedRelativeTo = relativeToSelect.value; this.commit(); });
        return h('div', { class: 'mm-ime__grid' }, [
          this.row(t.tooltipRelativeTo, relativeToSelect),
          posField(t.tooltipFixedX, tt.fixedX, (v) => { tt.fixedX = v; }),
          posField(t.tooltipFixedY, tt.fixedY, (v) => { tt.fixedY = v; }),
        ]);
      }
      if (tt.positionMode === 'document') {
        return h('div', { class: 'mm-ime__grid' }, [
          posField(t.tooltipDocumentX, tt.documentX, (v) => { tt.documentX = v; }),
          posField(t.tooltipDocumentY, tt.documentY, (v) => { tt.documentY = v; }),
          h('small', { class: 'mm-ime__muted', text: t.tooltipDocumentHelp }),
        ]);
      }
      return h('div', { class: 'mm-ime__grid' }, [
        posField(t.tooltipOffsetX, tt.offsetX, (v) => { tt.offsetX = v; }),
        posField(t.tooltipOffsetY, tt.offsetY, (v) => { tt.offsetY = v; }),
      ]);
    })();

    const zIndexInput = h('input', { type: 'number', class: 'form-control', step: 1, value: tt.zIndex });
    zIndexInput.addEventListener('input', () => { tt.zIndex = parseInt(zIndexInput.value, 10) || 0; this.commit(); });

    const sizeField = (value, onChange) => {
      const input = h('input', { type: 'number', class: 'form-control', min: 0, step: 1, placeholder: t.tooltipSizeAuto, value: value === null ? '' : value });
      input.addEventListener('input', () => { onChange(input.value === '' ? null : Math.max(0, parseInt(input.value, 10) || 0)); this.commit(); });
      return input;
    };
    const widthInput = sizeField(tt.width, (v) => { tt.width = v; });
    const heightInput = sizeField(tt.height, (v) => { tt.height = v; });

    const section = h('details', { class: 'mm-ime__tooltip-box', open: this.openStates.has('tooltip') }, [h('summary', { text: t.tooltip })]);
    section.addEventListener('toggle', () => (section.open ? this.openStates.add('tooltip') : this.openStates.delete('tooltip')));
    section.append(
      h('div', { class: 'mm-ime__row' }, [h('span', { class: 'mm-ime__label', text: t.tooltipText }), rte]),
      h('div', { class: 'mm-ime__grid' }, [
        this.row(t.color, this.colorControl(tt.borderColor, (v) => { tt.borderColor = v; refresh(); })),
        this.row(t.style, style),
        this.row(t.width, width),
        this.row(t.tooltipRadius, radius),
        this.row(t.bgColor, this.colorControl(tt.backgroundColor, (v) => { tt.backgroundColor = v; refresh(); })),
        this.row(t.bgOpacity, opacity),
        this.row(t.tooltipPadding, padding),
        this.row(t.tooltipWidth, widthInput),
        this.row(t.tooltipHeight, heightInput),
        h('div', { class: 'mm-ime__row' }, [h('span', { class: 'mm-ime__label', text: t.bgImage }), bgWrap]),
        this.row(t.tooltipPosition, positionSelect),
        this.row(t.tooltipZIndex, zIndexInput, t.tooltipZIndexHelp),
      ]),
      positionFields,
    );

    return section;
  }

  async uploadTooltipImage(area, file) {
    try {
      const data = await this.upload(file);
      area.tooltip.backgroundImage = data.identifier;
      this.commit();
      this.renderPanel();
    } catch (e) {
      this.setStatus(e.message || String(e), true);
    }
  }

  ensureCanvasTooltip() {
    if (!this.canvasTooltipEl) {
      this.canvasTooltipEl = h('div', { class: 'mm-ime__canvas-tooltip' });
      document.body.appendChild(this.canvasTooltipEl);
    }
    return this.canvasTooltipEl;
  }

  /** Live, correctly-positioned preview of an area's tooltip while hovering it in select mode. */
  showCanvasTooltip(area, evt) {
    const content = resolveTooltipContent(area);
    if (this.tool !== 'select' || this.drag || !content) return;
    const el = this.ensureCanvasTooltip();
    el.innerHTML = content;
    const tt = area.tooltip;
    el.style.border = tt.borderWidth > 0 && tt.borderStyle !== 'none' && tt.borderColor ? `${tt.borderWidth}px ${tt.borderStyle} ${tt.borderColor}` : 'none';
    el.style.borderRadius = `${tt.borderRadius}px`;
    el.style.padding = `${tt.padding}px`;
    el.style.backgroundColor = tt.backgroundColor ? hexToRgba(tt.backgroundColor, tt.backgroundOpacity) : 'transparent';
    if (tt.backgroundImage && this.fileUrls[tt.backgroundImage]) {
      el.style.backgroundImage = `url("${this.fileUrls[tt.backgroundImage]}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
    } else {
      el.style.backgroundImage = 'none';
    }
    el.style.width = tt.width ? `${tt.width}px` : '';
    el.style.height = tt.height ? `${tt.height}px` : '';
    el.style.maxWidth = tt.width ? 'none' : '';
    el.style.overflow = tt.height ? 'hidden' : '';
    el.style.display = 'block';
    el.style.zIndex = String(tt.zIndex);
    this.moveCanvasTooltip(area, evt);
  }

  moveCanvasTooltip(area, evt) {
    const el = this.canvasTooltipEl;
    if (!el || el.style.display === 'none' || !resolveTooltipContent(area)) return;
    const areaRect = (this.nodes.get(area.id) || {}).g?.getBoundingClientRect() || this.svg.getBoundingClientRect();
    const anchorRect = area.tooltip.fixedRelativeTo === 'image' ? this.svg.getBoundingClientRect() : areaRect;
    const size = el.getBoundingClientRect();
    const pos = computeTooltipPosition(
      area.tooltip,
      anchorRect,
      { x: evt.clientX, y: evt.clientY },
      { width: size.width, height: size.height },
      { width: window.innerWidth, height: window.innerHeight },
    );
    el.style.position = pos.positioning;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
  }

  hideCanvasTooltip() {
    if (this.canvasTooltipEl) this.canvasTooltipEl.style.display = 'none';
  }

  /* -------------------------------------------------------------- pointer */

  toSvg(evt) {
    const pt = this.svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = this.svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: Math.max(0, Math.min(this.W, p.x)), y: Math.max(0, Math.min(this.H, p.y)) };
  }

  /**
   * Mouse position converted into a rotated shape's own (unrotated) local coordinate space, using
   * that group's live CTM - so resize handles and point insertion work correctly regardless of the
   * area's current rotation, without any manual trigonometry.
   */
  toLocal(evt, groupEl) {
    const ctm = groupEl && groupEl.getScreenCTM();
    if (!ctm) return this.toSvg(evt);
    const pt = this.svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  defaultName() {
    const used = new Set(this.areas.map((a) => a.name));
    let n = this.areas.length + 1;
    while (used.has(`${this.t.defaultName} ${n}`)) n += 1;
    return `${this.t.defaultName} ${n}`;
  }

  /** Moves all given items by dx/dy, limited so that the group stays inside the image. */
  moveAreas(items, box, dx, dy) {
    const d = clampDelta(box, dx, dy, this.W, this.H);
    items.forEach(({ area, orig }) => {
      area.coords = translate(area.shape, orig, d.dx, d.dy);
      const entry = this.nodes.get(area.id);
      if (entry) {
        Object.values(entry.layers).forEach((el) => this.applyGeometry(el, area));
        this.applyRotation(entry.g, area);
      }
    });
    this.renderOverlay();
    return Math.abs(d.dx) + Math.abs(d.dy) > 0;
  }

  onPointerDown(evt) {
    if (evt.button !== 0) return;
    evt.preventDefault();
    this.svg.focus({ preventScroll: true });
    const p = this.toSvg(evt);
    const capture = () => {
      try { this.svg.setPointerCapture(evt.pointerId); } catch { /* ignore */ }
    };

    if (this.tool === 'select') {
      const single = this.selected;
      const rotateHandle = evt.target.closest && evt.target.closest('[data-rotate-handle]');
      if (rotateHandle && single) {
        const { cx, cy } = computeCenter(single.shape, single.coords);
        const startAngle = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI;
        this.drag = { type: 'rotate', area: single, cx, cy, startAngle, origRotation: single.rotation };
        capture();
        return;
      }

      const handle = evt.target.closest && evt.target.closest('[data-handle]');
      if (handle && single) {
        const entry = this.nodes.get(single.id);
        this.drag = { type: 'handle', index: parseInt(handle.dataset.handle, 10), area: single, orig: [...single.coords], groupEl: entry ? entry.g : null };
        capture();
        return;
      }

      const additive = evt.shiftKey || evt.ctrlKey || evt.metaKey;
      const node = evt.target.closest && evt.target.closest('[data-id]');
      if (node) {
        const id = node.dataset.id;
        if (additive) {
          this.toggleSelection(id);
          return;
        }
        const wasSelected = this.selection.includes(id);
        if (!wasSelected) this.setSelection([id]);
        const items = this.selectedAreas.map((area) => ({ area, orig: [...area.coords] }));
        this.drag = {
          type: 'move',
          start: p,
          items,
          box: unionBox(items.map(({ area }) => bbox(area.shape, area.coords))),
          moved: false,
          // plain click on an already selected area of a multi selection -> reduce to that area
          collapseTo: wasSelected && this.selection.length > 1 ? id : null,
        };
        capture();
        return;
      }

      // empty canvas: start a selection box
      this.drag = { type: 'marquee', start: p, additive, base: additive ? [...this.selection] : [], rect: null };
      if (!additive && this.selection.length) this.setSelection([]);
      capture();
      return;
    }

    if (this.tool === 'poly') {
      if (!this.polyActive) {
        this.lastPolyClick = { t: performance.now(), x: p.x, y: p.y };
        this.polyActive = true;
        this.draft = { shape: 'poly', coords: [p.x, p.y] };
      } else {
        const now = performance.now();
        const prev = this.lastPolyClick;
        this.lastPolyClick = { t: now, x: p.x, y: p.y };
        if (prev && now - prev.t < 400 && Math.hypot(p.x - prev.x, p.y - prev.y) < 6 * this.k) {
          this.finishPoly();
          return;
        }
        const pts = flatToPoints(this.draft.coords);
        const first = pts[0];
        const last = pts[pts.length - 1];
        if (pts.length >= 3 && Math.hypot(p.x - first.x, p.y - first.y) < 10 * this.k) {
          this.finishPoly();
          return;
        }
        if (Math.hypot(p.x - last.x, p.y - last.y) < 2 * this.k) return;
        this.draft.coords.push(p.x, p.y);
      }
      this.renderDraft();
      return;
    }

    const coords = { rect: [p.x, p.y, p.x, p.y], circle: [p.x, p.y, 0], freeform: [p.x, p.y] }[this.tool];
    this.draft = { shape: this.tool, coords };
    this.drag = { type: 'draw' };
    capture();
    this.renderDraft();
  }

  onPointerMove(evt) {
    if (!this.drag) return;
    const p = this.toSvg(evt);
    const drag = this.drag;

    if (drag.type === 'marquee') {
      drag.rect = { minX: Math.min(drag.start.x, p.x), minY: Math.min(drag.start.y, p.y), maxX: Math.max(drag.start.x, p.x), maxY: Math.max(drag.start.y, p.y) };
      this.renderOverlay();
      return;
    }

    if (drag.type === 'move') {
      if (this.moveAreas(drag.items, drag.box, p.x - drag.start.x, p.y - drag.start.y)) drag.moved = true;
      return;
    }

    if (drag.type === 'draw') {
      const d = this.draft;
      if (d.shape === 'rect') {
        d.coords[2] = p.x;
        d.coords[3] = p.y;
      } else if (d.shape === 'circle') {
        d.coords[2] = Math.hypot(p.x - d.coords[0], p.y - d.coords[1]);
      } else {
        const n = d.coords.length;
        if (Math.hypot(p.x - d.coords[n - 2], p.y - d.coords[n - 1]) >= 1.5 * this.k) d.coords.push(p.x, p.y);
      }
      this.renderDraft();
      return;
    }

    if (drag.type === 'rotate') {
      const angle = (Math.atan2(p.y - drag.cy, p.x - drag.cx) * 180) / Math.PI;
      const delta = angle - drag.startAngle;
      const raw = drag.origRotation + delta;
      drag.area.rotation = normalizeAngle(evt.shiftKey ? Math.round(raw / 15) * 15 : raw);
      this.updateShapeNode(drag.area);
      return;
    }

    if (drag.type === 'handle') {
      const { area } = drag;
      const o = drag.orig;
      const local = this.toLocal(evt, drag.groupEl);
      if (area.shape === 'rect') {
        // corners: 0 top-left, 1 top-right, 2 bottom-right, 3 bottom-left; the opposite corner stays fixed
        const [x1, y1, x2, y2] = normalizeRect(o);
        area.coords = [[local.x, local.y, x2, y2], [x1, local.y, local.x, y2], [x1, y1, local.x, local.y], [local.x, y1, x2, local.y]][drag.index];
      } else if (area.shape === 'circle') {
        area.coords = [o[0], o[1], Math.hypot(local.x - o[0], local.y - o[1])];
      } else {
        area.coords = [...o];
        area.coords[drag.index * 2] = local.x;
        area.coords[drag.index * 2 + 1] = local.y;
      }
      this.updateShapeNode(area);
    }
  }

  onPointerUp(evt) {
    if (!this.drag) return;
    const drag = this.drag;
    this.drag = null;
    try { this.svg.releasePointerCapture(evt.pointerId); } catch { /* ignore */ }

    if (drag.type === 'marquee') {
      if (drag.rect && drag.rect.maxX - drag.rect.minX + (drag.rect.maxY - drag.rect.minY) > 4 * this.k) {
        const hit = this.areas.filter((a) => a.coords.length >= 2 && boxesIntersect(bbox(a.shape, a.coords), drag.rect)).map((a) => a.id);
        this.setSelection([...new Set([...drag.base, ...hit])]);
      } else {
        this.renderOverlay();
      }
      return;
    }

    if (drag.type === 'move') {
      if (!drag.moved) {
        if (drag.collapseTo) this.setSelection([drag.collapseTo]);
        return; // plain click: selection only
      }
      this.commit();
      return;
    }

    if (drag.type === 'draw') {
      this.commitDraft();
      return;
    }

    if (drag.type === 'rotate') {
      this.commit();
      this.renderPanel();
      return;
    }

    if (drag.type === 'handle') {
      const { area } = drag;
      if (area.shape === 'rect') area.coords = normalizeRect(area.coords);
      this.commit();
      this.renderAll();
    }
  }

  /** Validates the drawn draft and adds it as a new area. */
  commitDraft() {
    const d = this.draft;
    this.draft = null;
    this.polyActive = false;
    this.tool = 'select';
    if (!d) return;

    let coords = d.coords;
    let ok = true;
    if (d.shape === 'rect') {
      coords = normalizeRect(coords);
      ok = coords[2] - coords[0] >= 4 && coords[3] - coords[1] >= 4;
    } else if (d.shape === 'circle') {
      ok = coords[2] >= 3;
    } else {
      const pts = d.shape === 'freeform' ? simplifyPath(flatToPoints(coords), 1.5 * this.k) : flatToPoints(coords);
      ok = pts.length >= 3;
      coords = pointsToFlat(pts);
    }

    if (ok) {
      const area = createArea(d.shape, coords, this.defaultName());
      this.areas.push(area);
      this.selection = [area.id];
      this.commit();
    }
    this.renderAll();
  }

  finishPoly() {
    if (this.polyActive) this.commitDraft();
  }

  /**
   * Double-click on the outline of the selected polygon/freeform area inserts a new, draggable
   * point there (on the edge closest to the click, converted into the shape's own coordinate
   * space so this also works correctly on a rotated shape).
   */
  tryInsertPoint(evt) {
    const area = this.selected;
    if (!area || (area.shape !== 'poly' && area.shape !== 'freeform')) return;

    const entry = this.nodes.get(area.id);
    const p = entry ? this.toLocal(evt, entry.g) : this.toSvg(evt);
    const pts = flatToPoints(area.coords);
    if (pts.length < 2) return;

    let bestIndex = 0;
    let bestDistance = Infinity;
    let bestPoint = null;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const projected = closestPointOnSegment(p, a, b);
      const distance = Math.hypot(p.x - projected.x, p.y - projected.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
        bestPoint = projected;
      }
    }

    // Only insert when the double-click actually landed reasonably close to the outline, so a
    // double-click elsewhere on the shape (or a mis-click) does not silently add a stray point.
    if (bestDistance > 14 * this.k) return;

    pts.splice(bestIndex + 1, 0, bestPoint);
    area.coords = pointsToFlat(pts);
    this.updateShapeNode(area);
    this.commit();
  }

  cancelDrawing() {
    this.draft = null;
    this.polyActive = false;
    this.tool = 'select';
    this.renderAll();
  }

  deleteSelected() {
    const list = this.selectedAreas;
    if (!list.length) return;
    const ids = list.map((a) => a.id);
    this.areas = this.areas.filter((a) => !ids.includes(a.id));
    this.selection = [];
    this.commit();
    this.renderAll();
  }

  onKeyDown(evt) {
    if (evt.key === 'Enter' && this.polyActive) {
      evt.preventDefault();
      this.finishPoly();
    } else if (evt.key === 'Escape') {
      if (this.polyActive || this.tool !== 'select') this.cancelDrawing();
      else this.setSelection([]);
    } else if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'a' && this.tool === 'select') {
      evt.preventDefault();
      this.setSelection(this.areas.map((a) => a.id));
    } else if ((evt.key === 'Delete' || evt.key === 'Backspace') && this.tool === 'select') {
      evt.preventDefault();
      this.deleteSelected();
    } else if (this.tool === 'select' && this.selection.length && evt.key.startsWith('Arrow')) {
      evt.preventDefault();
      const step = evt.shiftKey ? 10 : 1;
      const dx = { ArrowLeft: -step, ArrowRight: step }[evt.key] || 0;
      const dy = { ArrowUp: -step, ArrowDown: step }[evt.key] || 0;
      const items = this.selectedAreas.map((area) => ({ area, orig: [...area.coords] }));
      this.moveAreas(items, unionBox(items.map(({ area }) => bbox(area.shape, area.coords))), dx, dy);
      this.commit();
    }
  }
}

if (!customElements.get('mm-imagemap-editor')) {
  customElements.define('mm-imagemap-editor', MmImageMapEditor);
}
