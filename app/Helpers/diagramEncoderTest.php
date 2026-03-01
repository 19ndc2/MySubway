<?php

require_once 'diagramEncoder.php';

// Load API key from environment
$env = require __DIR__ . '/environment.php';
$apiKey = $env['GEMINI_API_KEY'] ?? null;

// Simple test for sendImageToGemini function
echo "=== Diagram Encoder Test ===\n\n";

// Test with skytrain.webp image
//$imagePath = __DIR__ . '/skytrain.webp';
$imagePath = __DIR__ . '/Canada_line_diagram.png'; // UPDATED: Testing with a different image to verify flexibility


if (!file_exists($imagePath)) {
    echo "Error: Image file not found at {$imagePath}\n";
    exit(1);
}

echo "Testing sendImageToGemini with Canada_line_diagram.png...\n";
echo "Image path: {$imagePath}\n";
echo "Image size: " . filesize($imagePath) . " bytes\n\n";

// Call the function with API key
$result = sendImageToGemini($imagePath, $apiKey);

// Display results
if ($result['success']) {
    echo "✓ API request successful!\n\n";
    echo "Response:\n";
    echo "---\n";
    echo $result['response'] . "\n";
    echo "---\n";
    
    // Try to parse as JSON if possible
    $jsonData = json_decode($result['response'], true);
    if ($jsonData) {
        echo "\n✓ Response is valid JSON\n";
        echo "Number of transit lines: " . count($jsonData['lines'] ?? []) . "\n";
    }
} else {
    echo "✗ API request failed!\n";
    echo "Error: " . $result['error'] . "\n";
    if (isset($result['response'])) {
        echo "Response details:\n";
        print_r($result['response']);
    }
}

?>
