<?php

namespace App\Helpers;

use App\Helpers\GraphvizRenderer;
use App\Helpers\PngConverter;

class JsonToPng
{
    /**
     * Generate PNG from transit JSON data
     * @param array $json Transit data array
     * @return string     PNG binary data
     */
    public static function generate(array $json)
    {
        // Generate DOT string
        $dotContent = GraphvizRenderer::render($json);

        if (!$dotContent) {
            throw new \Exception("Failed to generate DOT content");
        }

        // Convert DOT to SVG
        $svgContent = GraphvizRenderer::dotToSvg($dotContent);

        if (!$svgContent) {
            throw new \Exception("Failed to generate SVG");
        }

        // Convert SVG to PNG
        $pngData = PngConverter::convertSvgToPng($svgContent);

        if (!$pngData) {
            throw new \Exception("Failed to generate PNG");
        }

        return $pngData;
    }
}