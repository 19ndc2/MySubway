<?php
// testJsonToPng.php

require 'JsonToPng.php';

// Load JSON from file
$jsonFile = 'canada_line5.json';

if (!file_exists($jsonFile)) {
    die("JSON file not found: $jsonFile\n");
}

$json = json_decode(file_get_contents($jsonFile), true);

if (!$json) {
    die("Invalid JSON file.\n");
}

try {
    // Generate PNG from JSON
    $pngData = generatePngFromJson($json);
    
    // Save PNG to file
    $outputFile = 'output.png';
    file_put_contents($outputFile, $pngData);
    
    echo "PNG generated successfully: $outputFile\n";
    echo "File size: " . filesize($outputFile) . " bytes\n";
} catch (Exception $e) {
    die("Error: " . $e->getMessage() . "\n");
}
?>
