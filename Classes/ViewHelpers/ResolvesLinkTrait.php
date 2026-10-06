<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\ViewHelpers;

use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Frontend\ContentObject\ContentObjectRenderer;
use TYPO3\CMS\Frontend\Typolink\LinkFactory;

/**
 * Shared by the ViewHelpers that render a link (an area's link, the whole-image link): turns
 * the stored link string into [url, target]. Expects to be used inside an AbstractViewHelper
 * (it reads $this->renderingContext).
 */
trait ResolvesLinkTrait
{
    private function resolveRequest(): ?ServerRequestInterface
    {
        try {
            $request = $this->renderingContext->getAttribute(ServerRequestInterface::class);
        } catch (\Throwable) {
            $request = $GLOBALS['TYPO3_REQUEST'] ?? null;
        }

        return $request instanceof ServerRequestInterface ? $request : null;
    }

    /**
     * @return array{0: string, 1: string} [url, target]
     */
    private function resolveLink(string $link): array
    {
        if ($link === '') {
            return ['', ''];
        }

        // Plain absolute URLs (https://, mailto:, tel: ...) are used as they are.
        if (preg_match('#^(https?://|mailto:|tel:)#i', $link) === 1) {
            return [$link, ''];
        }

        // Everything else (t3://page?uid=1, t3://file?uid=2, page id, ...) goes through typolink.
        try {
            $request = $this->resolveRequest();

            $contentObjectRenderer = $request?->getAttribute('currentContentObject');
            if (!$contentObjectRenderer instanceof ContentObjectRenderer) {
                $contentObjectRenderer = GeneralUtility::makeInstance(ContentObjectRenderer::class);
                if ($request instanceof ServerRequestInterface) {
                    $contentObjectRenderer->setRequest($request);
                }
            }

            $result = GeneralUtility::makeInstance(LinkFactory::class)->create('', ['parameter' => $link], $contentObjectRenderer);

            return [$result->getUrl(), $result->getTarget()];
        } catch (\Throwable) {
            return ['', ''];
        }
    }
}
