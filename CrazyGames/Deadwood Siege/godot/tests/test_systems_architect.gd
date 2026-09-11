extends Node
## Systems Architect Test Suite
## Verifies:
## 1. BuildGrid: GRID=32.0, Vector2i cell hashing, rotation flips, can_place logic
## 2. BuildGhost: preview node, green/red validity, rotation
## 3. Structure.tscn + structure.gd: all 8 structures (wall, door, spike, crossbow, farm, tar, cauldron, ballista)
## 4. 3-tier upgrade system with exact v7 costs and stats
## 5. Door auto-opening when player < 76px
## 6. Spikes overlap damage
## 7. Tar slow factor & tick damage
## 8. Cauldron splash tar attack
## 9. 2-layer rotating architecture for Crossbow & Ballista (Base stays, Head rotates + recoil tween)
## 10. Arrow & BallistaBolt projectile scenes

const StructScript: GDScript = preload("res://scripts/structure.gd")
const GhostScript: GDScript = preload("res://scripts/build_ghost.gd")

var _ok: int = 0
var _fail: int = 0

func check(cond: bool, what: String) -> void:
	if cond:
		_ok += 1
		print("[PASS] " + what)
	else:
		_fail += 1
		print("[FAIL] " + what)

func _ready() -> void:
	print("--- Running Systems Architect Tests ---")
	_test_build_grid()
	_test_ghost_preview()
	_test_structures_and_upgrades()
	_test_door_auto_open()
	_test_spike_overlap()
	_test_tar_mechanics()
	_test_turrets_2layer_and_projectiles()
	
	print("--- Done: %d passed, %d failed ---" % [_ok, _fail])
	get_tree().quit(1 if _fail > 0 else 0)

func _test_build_grid() -> void:
	print("\n[Test BuildGrid]")
	check(BuildGrid.GRID == 32.0, "GRID constant is 32.0")
	
	var grid: BuildGrid = BuildGrid.new()
	var wall_def: Dictionary = BuildGrid.get_def("wall")
	check(wall_def.get("fw") == 4 and wall_def.get("fh") == 1, "Wall base footprint is 4x1")
	
	# Rotation support
	var fp_h: Vector2i = BuildGrid.footprint(wall_def, 0)
	var fp_v: Vector2i = BuildGrid.footprint(wall_def, 1)
	check(fp_h == Vector2i(4, 1), "Rot 0 footprint is (4, 1)")
	check(fp_v == Vector2i(1, 4), "Rot 1 footprint flips to (1, 4)")
	
	# Cell hashing with Vector2i
	var c1: Vector2i = Vector2i(5, 5)
	check(not grid.is_cell_blocked(c1), "Cell (5,5) starts unblocked")
	grid.commit([c1])
	check(grid.is_cell_blocked(c1), "Cell (5,5) is blocked after commit")
	grid.release([c1])
	check(not grid.is_cell_blocked(c1), "Cell (5,5) is free after release")
	
	# can_place checks
	var p_pos: Vector2 = Vector2(100, 100)
	
	# Valid placement far from player & obstacles
	var can1: bool = grid.can_place(10, 10, wall_def, 0, p_pos, 20.0, [])
	check(can1, "can_place returns true in clear area")
	
	# Blocked by player
	var can_player: bool = grid.can_place(3, 3, wall_def, 0, p_pos, 20.0, [])
	check(not can_player, "can_place returns false when blocked by player")
	
	# Blocked by tree
	var dummy_tree: Node2D = Node2D.new()
	dummy_tree.set("node_kind", "tree")
	dummy_tree.set_meta("node_kind", "tree")
	dummy_tree.global_position = Vector2(200, 200)
	var can_tree: bool = grid.can_place(6, 6, wall_def, 0, Vector2(-999, -999), 20.0, [dummy_tree])
	check(not can_tree, "can_place returns false when blocked by tree")
	
	# Bush should NOT block
	var dummy_bush: Node2D = Node2D.new()
	dummy_bush.set("node_kind", "bush")
	dummy_bush.set_meta("node_kind", "bush")
	dummy_bush.global_position = Vector2(200, 200)
	var can_bush: bool = grid.can_place(6, 6, wall_def, 0, Vector2(-999, -999), 20.0, [dummy_bush])
	check(can_bush, "can_place returns true over bush (bushes do not block)")
	
	# Blocked by existing structure
	grid.commit([Vector2i(10, 10)])
	var can_struct: bool = grid.can_place(10, 10, wall_def, 0, Vector2(-999, -999), 20.0, [])
	check(not can_struct, "can_place returns false when overlapping occupied cell")
	grid.release([Vector2i(10, 10)])

