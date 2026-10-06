<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\Domain\Model;

/**
 * Value object: one area of the JSON document stored in the imagemap record, plus the
 * public URLs of its background images. All values are sanitized here, because they
 * end up in CSS/HTML of the frontend output.
 */
final class Area
{
    public const SHAPE_RECT = 'rect';
    public const SHAPE_CIRCLE = 'circle';
    public const SHAPE_POLY = 'poly';
    public const SHAPE_FREEFORM = 'freeform';

    public const SHAPES = [self::SHAPE_RECT, self::SHAPE_CIRCLE, self::SHAPE_POLY, self::SHAPE_FREEFORM];
    public const STATES = ['normal', 'hover', 'active'];

    private const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'none'];
    private const BACKGROUND_SIZES = ['stretch', 'contain', 'cover', 'auto', 'custom'];
    private const SIZE_UNITS = ['px', '%'];

    /**
     * @param array<string, mixed> $data
     * @param array<string, array{url: string, width: int, height: int}> $imageUrls state => background-image data
     */
    private function __construct(private readonly array $data, private readonly array $imageUrls)
    {
    }

    /**
     * @param array<string, mixed> $data
     * @param array<string, array{url: string, width: int, height: int}> $imageUrls
     */
    public static function fromArray(array $data, array $imageUrls = []): self
    {
        return new self($data, $imageUrls);
    }

    /**
     * Own identifier of the area, independent of the title.
     */
    public function getName(): string
    {
        return mb_substr(trim((string)preg_replace('/[\x00-\x1F\x7F]/u', '', (string)($this->data['name'] ?? ''))), 0, 100);
    }

    public function getShape(): string
    {
        $shape = (string)($this->data['shape'] ?? self::SHAPE_RECT);

        return in_array($shape, self::SHAPES, true) ? $shape : self::SHAPE_RECT;
    }

    /**
     * Rotation in degrees (0-360), applied around the area's own center. Mirrors
     * geometry.js normalizeAngle(): out-of-range/invalid values are wrapped/reset, never dropped.
     */
    public function getRotation(): float
    {
        $rotation = $this->data['rotation'] ?? 0;
        if (!is_numeric($rotation)) {
            return 0.0;
        }
        $wrapped = fmod((float)$rotation, 360.0);

        return $wrapped < 0 ? $wrapped + 360.0 : $wrapped;
    }

    /**
     * rect: x1,y1,x2,y2 | circle: cx,cy,r | poly/freeform: x1,y1,x2,y2,...
     * All values are pixels of the original image.
     *
     * @return float[]
     */
    public function getCoordinateList(): array
    {
        $raw = trim((string)($this->data['coords'] ?? ''));
        if ($raw === '') {
            return [];
        }

        $values = [];
        foreach (explode(',', $raw) as $part) {
            $part = trim($part);
            if (is_numeric($part)) {
                $values[] = (float)$part;
            }
        }

        return $values;
    }

    public function getLink(): string
    {
        return trim((string)($this->data['link'] ?? ''));
    }

    public function getLinkTitle(): string
    {
        return trim((string)($this->data['title'] ?? ''));
    }

    private const TOOLTIP_ALLOWED_TAGS = [
        'b', 'strong', 'i', 'em', 'u', 'a', 'br', 'ul', 'ol', 'li', 'p', 'span',
        'h1', 'h2', 'h3', 'h4', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'font',
    ];

    /**
     * Attributes kept on allowed tags (beyond "style", which every tag may carry but whose
     * VALUE is separately reduced to a safe color/font-family allowlist - see sanitizeStyleValue()).
     */
    private const TOOLTIP_ALLOWED_ATTRIBUTES = [
        'a' => ['href', 'title', 'target'],
        'img' => ['src', 'alt', 'title', 'width', 'height'],
        'font' => ['color', 'face'],
    ];

    private const TOOLTIP_ALLOWED_STYLE_PROPERTIES = [
        'color', 'font-family', 'width', 'height',
        'border-width', 'border-style', 'border-color', 'border-collapse',
        'padding', 'margin',
    ];

    /**
     * Tooltip content as sanitized HTML, authored via the backend's small rich-text editor
     * (headings, bold/italic/underline, font color/family, links, images, tables, source view).
     * Areas created before that editor existed only had a plain "title" field - that is used
     * (escaped) as a fallback so old tooltips keep working.
     *
     * Sanitizing rules: only an allowlist of tags survives (everything else is unwrapped - the
     * tag is removed but its text/children are kept); only an allowlist of attributes per tag
     * survives; "style" is kept everywhere but reduced to color/font-family declarations only;
     * javascript: in href/src and any event handler attribute are removed regardless of tag.
     */
    public function getTooltipContent(): string
    {
        $html = trim((string)($this->data['tooltipContent'] ?? ''));
        if ($html === '') {
            $legacy = $this->getLinkTitle();

            return $legacy !== '' ? htmlspecialchars($legacy) : '';
        }

        return $this->sanitizeTooltipHtml($html);
    }

    private function sanitizeTooltipHtml(string $html): string
    {
        // <script>/<style> need to go entirely (tag AND content) - a DOM walk below would
        // otherwise keep their text content once the (disallowed) wrapping tag is unwrapped.
        $html = (string)preg_replace('#<(script|style)\b[^>]*>.*?</\1>#is', '', $html);

        $dom = new \DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $loaded = $dom->loadHTML(
            '<?xml encoding="utf-8"?><div>' . $html . '</div>',
            LIBXML_NOERROR | LIBXML_NOWARNING
        );
        libxml_use_internal_errors($previous);

        $container = $loaded ? $dom->getElementsByTagName('div')->item(0) : null;
        if ($container === null) {
            // Malformed input DOMDocument could not parse at all: fail safe to empty rather than
            // risk passing anything unsanitized through.
            return '';
        }

        $this->sanitizeDomNode($container);

        $result = '';
        foreach (iterator_to_array($container->childNodes) as $child) {
            $result .= $dom->saveHTML($child);
        }

        // Defense in depth, in case an unusual encoding ever slipped past the attribute allowlist.
        $result = (string)preg_replace('/((?:href|src)\s*=\s*)(["\']?)\s*javascript:[^"\'>]*/i', '$1$2#', $result);

        return trim($result);
    }

    private function sanitizeDomNode(\DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if (!($child instanceof \DOMElement)) {
                continue;
            }

            $this->sanitizeDomNode($child);

            $tag = strtolower($child->tagName);
            if (!in_array($tag, self::TOOLTIP_ALLOWED_TAGS, true)) {
                // Unwrap: drop the tag itself but keep its already-sanitized children/text.
                while ($child->firstChild !== null) {
                    $node->insertBefore($child->firstChild, $child);
                }
                $node->removeChild($child);
                continue;
            }

            $allowedAttributes = self::TOOLTIP_ALLOWED_ATTRIBUTES[$tag] ?? [];
            foreach (iterator_to_array($child->attributes ?? []) as $attribute) {
                $name = strtolower($attribute->name);
                if ($name === 'style') {
                    $clean = $this->sanitizeStyleValue($attribute->value);
                    if ($clean === '') {
                        $child->removeAttribute('style');
                    } else {
                        $child->setAttribute('style', $clean);
                    }
                    continue;
                }
                if (!in_array($name, $allowedAttributes, true)) {
                    $child->removeAttribute($attribute->name);
                }
            }
        }
    }

    private function sanitizeStyleValue(string $style): string
    {
        $kept = [];
        foreach (explode(';', $style) as $declaration) {
            if (!str_contains($declaration, ':')) {
                continue;
            }
            [$property, $value] = array_map('trim', explode(':', $declaration, 2));
            $property = strtolower($property);
            $lowerValue = strtolower($value);
            if (
                in_array($property, self::TOOLTIP_ALLOWED_STYLE_PROPERTIES, true)
                && $value !== ''
                && !str_contains($lowerValue, 'url(')
                && !str_contains($lowerValue, 'expression(')
            ) {
                $kept[] = $property . ': ' . $value;
            }
        }

        return implode('; ', $kept);
    }

    /**
     * Plain-text version of the tooltip content, for contexts that cannot render HTML
     * (the link's aria-label - screen readers would read markup literally otherwise).
     */
    public function getTooltipPlainText(): string
    {
        $text = html_entity_decode(strip_tags($this->getTooltipContent()), ENT_QUOTES);

        return trim((string)preg_replace('/\s+/', ' ', $text));
    }

    public function getCssClass(): string
    {
        return trim((string)preg_replace('/[^A-Za-z0-9_\- ]/', '', (string)($this->data['cssClass'] ?? '')));
    }

    /**
     * "Own Style": free-text CSS declarations (e.g. "opacity: 0.8;"), authored via the backend
     * editor's own-style textarea, applied to this whole area (not per Normal/Hover/Mousedown).
     * Unlike the tooltip's rich-text HTML, this is not reduced to an allowlist - it is meant as
     * an escape hatch for anything the structured controls do not cover, and it lands in a CSS
     * context (a <style> element), not HTML, so the same markup-injection risk does not apply.
     * The one thing that still matters: a <style> element's content is raw text up to the first
     * literal "</style" - letting that through would terminate it early and let arbitrary HTML/
     * script follow in the page. That (and the classic, now largely dead, CSS script-execution
     * vectors) is what gets neutralized; everything else passes through unrestricted.
     */
    public function getOwnStyle(): string
    {
        $raw = trim((string)($this->data['ownStyle'] ?? ''));
        if ($raw === '') {
            return '';
        }

        $clean = (string)preg_replace('#</\s*style#i', '', $raw);
        $clean = (string)preg_replace('/expression\s*\(/i', '', $clean);
        $clean = (string)preg_replace('/javascript\s*:/i', '', $clean);

        return trim($clean);
    }

    /**
     * backgroundOpacity: 0-100 (percent) or null = not set (normal: fully opaque, hover/active: unchanged).
     * backgroundSize/preserveAspectRatio/backgroundRepeat mirror the CSS-like options of the
     * backend editor (see Resources/Public/JavaScript/geometry.js resolveImagePlacement()).
     *
     * @return array{
     *     borderColor: string, borderStyle: string, borderWidth: int, backgroundColor: string, backgroundOpacity: int|null,
     *     backgroundSize: string, backgroundWidth: float|null, backgroundWidthUnit: string, backgroundHeight: float|null, backgroundHeightUnit: string,
     *     preserveAspectRatio: bool, backgroundRepeat: bool, repeatWidth: float|null, repeatHeight: float|null
     * }
     */
    public function getState(string $state): array
    {
        $source = $this->data['states'][$state] ?? null;
        $imageDefaults = [
            'backgroundSize' => 'stretch',
            'backgroundWidth' => null,
            'backgroundWidthUnit' => 'px',
            'backgroundHeight' => null,
            'backgroundHeightUnit' => 'px',
            'preserveAspectRatio' => false,
            'backgroundRepeat' => false,
            'repeatWidth' => null,
            'repeatHeight' => null,
        ];

        if (!is_array($source)) {
            // Same defaults as the editor
            return ($state === 'normal'
                ? ['borderColor' => '#ff8000', 'borderStyle' => 'solid', 'borderWidth' => 2, 'backgroundColor' => '', 'backgroundOpacity' => null]
                : ['borderColor' => '', 'borderStyle' => 'solid', 'borderWidth' => 0, 'backgroundColor' => '', 'backgroundOpacity' => null]
            ) + $imageDefaults;
        }

        $color = (string)($source['borderColor'] ?? '');
        $style = (string)($source['borderStyle'] ?? 'solid');
        $backgroundColor = (string)($source['backgroundColor'] ?? '');
        $opacity = $source['backgroundOpacity'] ?? null;
        $size = (string)($source['backgroundSize'] ?? 'stretch');
        $widthUnit = (string)($source['backgroundWidthUnit'] ?? 'px');
        $heightUnit = (string)($source['backgroundHeightUnit'] ?? 'px');

        return [
            'borderColor' => preg_match('/^#[0-9a-fA-F]{3,8}$/', $color) === 1 ? $color : '',
            'borderStyle' => in_array($style, self::BORDER_STYLES, true) ? $style : 'solid',
            'borderWidth' => max(0, min(50, (int)($source['borderWidth'] ?? 0))),
            'backgroundColor' => preg_match('/^#[0-9a-fA-F]{3,8}$/', $backgroundColor) === 1 ? $backgroundColor : '',
            'backgroundOpacity' => ($opacity === null || $opacity === '' || !is_numeric($opacity)) ? null : max(0, min(100, (int)round((float)$opacity))),
            'backgroundSize' => in_array($size, self::BACKGROUND_SIZES, true) ? $size : 'stretch',
            'backgroundWidth' => self::positiveFloatOrNull($source['backgroundWidth'] ?? null),
            'backgroundWidthUnit' => in_array($widthUnit, self::SIZE_UNITS, true) ? $widthUnit : 'px',
            'backgroundHeight' => self::positiveFloatOrNull($source['backgroundHeight'] ?? null),
            'backgroundHeightUnit' => in_array($heightUnit, self::SIZE_UNITS, true) ? $heightUnit : 'px',
            'preserveAspectRatio' => ($source['preserveAspectRatio'] ?? false) === true,
            'backgroundRepeat' => ($source['backgroundRepeat'] ?? false) === true,
            'repeatWidth' => self::positiveFloatOrNull($source['repeatWidth'] ?? null),
            'repeatHeight' => self::positiveFloatOrNull($source['repeatHeight'] ?? null),
        ];
    }

    private static function positiveFloatOrNull(mixed $value): ?float
    {
        if (!is_numeric($value)) {
            return null;
        }
        $float = (float)$value;

        return $float > 0 ? round($float, 2) : null;
    }

    private static function positiveIntOrNull(mixed $value, int $max): ?int
    {
        if (!is_numeric($value)) {
            return null;
        }
        $int = (int)round((float)$value);

        return $int > 0 ? min($int, $max) : null;
    }

    public function getBackgroundImageUrl(string $state): string
    {
        return $this->imageUrls[$state]['url'] ?? '';
    }

    /**
     * Natural pixel size of this state's background image (0/0 if none or unresolvable).
     *
     * @return array{width: int, height: int}
     */
    public function getBackgroundImageSize(string $state): array
    {
        return [
            'width' => (int)($this->imageUrls[$state]['width'] ?? 0),
            'height' => (int)($this->imageUrls[$state]['height'] ?? 0),
        ];
    }

    public function getTooltipImageUrl(): string
    {
        return $this->imageUrls['tooltip']['url'] ?? '';
    }

    /**
     * Mirrors geometry.js normalizeTooltip() exactly, so the editor and the frontend always
     * agree on the effective tooltip style. backgroundImage is the resolved public URL (empty
     * if none), everything else is a validated, ready-to-use value.
     *
     * @return array{
     *     borderColor: string, borderWidth: int, borderRadius: int, borderStyle: string,
     *     backgroundColor: string, backgroundOpacity: int, backgroundImage: string, padding: int,
     *     positionMode: string, offsetX: int, offsetY: int, fixedX: int, fixedY: int,
     *     documentX: int, documentY: int, zIndex: int, fixedRelativeTo: string,
     *     width: int|null, height: int|null
     * }
     */
    public function getTooltip(): array
    {
        $source = $this->data['tooltip'] ?? null;
        $source = is_array($source) ? $source : [];

        $color = (string)($source['borderColor'] ?? '');
        $bgColor = (string)($source['backgroundColor'] ?? '');
        $style = (string)($source['borderStyle'] ?? 'solid');
        $positionMode = (string)($source['positionMode'] ?? 'dynamic');

        $clampInt = static function (mixed $value, int $lo, int $hi, int $fallback): int {
            if (!is_numeric($value)) {
                return $fallback;
            }

            return max($lo, min($hi, (int)round((float)$value)));
        };

        return [
            'borderColor' => preg_match('/^#[0-9a-fA-F]{3,8}$/', $color) === 1 ? $color : '',
            'borderWidth' => $clampInt($source['borderWidth'] ?? null, 0, 50, 0),
            'borderRadius' => $clampInt($source['borderRadius'] ?? null, 0, 200, 4),
            'borderStyle' => in_array($style, self::BORDER_STYLES, true) ? $style : 'solid',
            'backgroundColor' => preg_match('/^#[0-9a-fA-F]{3,8}$/', $bgColor) === 1 ? $bgColor : '',
            'backgroundOpacity' => $clampInt($source['backgroundOpacity'] ?? null, 0, 100, 90),
            'backgroundImage' => $this->getTooltipImageUrl(),
            'padding' => $clampInt($source['padding'] ?? null, 0, 100, 8),
            'positionMode' => in_array($positionMode, ['fixed', 'dynamic', 'document'], true) ? $positionMode : 'dynamic',
            'offsetX' => $clampInt($source['offsetX'] ?? null, -2000, 2000, 12),
            'offsetY' => $clampInt($source['offsetY'] ?? null, -2000, 2000, 12),
            'fixedX' => $clampInt($source['fixedX'] ?? null, -2000, 2000, 0),
            'fixedY' => $clampInt($source['fixedY'] ?? null, -2000, 2000, 0),
            'documentX' => $clampInt($source['documentX'] ?? null, -100000, 100000, 0),
            'documentY' => $clampInt($source['documentY'] ?? null, -100000, 100000, 0),
            'zIndex' => $clampInt($source['zIndex'] ?? null, -999999, 2147483647, 2147483647),
            'fixedRelativeTo' => in_array($source['fixedRelativeTo'] ?? '', ['area', 'image'], true) ? $source['fixedRelativeTo'] : 'area',
            'width' => self::positiveIntOrNull($source['width'] ?? null, 4000),
            'height' => self::positiveIntOrNull($source['height'] ?? null, 4000),
        ];
    }
}
