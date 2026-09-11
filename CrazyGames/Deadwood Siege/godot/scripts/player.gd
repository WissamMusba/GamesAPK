extends CharacterBody2D
class_name Player
## Deadwood Siege v7 — Player: arc swing, X/C locks, damage numbers,
## walk dust, camera trauma, well-fed regen, eat food, tar slow.

const Art := preload("res://scripts/art_factory.gd")
const Juice := preload("res://scripts/juice.gd")
const DamageNumberScript := preload("res://scripts/damage_number.gd")

@export var speed: float = 210.0
@export var hp: float = 100.0
@export var max_hp: float = 100.0
@export var energy: float = 100.0
@export var max_energy: float = 100.0
@export var axe_dmg: float = 28.0
@export var swing_cd: float = 0.40
@export var swing_reach: float = 88.0
@export var swing_half_arc: float = 0.88

var swing_cooldown: float = 0.0
var dead: bool = false

# Refs
var body: Node2D = null
var hand_pivot: Node2D = null
var axe: Node2D = null
var camera: Camera2D = null

# Camera trauma
@export var trauma_decay: float = 1.6
@export var max_offset := Vector2(22.0, 16.0)
@export var max_roll: float = 0.05
var trauma: float = 0.0

# Movement
const MAP_X := 2048.0
const MAP_Y := 2048.0
const DASH_CD := 0.9
var _dash_cd: float = 0.0
var _dust_timer: float = 0.0
var touch_target := Vector2.ZERO
var has_touch_target: bool = false
var _axe_tween: Tween = null
var _game: Node = null

func _get_game() -> Node:
	if _game and is_instance_valid(_game): return _game
	if is_inside_tree() and get_tree() and get_tree().root:
		_game = get_tree().root.get_node_or_null("Game")
	return _game

func _ready() -> void:
	add_to_group("player")
	collision_layer = 1
	collision_mask = 1 | 2 | 4 | 8
	# Collision
	var col := get_node_or_null("CollisionShape2D") as CollisionShape2D
	if col == null:
		col = CollisionShape2D.new()
		var circle := CircleShape2D.new(); circle.radius = 24.0
		col.shape = circle
		add_child(col)
	# Hand pivot
	hand_pivot = Node2D.new(); hand_pivot.name = "HandPivot"
	add_child(hand_pivot)
	# Camera
	camera = Camera2D.new()
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 16.0
	camera.zoom = Vector2(2.4, 2.4)
	add_child(camera)
	camera.make_current()
	# Art
	_setup_art()
	set_process(true)

func _setup_art() -> void:
	body = Node2D.new(); body.name = "Body"
	add_child(body)
	var art: Node2D = Art.make_player()
	if art:
		# Move axe into hand_pivot, hands into hand_pivot, rest into body
		var axe_n := art.get_node_or_null("Axe") as Node2D
		if axe_n:
			art.remove_child(axe_n); axe_n.rotation = 0.0
			hand_pivot.add_child(axe_n); axe = axe_n
		var hands: Array = []
		for ch in art.get_children():
			if ch is Node2D and not (ch is Polygon2D) and not (ch is Line2D):
				hands.append(ch)
		for h in hands:
			art.remove_child(h); hand_pivot.add_child(h)
		for ch in art.get_children():
			art.remove_child(ch); body.add_child(ch)
		art.queue_free()
	if axe == null:
		axe = hand_pivot.get_node_or_null("Axe") as Node2D

func add_trauma(amount: float) -> void:
	trauma = clampf(trauma + amount, 0.0, 1.0)

func _process(delta: float) -> void:
	delta = minf(delta, 0.05)
	# Camera shake
	if camera and is_instance_valid(camera):
		if trauma > 0.0:
			trauma = maxf(0.0, trauma - trauma_decay * delta)
			var shake := trauma * trauma
			camera.offset = Vector2(
				randf_range(-max_offset.x, max_offset.x) * shake,
				randf_range(-max_offset.y, max_offset.y) * shake)
			camera.rotation = randf_range(-max_roll, max_roll) * shake
		else:
			camera.offset = Vector2.ZERO
			camera.rotation = 0.0
	# Redraw aim arc
	queue_redraw()