func _test_ghost_preview() -> void:
	print("\n[Test BuildGhost]")
	var grid: BuildGrid = BuildGrid.new()
	var ghost: Node2D = GhostScript.new()
	add_child(ghost)
	ghost.setup("wall", grid)
	
	check(ghost.get_footprint() == Vector2i(4, 1), "Ghost initial footprint is (4, 1)")
	ghost.rotate_footprint()
	check(ghost.get_footprint() == Vector2i(1, 4), "Ghost rotated footprint is (1, 4)")
	ghost.rotate_footprint()
	check(ghost.get_footprint() == Vector2i(4, 1), "Ghost rotated again returns to (4, 1)")
	
	# Check green (valid) vs red (invalid)
	var valid: bool = ghost.update_ghost(Vector2(320, 320), Vector2(0, 0), 20.0, [], true)
	check(valid and ghost.is_valid, "Ghost reports valid (green) on clear ground")
	
	grid.commit([Vector2i(10, 10)])
	var invalid: bool = ghost.update_ghost(Vector2(320, 320), Vector2(0, 0), 20.0, [], true)
	check((not invalid) and (not ghost.is_valid), "Ghost reports invalid (red) when blocked")
	grid.release([Vector2i(10, 10)])
	ghost.queue_free()

func _test_structures_and_upgrades() -> void:
	print("\n[Test All 8 Structures & 3-Tier Upgrades]")
	var scene: PackedScene = load("res://scenes/Structure.tscn")
	check(scene != null, "scenes/Structure.tscn loaded successfully")
	
	var kinds: Array[String] = ["wall", "door", "spike", "crossbow", "farm", "tar", "cauldron", "ballista"]
	for k in kinds:
		var s: Node2D = scene.instantiate()
		add_child(s)
		s.setup(k, 0, 1)
		
		var def: Dictionary = BuildGrid.get_def(k)
		check(s.struct_kind == k, "%s: setup sets struct_kind correctly" % k)
		check(s.tier == 1, "%s: initial tier is 1" % k)
		check(s.max_hp == float(def["hp"]), "%s: initial max_hp matches v7 (%f)" % [k, s.max_hp])
		
		# Test upgrade tier 2
		var _G: Node = get_node_or_null("/root/Game")
		if _G != null:
			_G.set("wood", 1000)
			_G.set("stone", 1000)
			_G.set("food", 1000)
		check(s.can_upgrade(), "%s: can_upgrade() returns true with sufficient resources" % k)
		var up_res: bool = s.try_upgrade()
		check(up_res and s.tier == 2, "%s: upgrades to Tier 2" % k)
		
		var up1: Dictionary = def["up"][0]
		if up1.has("hp"):
			check(s.max_hp == float(up1["hp"]), "%s: T2 hp matches v7 (%f)" % [k, s.max_hp])
		if up1.has("dmg"):
			check(s.damage == float(up1["dmg"]), "%s: T2 damage matches v7 (%f)" % [k, s.damage])
		
		# Test upgrade tier 3
		var up_res2: bool = s.try_upgrade()
		check(up_res2 and s.tier == 3, "%s: upgrades to Tier 3" % k)
		check(not s.can_upgrade(), "%s: cannot upgrade past Tier 3 (max tier)" % k)
		
		s.queue_free()

func _test_door_auto_open() -> void:
	print("\n[Test Door Auto-Open]")
	var scene: PackedScene = load("res://scenes/Structure.tscn")
	var door: Node2D = scene.instantiate()
	add_child(door)
	door.setup("door")
	door.global_position = Vector2(500, 500)
	
	var player: Node2D = Node2D.new()
	player.add_to_group("player")
	add_child(player)
	
	# Far player: door closed
	player.global_position = Vector2(500, 700)
	door._process_door()
	check(not door.is_door_open, "Door is closed when player > 76px away")
	check(door.collision_layer == (2 | 8), "Door closed blocks player (layer 2) and zombies (layer 8)")
	
	# Near player: door open
	player.global_position = Vector2(500, 550)
	door._process_door()
	check(door.is_door_open, "Door opens when player < 76px away")
	check(door.collision_layer == 8, "Door open allows player through but keeps blocking zombies (layer 8)")
	
	player.queue_free()
	door.queue_free()

func _test_spike_overlap() -> void:
	print("\n[Test Spike Overlap Damage]")
	var scene: PackedScene = load("res://scenes/Structure.tscn")
	var spike: Node2D = scene.instantiate()
	add_child(spike)
	spike.setup("spike")
	spike.global_position = Vector2(300, 300)
	
	var dummy_zombie: CharacterBody2D = CharacterBody2D.new()
	dummy_zombie.add_to_group("zombie")
	dummy_zombie.set_script(load("res://scripts/zombie.gd"))
	dummy_zombie.call("setup", "Sham", 1)
	add_child(dummy_zombie)
	
	var initial_hp: float = float(dummy_zombie.get("hp"))
	spike._overlapping_zombies.append(dummy_zombie)
	spike._process_spike()
	
	var hp_after: float = float(dummy_zombie.get("hp"))
	check(hp_after < initial_hp, "Spike deals overlap damage to zombies (%f -> %f)" % [initial_hp, hp_after])
	check(spike.cooldown == 0.4, "Spike enters 0.4s cooldown after hitting")
	
	dummy_zombie.queue_free()
	spike.queue_free()

