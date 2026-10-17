<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GameResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'home_team' => $this->home_team,
            'away_team' => $this->away_team,
            'category' => $this->category,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'status' => $this->status,
            'referee_slots' => $this->referee_slots,
            'notes' => $this->notes,
            'venue' => VenueResource::make($this->whenLoaded('venue')),
            'assignments_count' => $this->whenCounted('assignments'),
            'assignments' => AssignmentResource::collection($this->whenLoaded('assignments')),
        ];
    }
}
