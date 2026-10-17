<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateRefereeStatusRequest;
use App\Http\Resources\RefereeResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RefereeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'search' => ['sometimes', 'string', 'max:120'],
            'license_level' => ['sometimes', 'string', 'max:50'],
            'status' => ['sometimes', 'in:active,inactive'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $referees = User::query()
            ->where('role', 'referee')
            ->with('refereeProfile')
            ->withCount('assignments')
            ->when($request->filled('search'), fn ($query) => $query
                ->where('name', 'like', '%'.$request->string('search')->toString().'%'))
            ->when($request->filled('license_level'), fn ($query) => $query
                ->whereHas('refereeProfile', fn ($profile) => $profile->where('license_level', $request->string('license_level')->toString())))
            ->when($request->filled('status'), fn ($query) => $query
                ->whereHas('refereeProfile', fn ($profile) => $profile->where('status', $request->string('status')->toString())))
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString();

        return RefereeResource::collection($referees);
    }

    public function show(User $referee): RefereeResource
    {
        abort_unless($referee->role === 'referee', 404);

        return new RefereeResource($referee->load('refereeProfile')->loadCount('assignments'));
    }

    public function updateStatus(UpdateRefereeStatusRequest $request, User $referee): RefereeResource
    {
        abort_unless($referee->role === 'referee', 404);
        $referee->refereeProfile()->updateOrCreate(
            ['user_id' => $referee->id],
            ['status' => $request->string('status')->toString()],
        );
        if ($request->string('status')->toString() === 'inactive') {
            $referee->tokens()->delete();
        }

        return new RefereeResource($referee->refresh()->load('refereeProfile')->loadCount('assignments'));
    }
}
