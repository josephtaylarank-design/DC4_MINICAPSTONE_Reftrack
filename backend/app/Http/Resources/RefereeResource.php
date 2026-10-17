<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RefereeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'profile' => $this->whenLoaded('refereeProfile', fn () => [
                'license_level' => $this->refereeProfile->license_level,
                'phone' => $this->refereeProfile->phone,
                'years_experience' => $this->refereeProfile->years_experience,
                'status' => $this->refereeProfile->status,
            ]),
            'assignments_count' => $this->whenCounted('assignments'),
        ];
    }
}
