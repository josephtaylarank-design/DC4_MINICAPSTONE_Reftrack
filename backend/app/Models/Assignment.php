<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Assignment extends Model
{
    protected $fillable = [
        'game_id',
        'referee_id',
        'position',
        'status',
        'fee',
        'responded_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
            'responded_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    public function referee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referee_id');
    }
}
