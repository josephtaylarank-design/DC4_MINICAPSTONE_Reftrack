<?php

namespace Tests\Feature;

use App\Models\Game;
use App\Models\User;
use App\Models\Venue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RefTrackApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_registration_always_creates_a_referee(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Maya Referee',
            'email' => 'maya@example.test',
            'password' => 'correct-horse',
            'password_confirmation' => 'correct-horse',
            'role' => 'admin',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.role', 'referee')
            ->assertJsonStructure(['token', 'user' => ['referee_profile']]);
        $this->assertDatabaseHas('users', ['email' => 'maya@example.test', 'role' => 'referee']);
    }

    public function test_referee_cannot_create_games(): void
    {
        $referee = User::factory()->create(['role' => 'referee']);
        $referee->refereeProfile()->create(['license_level' => 'Level 1']);
        $venue = Venue::create(['name' => 'Main Gym', 'address' => '1 Main Street']);

        $this->actingAs($referee)->postJson('/api/games', [
            'venue_id' => $venue->id,
            'home_team' => 'Falcons',
            'away_team' => 'Eagles',
            'category' => 'U18',
            'starts_at' => now()->addDay()->setTime(15, 0)->toDateTimeString(),
            'ends_at' => now()->addDay()->setTime(17, 0)->toDateTimeString(),
        ])->assertForbidden();
    }

    public function test_assignment_rejects_a_referee_with_an_overlapping_game(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $referee = User::factory()->create(['role' => 'referee']);
        $referee->refereeProfile()->create(['license_level' => 'Level 1']);
        $venue = Venue::create(['name' => 'Main Gym', 'address' => '1 Main Street']);
        $start = now()->addDays(2)->setTime(15, 0);
        $firstGame = $this->makeGame($venue, $start, $start->copy()->addHours(2));
        $secondGame = $this->makeGame($venue, $start->copy()->addHour(), $start->copy()->addHours(3));

        $this->actingAs($admin)->postJson("/api/games/{$firstGame->id}/assignments", [
            'referee_id' => $referee->id,
            'position' => 'Crew Chief',
        ])->assertCreated();

        $this->postJson("/api/games/{$secondGame->id}/assignments", [
            'referee_id' => $referee->id,
            'position' => 'Crew Chief',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('referee_id');
    }

    public function test_assignment_rejects_a_referee_who_marked_the_game_time_unavailable(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $referee = User::factory()->create(['role' => 'referee']);
        $referee->refereeProfile()->create(['license_level' => 'Level 1']);
        $venue = Venue::create(['name' => 'Main Gym', 'address' => '1 Main Street']);
        $start = now()->addDays(2)->setTime(15, 0);
        $game = $this->makeGame($venue, $start, $start->copy()->addHours(2));
        $referee->availabilities()->create([
            'starts_at' => $start->copy()->subMinutes(30),
            'ends_at' => $start->copy()->addHours(1),
            'is_available' => false,
        ]);

        $this->actingAs($admin)->postJson("/api/games/{$game->id}/assignments", [
            'referee_id' => $referee->id,
            'position' => 'Crew Chief',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('referee_id');
    }

    public function test_referee_can_accept_own_pending_assignment_but_cannot_complete_it(): void
    {
        $referee = User::factory()->create(['role' => 'referee']);
        $referee->refereeProfile()->create(['license_level' => 'Level 1']);
        $venue = Venue::create(['name' => 'Main Gym', 'address' => '1 Main Street']);
        $start = now()->addDays(2)->setTime(15, 0);
        $game = $this->makeGame($venue, $start, $start->copy()->addHours(2));
        $assignment = $game->assignments()->create([
            'referee_id' => $referee->id,
            'position' => 'Crew Chief',
        ]);

        $this->actingAs($referee)
            ->patchJson("/api/assignments/{$assignment->id}/status", ['status' => 'accepted'])
            ->assertOk()
            ->assertJsonPath('data.status', 'accepted');

        $this->patchJson("/api/assignments/{$assignment->id}/status", ['status' => 'completed'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_dashboard_returns_role_specific_counts(): void
    {
        $referee = User::factory()->create(['role' => 'referee']);
        $referee->refereeProfile()->create(['license_level' => 'Level 1']);

        $this->actingAs($referee)
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('role', 'referee')
            ->assertJsonStructure(['summary' => ['upcoming_assignments', 'pending_responses']]);
    }

    public function test_admin_can_cancel_a_scheduled_game(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $venue = Venue::create(['name' => 'Main Gym', 'address' => '1 Main Street']);
        $start = now()->addDays(2)->setTime(15, 0);
        $game = $this->makeGame($venue, $start, $start->copy()->addHours(2));

        $this->actingAs($admin)
            ->patchJson("/api/games/{$game->id}/status", ['status' => 'cancelled'])
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_games_and_referees_paginate_but_venues_return_the_full_list(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Venue::create(['name' => 'Main Gym', 'address' => '1 Main Street']);

        $this->actingAs($admin)
            ->getJson('/api/games')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonStructure(['data', 'links', 'meta']);

        $this->getJson('/api/referees')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonStructure(['data', 'links', 'meta']);

        $this->getJson('/api/venues')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Main Gym')
            ->assertJsonMissingPath('meta');
    }

    private function makeGame(Venue $venue, $startsAt, $endsAt): Game
    {
        return Game::create([
            'venue_id' => $venue->id,
            'home_team' => 'Falcons',
            'away_team' => 'Eagles',
            'category' => 'U18',
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
        ]);
    }
}