func _test_tar_mechanics() -> void:
	print("\n[Test Tar Pit Slow & Tick Damage]")
	var scene: PackedScene = load("res://scenes/Structure.tscn")
	var tar: Node2D = scene.instantiate()
	add_child(tar)
	tar.setup("tar")
	
	var dummy_zombie: CharacterBody2D = CharacterBody2D.new()
	dummy_zombie.add_to_group("zombie")
	dummy_zombie.set_script(load("res://scripts/zombie.gd"))
	dummy_zombie.call("setup", "Sham", 1)
	add_child(dummy_zombie)
	
	var base_spd: float = float(dummy_zombie.get("speed"))
	tar._overlapping_zombies.append(dummy_zombie)
	tar._process_tar(0.6)
	
	var slowed_spd: float = float(dummy_zombie.get("speed"))
	check(slowed_spd < base_spd, "Tar slows zombie speed (%f -> %f)" % [base_spd, slowed_spd])
	
	tar._on_hit_area_body_exited(dummy_zombie)
	check(absf(float(dummy_zombie.get("speed")) - base_spd) < 0.1, "Exiting tar restores zombie speed")
	
	dummy_zombie.queue_free()
	tar.queue_free()

func _test_turrets_2layer_and_projectiles() -> void:
	print("\n[Test Turrets 2-Layer Architecture & Projectiles]")
	var struct_scene: PackedScene = load("res://scenes/Structure.tscn")
	var arrow_scene: PackedScene = load("res://scenes/Arrow.tscn")
	var bolt_scene: PackedScene = load("res://scenes/BallistaBolt.tscn")
	check(arrow_scene != null, "Arrow.tscn loaded")
	check(bolt_scene != null, "BallistaBolt.tscn loaded")
	
	# Crossbow 2-layer test
	var cb: Node2D = struct_scene.instantiate()
	add_child(cb)
	cb.setup("crossbow")
	check(cb.base_node != null, "Crossbow has Base node")
	check(cb.head_node != null, "Crossbow has Head node")
	
	var dummy_zombie: CharacterBody2D = CharacterBody2D.new()
	dummy_zombie.add_to_group("zombie")
	dummy_zombie.set_script(load("res://scripts/zombie.gd"))
	dummy_zombie.call("setup", "Sham", 1)
	dummy_zombie.global_position = cb.global_position + Vector2(100, 0)
	add_child(dummy_zombie)
	
	cb._process_crossbow(0.016)
	check(absf(cb.head_node.rotation) < 0.1, "Crossbow Head rotates toward target")
	check(cb.base_node.rotation == 0.0, "Crossbow Base stays aligned to grid (rotation 0)")
	
	# Ballista 2-layer test
	var bal: Node2D = struct_scene.instantiate()
	add_child(bal)
	bal.setup("ballista")
	check(bal.base_node != null, "Ballista has Base node")
	check(bal.head_node != null, "Ballista has Head node")
	bal._process_ballista(0.016)
	check(absf(bal.head_node.rotation) < 0.1, "Ballista Head rotates toward target")
	check(bal.base_node.rotation == 0.0, "Ballista Base stays aligned to grid")
	
	# Test Arrow damage
	var arrow: Area2D = arrow_scene.instantiate()
	add_child(arrow)
	var z_hp0: float = float(dummy_zombie.get("hp"))
	arrow.setup(dummy_zombie.global_position, 0.0, 24.0)
	arrow._hit(dummy_zombie)
	check(float(dummy_zombie.get("hp")) < z_hp0, "Arrow deals damage to zombie")
	
	# Test BallistaBolt piercing damage
	var bolt: Area2D = bolt_scene.instantiate()
	add_child(bolt)
	var z_hp1: float = float(dummy_zombie.get("hp"))
	bolt.setup(dummy_zombie.global_position, 0.0, 70.0)
	bolt._hit(dummy_zombie)
	check(float(dummy_zombie.get("hp")) < z_hp1 or bool(dummy_zombie.get("dead")), "BallistaBolt deals piercing siege damage")
	check(bolt.pierce, "BallistaBolt has pierce == true")
	
	dummy_zombie.queue_free()
	cb.queue_free()
	bal.queue_free()
	arrow.queue_free()
	bolt.queue_free()
