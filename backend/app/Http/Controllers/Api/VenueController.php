<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVenueRequest;
use App\Http\Requests\UpdateVenueRequest;
use App\Http\Resources\VenueResource;
use App\Models\Venue;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class VenueController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return VenueResource::collection(
            Venue::query()->withCount('games')->orderBy('name')->get()
        );
    }

    public function show(Venue $venue): VenueResource
    {
        return new VenueResource($venue->loadCount('games'));
    }

    public function store(StoreVenueRequest $request): VenueResource
    {
        return new VenueResource(Venue::create($request->validated()));
    }

    public function update(UpdateVenueRequest $request, Venue $venue): VenueResource
    {
        $venue->update($request->validated());

        return new VenueResource($venue->refresh()->loadCount('games'));
    }

    public function destroy(Venue $venue): Response
    {
        abort_if($venue->games()->exists(), 422, 'A venue with scheduled games cannot be deleted.');
        $venue->delete();

        return response()->noContent();
    }
}
