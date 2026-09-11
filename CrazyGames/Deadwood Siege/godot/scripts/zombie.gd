extends CharacterBody2D
## Deadwood Siege — Zombie (movement, targeting, attack, XP/score/combo integration, boss tracking).
## Enhanced with Hit-Flash shader, BloodBurst & BloodDecal juice, and walking waddle procedural animation.

const Art := preload("res://scripts/art_factory.gd")
const HitFlashShader := preload("res://shaders/hit_flash.gdshader")

var kind := "Sham"
var hp := 20.0
var max_hp := 20.0
var speed := 70.0
var damage := 8.0
var attack_cooldown := 0.0
var target: Node2D = null
var stuck_time := 0.0
var last_pos := Vector2.ZERO
var dead := false

# Procedural Waddle Animation
var _waddle_time: float = 0.0
var _visual_node: Node2D = null
var _hit_material: ShaderMaterial = null
var _flash_tween: Tween = null

const XP_VALUES := {
	"Sham": 4, "Run": 6, "Sap": 8, "Scav": 6,
	"Spit": 10, "Brute": 15, "Champ": 30, "WARLORD": 100
}

const SCORE_VALUES := {
	"Sham": 10, "Run": 15, "Sap": 20, "Scav": 20,
	"Spit": 30, "Brute": 40, "Champ": 100, "WARLORD": 500
}

static func stats_for(k: String, wave: int) -> Dictionary:
	var hp_base: float = {"Sham": 20.0, "Run": 14.0, "Sap": 30.0, "Scav": 18.0,
		"Brute": 90.0, "Spit": 40.0, "Champ": 220.0, "WARLORD": 900.0}.get(k, 10.0)
	var mult := pow(1.12, mini(wave, 200))
	if wave > 200:
		mult = pow(1.12, 200.0) * (1.0 + 0.08 * (wave - 200))
	var sp: float = {"Sham": 70.0, "Run": 130.0, "Sap": 60.0, "Scav": 90.0,
		"Brute": 45.0, "Spit": 60.0, "Champ": 75.0, "WARLORD": 55.0}.get(k, 90.0)
	var dmg: float = {"Sham": 8.0, "Run": 6.0, "Sap": 12.0, "Scav": 6.0,
		"Brute": 25.0, "Spit": 10.0, "Champ": 30.0, "WARLORD": 60.0}.get(k, 5.0)
	return {"hp": hp_base * mult, "speed": sp, "damage": dmg}

var active_mods: Array = []

func setup(k: String, wave: int = 1, mods: Array = []) -> void:
	kind = k
	active_mods = mods
	var st := stats_for(k, wave)
	hp = st["hp"]
	speed = st["speed"]
	speed *= randf_range(0.88, 1.12)
	damage = st["damage"]
	for m in mods:
		var mid: String = m.get("id", "") if m is Dictionary else str(m)
		if mid == "bloodlust":
			speed *= 1.12
		elif mid == "warcry":
			speed *= 1.05
		elif mid == "armored":
			if randf() < 0.30:
				hp *= 1.5
	max_hp = hp
	add_to_group("zombie")
	
	_visual_node = Art.make_zombie(kind)
	add_child(_visual_node)
	
	# Setup hit-flash shader material
	_hit_material = ShaderMaterial.new()
	_hit_material.shader = HitFlashShader
	_hit_material.set_shader_parameter("flash_modifier", 0.0)
	_hit_material.set_shader_parameter("flash_color", Color(1.0, 1.0, 1.0, 1.0))
	_apply_material_recursive(_visual_node, _hit_material)

	var col := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 20.0 if kind != "WARLORD" else 42.0
	col.shape = circle
	add_child(col)
	collision_layer = 4
	collision_mask = 1 | 2 | 8
	last_pos = global_position
	
	# Randomize waddle phase offset so zombies don't march in lockstep
	_waddle_time = randf() * TAU
	
	if kind == "WARLORD":
		Game.boss_hp_changed.emit(true, hp, max_hp, "WARLORD")
		Game.push_kill_feed("👑 WARLORD HAS ENTERED THE SIEGE!", "gold")

func _apply_material_recursive(node: Node, mat: Material) -> void:
	if node is CanvasItem:
		node.material = mat
	for child in node.get_children():
		_apply_material_recursive(child, mat)

