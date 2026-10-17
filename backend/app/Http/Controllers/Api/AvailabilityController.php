<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAvailabilityRequest;
use App\Http\Resources\AvailabilityResource;
use App\Models\Availability;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class AvailabilityController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return AvailabilityResource::collection(
            $request->user()->availabilities()->orderBy('starts_at')->paginate(10)
        );
    }

    public function store(StoreAvailabilityRequest $request): AvailabilityResource
    {
        return new AvailabilityResource($request->user()->availabilities()->create($request->validated()));
    }

    public function destroy(Request $request, Availability $availability): Response
    {
        abort_unless($availability->referee_id === $request->user()->id, 403);
        $availability->delete();

        return response()->noContent();
    }
}
