<?php

return [
	'ctrl' => [
		'title' => 'Imagemap',
		'label' => 'title',
		'tstamp' => 'tstamp',
		'crdate' => 'crdate',
		'sortby' => 'sorting',
		'delete' => 'deleted',
		'iconfile' => 'EXT:mminteractive/Resources/Public/Icons/Extension.svg',
		'security' => ['ignorePageTypeRestriction' => true],
	],
	'columns' => [
		'title' => [
			'exclude' => false,
			'label' => 'LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tx_mminteractive_domain_model_imagemap.title',
			'config' => [
				'type' => 'input',
				'size' => 40,
				'eval' => 'trim,required',
			],
		],
		'areas' => [
			'exclude' => false,
			'label' => 'LLL:EXT:mminteractive/Resources/Private/Language/locallang_db.xlf:tx_mminteractive_domain_model_imagemap.areas',
			'config' => [
				'type' => 'text',
				'renderType' => 'mmImageMapEditor',
				'rows' => 6,
			],
		],
	],
	'types' => [
		'1' => [
			'showitem' => 'title, areas',
		],
	],
];
