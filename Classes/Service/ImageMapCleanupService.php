<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\Service;

use Mikelmade\Mminteractive\Domain\Model\Area;
use Mikelmade\Mminteractive\Domain\Repository\ImageMapRepository;

/**
 * Deletes every file (main image and all per-state background images) referenced by one
 * imagemap's JSON document. These files live exclusively in fileadmin/mminteractive and are
 * never shared between imagemaps (each upload gets a unique name), so it is safe to remove
 * them together with the record.
 */
class ImageMapCleanupService
{
    public function __construct(private readonly FileUrlResolver $fileUrlResolver)
    {
    }

    public function deleteFilesFor(string $json): void
    {
        $config = ImageMapRepository::decode($json);

        $this->fileUrlResolver->delete($config['image']['file']);

        foreach ($config['areas'] as $area) {
            foreach (Area::STATES as $state) {
                $reference = $area['states'][$state]['backgroundImage'] ?? null;
                if (is_string($reference) || is_int($reference)) {
                    $this->fileUrlResolver->delete($reference);
                }
            }
        }
    }
}
