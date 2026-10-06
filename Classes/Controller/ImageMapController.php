<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\Controller;

use Mikelmade\Mminteractive\Domain\Repository\ImageMapRepository;
use Mikelmade\Mminteractive\Service\PlacementStyleBuilder;
use Psr\Http\Message\ResponseInterface;
use TYPO3\CMS\Extbase\Mvc\Controller\ActionController;

class ImageMapController extends ActionController
{
    public function __construct(
        private readonly ImageMapRepository $imageMapRepository
    ) {
    }

    public function showAction(): ResponseInterface
    {
        // The plugin stores the selected record uid on tt_content.tx_mminteractive_map.
        $contentObjectData = $this->request->getAttribute('currentContentObject')?->data ?? [];
        $mapUid = (int)($contentObjectData['tx_mminteractive_map'] ?? 0);

        $imageMap = $mapUid > 0 ? $this->imageMapRepository->findByUid($mapUid) : null;

        // Never fails silently: if nothing is rendered, the reason is visible in the page source
        // (view-source) as an HTML comment, without leaking anything sensitive.
        $reason = match (true) {
            $mapUid <= 0 => 'no imagemap selected in the content element',
            $imageMap === null => 'imagemap record ' . $mapUid . ' not found (deleted? wrong storage page / workspace?)',
            $imageMap->getImageUrl() === '' => 'imagemap ' . $mapUid . ' has no image yet (upload one and save)',
            default => '',
        };

        $this->view->assignMultiple([
            'debugReason' => $reason,
            'imageMap' => $imageMap,
            'areas' => $imageMap?->getAreas() ?? [],
            'imageUrl' => $imageMap?->getImageUrl() ?? '',
            'imageBorderCss' => $imageMap?->getImageBorderCss() ?? '',
            'imageLink' => $imageMap?->getImageLink() ?? '',
            // alt text of the image; falls back to the imagemap's title (the previous behaviour) if none is set
            'imageAlt' => $imageMap !== null && $imageMap->getImageAlt() !== '' ? $imageMap->getImageAlt() : ($imageMap?->getTitle() ?? ''),
            'placementCss' => PlacementStyleBuilder::build($contentObjectData),
            'imageWidth' => ($imageMap?->getImageWidth() ?? 0) ?: 800,
            'imageHeight' => ($imageMap?->getImageHeight() ?? 0) ?: 600,
        ]);

        return $this->htmlResponse();
    }
}
