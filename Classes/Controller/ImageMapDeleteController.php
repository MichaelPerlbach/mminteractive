<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\Controller;

use Mikelmade\Mminteractive\Domain\Repository\ImageMapRepository;
use Mikelmade\Mminteractive\Service\ImageMapCleanupService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Backend\Routing\UriBuilder as BackendUriBuilder;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\DataHandling\DataHandler;
use TYPO3\CMS\Core\FormProtection\FormProtectionFactory;
use TYPO3\CMS\Core\Http\RedirectResponse;
use TYPO3\CMS\Core\Type\Bitmask\Permission;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * Deletes one imagemap: its database record AND every file it owns (main image plus all
 * per-state background images, all stored under fileadmin/mminteractive). Reached only from
 * a POST form in the backend module (see Resources/Private/Templates/Backend/Index.html),
 * protected the same way TYPO3 core protects backend forms (FormProtectionFactory token).
 */
#[AsController]
final class ImageMapDeleteController
{
    private const TABLE = 'tx_mminteractive_domain_model_imagemap';
    public const TOKEN_ACTION = 'mminteractive_imagemap_delete';

    public function __construct(
        private readonly ImageMapRepository $imageMapRepository,
        private readonly ImageMapCleanupService $cleanupService,
        private readonly FormProtectionFactory $formProtectionFactory,
        private readonly BackendUriBuilder $backendUriBuilder,
    ) {
    }

    public function deleteAction(ServerRequestInterface $request): ResponseInterface
    {
        $params = $request->getMethod() === 'POST' ? (array)$request->getParsedBody() : $request->getQueryParams();
        $uid = (int)($params['uid'] ?? 0);
        $pageId = (int)($params['id'] ?? 0);
        $returnUrl = (string)($params['returnUrl'] ?? '');
        $token = (string)($params['formToken'] ?? '');

        $formProtection = $this->formProtectionFactory->createFromRequest($request);
        $isValidRequest = $request->getMethod() === 'POST'
            && $uid > 0
            && $formProtection->validateToken($token, self::TOKEN_ACTION, (string)$uid);

        if ($isValidRequest) {
            $this->deleteImageMap($uid);
        }

        return new RedirectResponse($returnUrl !== '' ? $returnUrl : (string)$this->backendUriBuilder->buildUriFromRoute('mikelmade_mminteractive', ['id' => $pageId]));
    }

    private function deleteImageMap(int $uid): void
    {
        $row = BackendUtility::getRecord(self::TABLE, $uid);
        if (!is_array($row)) {
            return;
        }

        $backendUser = $GLOBALS['BE_USER'];
        $pageInfo = BackendUtility::readPageAccess((int)$row['pid'], $backendUser->getPagePermsClause(Permission::PAGE_SHOW));
        $canDelete = is_array($pageInfo)
            && $backendUser->check('tables_modify', self::TABLE)
            && $backendUser->doesUserHaveAccess($pageInfo, Permission::CONTENT_EDIT);
        if (!$canDelete) {
            return;
        }

        // Remove the files this imagemap owns before removing the record itself.
        $json = $this->imageMapRepository->findRawAreas($uid);
        if ($json !== null) {
            $this->cleanupService->deleteFilesFor($json);
        }

        $dataHandler = GeneralUtility::makeInstance(DataHandler::class);
        $dataHandler->start([], [self::TABLE => [$uid => ['delete' => 1]]]);
        $dataHandler->process_cmdmap();
    }
}
