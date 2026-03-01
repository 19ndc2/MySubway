<?php
// testImgToJson.php

require 'ImgToJson.php';

// Example: Load an image file from disk
$imageFile = 'Canada_line_diagram.png'; // Change this to test with a different image file

if (!file_exists($imageFile)) {
    die("Image file not found: $imageFile\n");
}

// Determine MIME type from file extension
$ext = strtolower(pathinfo($imageFile, PATHINFO_EXTENSION));
$mimeTypes = [
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp'
];
$mimeType = $mimeTypes[$ext] ?? 'image/jpeg';

try {
    // Read binary image data from file
    $imageBinary = file_get_contents($imageFile);
    
    echo "Processing image: $imageFile\n";
    echo "MIME type: $mimeType\n";
    echo "Image size: " . strlen($imageBinary) . " bytes\n";
    echo "---\n";
    
    // Convert image to JSON
    $json = ImgToJson($imageBinary, $mimeType);
    
    // Save JSON to file
    $outputFile = 'extracted_' . pathinfo($imageFile, PATHINFO_FILENAME) . '.json';
    file_put_contents($outputFile, json_encode($json, JSON_PRETTY_PRINT));
    
    echo "Successfully extracted transit network!\n";
    echo "Lines: " . count($json['lines']) . "\n";
    
    foreach ($json['lines'] as $line) {
        echo "  - " . $line['id'] . " (" . $line['color'] . "): " . count($line['stations']) . " stations\n";
    }
    
    echo "---\n";
    echo "JSON saved to: $outputFile\n";
    
} catch (Exception $e) {
    die("Error: " . $e->getMessage() . "\n");
}
?>