func _physics_process(delta: float) -> void:
	if dead:
		return
	delta = minf(delta, 0.05)
	if delta != delta or not is_finite(delta):
		delta = 0.016
	attack_cooldown = maxf(0.0, attack_cooldown - delta)
	_pick_target()
	if target == null or not is_instance_valid(target):
		_process_idle_waddle(delta)
		return
	var to: Vector2 = target.global_position - global_position
	if to.length() < 0.001:
		return
	var vel := to.normalized() * speed
	vel += _separation() * 0.12
	velocity = velocity.lerp(vel, 5.5 * delta)
	move_and_slide()
	global_position.x = clampf(global_position.x, 32.0, 2560.0 - 32.0)
	global_position.y = clampf(global_position.y, 32.0, 2560.0 - 32.0)
	
	# Task 2: Zombie Walking Waddle (tilt +/- 6 deg, squash-and-stretch)
	_process_waddle(delta)
	
	if (global_position - last_pos).length() < 2.0:
		stuck_time += delta
		if stuck_time > 2.0:
			stuck_time = 0.0
			var tangent := Vector2(-to.y, to.x).normalized()
			var nudge_to := to.normalized()
			if tangent.dot(nudge_to) < 0.0:
				tangent = -tangent
			global_position += tangent * 14.0
	else:
		stuck_time = 0.0
	last_pos = global_position
	
	var pressed := false
	for i in range(get_slide_collision_count()):
		if get_slide_collision(i).get_collider() == target:
			pressed = true
			break
	if (pressed or to.length() < 46.0) and attack_cooldown <= 0.0 and target.has_method("take_hit"):
		attack_cooldown = 1.0
		target.take_hit(damage)

func _process_waddle(delta: float) -> void:
	if _visual_node == null:
		return
	var cur_speed := velocity.length()
	if cur_speed > 6.0:
		_waddle_time += delta * (cur_speed / 28.0) * 8.0
		# +/- 6 degrees = ~0.105 radians
		var tilt := sin(_waddle_time) * deg_to_rad(6.0)
		# Squash and stretch
		var squash := 1.0 + sin(_waddle_time * 2.0) * 0.06
		var stretch := 1.0 - sin(_waddle_time * 2.0) * 0.04
		_visual_node.rotation = tilt
		_visual_node.scale = Vector2(stretch, squash)
	else:
		_process_idle_waddle(delta)

func _process_idle_waddle(delta: float) -> void:
	if _visual_node:
		_visual_node.rotation = lerp_angle(_visual_node.rotation, 0.0, 10.0 * delta)
		_visual_node.scale = _visual_node.scale.lerp(Vector2.ONE, 10.0 * delta)

func _pick_target() -> void:
	match kind:
		"Sap":
			target = _nearest_in("wall")
			if target == null:
				target = _nearest_in("player")
		"Scav":
			target = _nearest_in("farm")
			if target == null:
				target = _nearest_in("player")
		"Brute", "Spit":
			target = _nearest_in("defence")
			if target == null:
				target = _nearest_in("wall")
			if target == null:
				target = _nearest_in("player")
		"Champ":
			target = _nearest_in("defence")
			if target == null:
				target = _nearest_in("wall")
			if target == null:
				target = _nearest_in("player")
		"WARLORD":
			target = _nearest_in("player")
			if target == null:
				target = _nearest_in("wall")
		_:
			target = _nearest_in("player")
			if target == null:
				target = _nearest_in("defence")
			if target == null:
				target = _nearest_in("wall")

func _nearest_in(group: String) -> Node2D:
	var best: Node2D = null
	var best_d := INF
	for n in get_tree().get_nodes_in_group(group):
		if not (n is Node2D) or not is_instance_valid(n):
			continue
		if n.get("dead") == true:
			continue
		var d: float = global_position.distance_squared_to(n.global_position)
		if d < best_d:
			best_d = d
			best = n
	return best

func _separation() -> Vector2:
	var push := Vector2.ZERO
	var count := 0
	for n in get_tree().get_nodes_in_group("zombie"):
		if n == self or not is_instance_valid(n):
			continue
		var diff: Vector2 = global_position - n.global_position
		var d := diff.length()
		if d > 0.01 and d < 30.0:
			push += diff.normalized() * (1.0 - d / 30.0) * 12.0
			count += 1
			if count >= 10:
				break
	return push

func take_hit(amount: float) -> void:
	if dead:
		return
	hp -= amount
	if kind == "WARLORD":
		Game.boss_hp_changed.emit(true, hp, max_hp, "WARLORD")
	
	# Task 2: Hit-Flash Shader: flash_modifier 1.0 for 80ms then fade
	_trigger_hit_flash()

	# Task 3: BloodBurst particles
	_spawn_blood_burst(global_position, 8 if kind != "WARLORD" else 18)
	
	# Task 4: Hitstop on boss hits or heavy strikes
	if kind == "WARLORD" or amount >= 35.0:
		_trigger_hitstop(0.035)

	if hp <= 0.0:
		die()

