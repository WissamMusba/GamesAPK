extends Node
## Deadwood Siege — Juice & FX System
## Handles particle systems (WoodSparks, StoneSparks, BloodBurst, BloodDecal, WalkDust, LevelUpShockwave),
## dynamic 2D lighting, and hitstop freeze frames.
## 100% GL Compatibility / WebGL2 friendly.

const HitFlashShader := preload("res://shaders/hit_flash.gdshader")

# ----------------- Particle Systems -----------------

static func wood_sparks(tree_or_scene: Node, pos: Vector2, count: int = 10) -> void:
	var scene := _get_scene(tree_or_scene)
	if not scene:
		return
	var colors := [Color("#8A6B4F"), Color("#5D463A"), Color("#6E8F5A"), Color("#85A86C")]
	for i in range(count):
		var p := ColorRect.new()
		var is_leaf := (i % 2 == 0)
		p.color = colors[randi() % colors.size()]
		var sz := randf_range(3.5, 6.5) if not is_leaf else randf_range(3.0, 5.0)
		p.size = Vector2(sz, sz * (0.6 if is_leaf else 1.0))
		p.position = pos + Vector2(randf_range(-10, 10), randf_range(-10, 10))
		p.z_index = 58
		scene.add_child(p)
		
		var angle := randf() * TAU
		var spd := randf_range(50.0, 130.0)
		var dest := p.position + Vector2(cos(angle), sin(angle)) * spd * randf_range(0.2, 0.35)
		var tw := p.create_tween()
		tw.set_parallel(true)
		tw.tween_property(p, "position", dest, 0.32).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(p, "rotation", randf_range(-PI, PI), 0.32)
		tw.tween_property(p, "modulate:a", 0.0, 0.32).set_ease(Tween.EASE_IN)
		tw.chain().tween_callback(p.queue_free)

static func stone_sparks(tree_or_scene: Node, pos: Vector2, count: int = 12) -> void:
	var scene := _get_scene(tree_or_scene)
	if not scene:
		return
	var dust_colors := [Color("#8B8FA8"), Color("#A6AAC2"), Color("#62657A")]
	var spark_colors := [Color("#FFF7D6"), Color("#FFE26A"), Color("#FFFFFF")]
	for i in range(count):
		var p := ColorRect.new()
		var is_spark := (randf() < 0.45)
		p.color = spark_colors[randi() % spark_colors.size()] if is_spark else dust_colors[randi() % dust_colors.size()]
		var sz := randf_range(2.0, 4.0) if is_spark else randf_range(3.5, 6.0)
		p.size = Vector2(sz, sz)
		p.position = pos + Vector2(randf_range(-8, 8), randf_range(-8, 8))
		p.z_index = 60
		scene.add_child(p)
		
		var angle := randf() * TAU
		var spd := randf_range(80.0, 180.0) if is_spark else randf_range(40.0, 90.0)
		var dur := randf_range(0.18, 0.28) if is_spark else randf_range(0.3, 0.45)
		var dest := p.position + Vector2(cos(angle), sin(angle)) * spd * dur
		var tw := p.create_tween()
		tw.set_parallel(true)
		tw.tween_property(p, "position", dest, dur).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(p, "modulate:a", 0.0, dur)
		tw.chain().tween_callback(p.queue_free)

static func blood_burst(tree_or_scene: Node, pos: Vector2, hit_dir: Vector2 = Vector2.ZERO, count: int = 12) -> void:
	var scene := _get_scene(tree_or_scene)
	if not scene:
		return
	var colors := [Color("#8A242B"), Color("#A82834"), Color("#5C151C"), Color("#3E1015")]
	var base_angle := hit_dir.angle() if hit_dir != Vector2.ZERO else randf() * TAU
	var is_directional := (hit_dir != Vector2.ZERO)
	for i in range(count):
		var p := ColorRect.new()
		p.color = colors[randi() % colors.size()]
		var sz := randf_range(3.0, 5.5)
		p.size = Vector2(sz, sz)
		p.position = pos + Vector2(randf_range(-5, 5), randf_range(-5, 5))
		p.z_index = 62
		scene.add_child(p)
		
		var angle := base_angle + randf_range(-0.75, 0.75) if is_directional else randf() * TAU
		var spd := randf_range(70.0, 190.0)
		var dur := randf_range(0.22, 0.35)
		var dest := p.position + Vector2(cos(angle), sin(angle)) * spd * dur
		var tw := p.create_tween()
		tw.set_parallel(true)
		tw.tween_property(p, "position", dest, dur).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw.tween_property(p, "modulate:a", 0.0, dur)
		tw.chain().tween_callback(p.queue_free)

static func blood_decal(tree_or_scene: Node, pos: Vector2, radius: float = 16.0) -> void:
	var scene := _get_scene(tree_or_scene)
	if not scene:
		return
	var decal := Node2D.new()
	decal.position = pos
	decal.z_index = 2
	
	var base_color := Color(0.40, 0.08, 0.11, 0.68)
	var disc_count := randi_range(3, 5)
	for i in range(disc_count):
		var circle_poly := Polygon2D.new()
		var r := randf_range(radius * 0.5, radius * 1.1)
		var pts := PackedVector2Array()
		var segs := 12
		var offset := Vector2(randf_range(-radius * 0.4, radius * 0.4), randf_range(-radius * 0.4, radius * 0.4))
		for s in range(segs):
			var a := TAU * float(s) / float(segs)
			pts.append(offset + Vector2(cos(a), sin(a)) * r * randf_range(0.82, 1.18))
		circle_poly.polygon = pts
		circle_poly.color = base_color
		decal.add_child(circle_poly)
	
	scene.add_child(decal)
	var tw := decal.create_tween()
	tw.tween_interval(35.0)
	tw.tween_property(decal, "modulate:a", 0.0, 10.0)
	tw.tween_callback(decal.queue_free)

