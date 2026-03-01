<?php

namespace App\Helpers;

use App\Helpers\ImgToJson;
use App\Helpers\JsonToPng;

/**
 * Convert an image to a PNG by extracting the transit network and re-rendering it
 */
class ImageConverter
{
    /**
     * Convert image to PNG with extracted transit network
     * @param string $imageBinary Binary image data
     * @param string $inputMimeType MIME type of input image (e.g., 'image/jpeg', 'image/png')
     * @return string PNG binary data
     * @throws Exception If conversion fails at any step
     */
    public static function convert($imageBinary, $inputMimeType = 'image/jpeg')
    {
        // Step 1: Convert image to JSON (extract transit network)
        $json = ImgToJson::extract($imageBinary, $inputMimeType);

        if (!$json || !isset($json['lines'])) {
            throw new \Exception("Failed to extract valid transit network from image");
        }

        // Step 2: Convert JSON to PNG (render as diagram)
        $pngData = JsonToPng::generate($json);

        if (!$pngData) {
            throw new \Exception("Failed to generate PNG from transit network");
        }

        return $pngData;
    }
}
