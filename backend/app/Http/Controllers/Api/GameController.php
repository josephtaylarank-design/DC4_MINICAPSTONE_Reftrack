<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreGameRequest;
use App\Http\Requests\UpdateGameRequest;
use App\Http\Requests\UpdateGameStatusRequest;
use App\Http\Resources\GameResource;
use App\Models\Game;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class GameController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'search' => ['sometimes', 'string', 'max:120'],
            'status' => ['sometimes', 'in:scheduled,completed,cancelled'],
            'category' => ['sometimes', 'string', 'max:50'],
            'venue_id' => ['sometimes', 'integer', 'min:1'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $games = Game::query()
            ->with('venue')
            ->withCount(['assignments' => fn ($query) => $query->whereIn('status', ['pending', 'accepted', 'completed'])])
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();
                $query->where(function ($query) use ($search) {
                    $query->where('home_team', 'like', "%{$search}%")
                        ->orWhere('away_team', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->string('category')->toString()))
            ->when($request->filled('venue_id'), fn ($query) => $query->where('venue_id', $request->integer('venue_id')))
            ->when($request->filled('date'), fn ($query) => $query->whereDate('starts_at', $request->date('date')))
            ->orderBy('starts_at')
            ->paginate(10)
            ->withQueryString();

        return GameResource::collection($games);
    }

    public function show(Game $game): GameResource
    {
        return new GameResource($game->load(['venue', 'assignments.referee.refereeProfile'])->loadCount([
            'assignments' => fn ($query) => $query->whereIn('status', ['pending', 'accepted', 'completed']),
        ]));
    }

    public function store(StoreGameRequest $request): GameResource
    {
        $game = Game::create($request->validated());

        return new GameResource($game->load('venue')->loadCount('assignments'));
    }

    public function update(UpdateGameRequest $request, Game $game): GameResource
    {
        $game->update($request->validated());

        return new GameResource($game->refresh()->load('venue')->loadCount('assignments'));
    }

    public function updateStatus(UpdateGameStatusRequest $request, Game $game): GameResource
    {
        abort_unless($game->status === 'scheduled', 422, 'Only scheduled games can be completed or cancelled.');
        $game->update($request->validated());

        return new GameResource($game->refresh()->load('venue')->loadCount('assignments'));
    }

    public function destroy(Game $game): Response
    {
        $game->delete();

        return response()->noContent();
    }
}
