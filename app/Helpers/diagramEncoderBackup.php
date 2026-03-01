<?php

// 1. Enhanced Schema: Added descriptions to reinforce coordinate alignment.
$transitSchema = [
    'type' => 'object',
    'properties' => [
        'lines' => [
            'type' => 'array',
            'items' => [
                'type' => 'object',
                'properties' => [
                    'id' => ['type' => 'string', 'description' => 'Name of the line or branch (e.g., Expo Line - King George Branch)'],
                    'color' => ['type' => 'string', 'description' => 'Hex color #RRGGBB'],
                    'stations' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'name' => ['type' => 'string'],
                                'x' => ['type' => 'integer', 'description' => 'X coordinate snapped to a 10-unit grid'],
                                'y' => ['type' => 'integer', 'description' => 'Y coordinate snapped to a 10-unit grid']
                            ],
                            'required' => ['name', 'x', 'y']
                        ]
                    ]
                ],
                'required' => ['id', 'color', 'stations']
            ]
        ]
    ],
    'required' => ['lines']
];

// 2. The "Hardened" Prompt: Explicitly demands schematic geometry.
$encodingPrompt = <<<PROMPT
You are a cartographic data engineer. Extract the transit network from this image into JSON.
CRITICAL GEOMETRIC RULES:
1. SCHEMATIC ALIGNMENT: This is a diagram, not a geographic map.
2. HORIZONTAL/VERTICAL: If a line segment looks horizontal, the Y coordinates for those stations MUST be identical. 
3. GRID SNAPPING: Snap all X and Y coordinates to the nearest 10 units (e.g., 110, 120, 130).
4. DIAGONALS: For diagonal segments, the change in X must equal the change in Y to maintain a 45-degree angle.
5. BRANCHING: Treat branches (like the YVR Airport or Production Way branches) as separate line entries but ensure they share the exact same coordinates for the transfer station (e.g., Bridgeport or Columbia).
6. EXCLUSION: Ignore bus routes (B-Lines). Only extract the rail-based SkyTrain lines.
PROMPT;

/**
 * Snap-to-Grid Post-Processor
 * Rounds coordinates to the nearest $grid size to ensure Graphviz sees perfect lines.
 */
function snapToGrid($jsonString, $grid = 20) {
    $data = json_decode($jsonString, true);
    if (!$data || !isset($data['lines'])) return $jsonString;

    foreach ($data['lines'] as &$line) {
        foreach ($line['stations'] as &$station) {
            $station['x'] = round($station['x'] / $grid) * $grid;
            $station['y'] = round($station['y'] / $grid) * $grid;
        }
    }
    return json_encode($data, JSON_PRETTY_PRINT);
}

/**
 * Sends image to Gemini 3.1 Pro with High Reasoning
 */
function sendImageToGemini($imageInput, $apiKey = null, $mimeType = null) {
    global $encodingPrompt, $transitSchema;
    
    if ($apiKey === null) $apiKey = getenv('GEMINI_API_KEY');
    if (empty($apiKey)) return ['success' => false, 'error' => 'API key missing'];
    
    // Image Handling
    if (is_string($imageInput) && file_exists($imageInput)) {
        $base64Image = base64_encode(file_get_contents($imageInput));
        $ext = strtolower(pathinfo($imageInput, PATHINFO_EXTENSION));
        $mimeTypes = ['jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp'];
        $mimeType = $mimeType ?? ($mimeTypes[$ext] ?? 'image/jpeg');
    } else {
        $base64Image = base64_encode($imageInput);
    }
    
    $requestData = [
        'contents' => [[
            'parts' => [
                ['text' => $encodingPrompt],
                ['inline_data' => ['mime_type' => $mimeType, 'data' => $base64Image]]
            ]
        ]],
        'generationConfig' => [
            'response_mime_type' => 'application/json',
            'response_schema' => $transitSchema,
            'temperature' => 0.1,
            // 2026 Feature: Requesting higher reasoning for spatial tasks
            //'thinking_level' => 'MEDIUM' 
        ]
    ];
    
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=' . $apiKey;
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 240); // Increased for Thinking Level
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $responseData = json_decode($response, true);
    
    if ($httpCode !== 200) {
        return ['success' => false, 'error' => "API Error: " . ($responseData['error']['message'] ?? 'Unknown')];
    }
    
    if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
        $rawJson = $responseData['candidates'][0]['content']['parts'][0]['text'];
        // Apply our grid-snapping post-processor before returning
        return ['success' => true, 'response' => snapToGrid($rawJson, 20)];
    }
    
    return ['success' => false, 'error' => 'No valid response content.'];
}