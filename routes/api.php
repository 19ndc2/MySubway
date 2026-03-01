<?php

use App\Http\Controllers\ImageController;

Route::post('convert-image', [ImageController::class, 'generate']);