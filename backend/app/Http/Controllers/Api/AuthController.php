<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->string('name')->toString(),
                'email' => $request->string('email')->toString(),
                'password' => $request->string('password')->toString(),
                'role' => 'referee',
            ]);

            $user->refereeProfile()->create([
                'phone' => $request->input('phone'),
                'license_level' => $request->input('license_level', 'Unlicensed'),
                'years_experience' => $request->integer('years_experience', 0),
            ]);

            return $user->load('refereeProfile');
        });

        return response()->json([
            'message' => 'Registration successful.',
            'token' => $user->createToken('reftrack-spa')->plainTextToken,
            'user' => new UserResource($user),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::with('refereeProfile')->where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password')->toString(), $user->password)) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 401);
        }

        if ($user->role === 'referee' && $user->refereeProfile?->status !== 'active') {
            return response()->json(['message' => 'This referee account is inactive.'], 403);
        }

        return response()->json([
            'message' => 'Login successful.',
            'token' => $user->createToken('reftrack-spa')->plainTextToken,
            'user' => new UserResource($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function user(Request $request): UserResource
    {
        return new UserResource($request->user()->load('refereeProfile'));
    }
}
