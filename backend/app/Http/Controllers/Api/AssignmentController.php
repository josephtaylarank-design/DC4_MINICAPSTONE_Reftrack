<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssignmentRequest;
use App\Http\Resources\AssignmentResource;
use App\Models\Assignment;
use App\Models\Game;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AssignmentController extends Controller
{
    public function mine(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'status' => ['sometimes', 'in:pending,accepted,declined,completed'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $assignments = Assignment::query()
            ->where('referee_id', $request->user()->id)
            ->with(['game.venue', 'referee.refereeProfile'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString();

        return AssignmentResource::collection($assignments);
    }

    public function store(StoreAssignmentRequest $request, Game $game): AssignmentResource
    {
        $assignment = DB::transaction(function () use ($request, $game) {
            $game = Game::query()->lockForUpdate()->findOrFail($game->id);

            if ($game->status !== 'scheduled') {
                throw ValidationException::withMessages(['game_id' => 'Referees can only be assigned to scheduled games.']);
            }

            $referee = User::query()->with('refereeProfile')->findOrFail($request->integer('referee_id'));
            if ($referee->role !== 'referee' || $referee->refereeProfile?->status !== 'active') {
                throw ValidationException::withMessages(['referee_id' => 'Choose an active referee account.']);
            }

            $data = $request->validated();
            if ($game->assignments()->where('position', $data['position'])->exists()) {
                throw ValidationException::withMessages(['position' => 'This game position is already filled.']);
            }

            if ($game->assignments()->where('referee_id', $referee->id)->exists()) {
                throw ValidationException::withMessages(['referee_id' => 'This referee is already assigned to this game.']);
            }

            $hasConflict = Assignment::query()
                ->where('referee_id', $referee->id)
                ->whereIn('status', ['pending', 'accepted'])
                ->whereHas('game', fn ($query) => $query
                    ->where('status', 'scheduled')
                    ->where('starts_at', '<', $game->ends_at)
                    ->where('ends_at', '>', $game->starts_at))
                ->exists();

            if ($hasConflict) {
                throw ValidationException::withMessages(['referee_id' => 'This referee already has an overlapping assignment.']);
            }

            $isUnavailable = $referee->availabilities()
                ->where('is_available', false)
                ->where('starts_at', '<', $game->ends_at)
                ->where('ends_at', '>', $game->starts_at)
                ->exists();

            if ($isUnavailable) {
                throw ValidationException::withMessages(['referee_id' => 'This referee marked this game time as unavailable.']);
            }

            return $game->assignments()->create([
                'referee_id' => $referee->id,
                'position' => $data['position'],
                'fee' => $data['fee'] ?? null,
            ]);
        });

        return new AssignmentResource($assignment->load('referee.refereeProfile'));
    }

    public function updateStatus(Request $request, Assignment $assignment): AssignmentResource
    {
        $data = $request->validate([
            'status' => ['required', 'in:accepted,declined,completed'],
        ]);
        $user = $request->user();

        if ($user->role === 'referee') {
            abort_unless($assignment->referee_id === $user->id, 403, 'You can only respond to your own assignments.');
            if ($assignment->status !== 'pending' || ! in_array($data['status'], ['accepted', 'declined'], true)) {
                throw ValidationException::withMessages(['status' => 'Only pending assignments can be accepted or declined.']);
            }

            $assignment->update([
                'status' => $data['status'],
                'responded_at' => now(),
            ]);
        } else {
            abort_unless($user->role === 'admin', 403, 'You are not authorized to update this assignment.');
            if ($data['status'] !== 'completed' || $assignment->status !== 'accepted') {
                throw ValidationException::withMessages(['status' => 'Only accepted assignments can be marked completed by an admin.']);
            }

            $assignment->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
        }

        return new AssignmentResource($assignment->refresh()->load(['game.venue', 'referee.refereeProfile']));
    }

    public function destroy(Assignment $assignment): Response
    {
        $assignment->delete();

        return response()->noContent();
    }
}
