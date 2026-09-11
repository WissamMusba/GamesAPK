class_name BuildGrid
extends Node
## Deadwood Siege — BuildGrid authority (bible §04 + §15-D).
## GRID = 32.0, Vector2i cell hashing, rotation support, footprint checks.
const BuildGhostScript := preload("res://scripts/build_ghost.gd")

const GRID: float = 32.0
const MAP_SIZE: float = 2048.0

const GhostScript := preload("res://scripts/build_ghost.gd")

const BUILD: Dictionary = {
	"wall": {
		"id": "wall", "name": "WALL", "icon": "▬", "hotkey": "1", "unlock_lv": 1, "fw": 4, "fh": 1,
		"cost": {"wood": 20, "stone": 0, "food": 0}, "hp": 380.0,
		"up": [
			{"cost": {"wood": 45, "stone": 0}, "hp": 700.0},
			{"cost": {"wood": 90, "stone": 30}, "hp": 1150.0}
		]
	},
	"door": {
		"id": "door", "name": "DOOR", "icon": "▯", "hotkey": "2", "unlock_lv": 1, "fw": 2, "fh": 1,
		"cost": {"wood": 15, "stone": 0, "food": 0}, "hp": 200.0,
		"up": [
			{"cost": {"wood": 35, "stone": 0}, "hp": 340.0},
			{"cost": {"wood": 70, "stone": 20}, "hp": 520.0}
		]
	},
	"spike": {
		"id": "spike", "name": "SPIKES", "icon": "▲", "hotkey": "3", "unlock_lv": 1, "fw": 2, "fh": 2,
		"cost": {"wood": 14, "stone": 14, "food": 0}, "hp": 150.0, "dmg": 34.0,
		"up": [
			{"cost": {"wood": 24, "stone": 24}, "dmg": 56.0},
			{"cost": {"wood": 42, "stone": 42}, "dmg": 88.0}
		]
	},
	"crossbow": {
		"id": "crossbow", "name": "CROSSBOW", "icon": "✚", "hotkey": "4", "unlock_lv": 2, "fw": 4, "fh": 2,
		"cost": {"wood": 80, "stone": 0, "food": 0}, "hp": 130.0, "range": 340.0, "rate": 1.05, "dmg": 24.0,
		"up": [
			{"cost": {"wood": 150, "stone": 0}, "dmg": 40.0, "rate": 0.85, "range": 360.0},
			{"cost": {"wood": 270, "stone": 70}, "dmg": 64.0, "rate": 0.72, "range": 390.0}
		]
	},
	"farm": {
		"id": "farm", "name": "FARM", "icon": "❀", "hotkey": "5", "unlock_lv": 2, "fw": 2, "fh": 2,
		"cost": {"wood": 25, "stone": 0, "food": 0}, "hp": 80.0, "food": 8, "rate": 4.5,
		"up": [
			{"cost": {"wood": 42, "stone": 0}, "food": 13, "rate": 4.0},
			{"cost": {"wood": 70, "stone": 18}, "food": 20, "rate": 3.5}
		]
	},
	"tar": {
		"id": "tar", "name": "TAR PIT", "icon": "●", "hotkey": "6", "unlock_lv": 3, "fw": 2, "fh": 2,
		"cost": {"wood": 12, "stone": 20, "food": 0}, "hp": 100.0, "slow": 0.55, "tar_dmg": 6.0,
		"up": [
			{"cost": {"wood": 22, "stone": 34}, "slow": 0.42, "tar_dmg": 11.0},
			{"cost": {"wood": 38, "stone": 58}, "slow": 0.30, "tar_dmg": 18.0}
		]
	},
	"cauldron": {
		"id": "cauldron", "name": "CAULDRON", "icon": "◉", "hotkey": "7", "unlock_lv": 4, "fw": 2, "fh": 2,
		"cost": {"wood": 40, "stone": 30, "food": 0}, "hp": 150.0, "range": 160.0, "rate": 2.5, "dmg": 30.0, "splash": 75.0,
		"up": [
			{"cost": {"wood": 70, "stone": 55}, "dmg": 50.0, "splash": 95.0, "rate": 2.3},
			{"cost": {"wood": 120, "stone": 95}, "dmg": 78.0, "splash": 120.0, "rate": 2.1}
		]
	},
	"ballista": {
		"id": "ballista", "name": "BALLISTA", "icon": "⇉", "hotkey": "8", "unlock_lv": 6, "fw": 6, "fh": 2,
		"cost": {"wood": 160, "stone": 70, "food": 0}, "hp": 220.0, "range": 440.0, "rate": 1.7, "dmg": 70.0, "pierce": true,
		"up": [
			{"cost": {"wood": 280, "stone": 120}, "dmg": 110.0, "rate": 1.45},
			{"cost": {"wood": 460, "stone": 200}, "dmg": 170.0, "rate": 1.3}
		]
	}
}

# Hashed cell storage: Vector2i -> Node (structure) or true
var _occupied: Dictionary = {}
var _reserved: Dictionary = {}

