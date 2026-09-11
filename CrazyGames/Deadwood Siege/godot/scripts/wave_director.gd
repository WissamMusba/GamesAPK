extends Node
## Deadwood Siege v7 — Wave Director
## Handles budget scaling, archetype wheel, wave modifiers, 3-state wave machine (prep -> active -> breather),
## and spawns zombies in radius 640-920px around the player.

const ZombieScene := preload("res://scenes/Zombie.tscn")

signal wave_started(wave: int, plan: Dictionary)
signal wave_cleared(wave: int)
signal wave_incoming(wave: int)
signal mods_changed(mods: Array)
signal countdown_tick(secs: int)
signal state_changed(state: String)

const ARCH_WHEEL: Array[String] = [
	"Mix", "Rush", "Siege", "Mix", "Raid", "Swarm", "Breather"
]

const ARCH_MIX: Dictionary = {
	"Mix": {"sham": 3.0, "run": 2.0, "sap": 1.2, "scav": 1.0, "brute": 0.8, "spit": 0.8},
	"Rush": {"run": 4.0, "sham": 2.0, "scav": 1.0},
	"Siege": {"sap": 3.5, "brute": 1.6, "sham": 1.0},
	"Raid": {"scav": 3.0, "run": 2.0, "spit": 1.0},
	"Swarm": {"sham": 5.0, "run": 1.5},
	"Breather": {"sham": 2.0}
}

const COST: Dictionary = {
	"sham": 1.0,
	"run": 1.5,
	"sap": 2.0,
	"scav": 2.0,
	"brute": 4.0,
	"spit": 3.0,
	"champ": 12.0,
	"warlord": 0.0
}

const FIRST_W: Dictionary = {
	"sham": 1,
	"run": 3,
	"sap": 5,
	"scav": 8,
	"brute": 12,
	"spit": 16,
	"champ": 25,
	"warlord": 10
}

const MODS: Array[Dictionary] = [
	{"id": "bloodlust", "name": "Bloodlust", "w": 12, "desc": "Zombie speed +12%"},
	{"id": "armored", "name": "Armored", "w": 20, "desc": "30% chance +50% HP"},
	{"id": "undying", "name": "Undying", "w": 35, "desc": "12% chance revive once at 35% HP"},
	{"id": "warcry", "name": "War Drums", "w": 45, "desc": "Zombie speed +5%"}
]

const REFERENCE_SEED := 9137

var run_seed: int = REFERENCE_SEED
var wave: int = 0
var wave_state: String = "prep" # "prep", "active", "breather"
var wave_timer: float = 4.0
var spawn_timer: float = 0.4
var spawn_queue: Array = []
var active_mods: Array = []
var alive: int = 0
var _last_tick_sec: int = -1

func _ready() -> void:
	pass

func start_run(seed_override: int = -1) -> void:
	run_seed = seed_override if seed_override >= 0 else randi()
	wave = 0
	alive = 0
	spawn_queue.clear()
	active_mods.clear()
	wave_state = "prep"
	wave_timer = 4.0
	_last_tick_sec = -1
	state_changed.emit(wave_state)
	wave_incoming.emit(1)

func wave_budget(n: int) -> float:
	if n <= 50:
		return 3.0 + 1.6 * float(n) + 0.35 * pow(float(n), 1.3)
	if n <= 120:
		return 142.0 + float(n - 50) * 2.6
	return 324.0 + float(n - 120) * 3.2

func budget(n: int) -> float:
	return wave_budget(n)

func era_of(n: int) -> int:
	if n <= 20: return 1
	if n <= 50: return 2
	if n <= 100: return 3
	if n <= 150: return 4
	return 5

func arch_of(n: int) -> String:
	if n % 10 == 0:
		return "Boss"
	return ARCH_WHEEL[(n - 1) % 7]

func avail_types(n: int) -> Array:
	var out: Array = []
	for k in FIRST_W.keys():
		if int(FIRST_W[k]) <= n and k != "warlord" and k != "champ":
			out.append(k)
	return out

func roll_mods(n: int, rng: RandomNumberGenerator) -> Array:
	if n < 12:
		return []
	var pool: Array = []
	for m in MODS:
		if int(m["w"]) <= n:
			pool.append(m["id"])
	if pool.is_empty():
		return []
	var e := era_of(n)
	var count := 0
	if e == 2:
		count = 1 if rng.randf() < 0.35 else 0
	elif e == 3:
		count = 1 if rng.randf() < 0.60 else 0
	elif e == 4:
		count = 1 + (1 if rng.randf() < 0.20 else 0)
	else:
		count = 1 + (1 if rng.randf() < 0.30 else 0) + (1 if rng.randf() < 0.10 else 0)

	var out: Array = []
	var copy := pool.duplicate()
	while out.size() < count and not copy.is_empty():
		var idx := rng.randi_range(0, copy.size() - 1)
		out.append(copy[idx])
		copy.remove_at(idx)
	return out

func roll_mix(arch: String, n: int, rng: RandomNumberGenerator) -> Dictionary:
	var avail := avail_types(n)
	var weights: Dictionary = ARCH_MIX.get(arch, ARCH_MIX["Mix"])
	var rem := wave_budget(n)
	if arch == "Boss":
		rem *= 0.5
	if arch == "Breather":
		rem *= 0.4

	var pool: Array = []
	for t in avail:
		if float(weights.get(t, 0.0)) > 0.0:
			pool.append(t)
	if pool.is_empty():
		pool.append("sham")

	var mix := {}
	var guard := 0
	while rem >= 1.0 and guard < 4000:
		guard += 1
		var tot := 0.0
		for t in pool:
			tot += float(weights.get(t, 0.0))
		var r := rng.randf() * tot
		var pick: String = pool[0]
		for t in pool:
			r -= float(weights.get(t, 0.0))
			if r <= 0.0:
				pick = t
				break
		var c: float = float(COST.get(pick, 1.0))
		if c > rem:
			break
		mix[pick] = int(mix.get(pick, 0)) + 1
		rem -= c
	return mix

