<?php

declare(strict_types=1);

use Mikelmade\Mminteractive\Controller\ImageMapDeleteController;

return [
	'mminteractive_imagemap_delete' => [
		'path' => '/mminteractive/imagemap/delete',
		'target' => ImageMapDeleteController::class . '::deleteAction',
	],
];
