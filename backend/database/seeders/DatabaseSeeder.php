<?php

namespace Database\Seeders;

use App\Models\Game;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => env('REFTRACK_ADMIN_EMAIL', 'admin@reftrack.test')],
            [
                'name' => 'RefTrack Admin',
                'role' => 'admin',
                'password' => env('REFTRACK_ADMIN_PASSWORD', 'password'),
            ],
        );

        $referees = User::factory(12)->create(['role' => 'referee']);
        $referees->each(fn (User $referee) => $referee->refereeProfile()->create([
            'license_level' => fake()->randomElement(['Level 1', 'Level 2', 'Level 3']),
            'phone' => fake()->phoneNumber(),
            'years_experience' => fake()->numberBetween(0, 15),
        ]));

        $venues = collect([
            ['Central Sports Hall', '100 Main Street', 2],
            ['Westside Gymnasium', '25 West Avenue', 1],
            ['Community Courts', '8 Park Road', 3],
        ])->map(fn (array $data) => Venue::create([
            'name' => $data[0],
            'address' => $data[1],
            'court_count' => $data[2],
        ]));

        for ($index = 0; $index < 20; $index++) {
            $isCompleted = $index < 5;
            $startsAt = $isCompleted
                ? now()->subDays(5 - $index)->setTime(8, 0)
                : now()->addDays($index - 4)->setTime(8, 0);

            $game = Game::create([
                'venue_id' => $venues[$index % $venues->count()]->id,
                'home_team' => fake()->city().' Hawks',
                'away_team' => fake()->city().' Tigers',
                'category' => fake()->randomElement(['U18', 'Open', 'U16']),
                'starts_at' => $startsAt,
                'ends_at' => (clone $startsAt)->addHours(2),
                'status' => $isCompleted ? 'completed' : 'scheduled',
                'referee_slots' => 3,
            ]);

            $staffCount = $isCompleted ? 2 : $index % 4;
            foreach ($referees->take($staffCount)->values() as $position => $referee) {
                $game->assignments()->create([
                    'referee_id' => $referee->id,
                    'position' => ['Crew Chief', 'Referee 1', 'Referee 2'][$position],
                    'status' => $isCompleted ? 'completed' : ($position === 0 ? 'accepted' : 'pending'),
                    'completed_at' => $isCompleted ? $game->ends_at : null,
                    'responded_at' => ! $isCompleted && $position > 0 ? null : $game->starts_at,
                    'fee' => 50,
                ]);
            }
        }
    }
}
