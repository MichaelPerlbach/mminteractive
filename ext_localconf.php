<?php

defined('TYPO3') or die();

use Mikelmade\Mminteractive\Controller\ImageMapController;
use Mikelmade\Mminteractive\Form\Element\ImageMapEditorElement;
use TYPO3\CMS\Extbase\Utility\ExtensionUtility;

(static function (): void {
	// Frontend plugin (registered as CType "mminteractive_imagemap", see Configuration/TCA/Overrides/tt_content.php).
	// "show" is marked non-cacheable (USER_INT): the imagemap is read via a plain Doctrine query,
	// not through Extbase persistence, so TYPO3's automatic "clear page cache when the underlying
	// record is saved" mechanism does not apply (that only tracks Extbase-repository reads/writes).
	// Without this, editing an imagemap (new image, moved/added areas) would not update pages that
	// already have this plugin in their cache.
	ExtensionUtility::configurePlugin(
		'Mminteractive',
		'Imagemap',
		[
			ImageMapController::class => 'show',
		],
		[
			ImageMapController::class => 'show',
		]
	);

	// Custom FormEngine element: WYSIWYG editor for all areas of an imagemap
	$GLOBALS['TYPO3_CONF_VARS']['SYS']['formEngine']['nodeRegistry'][1710000001] = [
		'nodeName' => 'mmImageMapEditor',
		'priority' => 40,
		'class' => ImageMapEditorElement::class,
	];
})();
