<?php

use TYPO3\CMS\Core\Imaging\IconProvider\SvgIconProvider;

return [
	'content-mminteractive' => [
		'provider' => SvgIconProvider::class,
		'source' => 'EXT:mminteractive/Resources/Public/Icons/Extension.svg',
	],
	// Icon of the top-level "Mikelmade" backend module group (the imagemap module lives below it)
	'modulegroup-mikelmade' => [
		'provider' => SvgIconProvider::class,
		'source' => 'EXT:mminteractive/Resources/Public/Icons/mikelmade.svg',
	],
	'module-mminteractive' => [
		'provider' => SvgIconProvider::class,
		'source' => 'EXT:mminteractive/Resources/Public/Icons/Extension.svg',
	],
];
