<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\Domain\Repository;

use Mikelmade\Mminteractive\Domain\Model\Area;
use Mikelmade\Mminteractive\Domain\Model\ImageMap;
use Mikelmade\Mminteractive\Service\FileUrlResolver;
use TYPO3\CMS\Core\Database\Connection;
use TYPO3\CMS\Core\Database\ConnectionPool;
use TYPO3\CMS\Core\Database\Query\Restriction\DeletedRestriction;

/**
 * Reads imagemaps directly via Doctrine. The configuration of an imagemap is one JSON document
 * in the column "areas": {"image": {"file", "width", "height"}, "areas": [...]}.
 * (A plain array of areas, as written by older versions, is read as well.)
 */
class ImageMapRepository
{
    public const TABLE = 'tx_mminteractive_domain_model_imagemap';

    public function __construct(
        private readonly ConnectionPool $connectionPool,
        private readonly FileUrlResolver $fileUrlResolver,
    ) {
    }

    /**
     * Frontend: respects hidden / start / end time.
     */
    public function findByUid(int $uid): ?ImageMap
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::TABLE);
        $row = $queryBuilder
            ->select('uid', 'title', 'areas')
            ->from(self::TABLE)
            ->where($queryBuilder->expr()->eq('uid', $queryBuilder->createNamedParameter($uid, Connection::PARAM_INT)))
            ->executeQuery()
            ->fetchAssociative();

        return is_array($row) ? $this->hydrate($row) : null;
    }

    /**
     * Backend list.
     *
     * @return list<array{uid: int, title: string, areaCount: int, thumbnailUrl: string}>
     */
    public function findSummariesByPid(int $pid): array
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::TABLE);
        $queryBuilder->getRestrictions()->removeAll()->add(new DeletedRestriction());
        $rows = $queryBuilder
            ->select('uid', 'title', 'areas')
            ->from(self::TABLE)
            ->where($queryBuilder->expr()->eq('pid', $queryBuilder->createNamedParameter($pid, Connection::PARAM_INT)))
            ->orderBy('title')
            ->executeQuery()
            ->fetchAllAssociative();

        return array_map(function (array $row): array {
            $config = self::decode((string)($row['areas'] ?? ''));

            return [
                'uid' => (int)$row['uid'],
                'title' => (string)$row['title'],
                'areaCount' => count($config['areas']),
                'thumbnailUrl' => $this->fileUrlResolver->resolveThumbnail($config['image']['file']),
            ];
        }, $rows);
    }

    /**
     * Raw JSON of one imagemap (used to resolve its files before deleting it).
     */
    public function findRawAreas(int $uid): ?string
    {
        $queryBuilder = $this->connectionPool->getQueryBuilderForTable(self::TABLE);
        $queryBuilder->getRestrictions()->removeAll()->add(new DeletedRestriction());
        $value = $queryBuilder
            ->select('areas')
            ->from(self::TABLE)
            ->where($queryBuilder->expr()->eq('uid', $queryBuilder->createNamedParameter($uid, Connection::PARAM_INT)))
            ->executeQuery()
            ->fetchOne();

        return $value === false ? null : (string)$value;
    }

    /**
     * @return array{image: array{file: string, width: int, height: int}, areas: list<array<string, mixed>>}
     */
    /**
     * Border around the whole image, validated exactly like geometry.js normalizeImageBorder().
     *
     * @return array{style: string, color: string, width: int}
     */
    private static function decodeBorder(mixed $border): array
    {
        $border = is_array($border) ? $border : [];
        $style = (string)($border['style'] ?? 'none');
        $color = (string)($border['color'] ?? '');
        $width = $border['width'] ?? 0;

        return [
            'style' => in_array($style, ['solid', 'dashed', 'dotted', 'none'], true) ? $style : 'none',
            'color' => preg_match('/^#[0-9a-fA-F]{3,8}$/', $color) === 1 ? $color : '#000000',
            'width' => is_numeric($width) ? max(0, min(50, (int)round((float)$width))) : 0,
        ];
    }

    public static function decode(string $json): array
    {
        $empty = ['image' => ['file' => '', 'width' => 0, 'height' => 0, 'border' => ['style' => 'none', 'color' => '#000000', 'width' => 0], 'link' => '', 'alt' => ''], 'areas' => []];
        $data = json_decode($json, true);
        if (!is_array($data)) {
            return $empty;
        }

        $areas = array_is_list($data) ? $data : ($data['areas'] ?? []);
        $image = !array_is_list($data) && is_array($data['image'] ?? null) ? $data['image'] : [];

        return [
            'image' => [
                'file' => (string)($image['file'] ?? ''),
                'width' => max(0, (int)($image['width'] ?? 0)),
                'height' => max(0, (int)($image['height'] ?? 0)),
                'border' => self::decodeBorder($image['border'] ?? null),
                'link' => mb_substr(trim((string)($image['link'] ?? '')), 0, 2000),
                'alt' => mb_substr(trim((string)($image['alt'] ?? '')), 0, 500),
            ],
            'areas' => is_array($areas) ? array_values(array_filter($areas, 'is_array')) : [],
        ];
    }

    /**
     * @param array<string, mixed> $row
     */
    private function hydrate(array $row): ImageMap
    {
        $config = self::decode((string)($row['areas'] ?? ''));

        $areas = [];
        foreach ($config['areas'] as $item) {
            $imageUrls = [];
            foreach (Area::STATES as $state) {
                $reference = $item['states'][$state]['backgroundImage'] ?? null;
                if (is_string($reference) || is_int($reference)) {
                    $url = $this->fileUrlResolver->resolve($reference);
                    if ($url !== '') {
                        $size = $this->fileUrlResolver->resolveSize($reference);
                        $imageUrls[$state] = ['url' => $url, 'width' => $size['width'], 'height' => $size['height']];
                    }
                }
            }

            $tooltipReference = $item['tooltip']['backgroundImage'] ?? null;
            if (is_string($tooltipReference) || is_int($tooltipReference)) {
                $tooltipUrl = $this->fileUrlResolver->resolve($tooltipReference);
                if ($tooltipUrl !== '') {
                    $imageUrls['tooltip'] = ['url' => $tooltipUrl, 'width' => 0, 'height' => 0];
                }
            }

            $areas[] = Area::fromArray($item, $imageUrls);
        }

        return new ImageMap(
            (int)$row['uid'],
            (string)$row['title'],
            $this->fileUrlResolver->resolve($config['image']['file']),
            $config['image']['width'],
            $config['image']['height'],
            $areas,
            $config['image']['border'],
            $config['image']['link'],
            $config['image']['alt']
        );
    }
}
