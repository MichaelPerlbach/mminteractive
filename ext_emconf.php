<?php

$EM_CONF[$_EXTKEY] = [
	'title' => 'MM Interactive',
	'description' => 'Backend WYSIWYG editor to upload images and define linked, styleable imagemap areas (rectangle/circle/polygon) with normal, hover and mousedown states (border color, style, width, background image).',
	'category' => 'plugin',
	'author' => 'Mikelmade',
	'author_email' => '',
	'state' => 'stable',
	'clearCacheOnLoad' => true,
	'version' => '1.0.0',
	'constraints' => [
		'depends' => [
			'typo3' => '14.3.0-14.3.99',
			'extbase' => '14.3.0-14.3.99',
			'fluid' => '14.3.0-14.3.99',
			'backend' => '14.3.0-14.3.99',
			'frontend' => '14.3.0-14.3.99',
		],
		'conflicts' => [],
		'suggests' => [],
	],
];
