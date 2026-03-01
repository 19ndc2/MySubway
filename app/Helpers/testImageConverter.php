<?php
// testImageConverter.php

// Load Composer autoloader FIRST (this includes Dotenv)
require __DIR__ . '/../../vendor/autoload.php';

// Now load .env explicitly from project root
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/../../');
$dotenv->load();

// Bootstrap Laravel
$app = require __DIR__ . '/../../bootstrap/app.php';

use App\Helpers\ImageConverter;

// Load input image
$inputFile = 'Canada_line_diagram.png';

if (!file_exists($inputFile)) {
    die("Image file not found: $inputFile\n");
}

// Determine MIME type
$ext = strtolower(pathinfo($inputFile, PATHINFO_EXTENSION));
$mimeTypes = [
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp'
];
$mimeType = $mimeTypes[$ext] ?? 'image/jpeg';

try {
    // Load binary image data
    $imageBinary = file_get_contents($inputFile);
    
    echo "Converting image to PNG...\n";
    echo "Input: $inputFile\n";
    echo "MIME type: $mimeType\n";
    echo "Image size: " . strlen($imageBinary) . " bytes\n";
    echo "---\n";
    
    // Convert image -> JSON -> PNG using the static method
    $pngData = ImageConverter::convert($imageBinary, $mimeType);
    
    // Save output PNG
    $outputFile = 'test_output.png';
    file_put_contents($outputFile, $pngData);
    
    echo "✓ Conversion successful!\n";
    echo "Output: $outputFile\n";
    echo "PNG size: " . filesize($outputFile) . " bytes\n";
    
} catch (Exception $e) {
    die("Error: " . $e->getMessage() . "\n");
}
