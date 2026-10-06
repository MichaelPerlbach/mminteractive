<?php

// Registers the ES6 module namespace, usable both in the backend (editor) and on frontend pages
// (the tooltip module). Import maps are emitted per-page only when a module is actually loaded
// via PageRenderer::loadJavaScriptModule() / JavaScriptRenderer, so this alone loads nothing.
return [
	'dependencies' => ['core', 'backend'],
	'imports' => [
		'@mikelmade/mminteractive/' => 'EXT:mminteractive/Resources/Public/JavaScript/',
	],
];