func build_wave_queue(n: int, rng: RandomNumberGenerator) -> Array:
	var arch := arch_of(n)
	var mix := roll_mix(arch, n, rng)
	var q: Array = []
	for t in mix.keys():
		for i in range(int(mix[t])):
			q.append(t)
	if arch == "Boss":
		q.append("warlord")
	if n >= 25 and n % 5 == 0 and n % 10 != 0:
		q.append("champ")

	# Shuffle
	for i in range(q.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var tmp = q[i]
		q[i] = q[j]
		q[j] = tmp
	return q

func start_wave() -> void:
	wave += 1
	var rng := RandomNumberGenerator.new()
	rng.seed = run_seed + wave * 7919

	var arch := arch_of(wave)
	spawn_queue = build_wave_queue(wave, rng)
	spawn_timer = 0.4
	wave_state = "active"
	active_mods = roll_mods(wave, rng)
	alive = spawn_queue.size()
	_last_tick_sec = -1

	Game.wave = wave
	Game.wave_damage_taken = 0.0
	Game.wave_changed.emit(wave)

	var plan := {
		"wave": wave,
		"arch": arch,
		"count": spawn_queue.size(),
		"mods": active_mods,
		"is_boss": (arch == "Boss"),
		"is_breather": (arch == "Breather")
	}

	state_changed.emit("active")
	wave_started.emit(wave, plan)
	mods_changed.emit(active_mods)

	if wave % 10 == 0:
		Game.gold += 1
		Game.resources_changed.emit()

func _process(delta: float) -> void:
	if not Game.run_active:
		return
	delta = minf(delta, 0.05)

	match wave_state:
		"prep":
			wave_timer -= delta
			var sec := int(ceil(wave_timer))
			if sec != _last_tick_sec and sec > 0:
				_last_tick_sec = sec
				countdown_tick.emit(sec)
			if wave_timer <= 0.0:
				start_wave()

		"active":
			if not spawn_queue.is_empty():
				spawn_timer -= delta
				if spawn_timer <= 0.0:
					spawn_timer = maxf(0.15, 0.62 - float(wave) * 0.005)
					var kind: String = spawn_queue.pop_front()
					spawn_zombie(kind)
			elif alive <= 0 and get_tree().get_nodes_in_group("zombie").is_empty():
				# WAVE CLEARED!
				wave_state = "breather"
				wave_timer = 8.0
				_last_tick_sec = -1
				state_changed.emit("breather")
				grant_wave_loot()

				# Flawless and wave achievements
				if Game.wave_damage_taken <= 0.0:
					Game.unlock_achievement("perfectWave")
					Game.push_kill_feed("✨ FLAWLESS WAVE!", "gold")
				if wave == 10:
					Game.unlock_achievement("wave10")
				elif wave == 25:
					Game.unlock_achievement("wave25")

				# Time crystal rewards
				if wave % 5 == 0:
					Game.crystals += 1
					Game.crystals_changed.emit(Game.crystals)
					Game.push_kill_feed("💎 +1 TIME CRYSTAL", "violet")

				wave_cleared.emit(wave)
				wave_incoming.emit(wave + 1)

		"breather":
			wave_timer -= delta
			var sec := int(ceil(wave_timer))
			if sec != _last_tick_sec and sec > 0:
				_last_tick_sec = sec
				countdown_tick.emit(sec)
			if wave_timer <= 0.0:
				wave_state = "prep"
				wave_timer = 4.0
				_last_tick_sec = -1
				state_changed.emit("prep")

func notify_killed() -> void:
	alive = maxi(0, alive - 1)

func grant_wave_loot() -> void:
	var mult := minf(2.5, 1.0 + float(wave) / 60.0)
	if arch_of(wave) == "Breather":
		Game.add_loot(int(40.0 * mult), int(25.0 * mult), int(15.0 * mult))
	else:
		var w := 20 + wave * 2
		var s := 12 + wave
		var f := 8 + int(floor(float(wave) * 0.8))
		Game.add_loot(w, s, f)

func get_spawn_pos_around(center: Vector2) -> Vector2:
	var tries := 0
	var pos := center
	while tries < 40:
		var a := randf() * TAU
		var d := randf_range(640.0, 920.0)
		pos = center + Vector2(cos(a), sin(a)) * d
		if pos.x >= 100.0 and pos.x <= 2048.0 - 100.0 and pos.y >= 100.0 and pos.y <= 2048.0 - 100.0:
			return pos
		tries += 1
	return pos.clamp(Vector2(100.0, 100.0), Vector2(1948.0, 1948.0))

func spawn_zombie(kind: String) -> CharacterBody2D:
	var player_node: Node2D = get_tree().get_first_node_in_group("player") as Node2D
	var center := player_node.global_position if (player_node and is_instance_valid(player_node)) else Vector2(1024.0, 1024.0)
	var pos := get_spawn_pos_around(center)

	var z: CharacterBody2D = ZombieScene.instantiate() as CharacterBody2D
	z.position = pos
	z.setup(kind, wave, active_mods)

	var target_parent: Node = get_tree().get_first_node_in_group("game")
	if target_parent == null:
		target_parent = get_tree().current_scene
	if target_parent:
		target_parent.add_child(z)

	return z


