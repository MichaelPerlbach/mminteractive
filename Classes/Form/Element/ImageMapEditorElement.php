<?php

declare(strict_types=1);

namespace Mikelmade\Mminteractive\Form\Element;

use Mikelmade\Mminteractive\Domain\Repository\ImageMapRepository;
use Mikelmade\Mminteractive\Service\FileUrlResolver;
use TYPO3\CMS\Backend\Form\Element\AbstractFormElement;
use TYPO3\CMS\Core\Page\JavaScriptModuleInstruction;
use TYPO3\CMS\Core\Utility\GeneralUtility;

/**
 * WYSIWYG editor (custom element <mm-imagemap-editor>) for the image and areas of one imagemap.
 * Everything is stored as one JSON document in the field this element is bound to, so it is
 * saved with the normal "Save" button of the record. The TYPO3 link browser is embedded as a
 * real FormEngine link field (see renderNativeLinkField()).
 */
class ImageMapEditorElement extends AbstractFormElement
{
    public function render(): array
    {
        $resultArray = $this->initializeResultArray();
        $parameterArray = $this->data['parameterArray'];
        $itemName = (string)$parameterArray['itemFormElName'];
        $itemValue = (string)($parameterArray['itemFormElValue'] ?? '');

        $config = ImageMapRepository::decode($itemValue);
        $resolver = GeneralUtility::makeInstance(FileUrlResolver::class);

        // identifier => public URL for the main image and all background images (used for previews)
        $fileUrls = [];
        $references = [$config['image']['file']];
        foreach ($config['areas'] as $area) {
            foreach ((array)($area['states'] ?? []) as $state) {
                $references[] = is_array($state) ? ($state['backgroundImage'] ?? '') : '';
            }
        }
        foreach ($references as $reference) {
            if ((is_string($reference) || is_int($reference)) && $reference !== '' && $reference !== 0 && !isset($fileUrls[(string)$reference])) {
                $url = $resolver->resolve($reference);
                if ($url !== '') {
                    $fileUrls[(string)$reference] = $url;
                }
            }
        }

        // Two embedded TYPO3 link fields: one that follows the selected area, one for the whole image.
        $nativeLinkHtml = $this->renderNativeLinkField($resultArray, 'mm_link_helper');
        $nativeImageLinkHtml = $this->renderNativeLinkField($resultArray, 'mm_link_helper_image');

        // The nested link fields would otherwise show this column's label ("Image and areas") as a
        // caption, which is wrong for a link. The editor hides any element showing exactly this text.
        $fieldLabel = (string)($this->data['parameterArray']['fieldConf']['label'] ?? '');
        $languageService = $GLOBALS['LANG'] ?? null;
        $fieldLabels = array_values(array_unique(array_filter([
            $fieldLabel,
            $languageService !== null ? (string)$languageService->sL($fieldLabel) : '',
        ], static fn (string $label): bool => trim($label) !== '')));

        $editorConfig = [
            'imageUrl' => $fileUrls[$config['image']['file']] ?? '',
            'fileUrls' => (object)$fileUrls,
            'fieldLabels' => $fieldLabels,
        ];

        $html = [];
        $html[] = '<div class="formengine-field-item t3js-formengine-field-item">';
        $html[] = '  <mm-imagemap-editor data-config="' . htmlspecialchars((string)json_encode($editorConfig, JSON_UNESCAPED_SLASHES), ENT_QUOTES) . '">';
        // Everything the editor takes over is "hidden" in the delivered HTML already: the web component
        // only upgrades once its JavaScript module has loaded, and until then the raw JSON field (and
        // the embedded link fields, which the editor moves into its own panel) would flash on screen.
        $html[] = '    <textarea class="form-control" rows="6" hidden data-mm-json name="' . htmlspecialchars($itemName, ENT_QUOTES) . '">' . htmlspecialchars($itemValue) . '</textarea>';
        if ($nativeLinkHtml !== '') {
            $html[] = '    <div hidden data-mm-native-link>' . $nativeLinkHtml . '</div>';
        }
        if ($nativeImageLinkHtml !== '') {
            $html[] = '    <div hidden data-mm-native-link-image>' . $nativeImageLinkHtml . '</div>';
        }
        $html[] = '  </mm-imagemap-editor>';
        $html[] = '</div>';

        $resultArray['html'] = implode(chr(10), $html);
        $resultArray['javaScriptModules'][] = JavaScriptModuleInstruction::create('@mikelmade/mminteractive/imagemap-editor.js');
        $resultArray['stylesheetFiles'][] = 'EXT:mminteractive/Resources/Public/Css/backend.css';

        return $resultArray;
    }

    /**
     * Renders a real TYPO3 "link" field (input + link browser button) for a helper name. The editor
     * moves it into the panel of the selected area (mm_link_helper) or into the whole-image link
     * block (mm_link_helper_image) and reads the chosen link from it. The helper is
     * not part of the "data[...]" array, so the DataHandler never sees it.
     *
     * If this cannot be rendered in the current TYPO3 version, an empty string is returned and the
     * editor falls back to a plain text field for the link.
     *
     * @param array<string, mixed> $resultArray
     */
    private function renderNativeLinkField(array &$resultArray, string $helperName): string
    {
        try {
            $data = $this->data;
            $data['renderType'] = 'link';
            $data['parameterArray']['itemFormElName'] = $helperName;
            $data['parameterArray']['itemFormElID'] = $helperName;
            $data['parameterArray']['itemFormElValue'] = '';
            $data['parameterArray']['fieldConf']['config'] = ['type' => 'link', 'renderType' => 'link', 'size' => 50];
            // no caption/description borrowed from the "areas" column
            $data['parameterArray']['fieldConf']['label'] = '';
            unset($data['parameterArray']['fieldConf']['description']);

            $child = $this->nodeFactory->create($data)->render();
            $html = (string)($child['html'] ?? '');
            if ($html === '') {
                return '';
            }
            $resultArray = $this->mergeChildReturnIntoExistingResult($resultArray, $child, false);

            return $html;
        } catch (\Throwable) {
            return '';
        }
    }
}
