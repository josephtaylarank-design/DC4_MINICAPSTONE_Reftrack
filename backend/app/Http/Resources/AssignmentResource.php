<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'game_id' => $this->game_id,
            'referee_id' => $this->referee_id,
            'position' => $this->position,
            'status' => $this->status,
            'fee' => $this->fee,
            'responded_at' => $this->responded_at,
            'completed_at' => $this->completed_at,
            'game' => $this->whenLoaded('game', fn () => [
                'id' => $this->game->id,
                'home_team' => $this->game->home_team,
                'away_team' => $this->game->away_team,
                'category' => $this->game->category,
                'starts_at' => $this->game->starts_at,
                'ends_at' => $this->game->ends_at,
                'status' => $this->game->status,
                'venue' => $this->game->venue?->name,
            ]),
            'referee' => $this->whenLoaded('referee', fn () => [
                'id' => $this->referee->id,
                'name' => $this->referee->name,
                'license_level' => $this->referee->refereeProfile?->license_level,
            ]),
        ];
    }
}
