<?php

namespace App\Helpers;

set_time_limit(300); // 5 minutes

class DiagramEncoder
{
    public static $transitSchema = [
        'type' => 'object',
        'properties' => [
            'lines' => [
                'type' => 'array',
                'items' => [
                    'type' => 'object',
                    'properties' => [
                        'id' => ['type' => 'string', 'description' => 'Name of the line or branch'],
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

    public static $encodingPrompt = <<<'PROMPT'
You are a cartographic data engineer. Extract the transit network from this image into JSON.
CRITICAL GEOMETRIC RULES:
1. SCHEMATIC ALIGNMENT: This is a diagram, not a geographic map.
2. HORIZONTAL/VERTICAL: If a line segment looks horizontal, the Y coordinates for those stations MUST be identical. 
3. GRID SNAPPING: Snap all X and Y coordinates to the nearest 10 units.
4. DIAGONALS: For diagonal segments, the change in X must equal the change in Y.
5. BRANCHING & SHARED STATIONS: 
   - For branches OF THE SAME LINE (same line splits into multiple routes): Create MULTIPLE line objects with the same line ID or related names (e.g., "Canada Line" and "Canada Line Branch"). The main line should contain shared stations up to and INCLUDING the branch point. The branch line MUST START with the same branch point station (identical name and coordinates), then continue with branch-specific stations. This ensures seamless visual connection with no gaps.
   - For shared stations BETWEEN DIFFERENT LINES (e.g., transfer points like Waterfront, or overlapping segments between Expo and Millennium): Include those stations in EACH line's stations array with IDENTICAL coordinates. CRITICAL: If station "X" appears in multiple lines, it MUST have the exact same x and y values in every line. Create a coordinate reference list if needed. Each line gets its own line object with complete station lists including shared stations.
6. EXCLUSION: Only extract the rail-based SkyTrain lines.
7. COORDINATE RANGE: ALL coordinates must be within 0-500. X range: 0-500. Y range: 0-500. Distribute stations throughout this full range without clustering.
8. STATION SPACING: Consecutive stations on the same line should be evenly spaced. Aim for consistent 40-60 unit gaps between adjacent stations within each line.
9. SHARED STATION VALIDATION: Before outputting JSON, verify that any station appearing in multiple lines has identical coordinates across all occurrences. Do not create conflicting positions for the same station name.
10. NO OVERLAPS: Two different stations MUST NEVER have the same (x, y) coordinates, EXCEPT when they are the same station name appearing in multiple lines (transfer points). Different station names = different coordinates.
11. NO GAPS IN VISUAL SEGMENTS: If the diagram shows a continuous line segment between two stations, the distance should reflect actual station count. Do not skip stations or create artificial gaps. Follow the visual path exactly as shown.
12. COMPLETE STATION LISTS: Include ALL visible stations for each line, even if stations are shared with other lines. Do not omit stations to avoid duplication—duplication at transfer points is correct.
PROMPT;

    /**
     * Snap-to-Grid Post-Processor
     */
    public static function snapToGrid($jsonString, $grid = 20)
    {
        $data = json_decode($jsonString, true);
        if (!$data || !isset($data['lines'])) {
            return $jsonString;
        }

        foreach ($data['lines'] as &$line) {
            foreach ($line['stations'] as &$station) {
                $station['x'] = round($station['x'] / $grid) * $grid;
                $station['y'] = round($station['y'] / $grid) * $grid;
            }
        }
        return json_encode($data, JSON_PRETTY_PRINT);
    }

    /**
     * Sends image to Gemini 3 Flash (High Speed + Thinking)
     */
    public static function sendImageToGemini($imageInput, $apiKey = null, $mimeType = null)
    {
        if ($apiKey === null) {
            $apiKey = env('GEMINI_API_KEY');
        }
        if (empty($apiKey)) {
            return ['success' => false, 'error' => 'API key missing'];
        }

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
                    ['text' => self::$encodingPrompt],
                    [
                        'inline_data' => [
                            'mime_type' => $mimeType,
                            'data' => $base64Image
                        ],
                        'media_resolution' => [
                            'level' => 'media_resolution_high'
                        ]
                    ]
                ]
            ]],
            'generationConfig' => [
                'response_mime_type' => 'application/json',
                'response_schema' => self::$transitSchema,
                'temperature' => 1.0,
                'thinking_config' => [
                    'thinking_level' => 'medium'
                ]
            ]
        ];

        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=' . $apiKey;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($requestData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 120);

        $response = curl_exec($ch);
        $curlError = curl_error($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $responseData = json_decode($response, true);

        if ($response === false) {
            return ['success' => false, 'error' => "CURL Error: " . $curlError];
        }

        if ($httpCode !== 200) {
            $errorMsg = $responseData['error']['message'] ?? 'Unknown Error';
            return ['success' => false, 'error' => "API Error ({$httpCode}): " . $errorMsg];
        }

        if (isset($responseData['candidates'][0]['content']['parts'][0]['text'])) {
            $rawJson = $responseData['candidates'][0]['content']['parts'][0]['text'];
            return ['success' => true, 'response' => self::snapToGrid($rawJson, 20)];
        }

        return ['success' => false, 'error' => 'No valid response content. Check if quota exceeded.'];
    }
}