<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\ViewHelpers;

use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;

/**
 * Wraps its content (the imagemap's <image>) in a link for the whole image. The areas are
 * rendered after it and therefore sit on top: a click on an area goes to the area's own link,
 * a click on the rest of the image goes to this one. Without a link the content is output as is.
 */
class ImageLinkViewHelper extends AbstractViewHelper
{
    use ResolvesLinkTrait;

    protected $escapeOutput = false;
    protected $escapeChildren = false;

    public function initializeArguments(): void
    {
        $this->registerArgument('link', 'string', 'Stored link of the whole image (t3://..., URL, ...)', false, '');
        $this->registerArgument('label', 'string', 'Accessible name of the link', false, '');
    }

    public function render(): string
    {
        $content = (string)$this->renderChildren();
        [$href, $target] = $this->resolveLink(trim((string)$this->arguments['link']));
        if ($href === '') {
            return $content;
        }

        $label = trim((string)$this->arguments['label']);

        return sprintf(
            '<a class="tx-mminteractive__imagelink" href="%s"%s%s>%s</a>',
            htmlspecialchars($href),
            $target !== '' ? ' target="' . htmlspecialchars($target) . '"' . ($target === '_blank' ? ' rel="noopener"' : '') : '',
            $label !== '' ? ' aria-label="' . htmlspecialchars($label) . '"' : '',
            $content
        );
    }
}
