<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGameRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'venue_id' => ['required', 'integer', 'exists:venues,id'],
            'home_team' => ['required', 'string', 'max:120'],
            'away_team' => ['required', 'string', 'max:120', 'different:home_team'],
            'category' => ['required', 'string', 'max:50'],
            'starts_at' => ['required', 'date', 'after:now'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'referee_slots' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
