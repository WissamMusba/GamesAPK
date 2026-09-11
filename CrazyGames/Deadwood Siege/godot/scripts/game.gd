extends Node
## Deadwood Siege v7 — Global run state (autoload as "Game").
## Resources, XP/level, score/combo, achievements, kill feed, crystals,
## time-rewind snapshots, lock state, and persistent stats. NO GOLD.

signal resources_changed
signal wave_changed(wave: int)
signal xp_changed(xp: int, to_next: int, level: int)
signal score_changed(score: int, combo: int)
signal combo_changed(combo: int)
signal combo_displayed(combo: int)
signal level_up(new_level: int)
signal crystals_changed(count: int)
signal achievement_unlocked(id: String, info: Dictionary)
signal kill_feed_event(text: String, cls: String)
signal locks_changed(lock_cursor: bool, auto_attack: bool)
signal time_rewound
signal day_time_changed(t: float)
signal boss_hp_changed(hp: float, max_hp: float)

const SAVE_KEY := "deadwood_siege_v7"
const GRID := 32.0
const SNAP_INT := 2.0
const SNAP_SLOTS := 30
const DAY_CYCLE_SECONDS := 180.0

# --- Resources (v7: wood, stone, food only) ---
var wood: int = 120
var stone: int = 40
var food: int = 45
var wave: int = 0
var kills: int = 0
var scraps: int = 0
var crystals: int = 1

# --- Progression ---
var xp: int = 0
var level: int = 1
var score: int = 0
var combo: int = 0
var combo_timer: float = 0.0
var best_combo_this_run: int = 0

# --- Persistent stats ---
var best_wave: int = 0
var best_combo: int = 0
var total_kills: int = 0
var total_score: int = 0
var runs: int = 0
var structures_placed: int = 0
var wave_damage_taken: float = 0.0
var secondary_wind_available: bool = true
var kills_this_wave: int = 0

# --- Locks (X = cursor, C = attack) ---
var lock_cursor: bool = false
var lock_attack: bool = false
var locked_angle: float = 0.0

# --- Day/night ---
var day_time: float = 0.30   # 0..1 over DAY_CYCLE_SECONDS

var run_active: bool = false

# --- Rewind ---
var rewind_snapshots: Array[Dictionary] = []
var _snap_acc: float = 0.0

# --- Achievements ---
const ACHIEVEMENTS := {
	"firstBlood":  {"ic": "🩸", "ti": "FIRST BLOOD",       "sb": "Kill your first zombie"},
	"combo10":     {"ic": "🔥", "ti": "COMBO ×10",          "sb": "Reach a ×10 kill chain"},
	"combo25":     {"ic": "💥", "ti": "COMBO ×25",          "sb": "Reach a ×25 kill chain"},
	"level5":      {"ic": "⭐", "ti": "LEVEL 5",            "sb": "Reach level 5"},
	"level10":     {"ic": "🌟", "ti": "LEVEL 10",           "sb": "Reach level 10"},
	"wave10":      {"ic": "🏰", "ti": "WAVE 10",            "sb": "Survive to wave 10"},
	"wave25":      {"ic": "🏯", "ti": "WAVE 25",            "sb": "Survive to wave 25"},
	"builder":     {"ic": "🔨", "ti": "BUILDER",            "sb": "Place 20 structures in one run"},
	"ballista":    {"ic": "🎯", "ti": "BALLISTA UNLOCKED",  "sb": "Reach level 6"},
	"bossSlayer":  {"ic": "👑", "ti": "BOSS SLAYER",        "sb": "Kill a Warlord"},
	"perfectWave": {"ic": "✨", "ti": "FLAWLESS",           "sb": "Clear a wave without taking damage"},
	"survivor":    {"ic": "💪", "ti": "SECOND WIND",        "sb": "Revive from near-death"}
}
var unlocked_achievements: Dictionary = {}
var achievement_queue: Array[String] = []

