<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referee_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('license_level', 50)->default('Unlicensed');
            $table->string('phone', 30)->nullable();
            $table->unsignedTinyInteger('years_experience')->default(0);
            $table->string('status')->default('active')->index();
            $table->timestamps();
        });

        Schema::create('venues', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('address');
            $table->unsignedSmallInteger('court_count')->default(1);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('games', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venue_id')->constrained()->restrictOnDelete();
            $table->string('home_team');
            $table->string('away_team');
            $table->string('category', 50);
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at');
            $table->string('status')->default('scheduled')->index();
            $table->unsignedTinyInteger('referee_slots')->default(3);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->cascadeOnDelete();
            $table->foreignId('referee_id')->constrained('users')->restrictOnDelete();
            $table->string('position', 30);
            $table->string('status', 20)->default('pending')->index();
            $table->decimal('fee', 8, 2)->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['game_id', 'position']);
            $table->unique(['game_id', 'referee_id']);
        });

        Schema::create('availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referee_id')->constrained('users')->cascadeOnDelete();
            $table->dateTime('starts_at')->index();
            $table->dateTime('ends_at');
            $table->boolean('is_available');
            $table->string('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('availabilities');
        Schema::dropIfExists('assignments');
        Schema::dropIfExists('games');
        Schema::dropIfExists('venues');
        Schema::dropIfExists('referee_profiles');
    }
};
