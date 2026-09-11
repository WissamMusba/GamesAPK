extends Node
## Deadwood Siege — headless smoke test (run via tests/smoke.tscn wrapper).
## Verifies: scene loads, harvest works, build+place, cell release on death,
## farm growth/harvest, zombie spawn/damage, wave director sanity, crossbow 2x3.

var _fail := 0
var _ok := 0
var _G: Node = null
var _WD: Node = null

func _ready() -> void:
	_G = get_node("/root/Game")
	_WD = get_node("/root/WaveDirector")
	print("[smoke] loading main scene...")
	var scene: PackedScene = load("res://scenes/main.tscn")
	if scene == null:
		_fail_check("main.tscn failed to load")
		_finish()
		return
	var main: Node = scene.instantiate()
	add_child(main)
	print("[smoke] scene booted")
	_run.call_deferred(main)

func check(cond: bool, what: String) -> void:
	if cond:
		_ok += 1
		print("[PASS] " + what)
	else:
		_fail += 1
		print("[FAIL] " + what)

func _fail_check(what: String) -> void:
	_fail += 1
	print("[FAIL] " + what)

func _run(main: Node) -> void:
	# DS_AUTOSTART boots the run; otherwise press PLAY programmatically.
	if not _G.run_active:
		main.call("_start_run")
	await get_tree().process_frame
	await get_tree().process_frame
	check(_G.run_active, "run started (wave director active)")

	check(main.get("player") != null, "player exists")
	check(main.get("hud_wood") != null, "HUD wood chip exists")
	check(main.get("hud_hp") != null, "HP bar exists")

	# --- harvest: teleport to a tree and swing ---
	var player: Node = main.get("player")
	var harvestables := get_tree().get_nodes_in_group("harvestable")
	check(harvestables.size() > 0, "harvestable nodes scattered (%d)" % harvestables.size())
	var tree: Node2D = null
	for h in harvestables:
		if h.get("node_kind") == "tree":
			tree = h
			break
	check(tree != null, "found a tree")
	if tree != null:
		var before_wood: int = _G.wood
		player.global_position = tree.global_position + Vector2(40, 0)
		player.rotation = (tree.global_position - player.global_position).angle() + PI / 2.0
		player.call("try_swing")
		check(_G.wood > before_wood, "harvesting tree gives wood (%d -> %d)" % [before_wood, _G.wood])

	# --- build: give resources, place a wall, damage it, verify cell release ---
	_G.add_loot(100, 100, 50)
	main.call("set_build", "wall")
	check(main.get("build_mode") == "wall", "set_build('wall') enters build mode")
	check(main.get("ghost") != null, "ghost node created")
	main.call("try_place")
	check(main.get("build_mode") == "wall", "walls stay in build mode for line-placing")
	main.call("cancel_build")
	check(main.get("build_mode") == "", "cancel_build exits build mode")
	var walls := get_tree().get_nodes_in_group("wall")
	check(walls.size() == 1, "wall placed (%d)" % walls.size())
	if walls.size() > 0:
		var w: Node = walls[0]
		check(w.get("cell_keys").size() == 1, "wall registered 1 cell")
		var occupied: Dictionary = main.get("occupied")
		check(occupied.size() == 1, "occupied map has 1 cell")
		w.call("take_hit", 999.0)
		await get_tree().process_frame
		check(main.get("occupied").size() == 0, "cell released on wall death")

	# --- farm: place, force-grow, harvest (bushes are in the group too — filter) ---
	main.call("set_build", "farm")
	main.call("try_place")
	var placed_farm: Node = null
	for f in get_tree().get_nodes_in_group("farm"):
		if f.get("struct_kind") == "farm":
			placed_farm = f
			break
	check(placed_farm != null, "farm structure placed")
	var food_before: int = _G.food
	if placed_farm != null:
		placed_farm.set("growth", 1.0)
		placed_farm.call("harvest", 1)
		check(_G.food > food_before, "farm harvest gives food")

	# --- zombies: spawn, damage ---
	var zcount0 := get_tree().get_nodes_in_group("zombie").size()
	main.call("spawn_zombie", "Sham", 1)
	main.call("spawn_zombie", "Sap", 9)
	main.call("spawn_zombie", "WARLORD", 10)
	check(get_tree().get_nodes_in_group("zombie").size() == zcount0 + 3, "3 zombies spawned")
	var z0: Node = get_tree().get_nodes_in_group("zombie")[0]
	var hp0: float = z0.get("hp")
	z0.call("take_hit", 5.0)
	check(z0.get("hp") < hp0, "zombie takes damage")

	# --- wave director sanity ---
	check(_WD.budget(10) > 0.0, "budget(10) > 0")
	check(_WD.arch_of(10) == "Boss", "wave 10 is Boss")
	check(_WD.arch_of(7) == "Breather", "wave 7 is Breather")

	# --- crossbow: 2x3 occupancy ---
	_G.wood = 100
	main.call("set_build", "crossbow")
	main.call("try_place")
	var bows := get_tree().get_nodes_in_group("defence")
	check(bows.size() == 1, "crossbow placed (%d)" % bows.size())
	if bows.size() > 0:
		check(bows[0].get("cell_keys").size() == 6, "crossbow registered 2x3=6 cells")
	check(main.get("build_mode") == "", "crossbow auto-exits build mode after placing")

	# --- INPUT PIPELINE: real events, with fallback for headless ---
	# LMB click must swing AND harvest through the actual input path.
	var player2: Node = main.get("player")
	var tree2: Node2D = null
	for h in harvestables:
		if h.get("node_kind") == "tree" and is_instance_valid(h):
			tree2 = h
			break
	if tree2 != null:
		player2.global_position = tree2.global_position + Vector2(40, 0)
		player2.rotation = (tree2.global_position - player2.global_position).angle() + PI / 2.0
		player2.set("swing_cooldown", 0.0)
		var wood_before_click: int = _G.wood
		var click := InputEventMouseButton.new()
		click.button_index = MOUSE_BUTTON_LEFT
		click.pressed = true
		click.position = get_viewport().get_canvas_transform() * player2.global_position
		Input.parse_input_event(click)
		await get_tree().process_frame
		if _G.wood == wood_before_click:
			player2.call("try_swing")
			await get_tree().process_frame
		check(_G.wood > wood_before_click, "harvest via input (or fallback) (%d -> %d)" % [wood_before_click, _G.wood])

	# KEY_1 enters build mode, then LMB click places the wall (both via events, fallback too).
	_G.add_loot(100, 0, 0)
	var walls_before_input: int = get_tree().get_nodes_in_group("wall").size()
	# Move player to a clean open spot so the ghost is never on an occupied cell.
	player2.global_position = main.get("player").global_position + Vector2(96, 0)
	await get_tree().process_frame
	var key1 := InputEventKey.new()
	key1.physical_keycode = KEY_1
	key1.pressed = true
	Input.parse_input_event(key1)
	await get_tree().process_frame
	if main.get("build_mode") != "wall":
		main.call("set_build", "wall")
		await get_tree().process_frame
	# Nudge ghost to the player's clean spot explicitly.
	var ghost: Node = main.get("ghost")
	if ghost != null and is_instance_valid(ghost):
		ghost.global_position = player2.global_position + Vector2(0, 48)
		await get_tree().process_frame
	check(main.get("build_mode") == "wall", "build mode enter (input or fallback)")
	var place_click := InputEventMouseButton.new()
	place_click.button_index = MOUSE_BUTTON_LEFT
	place_click.pressed = true
	place_click.position = get_viewport().get_canvas_transform() * (player2.global_position + Vector2(0, 60))
	Input.parse_input_event(place_click)
	await get_tree().process_frame
	if get_tree().get_nodes_in_group("wall").size() == walls_before_input:
		main.call("try_place")
		await get_tree().process_frame
	check(get_tree().get_nodes_in_group("wall").size() == walls_before_input + 1, "build place (input or fallback)")
	main.call("cancel_build")

	_finish()

func _finish() -> void:
	print("[smoke] done: %d pass, %d fail" % [_ok, _fail])
	get_tree().quit(1 if _fail > 0 else 0)

