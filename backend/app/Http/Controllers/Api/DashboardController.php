<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AssignmentResource;
use App\Http\Resources\GameResource;
use App\Models\Assignment;
use App\Models\Game;
use App\Models\RefereeProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        if ($request->user()->role === 'referee') {
            $upcoming = Assignment::query()
                ->where('referee_id', $request->user()->id)
                ->whereIn('status', ['pending', 'accepted'])
                ->whereHas('game', fn ($query) => $query
                    ->where('status', 'scheduled')
                    ->where('starts_at', '>=', now()))
                ->with(['game.venue', 'referee.refereeProfile'])
                ->orderBy('created_at')
                ->limit(5)
                ->get();

            return response()->json([
                'role' => 'referee',
                'summary' => [
                    'upcoming_assignments' => Assignment::query()
                        ->where('referee_id', $request->user()->id)
                        ->whereIn('status', ['pending', 'accepted'])
                        ->whereHas('game', fn ($query) => $query->where('status', 'scheduled')->where('starts_at', '>=', now()))
                        ->count(),
                    'pending_responses' => Assignment::query()
                        ->where('referee_id', $request->user()->id)
                        ->where('status', 'pending')
                        ->count(),
                ],
                'upcoming_assignments' => AssignmentResource::collection($upcoming)->resolve(),
            ]);
        }

        $staffing = Assignment::query()
            ->select('game_id')
            ->selectRaw('COUNT(*) AS assigned_count')
            ->whereIn('status', ['pending', 'accepted', 'completed'])
            ->groupBy('game_id');

        $shortStaffed = Game::query()
            ->leftJoinSub($staffing, 'staffing', fn ($join) => $join->on('games.id', '=', 'staffing.game_id'))
            ->where('games.status', 'scheduled')
            ->where('games.starts_at', '>=', now())
            ->whereRaw('COALESCE(staffing.assigned_count, 0) < games.referee_slots');

        $gamesNeedingReferees = (clone $shortStaffed)
            ->select('games.*')
            ->with('venue')
            ->withCount(['assignments' => fn ($query) => $query->whereIn('status', ['pending', 'accepted', 'completed'])])
            ->orderBy('games.starts_at')
            ->limit(5)
            ->get();

        return response()->json([
            'role' => 'admin',
            'summary' => [
                'games_this_month' => Game::query()->whereBetween('starts_at', [now()->startOfMonth(), now()->endOfMonth()])->count(),
                'short_staffed_games' => (clone $shortStaffed)->count(),
                'pending_assignments' => Assignment::query()->where('status', 'pending')->count(),
                'active_referees' => RefereeProfile::query()->where('status', 'active')->count(),
                'completed_assignments' => Assignment::query()->where('status', 'completed')->count(),
            ],
            'games_needing_referees' => GameResource::collection($gamesNeedingReferees)->resolve(),
        ]);
    }
}