func _trigger_hit_flash() -> void:
	if _hit_material:
		_hit_material.set_shader_parameter("flash_modifier", 1.0)
		if _flash_tween and _flash_tween.is_valid():
			_flash_tween.kill()
		_flash_tween = create_tween()
		_flash_tween.tween_interval(0.04) # hold bright white for ~40ms
		_flash_tween.tween_method(func(v: float): _hit_material.set_shader_parameter("flash_modifier", v), 1.0, 0.0, 0.04)
	else:
		modulate = Color(1.8, 1.8, 1.8)
		var tw := create_tween()
		tw.tween_property(self, "modulate", Color.WHITE, 0.08)

func _spawn_blood_burst(pos: Vector2, count: int) -> void:
	var tree := Engine.get_main_loop() as SceneTree
	var scene := tree.current_scene if tree else null
	if not scene:
		return
	var colors := [Color("#8A242B"), Color("#A82834"), Color("#5C151C"), Color("#3E1015")]
	for i in range(count):
		var p := ColorRect.new()
		p.color = colors[randi() % colors.size()]
		var sz := randf_range(3.0, 5.5)
		p.size = Vector2(sz, sz)
		p.position = pos + Vector2(randf_range(-6, 6), randf_range(-6, 6))
		p.z_index = 62
		scene.add_child(p)
		var angle := randf() * TAU
		var spd := randf_range(60.0, 160.0)
		var target_offset := Vector2(cos(angle), sin(angle)) * spd * randf_range(0.18, 0.32)
		var tw := p.create_tween()
		tw.tween_property(p, "position", p.position + target_offset, 0.25).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.parallel().tween_property(p, "modulate:a", 0.0, 0.28)
		tw.tween_callback(p.queue_free)

func _trigger_hitstop(duration_sec: float) -> void:
	var tree := Engine.get_main_loop() as SceneTree
	if not tree:
		return
	# Freeze frame by dropping time scale briefly
	Engine.time_scale = 0.05
	var timer := tree.create_timer(duration_sec, true, false, true) # ignore_time_scale = true
	timer.timeout.connect(func(): Engine.time_scale = 1.0)

func die() -> void:
	if dead:
		return
	dead = true
	
	# Task 3: BloodDecal on the ground where zombie dies
	_spawn_blood_decal(global_position)
	
	Game.unlock_achievement("firstBlood")
	Game.bump_combo()
	
	var xp_val: int = int(XP_VALUES.get(kind, 4))
	Game.gain_xp(xp_val)
	
	var score_val: int = int(SCORE_VALUES.get(kind, 10))
	Game.gain_score(score_val, global_position)
	
	Game.add_loot(2, 1, 0)
	Game.scraps += 1
	
	if kind == "WARLORD":
		Game.unlock_achievement("bossSlayer")
		Game.push_kill_feed("👑 WARLORD SLAIN!", "gold")
		Game.boss_hp_changed.emit(false, 0.0, 0.0, "")
		_trigger_hitstop(0.06)
	elif kind in ["Champ", "Brute"]:
		Game.push_kill_feed("⚔ %s Defeated" % kind)
	
	WaveDirector.notify_killed()
	
	set_physics_process(false)
	var tw := create_tween()
	tw.tween_property(self, "scale", Vector2(1.35, 1.35), 0.09)
	tw.parallel().tween_property(self, "modulate:a", 0.0, 0.09)
	tw.tween_callback(queue_free)

func _spawn_blood_decal(pos: Vector2) -> void:
	var tree := Engine.get_main_loop() as SceneTree
	var scene := tree.current_scene if tree else null
	if not scene:
		return
	var decal := Node2D.new()
	decal.position = pos
	decal.z_index = 2 # Just above ground, below units
	
	# Draw permanent / long-lasting puddle using overlapping dark crimson discs
	var base_color := Color(0.42, 0.08, 0.11, 0.72)
	var disc_count := randi_range(3, 5)
	for i in range(disc_count):
		var circle_poly := Polygon2D.new()
		var r := randf_range(8.0, 16.0) if kind != "WARLORD" else randf_range(18.0, 32.0)
		var pts := PackedVector2Array()
		var segs := 14
		var offset := Vector2(randf_range(-7, 7), randf_range(-7, 7))
		for s in range(segs):
			var a := TAU * float(s) / float(segs)
			pts.append(offset + Vector2(cos(a), sin(a)) * r * randf_range(0.85, 1.15))
		circle_poly.polygon = pts
		circle_poly.color = base_color
		decal.add_child(circle_poly)
	
	scene.add_child(decal)
	# Fade decal very slowly over 45s so the map tells the story of the siege
	var tw := decal.create_tween()
	tw.tween_interval(35.0)
	tw.tween_property(decal, "modulate:a", 0.0, 10.0)
	tw.tween_callback(decal.queue_free)
