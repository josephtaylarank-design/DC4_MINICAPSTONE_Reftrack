<?php

use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AvailabilityController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\GameController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RefereeController;
use App\Http\Controllers\Api\VenueController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::get('/dashboard', DashboardController::class);

    Route::get('/games', [GameController::class, 'index']);
    Route::get('/games/{game}', [GameController::class, 'show']);

    Route::get('/venues', [VenueController::class, 'index']);
    Route::get('/venues/{venue}', [VenueController::class, 'show']);

    Route::middleware('role:referee')->group(function () {
        Route::get('/my-assignments', [AssignmentController::class, 'mine']);
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::patch('/profile', [ProfileController::class, 'update']);

        Route::get('/availabilities', [AvailabilityController::class, 'index']);
        Route::post('/availabilities', [AvailabilityController::class, 'store']);
        Route::delete('/availabilities/{availability}', [AvailabilityController::class, 'destroy']);
    });

    Route::patch('/assignments/{assignment}/status', [AssignmentController::class, 'updateStatus']);

    Route::middleware('role:admin')->group(function () {
        Route::post('/games', [GameController::class, 'store']);
        Route::put('/games/{game}', [GameController::class, 'update']);
        Route::patch('/games/{game}', [GameController::class, 'update']);
        Route::patch('/games/{game}/status', [GameController::class, 'updateStatus']);
        Route::delete('/games/{game}', [GameController::class, 'destroy']);

        Route::post('/games/{game}/assignments', [AssignmentController::class, 'store']);
        Route::delete('/assignments/{assignment}', [AssignmentController::class, 'destroy']);

        Route::post('/venues', [VenueController::class, 'store']);
        Route::put('/venues/{venue}', [VenueController::class, 'update']);
        Route::patch('/venues/{venue}', [VenueController::class, 'update']);
        Route::delete('/venues/{venue}', [VenueController::class, 'destroy']);

        Route::get('/referees', [RefereeController::class, 'index']);
        Route::get('/referees/{referee}', [RefereeController::class, 'show']);
        Route::patch('/referees/{referee}/status', [RefereeController::class, 'updateStatus']);
    });
});