static func walk_dust(tree_or_scene: Node, foot_pos: Vector2, move_vel: Vector2) -> void:
	var scene := _get_scene(tree_or_scene)
	if not scene:
		return
	var p := ColorRect.new()
	p.color = Color(0.82, 0.86, 0.74, 0.38)
	var sz := randf_range(4.0, 7.0)
	p.size = Vector2(sz, sz)
	# Place slightly behind feet
	var back_dir := -move_vel.normalized()
	p.position = foot_pos + back_dir * randf_range(6.0, 12.0) + Vector2(randf_range(-3, 3), randf_range(-3, 3))
	p.z_index = 8
	scene.add_child(p)
	
	var drift := back_dir * randf_range(8.0, 16.0) + Vector2(randf_range(-4, 4), randf_range(-4, 4))
	var tw := p.create_tween()
	tw.set_parallel(true)
	tw.tween_property(p, "position", p.position + drift, 0.28).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(p, "scale", Vector2(1.6, 1.6), 0.28)
	tw.tween_property(p, "modulate:a", 0.0, 0.28)
	tw.chain().tween_callback(p.queue_free)

static func level_up_shockwave(tree_or_scene: Node, center_pos: Vector2) -> void:
	var scene := _get_scene(tree_or_scene)
	if not scene:
		return
	
	# Expanding golden shockwave ring
	var ring := Line2D.new()
	var segs := 36
	var pts := PackedVector2Array()
	for i in range(segs + 1):
		var a := TAU * float(i) / float(segs)
		pts.append(Vector2(cos(a), sin(a)))
	ring.points = pts
	ring.width = 6.0
	ring.default_color = Color("#E6C25A")
	ring.position = center_pos
	ring.z_index = 65
	scene.add_child(ring)
	
	var tw := ring.create_tween()
	tw.set_parallel(true)
	tw.tween_property(ring, "scale", Vector2(180.0, 180.0), 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	tw.tween_property(ring, "width", 1.0, 0.5)
	tw.tween_property(ring, "modulate:a", 0.0, 0.5).set_ease(Tween.EASE_IN)
	tw.chain().tween_callback(ring.queue_free)
	
	# Golden sparkles burst
	var spark_colors := [Color("#FFF8D4"), Color("#E6C25A"), Color("#F5D77F")]
	for i in range(24):
		var p := ColorRect.new()
		p.color = spark_colors[randi() % spark_colors.size()]
		var sz := randf_range(3.0, 6.0)
		p.size = Vector2(sz, sz)
		p.position = center_pos
		p.z_index = 66
		scene.add_child(p)
		
		var a := TAU * float(i) / 24.0 + randf_range(-0.1, 0.1)
		var spd := randf_range(110.0, 220.0)
		var dest := center_pos + Vector2(cos(a), sin(a)) * spd * 0.45
		var tw_spark := p.create_tween()
		tw_spark.set_parallel(true)
		tw_spark.tween_property(p, "position", dest, 0.45).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tw_spark.tween_property(p, "modulate:a", 0.0, 0.45)
		tw_spark.chain().tween_callback(p.queue_free)

# ----------------- Hitstop (Freeze Frame) -----------------

static func hitstop(tree_or_node: Node, duration_sec: float = 0.035, scale: float = 0.05) -> void:
	var tree := tree_or_node.get_tree() if tree_or_node else (Engine.get_main_loop() as SceneTree)
	if not tree:
		return
	Engine.time_scale = scale
	var timer := tree.create_timer(duration_sec, true, false, true) # ignore_time_scale = true
	timer.timeout.connect(func(): Engine.time_scale = 1.0)

# ----------------- Torchlight Helper -----------------

static func create_flicker_light(color: Color, radius: float, energy: float) -> Node2D:
	var root := Node2D.new()
	root.name = "FlickerLight"
	
	# Radial gradient texture
	var grad := Gradient.new()
	grad.colors = PackedColorArray([color, Color(color.r, color.g, color.b, 0.0)])
	grad.offsets = PackedFloat32Array([0.0, 1.0])
	var tex := GradientTexture2D.new()
	tex.gradient = grad
	tex.fill = GradientTexture2D.FILL_RADIAL
	tex.fill_from = Vector2(0.5, 0.5)
	tex.fill_to = Vector2(0.5, 0.0)
	var sz: int = int(round(radius * 2.0))
	tex.width = sz
	tex.height = sz
	
	var light := PointLight2D.new()
	light.name = "PointLight"
	light.texture = tex
	light.energy = energy
	light.color = color
	root.add_child(light)
	
	# Additive halo sprite fallback for 100% WebGL2 compatibility
	var halo := Sprite2D.new()
	halo.name = "Halo"
	halo.texture = tex
	halo.modulate = Color(color.r, color.g, color.b, energy * 0.35)
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	halo.material = mat
	halo.z_index = 4
	root.add_child(halo)
	
	# Script/Process on root for flicker
	root.set_script(preload("res://scripts/light_flicker.gd"))
	root.set("base_energy", energy)
	return root

static func _get_scene(node: Object) -> Node:
	if node == null:
		var tree := Engine.get_main_loop() as SceneTree
		return tree.current_scene if tree else null
	if node is SceneTree:
		return (node as SceneTree).current_scene
	if node is Node:
		var tree := (node as Node).get_tree()
		return tree.current_scene if tree else (node as Node)
	return null
