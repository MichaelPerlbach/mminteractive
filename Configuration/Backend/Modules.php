<?php

declare(strict_types=1);

use Mikelmade\Mminteractive\Controller\BackendController;

return [
	// Own top-level module group "Mikelmade" (instead of living below "Content").
	'mikelmade' => [
		'labels' => 'LLL:EXT:mminteractive/Resources/Private/Language/locallang_mikelmade.xlf',
		'iconIdentifier' => 'modulegroup-mikelmade',
		// shown right after the core "Content" module group
		'position' => ['after' => 'content'],
		'navigationComponent' => '@typo3/backend/tree/page-tree-element',
	],

	'mikelmade_mminteractive' => [
		'parent' => 'mikelmade',
		'access' => 'user',
		'workspaces' => 'live',
		'path' => '/module/mikelmade/mminteractive',
		'iconIdentifier' => 'module-mminteractive',
		'labels' => 'LLL:EXT:mminteractive/Resources/Private/Language/locallang_mod.xlf',
		'extensionName' => 'Mminteractive',
		'navigationComponent' => '@typo3/backend/tree/page-tree-element',
		'controllerActions' => [
			BackendController::class => ['index'],
		],
	],
];
