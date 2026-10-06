<?php

defined('TYPO3') or die();

use TYPO3\CMS\Core\Utility\ExtensionManagementUtility;
use TYPO3\CMS\Extbase\Utility\ExtensionUtility;

(static function (): void {
	// Registers the plugin as content element type (CType = "mminteractive_imagemap").
	$pluginSignature = ExtensionUtility::registerPlugin(
		'Mminteractive',
		'Imagemap',
		'LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:plugin.title',
		'content-mminteractive',
		'plugins',
		'LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:plugin.description'
	);

	// Field to pick which Imagemap record this content element should render.
	$GLOBALS['TCA']['tt_content']['columns']['tx_mminteractive_map'] = [
		'exclude' => true,
		'label' => 'LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.map',
		'config' => [
			'type' => 'select',
			'renderType' => 'selectSingle',
			'foreign_table' => 'tx_mminteractive_domain_model_imagemap',
			'items' => [
				['label' => '', 'value' => 0],
			],
		],
	];

	// Placement of the imagemap in the page: "relative" (default, normal document flow, optional
	// space above/below), or "absolute" / "fixed" with an x/y position in px or %.
	$unitField = static fn (string $label): array => [
		'exclude' => true,
		'label' => $label,
		'displayCond' => 'FIELD:tx_mminteractive_position:!=:relative',
		'config' => [
			'type' => 'select',
			'renderType' => 'selectSingle',
			'items' => [
				['label' => 'px', 'value' => 'px'],
				['label' => '%', 'value' => '%'],
			],
			'default' => 'px',
		],
	];
	$coordField = static fn (string $label): array => [
		'exclude' => true,
		'label' => $label,
		'displayCond' => 'FIELD:tx_mminteractive_position:!=:relative',
		'config' => [
			'type' => 'number',
			'format' => 'decimal',
			'size' => 8,
			'nullable' => true,
			'default' => null,
		],
	];
	$marginField = static fn (string $label): array => [
		'exclude' => true,
		'label' => $label,
		'displayCond' => 'FIELD:tx_mminteractive_position:=:relative',
		'config' => [
			'type' => 'number',
			'size' => 6,
			'range' => ['lower' => 0, 'upper' => 10000],
			'default' => 0,
		],
	];
	$GLOBALS['TCA']['tt_content']['columns']['tx_mminteractive_position'] = [
		'exclude' => true,
		'label' => 'LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.position',
		'onChange' => 'reload',
		'config' => [
			'type' => 'select',
			'renderType' => 'selectSingle',
			'items' => [
				['label' => 'LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.position.relative', 'value' => 'relative'],
				['label' => 'LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.position.absolute', 'value' => 'absolute'],
				['label' => 'LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.position.fixed', 'value' => 'fixed'],
			],
			'default' => 'relative',
		],
	];
	$GLOBALS['TCA']['tt_content']['columns']['tx_mminteractive_x'] = $coordField('LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.x');
	$GLOBALS['TCA']['tt_content']['columns']['tx_mminteractive_x_unit'] = $unitField('LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.x_unit');
	$GLOBALS['TCA']['tt_content']['columns']['tx_mminteractive_y'] = $coordField('LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.y');
	$GLOBALS['TCA']['tt_content']['columns']['tx_mminteractive_y_unit'] = $unitField('LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.y_unit');
	$GLOBALS['TCA']['tt_content']['columns']['tx_mminteractive_margin_top'] = $marginField('LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.margin_top');
	$GLOBALS['TCA']['tt_content']['columns']['tx_mminteractive_margin_bottom'] = $marginField('LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.margin_bottom');

	$GLOBALS['TCA']['tt_content']['palettes']['mminteractivePlacement'] = [
		'label' => 'LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tt_content.placement',
		'showitem' => 'tx_mminteractive_position, --linebreak--, tx_mminteractive_x, tx_mminteractive_x_unit, --linebreak--, tx_mminteractive_y, tx_mminteractive_y_unit, --linebreak--, tx_mminteractive_margin_top, tx_mminteractive_margin_bottom',
	];

	ExtensionManagementUtility::addToAllTCAtypes(
		'tt_content',
		'--div--;LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tabs.plugin, tx_mminteractive_map, --palette--;;mminteractivePlacement',
		$pluginSignature,
		'after:subheader'
	);
})();