# --- Building definitions (v7, unlock by level) ---
const BUILD_DEFS := [
	{"id": "wall",     "name": "WALL",     "hotkey": "1", "unlockLv": 1, "fw": 4, "fh": 1, "cost": {"w": 20,  "s": 0,  "f": 0}},
	{"id": "door",     "name": "DOOR",     "hotkey": "2", "unlockLv": 1, "fw": 2, "fh": 1, "cost": {"w": 15,  "s": 0,  "f": 0}},
	{"id": "spike",    "name": "SPIKES",   "hotkey": "3", "unlockLv": 1, "fw": 2, "fh": 2, "cost": {"w": 14,  "s": 14, "f": 0}},
	{"id": "crossbow", "name": "CROSSBOW", "hotkey": "4", "unlockLv": 2, "fw": 4, "fh": 2, "cost": {"w": 80,  "s": 0,  "f": 0}},
	{"id": "farm",     "name": "FARM",     "hotkey": "5", "unlockLv": 2, "fw": 2, "fh": 2, "cost": {"w": 25,  "s": 0,  "f": 0}},
	{"id": "tar",      "name": "TAR PIT",  "hotkey": "6", "unlockLv": 3, "fw": 2, "fh": 2, "cost": {"w": 12,  "s": 20, "f": 0}},
	{"id": "cauldron", "name": "CAULDRON", "hotkey": "7", "unlockLv": 4, "fw": 2, "fh": 2, "cost": {"w": 40,  "s": 30, "f": 0}},
	{"id": "ballista", "name": "BALLISTA", "hotkey": "8", "unlockLv": 6, "fw": 6, "fh": 2, "cost": {"w": 160, "s": 70, "f": 0}}
]

func _ready() -> void:
	load_save()
	set_process(true)

func _process(delta: float) -> void:
	if not run_active or get_tree().paused:
		return
	if combo > 0:
		combo_timer -= delta
		if combo_timer <= 0.0:
			combo = 0
			combo_timer = 0.0
			combo_changed.emit(0)
			score_changed.emit(score, 0)
	_tick_snapshots(delta)
	day_time += delta / DAY_CYCLE_SECONDS
	if day_time >= 1.0:
		day_time -= 1.0
	day_time_changed.emit(day_time)

# ---------------- Run lifecycle ----------------
func new_run() -> void:
	wood = 120; stone = 40; food = 45
	wave = 0; kills = 0; scraps = 0
	xp = 0; level = 1; score = 0; combo = 0; combo_timer = 0.0
	best_combo_this_run = 0
	crystals = 1
	structures_placed = 0
	wave_damage_taken = 0.0
	kills_this_wave = 0
	secondary_wind_available = true
	lock_cursor = false; lock_attack = false; locked_angle = 0.0
	run_active = true
	rewind_snapshots.clear()
	_snap_acc = 0.0
	resources_changed.emit()
	wave_changed.emit(0)
	xp_changed.emit(xp, xp_to_next(level), level)
	score_changed.emit(score, combo)
	combo_changed.emit(0)
	crystals_changed.emit(crystals)
	locks_changed.emit(lock_cursor, lock_attack)

func end_run() -> void:
	run_active = false
	total_kills += kills
	total_score += score
	if wave > best_wave:
		best_wave = wave
	if best_combo_this_run > best_combo:
		best_combo = best_combo_this_run
	runs += 1
	save_game()

# ---------------- Resources ----------------
func add_loot(w: int, s: int, f: int) -> void:
	wood += w; stone += s; food += f
	resources_changed.emit()

func spend(w: int, s: int, f: int) -> bool:
	if wood < w or stone < s or food < f:
		return false
	wood -= w; stone -= s; food -= f
	resources_changed.emit()
	return true

# ---------------- Level curve ----------------
static func xp_to_next(lv: int) -> int:
	return 25 + (lv - 1) * 25

func gain_xp(n: int) -> void:
	xp += n
	var cur := xp_to_next(level)
	while xp >= cur:
		xp -= cur
		level += 1
		cur = xp_to_next(level)
		_apply_level_up()
	xp_changed.emit(xp, cur, level)

func _apply_level_up() -> void:
	var player = get_tree().get_first_node_in_group("player")
	if player and is_instance_valid(player):
		if "max_hp" in player: player.max_hp += 8.0
		if "hp" in player:     player.hp = minf(player.max_hp, player.hp + 20.0)
		if "axe_dmg" in player: player.axe_dmg += 3.0
	push_kill_feed("⭐ LEVEL %d" % level, "gold")
	level_up.emit(level)
	if level == 5:    unlock_achievement("level5")
	elif level == 6:  unlock_achievement("ballista")
	elif level == 10: unlock_achievement("level10")
	for def in BUILD_DEFS:
		if int(def["unlockLv"]) == level:
			push_kill_feed("UNLOCKED · %s" % str(def["name"]), "gold")