func _physics_process(delta: float) -> void:
	if dead: return
	delta = minf(delta, 0.05)
	swing_cooldown = maxf(0.0, swing_cooldown - delta)
	_dash_cd = maxf(0.0, _dash_cd - delta)
	var game := _get_game()
	var well_fed: bool = game != null and game.food > 20
	if well_fed:
		hp = minf(max_hp, hp + 0.7 * delta)
		energy = minf(max_energy, energy + 15.0 * delta)
	else:
		energy = minf(max_energy, energy + 12.0 * delta)
	# Movement
	var dir := Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT):  dir.x -= 1
	if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT): dir.x += 1
	if Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP):    dir.y -= 1
	if Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN):  dir.y += 1
	if dir == Vector2.ZERO and has_touch_target:
		var to := touch_target - global_position
		if to.length() < 8.0: has_touch_target = false
		else: dir = to.normalized()
	if dir != Vector2.ZERO:
		dir = dir.normalized()
		var tired_mult: float = 0.55 if energy <= 1.0 else 1.0
		velocity = velocity.lerp(dir * speed * tired_mult, 14.0 * delta)
	else:
		velocity = velocity.lerp(Vector2.ZERO, 10.0 * delta)
	move_and_slide()
	# Walk dust
	if velocity.length() > 30.0:
		_dust_timer -= delta
		if _dust_timer <= 0.0:
			_dust_timer = 0.14
			Juice.walk_dust(self, global_position + Vector2(0, 16), velocity)
	# Boundary
	global_position.x = clampf(global_position.x, 32.0, MAP_X - 32.0)
	global_position.y = clampf(global_position.y, 32.0, MAP_Y - 32.0)
	# Aim
	if hand_pivot:
		if game and game.lock_cursor:
			hand_pivot.rotation = game.locked_angle
		elif has_touch_target:
			var to_t := touch_target - global_position
			if to_t.length() > 4.0: hand_pivot.rotation = to_t.angle()
		else:
			var to_m := get_global_mouse_position() - global_position
			if to_m.length() > 4.0: hand_pivot.rotation = to_m.angle()
	# Attack: mouse OR auto-attack lock
	var want := Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT)
	if game and game.lock_attack: want = true
	if want and not _is_building():
		try_swing()

func _is_building() -> bool:
	var g = get_tree().get_first_node_in_group("game")
	return g != null and str(g.get("build_mode")) != ""

# ---------------- Input ----------------
func _unhandled_input(event: InputEvent) -> void:
	if dead or get_tree().paused: return
	if event is InputEventKey and event.pressed and not event.echo:
		match event.physical_keycode:
			KEY_SPACE:
				if not _is_building(): try_swing()
			KEY_E:
				eat_food()
			KEY_SHIFT:
				try_dash()
	elif event is InputEventScreenTouch:
		if event.pressed:
			has_touch_target = true
			touch_target = _to_world(event.position)
		else:
			if not _is_building(): try_swing()
	elif event is InputEventScreenDrag:
		has_touch_target = true
		touch_target = _to_world(event.position)

func _to_world(screen_pos: Vector2) -> Vector2:
	var vp := get_viewport()
	return vp.get_canvas_transform().affine_inverse() * screen_pos

# ---------------- Swing ----------------
func try_swing() -> void:
	if swing_cooldown > 0.0 or dead: return
	if energy < 5.0: return
	swing_cooldown = swing_cd
	energy = maxf(0.0, energy - 5.0)
	_show_swing_arc()
	_animate_axe_swing()
	var game := _get_game()
	var well_mult: float = 1.15 if (game and game.food > 30) else 1.0
	var dmg: float = axe_dmg * well_mult
	# Gather targets
	var aim_dir := Vector2.RIGHT.rotated(hand_pivot.rotation)
	var hit_z: Array = []
	var hit_r: Array = []
	for z in get_tree().get_nodes_in_group("zombie"):
		if not is_instance_valid(z) or z.get("dead"): continue
		var to: Vector2 = z.global_position - global_position
		var d := to.length()
		var z_r: float = 20.0
		if d > swing_reach + z_r * 0.75: continue
		if absf(aim_dir.angle_to(to)) <= swing_half_arc:
			hit_z.append(z)
	for r in get_tree().get_nodes_in_group("harvestable"):
		if not is_instance_valid(r): continue
		var to: Vector2 = r.global_position - global_position
		var d := to.length()
		var r_r: float = 26.0
		if d > swing_reach + r_r * 0.75: continue
		if absf(aim_dir.angle_to(to)) <= swing_half_arc:
			hit_r.append(r)
	# Apply
	for z in hit_z:
		var kb: Vector2 = (z.global_position - global_position).normalized()
		var crit: bool = randf() < 0.15
		var actual: float = dmg * (1.5 if crit else 1.0)
		var num_col := Color("#E6C25A") if crit else Color("#FFE0D0")
		var num_size: int = 16 if crit else 13
		if z.has_method("take_damage"): z.take_damage(actual, global_position, 110.0)
		elif z.has_method("take_hit"): z.take_hit(actual)
		DamageNumberScript.create(str(int(round(actual))),
			z.global_position + Vector2(randf_range(-6, 6), -24), num_col, num_size)
		_spawn_burst(z.global_position, 4, Color("#9CC08A"))
		add_trauma(0.12)
	for r in hit_r:
		if r.has_method("take_damage"): r.take_damage(dmg)
		elif r.has_method("harvest"): r.harvest(maxi(1, int(round(dmg / 14.0))))
		elif r.has_method("take_hit"): r.take_hit(dmg)
		_spawn_burst(r.global_position, 3, Color("#DCE9CE"))
		add_trauma(0.05)

