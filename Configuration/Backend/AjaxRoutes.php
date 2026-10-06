<?php

declare(strict_types=1);

use Mikelmade\Mminteractive\Controller\UploadAjaxController;

return [
	'mminteractive_upload' => [
		'path' => '/mminteractive/upload',
		'methods' => ['POST'],
		'target' => UploadAjaxController::class . '::uploadAction',
	],
];
