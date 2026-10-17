<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AvailabilityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'starts_at' => $this->starts_at,
            'ends_at' => $this->ends_at,
            'is_available' => $this->is_available,
            'notes' => $this->notes,
        ];
    }
}