func _show_swing_arc() -> void:
	var arc := Polygon2D.new()
	arc.polygon = _build_arc_poly()
	arc.color = Color(1.0, 0.95, 0.72, 0.42)
	arc.z_index = 5
	hand_pivot.add_child(arc)
	var rim := Line2D.new()
	rim.points = _build_arc_rim()
	rim.width = 3.5
	rim.default_color = Color(1.0, 1.0, 1.0, 0.85)
	rim.z_index = 6
	hand_pivot.add_child(rim)
	var tw := create_tween()
	tw.set_parallel(true)
	tw.tween_property(arc, "modulate:a", 0.0, 0.16)
	tw.tween_property(rim, "modulate:a", 0.0, 0.16)
	tw.chain().tween_callback(func():
		if is_instance_valid(arc): arc.queue_free()
		if is_instance_valid(rim): rim.queue_free())

func _build_arc_poly() -> PackedVector2Array:
	var pts := PackedVector2Array()
	pts.append(Vector2.ZERO)
	var steps := 12
	for i in range(steps + 1):
		var a := lerpf(-swing_half_arc, swing_half_arc, float(i) / float(steps))
		pts.append(Vector2(cos(a), sin(a)) * swing_reach)
	return pts

func _build_arc_rim() -> PackedVector2Array:
	var pts := PackedVector2Array()
	var steps := 16
	for i in range(steps + 1):
		var a := lerpf(-swing_half_arc, swing_half_arc, float(i) / float(steps))
		pts.append(Vector2(cos(a), sin(a)) * swing_reach)
	return pts

func _animate_axe_swing() -> void:
	if axe == null:
		axe = hand_pivot.get_node_or_null("Axe") as Node2D
	if axe:
		if _axe_tween and _axe_tween.is_valid(): _axe_tween.kill()
		var tw := create_tween()
		tw.tween_property(axe, "rotation", -0.75, 0.04).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(axe, "rotation", 0.65, 0.07).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		tw.tween_property(axe, "rotation", 0.0, 0.06).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		_axe_tween = tw

func _spawn_burst(pos: Vector2, count: int, col: Color) -> void:
	var tree := Engine.get_main_loop() as SceneTree
	var scene := tree.current_scene if tree else null
	if not scene: return
	for i in count:
		var p := ColorRect.new()
		p.color = col
		p.size = Vector2(4, 4)
		p.position = pos + Vector2(randf_range(-6, 6), randf_range(-6, 6))
		p.z_index = 65
		p.mouse_filter = Control.MOUSE_FILTER_IGNORE
		scene.add_child(p)
		var ang := randf() * TAU
		var spd := randf_range(50.0, 100.0)
		var off := Vector2(cos(ang), sin(ang)) * spd * 0.22
		var tw := p.create_tween()
		tw.tween_property(p, "position", p.position + off, 0.22)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.22)
		tw.tween_callback(p.queue_free)

