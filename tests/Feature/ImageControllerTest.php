<?php
namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ImageControllerTest extends TestCase
{
    /**
     * Test that the image conversion endpoint works with a real transit diagram
     */
    public function test_convert_image_endpoint()
    {
        // Use your actual test image
        $imagePath = app_path('Helpers/Canada_line_diagram.png');
        
        $response = $this->post('/api/convert-image', [
            'image' => new UploadedFile(
                $imagePath,
                'Canada_line_diagram.png',
                'image/png',
                null,
                true
            ),
        ]);
        
        // Assert successful response
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'image/png');
        $this->assertNotEmpty($response->getContent());
    }
    
    /**
     * Test validation - missing image
     */
    public function test_missing_image_validation()
    {
        $response = $this->postJson('/api/convert-image', []);
        $response->assertStatus(422);
    }
}