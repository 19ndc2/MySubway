<?php

namespace App\Helpers;

/**
 * Convert an image to transit JSON using Gemini API
 */
class ImgToJson
{
    /**
     * Extract transit network from image as JSON
     * @param string $imageBinary Binary image data (not a file path)
     * @param string $mimeType    MIME type (e.g., 'image/jpeg', 'image/png')
     * @param string $apiKey      Optional: API key (loads from environment if not provided)
     * @return array              Extracted transit network JSON as associative array
     * @throws Exception          If API call fails or returns invalid data
     */
    public static function extract($imageBinary, $mimeType = 'image/jpeg', $apiKey = null)
    {
        if (!$apiKey) {
            $apiKey = env('GEMINI_API_KEY');
        }

        if (!$apiKey) {
            throw new \Exception("GEMINI_API_KEY not found in environment");
        }

        $result = DiagramEncoder::sendImageToGemini($imageBinary, $apiKey, $mimeType);

        if (!$result['success']) {
            throw new \Exception($result['error']);
        }

        return json_decode($result['response'], true);
    }
}