static func get_def(kind: String) -> Dictionary:
	return BUILD.get(kind, {})

static func footprint(def: Dictionary, rot: int) -> Vector2i:
	if rot % 2 != 0:
		return Vector2i(int(def.get("fh", 1)), int(def.get("fw", 1)))
	return Vector2i(int(def.get("fw", 1)), int(def.get("fh", 1)))

static func world_to_cell(pos: Vector2) -> Vector2i:
	return Vector2i(int(floor(pos.x / GRID)), int(floor(pos.y / GRID)))

static func cell_to_world(cell: Vector2i) -> Vector2:
	return Vector2(cell.x * GRID, cell.y * GRID)

static func cell_to_center(cell: Vector2i, fw: int, fh: int) -> Vector2:
	return Vector2((float(cell.x) + float(fw) * 0.5) * GRID, (float(cell.y) + float(fh) * 0.5) * GRID)

# Helper to normalize input into Vector2i cell
static func to_cell(val) -> Vector2i:
	if val is Vector2i:
		return val
	if val is Vector2:
		return world_to_cell(val)
	if val is String:
		var parts := (val as String).split(",")
		if parts.size() >= 2:
			return Vector2i(int(parts[0]), int(parts[1]))
	if val is int:
		var v: int = int(val)
		var x: int = (v & 0xFFFF)
		if x >= 0x8000:
			x -= 0x10000
		var y: int = ((v >> 16) & 0xFFFF)
		if y >= 0x8000:
			y -= 0x10000
		return Vector2i(x, y)
	return Vector2i.ZERO

# Compatibility integer-key generator
func _key(c: Vector2i) -> int:
	return (c.x & 0xFFFF) | ((c.y & 0xFFFF) << 16)

func is_cell_blocked(c: Vector2i) -> bool:
	return _occupied.has(c) or _reserved.has(c) or _occupied.has(_key(c)) or _reserved.has(_key(c))

func is_blocked(cells: Array) -> bool:
	for raw in cells:
		var c := to_cell(raw)
		if is_cell_blocked(c):
			return true
	return false

func reserve(cells: Array) -> bool:
	if is_blocked(cells):
		return false
	for raw in cells:
		var c := to_cell(raw)
		_reserved[c] = true
		_reserved[_key(c)] = true
	return true

func commit(cells: Array, struct_ref: Variant = true) -> void:
	for raw in cells:
		var c := to_cell(raw)
		_reserved.erase(c)
		_reserved.erase(_key(c))
		_occupied[c] = struct_ref
		_occupied[_key(c)] = struct_ref

func release(cells: Array) -> void:
	for raw in cells:
		var c := to_cell(raw)
		_reserved.erase(c)
		_reserved.erase(_key(c))
		_occupied.erase(c)
		_occupied.erase(_key(c))

func occupied_keys() -> Array:
	return _occupied.keys()

func debug_blocked_at(pos: Vector2i) -> bool:
	return is_cell_blocked(pos)

func get_cells_for(cx: int, cy: int, fw: int, fh: int) -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for ax in range(fw):
		for ay in range(fh):
			out.append(Vector2i(cx + ax, cy + ay))
	return out

func can_place(cx: int, cy: int, def: Dictionary, rot: int, player_pos: Vector2 = Vector2(-9999, -9999), player_radius: float = 20.0, obstacles: Array = []) -> bool:
	var fp := footprint(def, rot)
	var fw := fp.x
	var fh := fp.y
	
	if cx < 0 or cy < 0:
		return false
	if (cx + fw) * GRID > MAP_SIZE or (cy + fh) * GRID > MAP_SIZE:
		return false
	
	for ax in range(fw):
		for ay in range(fh):
			var c := Vector2i(cx + ax, cy + ay)
			if is_cell_blocked(c):
				return false
			
			var px := float(cx + ax) * GRID
			var py := float(cy + ay) * GRID
			
			# Player check (exact formula from v7 line 1049)
			if player_pos.x > px - player_radius and player_pos.x < px + GRID + player_radius and \
			   player_pos.y > py - player_radius and player_pos.y < py + GRID + player_radius:
				return false
			
			# Obstacles check (trees, rocks/boulders — bushes do not block, matching v7 line 1052)
			for obs in obstacles:
				if not is_instance_valid(obs):
					continue
				var k = obs.get("node_kind")
				if k == null and obs.has_meta("node_kind"):
					k = obs.get_meta("node_kind")
				if str(k) == "bush":
					continue
				var obs_pos: Vector2 = obs.global_position
				var obs_r: float = 26.0
				if obs_pos.x > px - obs_r * 0.6 and obs_pos.x < px + GRID + obs_r * 0.6 and \
				   obs_pos.y > py - obs_r * 0.6 and obs_pos.y < py + GRID + obs_r * 0.6:
					return false
	return true

func create_ghost(kind: String) -> Node2D:
	var ghost: Node2D = GhostScript.new()
	ghost.setup(kind, self)
	return ghost
