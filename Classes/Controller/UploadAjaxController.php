<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\Controller;

use Mikelmade\Mminteractive\Service\FileUrlResolver;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\UploadedFileInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Core\Http\JsonResponse;
use TYPO3\CMS\Core\Resource\Folder;
use TYPO3\CMS\Core\Resource\ResourceStorage;
use TYPO3\CMS\Core\Resource\StorageRepository;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * Receives an image from the backend editor and stores it in fileadmin/mminteractive
 * (folder "mminteractive" of the default file storage). The file is written through the
 * FAL storage API, so folder permissions, file extension rules and file name cleanup of
 * TYPO3 apply. The editor only keeps the returned identifier ("1:/mminteractive/name.png").
 */
#[AsController]
final class UploadAjaxController
{
    private const TARGET_FOLDER = 'mminteractive';
    private const MAX_BYTES = 20 * 1024 * 1024;
    private const ALLOWED = [
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'gif' => 'image/gif',
        'webp' => 'image/webp',
    ];

    public function __construct(private readonly FileUrlResolver $fileUrlResolver)
    {
    }

    public function uploadAction(ServerRequestInterface $request): ResponseInterface
    {
        $file = $request->getUploadedFiles()['file'] ?? null;
        if (!$file instanceof UploadedFileInterface || $file->getError() !== UPLOAD_ERR_OK) {
            return $this->error('No file received (check upload_max_filesize / post_max_size).', 400);
        }
        if (($file->getSize() ?? 0) > self::MAX_BYTES) {
            return $this->error('The file is too large (max. 20 MB).', 400);
        }

        $extension = strtolower(pathinfo((string)$file->getClientFilename(), PATHINFO_EXTENSION));
        if (!isset(self::ALLOWED[$extension])) {
            return $this->error('Only ' . implode(', ', array_keys(self::ALLOWED)) . ' images are allowed.', 400);
        }

        $temporaryPath = GeneralUtility::tempnam('mminteractive_');
        try {
            $file->moveTo($temporaryPath);

            // The content has to be a real image whose type matches the extension.
            $info = @getimagesize($temporaryPath);
            if ($info === false || ($info['mime'] ?? '') !== self::ALLOWED[$extension]) {
                return $this->error('The file is not a valid ' . strtoupper($extension) . ' image.', 400);
            }

            $storage = $this->getStorage();
            if ($storage === null) {
                return $this->error('No file storage available.', 500);
            }
            $folder = $this->getTargetFolder($storage);

            // A random suffix avoids overwriting/renaming conflicts.
            $baseName = trim((string)preg_replace('/[^A-Za-z0-9_-]+/', '-', pathinfo((string)$file->getClientFilename(), PATHINFO_FILENAME)), '-');
            $fileName = ($baseName !== '' ? mb_substr($baseName, 0, 60) : 'image') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;

            $stored = $folder->addFile($temporaryPath, $fileName);
        } catch (\Throwable $e) {
            return $this->error($e->getMessage() !== '' ? $e->getMessage() : 'The file could not be stored.', 500);
        } finally {
            if (is_file($temporaryPath)) {
                @unlink($temporaryPath);
            }
        }

        $identifier = $stored->getCombinedIdentifier();

        return new JsonResponse([
            'ok' => true,
            'identifier' => $identifier,
            'url' => $this->fileUrlResolver->resolve($identifier),
            'name' => $stored->getName(),
            'width' => (int)$info[0],
            'height' => (int)$info[1],
        ]);
    }

    private function getStorage(): ?ResourceStorage
    {
        $repository = GeneralUtility::makeInstance(StorageRepository::class);

        return $repository->getDefaultStorage() ?? $repository->findByUid(1);
    }

    private function getTargetFolder(ResourceStorage $storage): Folder
    {
        $identifier = '/' . self::TARGET_FOLDER . '/';
        if ($storage->hasFolder($identifier)) {
            return $storage->getFolder($identifier);
        }

        return $storage->createFolder(self::TARGET_FOLDER, $storage->getRootLevelFolder());
    }

    private function error(string $message, int $status): ResponseInterface
    {
        return new JsonResponse(['ok' => false, 'message' => $message], $status);
    }
}