# ---------------- Score & combo ----------------
func gain_score(base_amount: int, world_pos: Vector2 = Vector2.ZERO) -> int:
	var mult := 1.0 + float(combo) * 0.15
	var gained := int(round(float(base_amount) * mult))
	score += gained
	score_changed.emit(score, combo)
	if world_pos != Vector2.ZERO:
		var col := Color("#E6C25A") if combo >= 5 else Color("#CFE3C8")
		get_tree().call_group("game", "spawn_float_text", world_pos, "+%d" % gained, col)
	return gained

func bump_combo() -> void:
	combo += 1
	combo_timer = 3.0
	if combo > best_combo_this_run:
		best_combo_this_run = combo
	if combo == 10:  unlock_achievement("combo10")
	elif combo == 25: unlock_achievement("combo25")
	if combo >= 5:
		combo_displayed.emit(combo)
	combo_changed.emit(combo)
	score_changed.emit(score, combo)

# ---------------- Achievements ----------------
func unlock_achievement(id: String) -> void:
	if unlocked_achievements.has(id): return
	if not ACHIEVEMENTS.has(id): return
	unlocked_achievements[id] = true
	achievement_queue.append(id)
	achievement_unlocked.emit(id, ACHIEVEMENTS[id])
	save_game()

func push_kill_feed(text: String, cls: String = "") -> void:
	kill_feed_event.emit(text, cls)

# ---------------- Locks ----------------
func toggle_cursor_lock() -> bool:
	lock_cursor = not lock_cursor
	var player = get_tree().get_first_node_in_group("player")
	if lock_cursor and player and is_instance_valid(player):
		var hp_node = player.get_node_or_null("HandPivot")
		if hp_node: locked_angle = hp_node.rotation
	locks_changed.emit(lock_cursor, lock_attack)
	return lock_cursor

func toggle_auto_attack() -> bool:
	lock_attack = not lock_attack
	locks_changed.emit(lock_cursor, lock_attack)
	return lock_attack

# ---------------- Rewind snapshots ----------------
func _tick_snapshots(delta: float) -> void:
	_snap_acc += delta
	if _snap_acc >= SNAP_INT:
		_snap_acc = 0.0
		rewind_snapshots.append(_snapshot_world())
		if rewind_snapshots.size() > SNAP_SLOTS:
			rewind_snapshots.pop_front()

func _snapshot_world() -> Dictionary:
	var snap := {"wave": wave, "kills": kills, "score": score, "combo": combo}
	var player = get_tree().get_first_node_in_group("player")
	if player and is_instance_valid(player):
		snap["player"] = {
			"pos": player.global_position, "hp": player.hp, "max_hp": player.max_hp,
			"energy": player.energy, "wood": wood, "stone": stone, "food": food,
			"level": level, "xp": xp
		}
	var zs: Array = []
	for z in get_tree().get_nodes_in_group("zombie"):
		if is_instance_valid(z) and not z.get("dead"):
			zs.append({"kind": z.get("kind"), "pos": z.global_position, "hp": z.get("hp"),
				"max_hp": z.get("max_hp")})
	snap["zombies"] = zs
	var ss: Array = []
	for s in get_tree().get_nodes_in_group("wall") + get_tree().get_nodes_in_group("defence") + get_tree().get_nodes_in_group("farm"):
		if is_instance_valid(s) and not s.get("dead"):
			var t_val = s.get("tier")
			var tier: int = int(t_val) if t_val != null else 0
			var hp_val = s.get("hp")
			var cur_hp: float = float(hp_val) if hp_val != null else 100.0
			var mx_val = s.get("max_hp")
			var max_hp: float = float(mx_val) if mx_val != null else 100.0
			var k_val = s.get("cell_keys")
			var keys: Array = k_val if k_val is Array else []
			ss.append({"kind": s.get("struct_kind"), "pos": s.global_position,
				"rot": s.rotation, "tier": tier, "hp": cur_hp,
				"max_hp": max_hp, "keys": keys})
	snap["structures"] = ss
	return snap

