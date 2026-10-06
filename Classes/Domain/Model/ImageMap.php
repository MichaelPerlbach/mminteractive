<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\Domain\Model;

/**
 * Value object: one imagemap with its image and areas (read from the JSON document).
 */
final class ImageMap
{
    /**
     * @param Area[] $areas
     */
    public function __construct(
        private readonly int $uid,
        private readonly string $title,
        private readonly string $imageUrl,
        private readonly int $imageWidth,
        private readonly int $imageHeight,
        private readonly array $areas,
        private readonly array $imageBorder = ['style' => 'none', 'color' => '#000000', 'width' => 0],
        private readonly string $imageLink = '',
        private readonly string $imageAlt = '',
    ) {
    }

    /** Alt text of the image (empty = not set). */
    public function getImageAlt(): string
    {
        return $this->imageAlt;
    }

    /** Stored link of the whole image (resolved at render time by ImageLinkViewHelper). */
    public function getImageLink(): string
    {
        return $this->imageLink;
    }

    /**
     * Ready-to-use CSS declaration for the border around the whole image ("" = none). All three
     * parts were validated (style allowlist, hex color, clamped width) when the document was
     * decoded, so this is safe to put into a style attribute as-is.
     */
    public function getImageBorderCss(): string
    {
        $style = (string)($this->imageBorder['style'] ?? 'none');
        $width = (int)($this->imageBorder['width'] ?? 0);
        if ($style === 'none' || $width <= 0) {
            return '';
        }

        return 'border: ' . $width . 'px ' . $style . ' ' . (string)($this->imageBorder['color'] ?? '#000000') . ';';
    }

    public function getUid(): int
    {
        return $this->uid;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function getImageUrl(): string
    {
        return $this->imageUrl;
    }

    public function getImageWidth(): int
    {
        return $this->imageWidth;
    }

    public function getImageHeight(): int
    {
        return $this->imageHeight;
    }

    /**
     * @return Area[]
     */
    public function getAreas(): array
    {
        return $this->areas;
    }
}
