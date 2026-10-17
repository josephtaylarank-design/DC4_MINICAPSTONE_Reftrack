<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use Illuminate\Support\Facades\DB;

class ProfileController extends Controller
{
    public function show(): UserResource
    {
        return new UserResource(request()->user()->load('refereeProfile'));
    }

    public function update(UpdateProfileRequest $request): UserResource
    {
        $user = $request->user();
        $data = $request->validated();

        DB::transaction(function () use ($user, $data) {
            $user->update(collect($data)->only(['name', 'email'])->all());
            $user->refereeProfile()->updateOrCreate(
                ['user_id' => $user->id],
                collect($data)->only(['phone', 'license_level', 'years_experience'])->all(),
            );
        });

        return new UserResource($user->refresh()->load('refereeProfile'));
    }
}
