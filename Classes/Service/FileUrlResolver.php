<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\Service;

use TYPO3\CMS\Core\Resource\Exception\FileDoesNotExistException;
use TYPO3\CMS\Core\Resource\File;
use TYPO3\CMS\Core\Resource\FileInterface;
use TYPO3\CMS\Core\Resource\ProcessedFile;
use TYPO3\CMS\Core\Resource\ResourceFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\PathUtility;

/**
 * Turns a stored file reference into a public URL. References are FAL combined identifiers
 * ("1:/mminteractive/plan.jpg"); plain numbers (file uids of older versions) are accepted, too.
 */
class FileUrlResolver
{
    /**
     * Natural pixel size of a stored file (0/0 if unresolvable or metadata is unavailable).
     * Used to place background images ("auto" size, default repeat tile size).
     *
     * @return array{width: int, height: int}
     */
    public function resolveSize(int|string|null $reference): array
    {
        $file = $this->resolveFile($reference);
        if ($file === null) {
            return ['width' => 0, 'height' => 0];
        }

        return [
            'width' => max(0, (int)$file->getProperty('width')),
            'height' => max(0, (int)$file->getProperty('height')),
        ];
    }

    public function resolve(int|string|null $reference): string
    {
        $file = $this->resolveFile($reference);
        if ($file === null) {
            return '';
        }

        $url = (string)$file->getPublicUrl();

        return $url === '' ? '' : PathUtility::getAbsoluteWebPath($url);
    }

    /**
     * Public URL of a cropped thumbnail, generated through the regular FAL processing pipeline
     * (falls back to the original image if processing is unavailable, e.g. for SVGs).
     */
    public function resolveThumbnail(int|string|null $reference, int $width = 64, int $height = 64): string
    {
        $file = $this->resolveFile($reference);
        if ($file === null) {
            return '';
        }

        if ($file instanceof File) {
            try {
                $processed = $file->process(ProcessedFile::CONTEXT_IMAGECROPSCALEMASK, [
                    'width' => $width . 'c',
                    'height' => $height . 'c',
                ]);
                $url = (string)$processed->getPublicUrl();
                if ($url !== '') {
                    return PathUtility::getAbsoluteWebPath($url);
                }
            } catch (\Throwable) {
                // fall through to the original file below
            }
        }

        $url = (string)$file->getPublicUrl();

        return $url === '' ? '' : PathUtility::getAbsoluteWebPath($url);
    }

    /**
     * Resolves and permanently deletes a stored file. Used when an imagemap (and therefore its
     * own, non-shared upload) is deleted. Missing files are ignored.
     */
    public function delete(int|string|null $reference): void
    {
        $file = $this->resolveFile($reference);
        if ($file instanceof FileInterface) {
            try {
                $file->delete();
            } catch (\Throwable) {
                // already gone or not deletable - nothing more we can do here
            }
        }
    }

    private function resolveFile(int|string|null $reference): ?FileInterface
    {
        if ($reference === null || $reference === '' || $reference === 0 || $reference === '0') {
            return null;
        }

        try {
            $factory = GeneralUtility::makeInstance(ResourceFactory::class);
            $file = is_numeric($reference)
                ? $factory->getFileObject((int)$reference)
                : $factory->retrieveFileOrFolderObject((string)$reference);

            return $file instanceof FileInterface ? $file : null;
        } catch (FileDoesNotExistException) {
            return null;
        } catch (\Throwable) {
            return null;
        }
    }
}
