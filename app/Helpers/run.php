<?php
// run.php

require 'GraphvizRenderer.php';
require 'PngConverter.php';

/**
 * Generate PNG from transit JSON data
 * @param array $json Transit data array
 * @return string     PNG binary data
 */
function generatePngFromJson(array $json) {
    // Generate DOT string
    $dotContent = generateGraphvizImage($json);
    
    if (!$dotContent) {
        throw new Exception("Failed to generate DOT content");
    }
    
    // Convert DOT to SVG
    $svgContent = dotToSvg($dotContent);
    
    if (!$svgContent) {
        throw new Exception("Failed to generate SVG");
    }
    
    // Convert SVG to PNG
    $pngData = convertSvgToPng($svgContent);
    
    if (!$pngData) {
        throw new Exception("Failed to generate PNG");
    }
    
    return $pngData;
}