<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\ViewHelpers;

use Mikelmade\Mminteractive\Domain\Model\Area;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\ConsumableNonce;
use TYPO3\CMS\Core\Security\ContentSecurityPolicy\Directive;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;

/**
 * Renders a single imagemap area as SVG shape (wrapped in a link if configured) plus a
 * scoped <style> block implementing the normal / :hover / :active states.
 */
class AreaViewHelper extends AbstractViewHelper
{
    use ResolvesLinkTrait;

    protected $escapeOutput = false;

    public function initializeArguments(): void
    {
        $this->registerArgument('area', Area::class, 'The area to render', true);
        $this->registerArgument('index', 'int', 'Index used to build a unique DOM id', true);
        $this->registerArgument('domIdPrefix', 'string', 'Prefix for the generated element id', false, 'imagemap-area');
    }

    public function render(): string
    {
        /** @var Area $area */
        $area = $this->arguments['area'];
        $domId = preg_replace('/[^A-Za-z0-9_-]/', '', (string)$this->arguments['domIdPrefix']) . '-' . (int)$this->arguments['index'];

        // Border layer: carries the stroke and receives the mouse events.
        $border = $this->buildShapeMarkup($area, $domId);
        if ($border === '') {
            return '';
        }

        $effectiveByState = [];
        foreach (Area::STATES as $state) {
            $effective = $this->resolveEffectiveImage($area, $state);
            if ($effective['url'] !== '') {
                $effectiveByState[$state] = $effective;
            }
        }
        $needsColor = false;
        foreach (Area::STATES as $state) {
            if ($area->getState($state)['backgroundColor'] !== '') {
                $needsColor = true;
            }
        }

        // Stacking order (like CSS backgrounds): color, then image, then border on top.
        $layers = '';
        if ($needsColor) {
            $layers .= $this->buildShapeMarkup($area, $domId . '-c');
        }
        if ($effectiveByState !== []) {
            $layers .= $this->buildShapeMarkup($area, $domId . '-i');
        }
        $layers .= $border;

        [$href, $target] = $this->resolveLink($area->getLink());
        $defs = $this->buildPatternDefs($effectiveByState, $area, $domId);
        $style = $this->buildStyleMarkup($area, $domId, $effectiveByState, $needsColor, $href !== '');

        $name = $area->getName();
        $tooltipHtml = $area->getTooltipContent();
        $tooltipPlainText = $area->getTooltipPlainText();
        $label = $tooltipPlainText !== '' ? htmlspecialchars($tooltipPlainText) : htmlspecialchars($name);
        $cssClass = htmlspecialchars(trim('imagemap-area ' . $area->getCssClass()));
        $nameAttr = $name !== '' ? ' data-name="' . htmlspecialchars($name) . '"' : '';
        // No native <title> element: the tooltip is now the custom, styleable one built from
        // data-tooltip below (see Resources/Public/JavaScript/frontend-tooltip.js). aria-label
        // still carries the accessible name for screen readers either way (as plain text - markup
        // in the rich-text tooltip would otherwise be read out literally).
        $inner = $layers;

        $tooltipAttrs = '';
        if ($tooltipHtml !== '') {
            $tooltipAttrs = ' data-tooltip-text="' . htmlspecialchars($tooltipHtml, ENT_QUOTES) . '" data-tooltip="'
                . htmlspecialchars((string)json_encode($area->getTooltip(), JSON_UNESCAPED_SLASHES), ENT_QUOTES) . '"';
            GeneralUtility::makeInstance(PageRenderer::class)->loadJavaScriptModule('@mikelmade/mminteractive/frontend-tooltip.js');
        }

        $rotation = $area->getRotation();
        $transformAttr = '';
        if ($rotation !== 0.0) {
            $center = $this->computeCenter($area);
            $n = static fn (float $v): string => ($r = rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.')) === '' ? '0' : $r;
            $transformAttr = ' transform="rotate(' . $n($rotation) . ' ' . $n($center['cx']) . ' ' . $n($center['cy']) . ')"';
        }

        if ($href !== '') {
            $markup = sprintf(
                '<a id="%s-w" href="%s"%s class="%s"%s%s%s%s>%s</a>',
                $domId,
                htmlspecialchars($href),
                $target !== '' ? ' target="' . htmlspecialchars($target) . '"' . ($target === '_blank' ? ' rel="noopener"' : '') : '',
                $cssClass,
                $nameAttr,
                $label !== '' ? ' aria-label="' . $label . '"' : '',
                $transformAttr,
                $tooltipAttrs,
                $inner
            );
        } else {
            $markup = sprintf('<g id="%s-w" class="%s"%s%s%s>%s</g>', $domId, $cssClass, $nameAttr, $transformAttr, $tooltipAttrs, $inner);
        }

        return $defs . $style . $markup;
    }

    private function buildShapeMarkup(Area $area, string $id): string
    {
        $c = $area->getCoordinateList();
        $n = static fn (float $v): string => ($r = rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.')) === '' ? '0' : $r;

        switch ($area->getShape()) {
            case Area::SHAPE_RECT:
                if (count($c) < 4) {
                    return '';
                }

                return sprintf(
                    '<rect id="%s" x="%s" y="%s" width="%s" height="%s" />',
                    $id,
                    $n(min($c[0], $c[2])),
                    $n(min($c[1], $c[3])),
                    $n(abs($c[2] - $c[0])),
                    $n(abs($c[3] - $c[1]))
                );
            case Area::SHAPE_CIRCLE:
                if (count($c) < 3) {
                    return '';
                }

                return sprintf('<circle id="%s" cx="%s" cy="%s" r="%s" />', $id, $n($c[0]), $n($c[1]), $n(max(0.0, $c[2])));
            default: // poly + freeform are both rendered as polygon
                if (count($c) < 6) {
                    return '';
                }
                $points = [];
                for ($i = 0; $i + 1 < count($c); $i += 2) {
                    $points[] = $n($c[$i]) . ',' . $n($c[$i + 1]);
                }

                return sprintf('<polygon id="%s" points="%s" />', $id, implode(' ', $points));
        }
    }

    /**
     * @return array<string, string> state => public URL (only states that have a background image)
     */
    /**
     * Resolves which state's background image is effectively shown for $state, walking the same
     * inheritance chain as the borders/colors: a state with no image of its own shows an earlier
     * state's image - and, since size/aspect/repeat are configured together with the image, that
     * earlier state's own placement settings too (mirrors geometry.js effectiveStyle().bgSourceState).
     *
     * @return array{url: string, sourceState: string}
     */
    private function resolveEffectiveImage(Area $area, string $state): array
    {
        $chain = match ($state) {
            'hover' => ['normal', 'hover'],
            'active' => ['normal', 'hover', 'active'],
            default => ['normal'],
        };

        $url = '';
        $sourceState = 'normal';
        foreach ($chain as $candidate) {
            $candidateUrl = $area->getBackgroundImageUrl($candidate);
            if ($candidateUrl !== '') {
                $url = $candidateUrl;
                $sourceState = $candidate;
            }
        }

        return ['url' => $url, 'sourceState' => $sourceState];
    }

    /**
     * @return array{w: float, h: float}
     */
    private function computeBoundingBox(Area $area): array
    {
        $c = $area->getCoordinateList();

        if ($area->getShape() === Area::SHAPE_RECT && count($c) >= 4) {
            return ['w' => max(1.0, abs($c[2] - $c[0])), 'h' => max(1.0, abs($c[3] - $c[1]))];
        }
        if ($area->getShape() === Area::SHAPE_CIRCLE && count($c) >= 3) {
            return ['w' => max(1.0, $c[2] * 2), 'h' => max(1.0, $c[2] * 2)];
        }

        $xs = [];
        $ys = [];
        for ($i = 0; $i + 1 < count($c); $i += 2) {
            $xs[] = $c[$i];
            $ys[] = $c[$i + 1];
        }
        if ($xs === []) {
            return ['w' => 1.0, 'h' => 1.0];
        }

        return ['w' => max(1.0, max($xs) - min($xs)), 'h' => max(1.0, max($ys) - min($ys))];
    }

    /**
     * Center point an area rotates around: the shape's own geometric center for rect/circle,
     * the bounding-box center for poly/freeform. Mirrors geometry.js computeCenter() exactly.
     *
     * @return array{cx: float, cy: float}
     */
    private function computeCenter(Area $area): array
    {
        $c = $area->getCoordinateList();

        if ($area->getShape() === Area::SHAPE_CIRCLE && count($c) >= 3) {
            return ['cx' => $c[0], 'cy' => $c[1]];
        }
        if ($area->getShape() === Area::SHAPE_RECT && count($c) >= 4) {
            return ['cx' => (min($c[0], $c[2]) + max($c[0], $c[2])) / 2, 'cy' => (min($c[1], $c[3]) + max($c[1], $c[3])) / 2];
        }

        $xs = [];
        $ys = [];
        for ($i = 0; $i + 1 < count($c); $i += 2) {
            $xs[] = $c[$i];
            $ys[] = $c[$i + 1];
        }
        if ($xs === []) {
            return ['cx' => 0.0, 'cy' => 0.0];
        }

        return ['cx' => (min($xs) + max($xs)) / 2, 'cy' => (min($ys) + max($ys)) / 2];
    }

    /**
     * Reference box that backgroundSize percentages/modes are relative to: the tile size when
     * repeating, otherwise the area's own bounding box. Mirrors geometry.js backgroundReferenceBox().
     *
     * @param array<string, mixed> $cfg
     * @return array{w: float, h: float}
     */
    private function backgroundReferenceBox(array $cfg, float $bboxW, float $bboxH, int $naturalW, int $naturalH): array
    {
        if ($cfg['backgroundRepeat']) {
            return [
                'w' => $cfg['repeatWidth'] ?: ($naturalW ?: $bboxW),
                'h' => $cfg['repeatHeight'] ?: ($naturalH ?: $bboxH),
            ];
        }

        return ['w' => $bboxW, 'h' => $bboxH];
    }

    /**
     * The box (same unit as the bbox) the image is placed into. Mirrors geometry.js resolveImageBox().
     *
     * @param array<string, mixed> $cfg
     * @return array{w: float, h: float}
     */
    private function resolveImageBox(array $cfg, float $refW, float $refH, int $naturalW, int $naturalH): array
    {
        return match ($cfg['backgroundSize']) {
            'auto' => ['w' => $naturalW ?: $refW, 'h' => $naturalH ?: $refH],
            'custom' => [
                'w' => $cfg['backgroundWidth'] ? $this->pxOrPercent((float)$cfg['backgroundWidth'], (string)$cfg['backgroundWidthUnit'], $refW) : $refW,
                'h' => $cfg['backgroundHeight'] ? $this->pxOrPercent((float)$cfg['backgroundHeight'], (string)$cfg['backgroundHeightUnit'], $refH) : $refH,
            ],
            // stretch | contain | cover: the box is always the full reference area; preserveAspectRatio
            // (meet/slice/none) decides how the image fits inside it.
            default => ['w' => $refW, 'h' => $refH],
        };
    }

    private function pxOrPercent(float $value, string $unit, float $reference): float
    {
        return $unit === '%' ? ($reference * $value) / 100 : $value;
    }

    /**
     * @param array<string, mixed> $cfg
     */
    private function resolvePreserveAspectRatioAttr(array $cfg): string
    {
        if (!$cfg['preserveAspectRatio']) {
            return 'none';
        }

        return in_array($cfg['backgroundSize'], ['cover', 'stretch'], true) ? 'xMidYMid slice' : 'xMidYMid meet';
    }

    /**
     * Full placement for one state's background image (pattern tile size, and within it the
     * <image>'s x/y/width/height/preserveAspectRatio). Mirrors geometry.js resolveImagePlacement()
     * exactly, so the editor preview and the frontend output always render identically.
     *
     * @param array<string, mixed> $cfg
     * @return array{tileW: float, tileH: float, imgX: float, imgY: float, imgW: float, imgH: float, preserveAspectRatio: string}
     */
    private function resolveImagePlacement(array $cfg, float $bboxW, float $bboxH, int $naturalW, int $naturalH): array
    {
        $ref = $this->backgroundReferenceBox($cfg, $bboxW, $bboxH, $naturalW, $naturalH);
        $box = $this->resolveImageBox($cfg, $ref['w'], $ref['h'], $naturalW, $naturalH);

        return [
            'tileW' => $ref['w'],
            'tileH' => $ref['h'],
            'imgX' => ($ref['w'] - $box['w']) / 2,
            'imgY' => ($ref['h'] - $box['h']) / 2,
            'imgW' => $box['w'],
            'imgH' => $box['h'],
            'preserveAspectRatio' => $this->resolvePreserveAspectRatioAttr($cfg),
        ];
    }

    /**
     * Builds one <pattern> per state whose background image is effectively visible (deduplicated:
     * a state that only inherits an image shares its source state's pattern instead of repeating it).
     *
     * @param array<string, array{url: string, sourceState: string}> $effectiveByState
     */
    private function buildPatternDefs(array $effectiveByState, Area $area, string $domId): string
    {
        $bbox = $this->computeBoundingBox($area);
        $rendered = [];
        $defs = '';

        foreach ($effectiveByState as $effective) {
            $sourceState = $effective['sourceState'];
            if (isset($rendered[$sourceState])) {
                continue;
            }
            $rendered[$sourceState] = true;

            $cfg = $area->getState($sourceState);
            $size = $area->getBackgroundImageSize($sourceState);
            $placement = $this->resolveImagePlacement($cfg, $bbox['w'], $bbox['h'], $size['width'], $size['height']);
            $n = static fn (float $v): string => rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.') ?: '0';

            $patternAttrs = $cfg['backgroundRepeat']
                ? sprintf('patternUnits="userSpaceOnUse" patternContentUnits="userSpaceOnUse" width="%s" height="%s"', $n($placement['tileW']), $n($placement['tileH']))
                : sprintf('patternUnits="objectBoundingBox" patternContentUnits="userSpaceOnUse" width="1" height="1" viewBox="0 0 %s %s" preserveAspectRatio="none"', $n($placement['tileW']), $n($placement['tileH']));

            $defs .= sprintf(
                '<pattern id="%1$s-bg-%2$s" %3$s><image href="%4$s" x="%5$s" y="%6$s" width="%7$s" height="%8$s" preserveAspectRatio="%9$s" /></pattern>',
                $domId,
                $sourceState,
                $patternAttrs,
                htmlspecialchars($effective['url']),
                $n($placement['imgX']),
                $n($placement['imgY']),
                $n($placement['imgW']),
                $n($placement['imgH']),
                $placement['preserveAspectRatio']
            );
        }

        return $defs !== '' ? '<defs>' . $defs . '</defs>' : '';
    }

    /**
     * @param array<string, array{url: string, sourceState: string}> $effectiveByState
     */
    private function buildStyleMarkup(Area $area, string $domId, array $effectiveByState, bool $needsColor, bool $hasLink): string
    {
        $wrapper = '#' . $domId . '-w';
        $nonceAttr = $this->resolveNonceAttribute();
        $transition = 'transition: fill-opacity .15s ease, stroke .15s ease, stroke-width .15s ease;';

        $normal = $this->resolveState($area, 'normal');
        $hover = $this->resolveState($area, 'hover');
        $active = $this->resolveState($area, 'active');

        // base look ("normal") + the area's own free-text CSS declarations, if any
        $ownStyle = $area->getOwnStyle();
        $css = $wrapper . ' { ' . ($hasLink ? 'cursor: pointer; ' : '') . $ownStyle . ' }';
        $css .= ' #' . $domId . ' { fill: transparent; pointer-events: all; ' . $transition . ' ' . $this->borderDeclarations($normal) . ' }';
        if ($needsColor) {
            $css .= ' #' . $domId . '-c { pointer-events: none; ' . $transition . ' ' . $this->colorDeclarations($normal) . ' }';
        }
        if ($effectiveByState !== []) {
            $normalSource = $effectiveByState['normal']['sourceState'] ?? null;
            $normalImage = $normalSource !== null ? $this->imageRule($domId, $normalSource) : 'fill: none;';
            $css .= ' #' . $domId . '-i { pointer-events: none; ' . $normalImage . ' }';
        }

        // hover / mousedown: always the FULL resolved look (not a delta), so every transitioned
        // property (in particular fill-opacity) always starts from and moves to an explicit,
        // correct value - never from an implicit browser default, which caused a flash of full
        // opacity before the configured transparency became visible.
        foreach (['hover' => [':hover', $hover], 'active' => [':active', $active]] as $stateKey => [$pseudo, $resolved]) {
            $css .= ' ' . $wrapper . $pseudo . ' #' . $domId . ' { ' . $this->borderDeclarations($resolved) . ' }';
            if ($needsColor) {
                $css .= ' ' . $wrapper . $pseudo . ' #' . $domId . '-c { ' . $this->colorDeclarations($resolved) . ' }';
            }
            $sourceState = $effectiveByState[$stateKey]['sourceState'] ?? null;
            $image = $sourceState !== null ? $this->imageRule($domId, $sourceState) : '';
            if ($image !== '') {
                $css .= ' ' . $wrapper . $pseudo . ' #' . $domId . '-i { ' . $image . ' }';
            }
        }

        return '<style' . $nonceAttr . '>' . $css . '</style>';
    }

    /**
     * Content-Security-Policy support: per-area style blocks are generated dynamically, so they need
     * the request's CSP nonce (if the site enforces a nonce-based style-src). Sites without CSP, or
     * with a permissive style-src, are unaffected - the attribute is simply omitted.
     */
    private function resolveNonceAttribute(): string
    {
        try {
            $nonce = $this->resolveRequest()?->getAttribute('nonce');
            if ($nonce instanceof ConsumableNonce) {
                $nonce->consumeInline(Directive::StyleSrcElem);

                return ' nonce="' . htmlspecialchars((string)$nonce) . '"';
            }
        } catch (\Throwable) {
            // no CSP / nonce not available in this context - inline style works unmodified
        }

        return '';
    }

    /**
     * Fully resolves one CSS state (normal / hover / active) by walking the same chain the
     * backend editor's preview uses (hover builds on normal; active builds on hover, because
     * the mouse is still down over the area while it is pressed) - see geometry.js effectiveStyle().
     * The result always has explicit values, never "unset", so the CSS emitted from it never
     * relies on an implicit browser default as a transition start/end value.
     *
     * @return array{stroke: string, strokeWidth: int, dash: string, fill: string, fillOpacity: string}
     */
    private function resolveState(Area $area, string $target): array
    {
        $chain = match ($target) {
            'hover' => ['normal', 'hover'],
            'active' => ['normal', 'hover', 'active'],
            default => ['normal'],
        };

        $stroke = 'none';
        $strokeWidth = 1;
        $dash = 'none';
        $color = '';
        $hasColor = false;
        $opacityPercent = null;

        foreach ($chain as $state) {
            $cfg = $area->getState($state);

            if ($state === 'normal') {
                if ($cfg['borderWidth'] > 0 && $cfg['borderColor'] !== '' && $cfg['borderStyle'] !== 'none') {
                    $stroke = $cfg['borderColor'];
                    $strokeWidth = $cfg['borderWidth'];
                    $dash = $this->dasharrayFor($cfg['borderStyle']);
                }
            } elseif ($cfg['borderStyle'] === 'none') {
                $stroke = 'none';
            } elseif ($cfg['borderColor'] !== '') {
                $stroke = $cfg['borderColor'];
                if ($cfg['borderWidth'] > 0) {
                    $strokeWidth = $cfg['borderWidth'];
                }
                $dash = $this->dasharrayFor($cfg['borderStyle']);
            } elseif ($cfg['borderWidth'] > 0) {
                $strokeWidth = $cfg['borderWidth'];
            }

            if ($cfg['backgroundColor'] !== '') {
                $color = $cfg['backgroundColor'];
                $hasColor = true;
            }
            if ($cfg['backgroundOpacity'] !== null) {
                $opacityPercent = $cfg['backgroundOpacity'];
            }
        }

        // No explicit opacity anywhere in the chain: a color defaults to fully visible, no color
        // defaults to fully invisible - either way this is an explicit value, never left to the
        // browser's own default, which is what caused the transition to start from the wrong point.
        $opacityPercent ??= $hasColor ? 100 : 0;

        return [
            'stroke' => $stroke,
            'strokeWidth' => $strokeWidth,
            'dash' => $dash,
            // A neutral fallback color (invisible via fill-opacity: 0 below) instead of "none":
            // "none" cannot be transitioned, so switching to a real color on hover/mousedown used
            // to make it flash in at full opacity before fading to the configured value.
            'fill' => $hasColor ? $color : '#808080',
            'fillOpacity' => $this->opacityValue($opacityPercent),
        ];
    }

    /**
     * @param array{stroke: string, strokeWidth: int, dash: string} $resolved
     */
    private function borderDeclarations(array $resolved): string
    {
        if ($resolved['stroke'] === 'none') {
            return 'stroke: none;';
        }

        return 'stroke: ' . $resolved['stroke'] . '; stroke-width: ' . $resolved['strokeWidth'] . '; stroke-dasharray: ' . $resolved['dash'] . ';';
    }

    /**
     * @param array{fill: string, fillOpacity: string} $resolved
     */
    private function colorDeclarations(array $resolved): string
    {
        return 'fill: ' . $resolved['fill'] . '; fill-opacity: ' . $resolved['fillOpacity'] . ';';
    }

    private function imageRule(string $domId, string $sourceState): string
    {
        return 'fill: url(#' . $domId . '-bg-' . $sourceState . ');';
    }

    private function opacityValue(int $percent): string
    {
        $value = rtrim(rtrim(number_format(max(0, min(100, $percent)) / 100, 2, '.', ''), '0'), '.');

        return $value === '' ? '0' : $value;
    }

    private function dasharrayFor(string $style): string
    {
        return match ($style) {
            'dashed' => '10,6',
            'dotted' => '2,4',
            default => 'none',
        };
    }
}
