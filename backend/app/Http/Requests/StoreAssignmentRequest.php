<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'referee_id' => ['required', 'integer', 'exists:users,id'],
            'position' => ['required', 'in:Crew Chief,Referee 1,Referee 2'],
            'fee' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
        ];
    }
}