# ---------------- Aim arc visual ----------------
func _draw() -> void:
	if dead or not is_inside_tree(): return
	var g = get_tree().get_first_node_in_group("game")
	if g and str(g.get("build_mode")) != "": return
	if hand_pivot == null: return
	var ang := hand_pivot.rotation
	var ca := cos(ang); var sa := sin(ang)
	var rot := func(v: Vector2) -> Vector2:
		return Vector2(v.x * ca - v.y * sa, v.x * sa + v.y * ca)
	# Faint persistent arc
	var pts := PackedVector2Array()
	pts.append(Vector2.ZERO)
	var steps := 16
	for i in range(steps + 1):
		var a := lerpf(-swing_half_arc, swing_half_arc, float(i) / float(steps))
		pts.append(rot.call(Vector2(cos(a), sin(a)) * swing_reach))
	draw_colored_polygon(pts, Color(0.86, 0.91, 0.81, 0.05))
	# Edge lines
	var p1: Vector2 = rot.call(Vector2(cos(-swing_half_arc), sin(-swing_half_arc)) * swing_reach)
	var p2: Vector2 = rot.call(Vector2(cos(swing_half_arc), sin(swing_half_arc)) * swing_reach)
	draw_line(Vector2.ZERO, p1, Color(0.86, 0.91, 0.81, 0.10), 1.0)
	draw_line(Vector2.ZERO, p2, Color(0.86, 0.91, 0.81, 0.10), 1.0)
	# Highlight arc targets
	var aim_dir := Vector2.RIGHT.rotated(ang)
	for z in get_tree().get_nodes_in_group("zombie"):
		if not is_instance_valid(z) or z.get("dead"): continue
		var to: Vector2 = z.global_position - global_position
		var d := to.length()
		var z_r: float = 20.0
		if d > swing_reach + z_r * 0.75: continue
		if absf(aim_dir.angle_to(to)) <= swing_half_arc:
			draw_arc(to, z_r + 6, 0, TAU, 20, Color(0.86, 0.91, 0.81, 0.85), 2.0)
	for r in get_tree().get_nodes_in_group("harvestable"):
		if not is_instance_valid(r): continue
		var to: Vector2 = r.global_position - global_position
		var d := to.length()
		var r_r: float = 26.0
		if d > swing_reach + r_r * 0.75: continue
		if absf(aim_dir.angle_to(to)) <= swing_half_arc:
			draw_arc(to, r_r + 5, 0, TAU, 20, Color(0.86, 0.91, 0.81, 0.85), 2.0)

# ---------------- Food ----------------
func eat_food() -> void:
	if dead: return
	var g := _get_game()
	if g == null: return
	if g.food >= 10 and hp < max_hp:
		g.food -= 10
		hp = minf(max_hp, hp + 40.0)
		energy = max_energy
		g.resources_changed.emit()
		DamageNumberScript.create("+40 HP", global_position + Vector2(0, -36), Color("#86B06C"), 16)
		get_tree().call_group("game", "flash_toast", "+40 HP & Full Energy")
	elif g.food >= 5 and energy < 50.0:
		g.food -= 5
		energy = max_energy
		g.resources_changed.emit()
		DamageNumberScript.create("+ENERGY", global_position + Vector2(0, -36), Color("#D9A441"), 14)
		get_tree().call_group("game", "flash_toast", "Full Energy")
	else:
		if g.food < 5:
			get_tree().call_group("game", "flash_toast", "Need at least 5 food")
		else:
			get_tree().call_group("game", "flash_toast", "HP & Energy full")

# ---------------- Damage ----------------
func take_hit(amount: float) -> void:
	if dead: return
	hp -= amount
	add_trauma(0.38)
	Game.wave_damage_taken += amount
	if amount >= 15.0:
		Juice.hitstop(self, 0.035, 0.05)
	DamageNumberScript.create("-%d" % int(round(amount)),
		global_position + Vector2(randf_range(-8, 8), -35), Color("#FF8F8F"), 16)
	_flash_hurt()
	if hp <= 0.0:
		if Game.secondary_wind_available:
			Game.secondary_wind_available = false
			hp = 30.0
			Game.crystals = maxi(0, Game.crystals - 1)
			Game.unlock_achievement("survivor")
			Game.push_kill_feed("💪 SECOND WIND", "violet")
			Juice.level_up_shockwave(get_parent(), global_position)
			return
		hp = 0.0
		die()

func take_damage(amount: float) -> void:
	take_hit(amount)

func _flash_hurt() -> void:
	modulate = Color(1.8, 0.4, 0.4)
	var tw := create_tween()
	tw.tween_property(self, "modulate", Color.WHITE, 0.18)

func die() -> void:
	dead = true
	get_tree().call_group("game", "show_game_over")

# ---------------- Dash ----------------
func try_dash() -> void:
	if dead or _dash_cd > 0.0: return
	if energy < 10.0:
		get_tree().call_group("game", "flash_toast", "No energy for dash"); return
	_dash_cd = DASH_CD
	energy -= 10.0
	var dir := velocity.normalized()
	if dir == Vector2.ZERO: dir = Vector2.RIGHT.rotated(hand_pivot.rotation)
	velocity = dir * maxf(speed * 1.35, 300.0)
	move_and_slide()