func try_rewind() -> bool:
	if not run_active or crystals <= 0:
		push_kill_feed("No Time Crystals!", "gold"); return false
	if rewind_snapshots.size() < 5:
		push_kill_feed("Not enough timeline recorded!", "gold"); return false
	var idx := maxi(0, rewind_snapshots.size() - 15)
	var snap: Dictionary = rewind_snapshots[idx]
	crystals -= 1
	crystals_changed.emit(crystals)
	_restore_world(snap)
	rewind_snapshots.clear()
	push_kill_feed("⟲ TIME REWOUND", "violet")
	time_rewound.emit()
	return true

func _restore_world(snap: Dictionary) -> void:
	var main = get_tree().get_first_node_in_group("game")
	var player = get_tree().get_first_node_in_group("player")
	if player and is_instance_valid(player) and snap.has("player"):
		var p: Dictionary = snap["player"]
		player.global_position = p["pos"]
		player.hp = p["hp"]; player.max_hp = p["max_hp"]; player.energy = p["energy"]
		wood = p["wood"]; stone = p["stone"]; food = p["food"]
		level = p["level"]; xp = p["xp"]
	wave  = int(snap.get("wave", wave))
	kills = int(snap.get("kills", kills))
	score = int(snap.get("score", score))
	combo = int(snap.get("combo", combo))
	resources_changed.emit(); wave_changed.emit(wave)
	xp_changed.emit(xp, xp_to_next(level), level)
	score_changed.emit(score, combo); combo_changed.emit(combo)
	# Clear & restore
	for z in get_tree().get_nodes_in_group("zombie"):
		if is_instance_valid(z): z.queue_free()
	for s in get_tree().get_nodes_in_group("wall") + get_tree().get_nodes_in_group("defence") + get_tree().get_nodes_in_group("farm"):
		if is_instance_valid(s): s.queue_free()
	if main:
		main.set("occupied", {})
		if main.has_method("_restore_from_snapshot"):
			main.call("_restore_from_snapshot", snap)

# ---------------- Save/load ----------------
func save_game() -> void:
	var data := {
		"best_wave": best_wave, "best_combo": best_combo,
		"total_kills": total_kills, "total_score": total_score,
		"runs": runs, "achievements": unlocked_achievements, "version": 7
	}
	var text := JSON.stringify(data)
	if OS.has_feature("web"):
		_set_web_item(SAVE_KEY, text)
	else:
		var f := FileAccess.open("user://deadwood_siege_v7.save", FileAccess.WRITE)
		if f: f.store_string(text); f.close()

func load_save() -> void:
	var text := ""
	if OS.has_feature("web"):
		text = _get_web_item(SAVE_KEY)
	elif FileAccess.file_exists("user://deadwood_siege_v7.save"):
		var f := FileAccess.open("user://deadwood_siege_v7.save", FileAccess.READ)
		if f: text = f.get_as_text(); f.close()
	if text == "": return
	var parsed = JSON.parse_string(text)
	if typeof(parsed) == TYPE_DICTIONARY:
		best_wave = int(parsed.get("best_wave", 0))
		best_combo = int(parsed.get("best_combo", 0))
		total_kills = int(parsed.get("total_kills", 0))
		total_score = int(parsed.get("total_score", 0))
		runs = int(parsed.get("runs", 0))
		var achs = parsed.get("achievements", {})
		if typeof(achs) == TYPE_DICTIONARY: unlocked_achievements = achs

func _set_web_item(key: String, value: String) -> void:
	if not OS.has_feature("web"): return
	if not Engine.has_singleton("JavaScriptBridge"): return
	Engine.get_singleton("JavaScriptBridge").eval(
		"try{localStorage.setItem('%s',%s)}catch(e){}" % [key, JSON.stringify(value)], true)

func _get_web_item(key: String) -> String:
	if not OS.has_feature("web"): return ""
	if not Engine.has_singleton("JavaScriptBridge"): return ""
	var out = Engine.get_singleton("JavaScriptBridge").eval(
		"try{localStorage.getItem('%s')||''}catch(e){''}" % key, true)
	return str(out) if out != null else ""