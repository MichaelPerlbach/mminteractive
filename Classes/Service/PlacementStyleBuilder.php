<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\Service;

/**
 * Turns the placement settings of the content element (tt_content) into a CSS declaration string
 * for the imagemap container. Every value is validated here (allowlisted position/unit, numbers
 * clamped), so the result is safe to put into a style attribute as is.
 *
 *  - relative (default): normal document flow, optional space above / below (px)
 *  - absolute / fixed:   x / y position in px or % (from the left / the top); an empty value is
 *                        simply not set
 */
final class PlacementStyleBuilder
{
    private const POSITIONS = ['relative', 'absolute', 'fixed'];
    private const UNITS = ['px', '%'];

    /**
     * @param array<string, mixed> $data tt_content row
     */
    public static function build(array $data): string
    {
        $position = (string)($data['tx_mminteractive_position'] ?? 'relative');
        if (!in_array($position, self::POSITIONS, true)) {
            $position = 'relative';
        }

        if ($position === 'relative') {
            $css = '';
            $top = self::clampInt($data['tx_mminteractive_margin_top'] ?? 0);
            $bottom = self::clampInt($data['tx_mminteractive_margin_bottom'] ?? 0);
            if ($top > 0) {
                $css .= 'margin-top: ' . $top . 'px; ';
            }
            if ($bottom > 0) {
                $css .= 'margin-bottom: ' . $bottom . 'px; ';
            }

            return trim($css);
        }

        $css = 'position: ' . $position . '; ';
        $left = self::length($data['tx_mminteractive_x'] ?? null, $data['tx_mminteractive_x_unit'] ?? 'px');
        $top = self::length($data['tx_mminteractive_y'] ?? null, $data['tx_mminteractive_y_unit'] ?? 'px');
        if ($left !== '') {
            $css .= 'left: ' . $left . '; ';
        }
        if ($top !== '') {
            $css .= 'top: ' . $top . '; ';
        }

        return trim($css);
    }

    private static function clampInt(mixed $value): int
    {
        return is_numeric($value) ? max(0, min(10000, (int)round((float)$value))) : 0;
    }

    /** "12.5" + "%" -> "12.5%"; empty/non-numeric -> "" (not set). */
    private static function length(mixed $value, mixed $unit): string
    {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return '';
        }
        $unit = in_array($unit, self::UNITS, true) ? (string)$unit : 'px';
        $number = max(-100000.0, min(100000.0, (float)$value));
        $text = rtrim(rtrim(number_format($number, 2, '.', ''), '0'), '.');

        return ($text === '' || $text === '-0' ? '0' : $text) . $unit;
    }
}
