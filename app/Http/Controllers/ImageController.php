<?php

namespace App\Http\Controllers;

use App\Helpers\ImageConverter;
use Illuminate\Http\Request;

class ImageController extends Controller
{
    /**
     * Accept a user-uploaded image, convert it to PNG using your helper, and return it.
     */
    public function generate(Request $request)
    {
        // 1️⃣ Validate the upload
        $request->validate([
            'image' => 'required|image',
        ]);

        // 2️⃣ Get uploaded file
        $uploaded = $request->file('image');
        $binary = file_get_contents($uploaded);
        $mime = $uploaded->getMimeType();

        // 3️⃣ Call ImageConverter to convert the image to PNG
        $pngData = ImageConverter::convert($binary, $mime);

        // 4️⃣ Return the PNG directly
        return response($pngData, 200, [
            'Content-Type' => 'image/png',
            'Content-Disposition' => 'inline; filename="diagram.png"',
        ]);
    }
}