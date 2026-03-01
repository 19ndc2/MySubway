<?php

namespace App\Helpers;

class PngConverter
{
    /**
     * Converts SVG string content to PNG binary data (no file saved)
     * @param string $svgContent The raw XML string of the SVG
     * @param int    $width      Optional: Force a specific width
     * @return string            PNG binary data
     */
    public static function convertSvgToPng($svgContent, $width = null)
    {
        // Create temporary file for SVG input
        $tmpSvg = tempnam(sys_get_temp_dir(), 'svg_');
        file_put_contents($tmpSvg, $svgContent);

        // Create temporary file for PNG output
        $tmpPng = tempnam(sys_get_temp_dir(), 'png_');

        $bin = '/usr/bin/rsvg-convert';
        if (!file_exists($bin)) {
            $bin = 'rsvg-convert';
        }

        $cmd = escapeshellarg($bin) . " " . escapeshellarg($tmpSvg) . " -o " . escapeshellarg($tmpPng);

        if ($width) {
            $cmd .= " --width=" . intval($width) . " --keep-aspect-ratio";
        }

        $cmd .= " 2>&1";

        $output = shell_exec($cmd);

        // Read PNG into memory
        if (!file_exists($tmpPng) || filesize($tmpPng) === 0) {
            unlink($tmpSvg);
            throw new \Exception("PNG conversion failed: " . $output);
        }

        $pngData = file_get_contents($tmpPng);

        // Cleanup temp files
        unlink($tmpSvg);
        unlink($tmpPng);

        return $pngData;
    }
}