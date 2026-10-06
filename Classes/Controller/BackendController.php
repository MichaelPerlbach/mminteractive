<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\Controller;

use Mikelmade\Mminteractive\Controller\ImageMapDeleteController;
use Mikelmade\Mminteractive\Domain\Repository\ImageMapRepository;
use Psr\Http\Message\ResponseInterface;
use TYPO3\CMS\Backend\Attribute\AsController;
use TYPO3\CMS\Backend\Routing\UriBuilder as BackendUriBuilder;
use TYPO3\CMS\Backend\Template\ModuleTemplateFactory;
use TYPO3\CMS\Backend\Utility\BackendUtility;
use TYPO3\CMS\Core\FormProtection\FormProtectionFactory;
use TYPO3\CMS\Core\Page\PageRenderer;
use TYPO3\CMS\Core\Type\Bitmask\Permission;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Extbase\Mvc\Controller\ActionController;

/**
 * Backend module "Content > Imagemaps": lists the imagemaps stored on the
 * page selected in the page tree and links to the FormEngine editor
 * (image upload + interactive area editor) for creating/editing them.
 */
#[AsController]
final class BackendController extends ActionController
{
    private const TABLE = 'tx_mminteractive_domain_model_imagemap';

    public function __construct(
        private readonly ModuleTemplateFactory $moduleTemplateFactory,
        private readonly BackendUriBuilder $backendUriBuilder,
        private readonly ImageMapRepository $imageMapRepository,
        private readonly FormProtectionFactory $formProtectionFactory,
    ) {
    }

    public function indexAction(): ResponseInterface
    {
        $pageRenderer = GeneralUtility::makeInstance(PageRenderer::class);
        $pageRenderer->loadJavaScriptModule('@mikelmade/mminteractive/backend-delete-confirm.js');
        $pageRenderer->addCssFile('EXT:mminteractive/Resources/Public/Css/backend.css');

        $pageId = (int)($this->request->getQueryParams()['id'] ?? 0);
        $backendUser = $GLOBALS['BE_USER'];

        $pageInfo = $pageId > 0
            ? BackendUtility::readPageAccess($pageId, $backendUser->getPagePermsClause(Permission::PAGE_SHOW))
            : false;

        $records = [];
        $newUrl = '';
        $canCreate = false;

        if (is_array($pageInfo)) {
            $returnUrl = (string)$this->request->getAttribute('normalizedParams')->getRequestUri();

            $formProtection = $this->formProtectionFactory->createFromRequest($this->request);
            $records = array_map(fn (array $row): array => $row + [
                'editUrl' => (string)$this->backendUriBuilder->buildUriFromRoute('record_edit', [
                    'edit' => [self::TABLE => [$row['uid'] => 'edit']],
                    'returnUrl' => $returnUrl,
                ]),
                'deleteToken' => $formProtection->generateToken(ImageMapDeleteController::TOKEN_ACTION, (string)$row['uid']),
            ], $this->imageMapRepository->findSummariesByPid($pageId));

            $deleteUrl = (string)$this->backendUriBuilder->buildUriFromRoute('mminteractive_imagemap_delete');

            $canCreate = $backendUser->check('tables_modify', self::TABLE)
                && $backendUser->doesUserHaveAccess($pageInfo, Permission::CONTENT_EDIT);

            if ($canCreate) {
                $newUrl = (string)$this->backendUriBuilder->buildUriFromRoute('record_edit', [
                    'edit' => [self::TABLE => [$pageId => 'new']],
                    'returnUrl' => $returnUrl,
                ]);
            }
        }

        $moduleTemplate = $this->moduleTemplateFactory->create($this->request);
        $moduleTemplate->assignMultiple([
            'pageId' => $pageId,
            'pageTitle' => is_array($pageInfo) ? (string)($pageInfo['title'] ?? '') : '',
            'hasPage' => is_array($pageInfo),
            'records' => $records,
            'canCreate' => $canCreate,
            'newUrl' => $newUrl,
            'deleteUrl' => $deleteUrl ?? '',
            'returnUrl' => $returnUrl ?? '',
        ]);

        return $moduleTemplate->renderResponse('Backend/Index');
    }
}
