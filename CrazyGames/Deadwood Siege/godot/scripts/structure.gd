extends StaticBody2D
## Deadwood Siege — Structure Node (v7 port)
## Handles all 8 structures: wall, door, spike, crossbow, farm, tar, cauldron, ballista.
## Supports 3-tier upgrades, 2-layer rotating architecture for turrets, recoil tweens,
## auto-opening door (< 76px), and accurate v7 stats.
class_name Structure

signal died(cell_keys: Array)
signal upgraded(new_tier: int)
signal structure_hit(new_hp: float, max_hp: float)

const ArrowScene := preload("res://scenes/Arrow.tscn")
const BallistaBoltScene := preload("res://scenes/BallistaBolt.tscn")

var struct_kind: String = "wall"
var tier: int = 1
var rot: int = 0
var fw: int = 4
var fh: int = 1
var base_fw: int = 4
var base_fh: int = 1
var cell_origin: Vector2i = Vector2i.ZERO
var cell_keys: Array = []

var hp: float = 380.0
var max_hp: float = 380.0
var dead: bool = false
var cooldown: float = 0.0
var fire_rate: float = 1.0
var damage: float = 0.0
var range_px: float = 0.0
var food_yield: int = 0
var slow_factor: float = 1.0
var tar_dmg: float = 0.0
var splash_radius: float = 0.0
var pierce: bool = false

var growth: float = 0.0
var grow_time: float = 12.0
var sprouts: Node2D = null

var hit_timer: float = 0.0
var is_door_open: bool = false
var door_leaf: Node2D = null

# 2-layer architecture references
@onready var base_node: Node2D = get_node_or_null("Base")
@onready var head_node: Node2D = get_node_or_null("Head")
@onready var col_shape: CollisionShape2D = get_node_or_null("CollisionShape2D")
@onready var hit_area: Area2D = get_node_or_null("HitArea")
@onready var hit_col: CollisionShape2D = get_node_or_null("HitArea/CollisionShape2D") if hit_area else null

var _overlapping_zombies: Array[Node] = []
var _slowed_zombies: Dictionary = {}
var _tar_tick_timer: float = 0.0

func _ready() -> void:
	if base_node == null:
		base_node = Node2D.new()
		base_node.name = "Base"
		add_child(base_node)
	if head_node == null:
		head_node = Node2D.new()
		head_node.name = "Head"
		add_child(head_node)
	if col_shape == null:
		col_shape = CollisionShape2D.new()
		col_shape.name = "CollisionShape2D"
		add_child(col_shape)
	if hit_area == null:
		hit_area = Area2D.new()
		hit_area.name = "HitArea"
		hit_col = CollisionShape2D.new()
		hit_col.name = "CollisionShape2D"
		hit_area.add_child(hit_col)
		add_child(hit_area)
	
	hit_area.collision_layer = 0
	hit_area.collision_mask = 4
	if not hit_area.body_entered.is_connected(_on_hit_area_body_entered):
		hit_area.body_entered.connect(_on_hit_area_body_entered)
	if not hit_area.body_exited.is_connected(_on_hit_area_body_exited):
		hit_area.body_exited.connect(_on_hit_area_body_exited)

func setup(kind: String, p_rot: int = 0, p_tier: int = 1) -> void:
	struct_kind = kind
	rot = p_rot
	tier = p_tier
	
	var def: Dictionary = BuildGrid.get_def(kind)
	base_fw = int(def.get("fw", 1))
	base_fh = int(def.get("fh", 1))
	var fp: Vector2i = BuildGrid.footprint(def, rot)
	fw = fp.x
	fh = fp.y
	
	hp = float(def.get("hp", 100.0))
	max_hp = hp
	damage = float(def.get("dmg", 0.0))
	fire_rate = float(def.get("rate", 1.0))
	range_px = float(def.get("range", 0.0))
	food_yield = int(def.get("food", 0))
	slow_factor = float(def.get("slow", 1.0))
	tar_dmg = float(def.get("tar_dmg", 0.0))
	splash_radius = float(def.get("splash", 0.0))
	pierce = bool(def.get("pierce", false))
	cooldown = 0.0
	growth = 0.0
	
	var ups: Array = def.get("up", [])
	for i in range(mini(tier - 1, ups.size())):
		var up: Dictionary = ups[i]
		if up.has("hp"):
			max_hp = float(up["hp"])
			hp = max_hp
		if up.has("dmg"): damage = float(up["dmg"])
		if up.has("rate"): fire_rate = float(up["rate"])
		if up.has("range"): range_px = float(up["range"])
		if up.has("food"): food_yield = int(up["food"])
		if up.has("slow"): slow_factor = float(up["slow"])
		if up.has("splash"): splash_radius = float(up["splash"])
		if up.has("tar_dmg"): tar_dmg = float(up["tar_dmg"])
	
	match kind:
		"wall", "door":
			add_to_group("wall")
		"farm":
			add_to_group("farm")
			add_to_group("harvestable")
		_:
			add_to_group("defence")
	
	_setup_collision()
	_rebuild_art()

func _setup_collision() -> void:
	if col_shape == null:
		return
	var w: float = float(fw) * BuildGrid.GRID
	var h: float = float(fh) * BuildGrid.GRID
	var rect := RectangleShape2D.new()
	rect.size = Vector2(w, h)
	col_shape.shape = rect
	col_shape.position = Vector2.ZERO
	
	if hit_col:
		var hit_rect := RectangleShape2D.new()
		hit_rect.size = Vector2(w + 12.0, h + 12.0)
		hit_col.shape = hit_rect
		hit_col.position = Vector2.ZERO
	
	match struct_kind:
		"farm", "tar":
			collision_layer = 0
			collision_mask = 0
		"door":
			collision_layer = 2 | 8
			collision_mask = 1 | 4
		"spike":
			collision_layer = 2
			collision_mask = 4
		_:
			collision_layer = 2
			collision_mask = 1 | 4

func _process(delta: float) -> void:
	delta = minf(delta, 0.05)
	if dead:
		return
	
	hit_timer = maxf(0.0, hit_timer - delta)
	cooldown = maxf(0.0, cooldown - delta)
	
	match struct_kind:
		"door":
			_process_door()
		"spike":
			_process_spike()
		"tar":
			_process_tar(delta)
		"crossbow":
			_process_crossbow(delta)
		"ballista":
			_process_ballista(delta)
		"cauldron":
			_process_cauldron(delta)
		"farm":
			_process_farm()

# ----------------- 1. DOOR (auto opens when player < 76px) -----------------
func _process_door() -> void:
	var player: Node2D = get_tree().get_first_node_in_group("player") as Node2D
	if player == null or not is_instance_valid(player):
		return
	
	var dist: float = global_position.distance_to(player.global_position)
	var should_open: bool = dist < 76.0
	
	if should_open != is_door_open:
		is_door_open = should_open
		if is_door_open:
			collision_layer = 8
			if door_leaf:
				var tw := create_tween()
				tw.tween_property(door_leaf, "rotation", -0.95, 0.15)
		else:
			collision_layer = 2 | 8
			if door_leaf:
				var tw := create_tween()
				tw.tween_property(door_leaf, "rotation", 0.0, 0.15)

# ----------------- 2. SPIKE (damages enemies on overlap) -----------------
func _process_spike() -> void:
	if cooldown > 0.0:
		return
	var hit: bool = false
	for z in _overlapping_zombies:
		if is_instance_valid(z) and not z.get("dead") and z.has_method("take_hit"):
			z.take_hit(damage)
			hit = true
	if hit:
		cooldown = 0.4
		modulate = Color(1.8, 0.8, 0.8)
		var tw := create_tween()
		tw.tween_property(self, "modulate", Color.WHITE, 0.18)

# ----------------- 3. TAR PIT (slows zombies 50% + tick dmg) -----------------
func _process_tar(delta: float) -> void:
	_tar_tick_timer += delta
	var do_tick: bool = _tar_tick_timer >= 0.5
	if do_tick:
		_tar_tick_timer = 0.0
	
	for z in _overlapping_zombies:
		if not is_instance_valid(z) or z.get("dead"):
			continue
		
		if not _slowed_zombies.has(z) and "speed" in z:
			_slowed_zombies[z] = z.speed
			z.speed = z.speed * slow_factor
		
		if do_tick and z.has_method("take_hit"):
			z.take_hit(tar_dmg * 0.5)

# ----------------- 4. CROSSBOW (2-layer: Base + rotating Head) -----------------
func _process_crossbow(_delta: float) -> void:
	var target: Node2D = _nearest_zombie(range_px)
	if target == null:
		return
	
	var aim_dir: Vector2 = (target.global_position - global_position).normalized()
	if head_node:
		head_node.rotation = aim_dir.angle()
	
	if cooldown <= 0.0:
		cooldown = fire_rate
		_fire_crossbow(aim_dir)

func _fire_crossbow(aim_dir: Vector2) -> void:
	var arrow: Area2D = ArrowScene.instantiate()
	var spawn_pos: Vector2 = global_position + aim_dir * 36.0
	arrow.setup(spawn_pos, aim_dir.angle(), damage, 680.0)
	get_tree().current_scene.add_child(arrow)
	
	if head_node:
		var tw := create_tween()
		tw.tween_property(head_node, "position", -aim_dir * 10.0, 0.04).set_ease(Tween.EASE_OUT)
		tw.tween_property(head_node, "position", Vector2.ZERO, 0.12).set_ease(Tween.EASE_IN_OUT)

# ----------------- 5. BALLISTA (heavy 2-layer rotating head, siege bolt) -----------------
func _process_ballista(_delta: float) -> void:
	var target: Node2D = _nearest_zombie(range_px)
	if target == null:
		return
	
	var aim_dir: Vector2 = (target.global_position - global_position).normalized()
	if head_node:
		head_node.rotation = aim_dir.angle()
	
	if cooldown <= 0.0:
		cooldown = fire_rate
		_fire_ballista(aim_dir)

func _fire_ballista(aim_dir: Vector2) -> void:
	var bolt: Area2D = BallistaBoltScene.instantiate()
	var spawn_pos: Vector2 = global_position + aim_dir * 60.0
	bolt.setup(spawn_pos, aim_dir.angle(), damage, 820.0)
	get_tree().current_scene.add_child(bolt)
	
	if head_node:
		var tw := create_tween()
		tw.tween_property(head_node, "position", -aim_dir * 18.0, 0.05).set_ease(Tween.EASE_OUT)
		tw.tween_property(head_node, "position", Vector2.ZERO, 0.16).set_ease(Tween.EASE_IN_OUT)

# ----------------- 6. CAULDRON (splash tar attack) -----------------
func _process_cauldron(_delta: float) -> void:
	if cooldown > 0.0:
		return
	var target: Node2D = _nearest_zombie(range_px)
	if target == null:
		return
	
	cooldown = fire_rate
	var tgt_pos: Vector2 = target.global_position
	
	for z in get_tree().get_nodes_in_group("zombie"):
		if not is_instance_valid(z) or z.get("dead"):
			continue
		var d: float = tgt_pos.distance_to(z.global_position)
		if d <= splash_radius and z.has_method("take_hit"):
			z.take_hit(damage)
	
	_spawn_cauldron_splash_fx(tgt_pos)

func _spawn_cauldron_splash_fx(tgt_pos: Vector2) -> void:
	var ring := Line2D.new()
	var pts := PackedVector2Array()
	for i in range(25):
		var a := TAU * float(i) / 24.0
		pts.append(Vector2(cos(a), sin(a)) * splash_radius)
	ring.points = pts
	ring.default_color = Color("#D9A441")
	ring.width = 3.5
	ring.global_position = tgt_pos
	get_tree().current_scene.add_child(ring)
	var tw := ring.create_tween()
	tw.tween_property(ring, "scale", Vector2(1.2, 1.2), 0.25)
	tw.parallel().tween_property(ring, "modulate:a", 0.0, 0.25)
	tw.tween_callback(ring.queue_free)

# ----------------- 7. FARM (produces food every rate interval) -----------------
func _process_farm() -> void:
	if cooldown <= 0.0:
		cooldown = fire_rate
		var g: Node = get_node_or_null("/root/Game")
		if g != null:
			g.add_loot(0, 0, food_yield)
		get_tree().call_group("game", "spawn_float_text", global_position + Vector2(0, -26), "+%d food" % food_yield, Color("#6E8F5A"))

func harvest(_power: int = 1) -> void:
	if struct_kind != "farm" or dead:
		return
	var g: Node = get_node_or_null("/root/Game")
	if g != null:
		g.add_loot(0, 0, food_yield)
	get_tree().call_group("game", "spawn_float_text", global_position + Vector2(0, -26), "+%d food" % food_yield, Color("#6E8F5A"))

func _nearest_zombie(max_dist: float) -> Node2D:
	var best: Node2D = null
	var best_d: float = max_dist * max_dist
	for z in get_tree().get_nodes_in_group("zombie"):
		if not is_instance_valid(z) or z.get("dead"):
			continue
		var d: float = global_position.distance_squared_to(z.global_position)
		if d < best_d:
			best_d = d
			best = z
	return best

func _on_hit_area_body_entered(body: Node2D) -> void:
	if body.is_in_group("zombie") and not body in _overlapping_zombies:
		_overlapping_zombies.append(body)

func _on_hit_area_body_exited(body: Node2D) -> void:
	_overlapping_zombies.erase(body)
	if _slowed_zombies.has(body):
		if is_instance_valid(body) and "speed" in body:
			body.speed = _slowed_zombies[body]
		_slowed_zombies.erase(body)

func get_upgrade_cost() -> Dictionary:
	var def: Dictionary = BuildGrid.get_def(struct_kind)
	var ups: Array = def.get("up", [])
	var up_index: int = tier - 1
	if up_index >= 0 and up_index < ups.size():
		return ups[up_index].get("cost", {})
	return {}

func can_upgrade() -> bool:
	if dead or tier >= 3:
		return false
	var cost: Dictionary = get_upgrade_cost()
	if cost.is_empty():
		return false
	var need_w: int = int(cost.get("wood", 0))
	var need_s: int = int(cost.get("stone", 0))
	var need_f: int = int(cost.get("food", 0))
	var g: Node = get_node_or_null("/root/Game")
	if g != null:
		return int(g.get("wood")) >= need_w and int(g.get("stone")) >= need_s and int(g.get("food")) >= need_f
	return true

func try_upgrade() -> bool:
	if not can_upgrade():
		var cost: Dictionary = get_upgrade_cost()
		if not cost.is_empty():
			var need_w: int = int(cost.get("wood", 0))
			var need_s: int = int(cost.get("stone", 0))
			get_tree().call_group("game", "flash_toast", "Need %dW %dS to upgrade" % [need_w, need_s])
		else:
			get_tree().call_group("game", "flash_toast", "Max tier")
		return false
	
	var cost: Dictionary = get_upgrade_cost()
	var need_w: int = int(cost.get("wood", 0))
	var need_s: int = int(cost.get("stone", 0))
	var need_f: int = int(cost.get("food", 0))
	var g: Node = get_node_or_null("/root/Game")
	if g != null:
		g.spend(need_w, need_s, need_f)
	
	var def: Dictionary = BuildGrid.get_def(struct_kind)
	var ups: Array = def.get("up", [])
	var up: Dictionary = ups[tier - 1]
	
	var old_ratio: float = hp / max_hp if max_hp > 0.0 else 1.0
	tier += 1
	
	if up.has("hp"):
		max_hp = float(up["hp"])
		hp = max_hp
	else:
		hp = max_hp * minf(1.0, old_ratio + 0.4)
	
	if up.has("dmg"): damage = float(up["dmg"])
	if up.has("rate"): fire_rate = float(up["rate"])
	if up.has("range"): range_px = float(up["range"])
	if up.has("food"): food_yield = int(up["food"])
	if up.has("slow"): slow_factor = float(up["slow"])
	if up.has("splash"): splash_radius = float(up["splash"])
	if up.has("tar_dmg"): tar_dmg = float(up["tar_dmg"])
	
	_rebuild_art()
	
	var tw := create_tween()
	tw.tween_property(self, "scale", Vector2(1.15, 1.15), 0.08)
	tw.tween_property(self, "scale", Vector2.ONE, 0.12)
	get_tree().call_group("game", "spawn_float_text", global_position + Vector2(0, -20), "TIER %d" % tier, Color("#E6C25A"))
	get_tree().call_group("game", "flash_toast", "%s upgraded to Tier %d!" % [struct_kind.capitalize(), tier])
	upgraded.emit(tier)
	return true

func take_hit(amount: float) -> void:
	if dead:
		return
	hp -= amount
	structure_hit.emit(hp, max_hp)
	modulate = Color(1.8, 1.2, 1.2)
	var tw := create_tween()
	tw.tween_property(self, "modulate", Color.WHITE, 0.14)
	if hp <= 0.0:
		die()

func die() -> void:
	if dead:
		return
	dead = true
	died.emit(cell_keys)
	set_process(false)
	collision_layer = 0
	collision_mask = 0
	
	for z in _slowed_zombies.keys():
		if is_instance_valid(z) and "speed" in z:
			z.speed = _slowed_zombies[z]
	_slowed_zombies.clear()
	
	var tw := create_tween()
	tw.tween_property(self, "scale", Vector2(0.8, 0.8), 0.12)
	tw.parallel().tween_property(self, "modulate:a", 0.0, 0.12)
	tw.tween_callback(queue_free)

func _rebuild_art() -> void:
	if base_node == null or head_node == null:
		return
	
	for child in base_node.get_children():
		child.queue_free()
	for child in head_node.get_children():
		child.queue_free()
	door_leaf = null
	
	var w: float = float(fw) * BuildGrid.GRID
	var h: float = float(fh) * BuildGrid.GRID
	var half_w: float = w * 0.5
	var half_h: float = h * 0.5
	
	match struct_kind:
		"wall":
			_build_wall_art(half_w, half_h)
		"door":
			_build_door_art(w, h, half_w, half_h)
		"spike":
			_build_spike_art(half_w, half_h)
		"crossbow":
			_build_crossbow_art(half_w, half_h)
		"farm":
			_build_farm_art(half_w, half_h)
		"tar":
			_build_tar_art(half_w, half_h)
		"cauldron":
			_build_cauldron_art(half_w, half_h)
		"ballista":
			_build_ballista_art(half_w, half_h)

func _build_wall_art(hw: float, hh: float) -> void:
	var bg_col: Color = Color("#8B6B3E") if tier == 1 else (Color("#7C7A82") if tier == 2 else Color("#4A505C"))
	var inner_col: Color = Color("#A98453") if tier == 1 else (Color("#9A98A0") if tier == 2 else Color("#6A707C"))
	var stroke_col: Color = Color("#5C4526") if tier == 1 else (Color("#4A4A52") if tier == 2 else Color("#B8933A"))
	
	var base_poly := Polygon2D.new()
	base_poly.polygon = PackedVector2Array([
		Vector2(-hw, -hh), Vector2(hw, -hh), Vector2(hw, hh), Vector2(-hw, hh)
	])
	base_poly.color = bg_col
	base_node.add_child(base_poly)
	
	var inner_poly := Polygon2D.new()
	inner_poly.polygon = PackedVector2Array([
		Vector2(-hw + 3, -hh + 3), Vector2(hw - 3, -hh + 3),
		Vector2(hw - 3, hh - 3), Vector2(-hw + 3, hh - 3)
	])
	inner_poly.color = inner_col
	base_node.add_child(inner_poly)
	
	var num_divs: int = maxi(2, int((hw * 2.0) / 26.0))
	for i in range(1, num_divs):
		var x: float = -hw + (hw * 2.0 / float(num_divs)) * float(i)
		var div := Line2D.new()
		div.points = PackedVector2Array([Vector2(x, -hh + 4), Vector2(x, hh - 4)])
		div.default_color = stroke_col
		div.width = 2.0
		base_node.add_child(div)
	
	if tier == 3:
		for i in range(5):
			var rx: float = -hw + 10.0 + float(i) * ((hw * 2.0 - 20.0) / 4.0)
			var dot := Polygon2D.new()
			dot.polygon = _circle_poly(3.0, 8)
			dot.position = Vector2(rx, 0)
			dot.color = Color("#D9A441")
			base_node.add_child(dot)

func _build_door_art(w: float, h: float, hw: float, hh: float) -> void:
	var frame := Line2D.new()
	frame.points = PackedVector2Array([
		Vector2(-hw + 2, -hh + 2), Vector2(hw - 2, -hh + 2),
		Vector2(hw - 2, hh - 2), Vector2(-hw + 2, hh - 2), Vector2(-hw + 2, -hh + 2)
	])
	frame.default_color = Color("#3A2D1E")
	frame.width = 3.0
	base_node.add_child(frame)
	
	door_leaf = Node2D.new()
	door_leaf.position = Vector2(-hw + 4.0, 0.0)
	base_node.add_child(door_leaf)
	
	var leaf_w: float = w - 8.0
	var leaf_h: float = h - 6.0
	var leaf_bg := Polygon2D.new()
	leaf_bg.polygon = PackedVector2Array([
		Vector2(0, -leaf_h * 0.5), Vector2(leaf_w, -leaf_h * 0.5),
		Vector2(leaf_w, leaf_h * 0.5), Vector2(0, leaf_h * 0.5)
	])
	leaf_bg.color = Color("#8B6B3E") if tier == 1 else (Color("#8A8A92") if tier == 2 else Color("#5A6070"))
	door_leaf.add_child(leaf_bg)
	
	var knob := Polygon2D.new()
	knob.polygon = _circle_poly(3.0, 8)
	knob.position = Vector2(leaf_w - 6.0, 0.0)
	knob.color = Color("#D9A441") if tier == 3 else Color("#454B5C")
	door_leaf.add_child(knob)

func _build_spike_art(hw: float, hh: float) -> void:
	var beam := Line2D.new()
	beam.points = PackedVector2Array([Vector2(-hw + 4, hh - 6), Vector2(hw - 4, hh - 6)])
	beam.default_color = Color("#6E5A3E") if tier == 1 else Color("#4A4A4A")
	beam.width = 6.0
	base_node.add_child(beam)
	
	var n_spikes: int = 3 + tier
	var spacing: float = (hw * 2.0 - 16.0) / float(n_spikes - 1)
	var col: Color = Color("#B8BED0") if tier == 1 else (Color("#C8CEDE") if tier == 2 else Color("#D8DEEA"))
	
	for i in range(n_spikes):
		var sx: float = -hw + 8.0 + float(i) * spacing
		var spike_poly := Polygon2D.new()
		spike_poly.polygon = PackedVector2Array([
			Vector2(sx - 6.0, hh - 6.0),
			Vector2(sx, -hh + 6.0),
			Vector2(sx + 6.0, hh - 6.0)
		])
		spike_poly.color = col
		base_node.add_child(spike_poly)
		
		var spike_out := Line2D.new()
		spike_out.points = spike_poly.polygon + PackedVector2Array([spike_poly.polygon[0]])
		spike_out.default_color = Color("#333B4F")
		spike_out.width = 1.5
		base_node.add_child(spike_out)
		
		if tier == 3:
			var gold_tip := Polygon2D.new()
			gold_tip.polygon = _circle_poly(2.5, 6)
			gold_tip.position = Vector2(sx, -hh + 8.0)
			gold_tip.color = Color("#D9A441")
			base_node.add_child(gold_tip)

func _build_crossbow_art(hw: float, hh: float) -> void:
	var base_r: float = 22.0 + float(tier) * 2.0
	var mount := Polygon2D.new()
	mount.polygon = _circle_poly(base_r, 20)
	mount.color = Color("#6E7286") if tier == 1 else (Color("#7C8298") if tier == 2 else Color("#5A627A"))
	base_node.add_child(mount)
	
	var mount_out := Line2D.new()
	mount_out.points = mount.polygon + PackedVector2Array([mount.polygon[0]])
	mount_out.default_color = Color("#333B4F")
	mount_out.width = 3.0
	base_node.add_child(mount_out)
	
	var n_dots: int = 4 + tier
	for i in range(n_dots):
		var a: float = float(i) * TAU / float(n_dots) + PI / 4.0
		var dp := Polygon2D.new()
		dp.polygon = _circle_poly(2.5, 8)
		dp.position = Vector2(cos(a), sin(a)) * (base_r - 5.0)
		dp.color = Color("#D9A441") if tier == 3 else Color("#454B5C")
		base_node.add_child(dp)
	
	var stock_len: float = 44.0 + float(tier) * 4.0
	var stock_h: float = 12.0
	
	var stock := Polygon2D.new()
	stock.polygon = PackedVector2Array([
		Vector2(-stock_len * 0.5, -stock_h * 0.5), Vector2(stock_len * 0.5, -stock_h * 0.5),
		Vector2(stock_len * 0.5, stock_h * 0.5), Vector2(-stock_len * 0.5, stock_h * 0.5)
	])
	stock.color = Color("#9A7853") if tier == 1 else (Color("#8B6B44") if tier == 2 else Color("#7A5A38"))
	head_node.add_child(stock)
	
	var stock_out := Line2D.new()
	stock_out.points = stock.polygon + PackedVector2Array([stock.polygon[0]])
	stock_out.default_color = Color("#333B4F")
	stock_out.width = 2.0
	head_node.add_child(stock_out)
	
	var limb_len: float = 28.0 + float(tier) * 4.0
	var bow_line := Line2D.new()
	bow_line.points = PackedVector2Array([
		Vector2(8.0, -limb_len), Vector2(16.0, 0.0), Vector2(8.0, limb_len)
	])
	bow_line.default_color = Color("#5A4530")
	bow_line.width = 5.0
	head_node.add_child(bow_line)
	
	var string_line := Line2D.new()
	string_line.points = PackedVector2Array([
		Vector2(8.0, -limb_len), Vector2(-8.0, 0.0), Vector2(8.0, limb_len)
	])
	string_line.default_color = Color("#E8E0C8")
	string_line.width = 2.0
	head_node.add_child(string_line)
	
	var bolt_tip := Polygon2D.new()
	bolt_tip.polygon = PackedVector2Array([
		Vector2(24.0, 0.0), Vector2(16.0, -3.5), Vector2(16.0, 3.5)
	])
	bolt_tip.color = Color("#DDE3ED")
	head_node.add_child(bolt_tip)

func _build_farm_art(hw: float, hh: float) -> void:
	var soil := Polygon2D.new()
	soil.polygon = PackedVector2Array([
		Vector2(-hw + 3, -hh + 3), Vector2(hw - 3, -hh + 3),
		Vector2(hw - 3, hh - 3), Vector2(-hw + 3, hh - 3)
	])
	soil.color = Color("#7A5C3E") if tier == 1 else (Color("#6A4F32") if tier == 2 else Color("#5A4428"))
	base_node.add_child(soil)
	
	var rows: int = 3 + tier
	for i in range(rows):
		var y: float = -hh + 8.0 + float(i) * ((hh * 2.0 - 16.0) / float(rows - 1))
		var furrow := Line2D.new()
		furrow.points = PackedVector2Array([Vector2(-hw + 8, y), Vector2(hw - 8, y)])
		furrow.default_color = Color("#5F7F4E")
		furrow.width = 3.0
		base_node.add_child(furrow)
		
		for j in range(3):
			var bx: float = -hw + 14.0 + float(j) * ((hw * 2.0 - 28.0) / 2.0)
			var berry := Polygon2D.new()
			berry.polygon = _circle_poly(3.0, 6)
			berry.position = Vector2(bx, y)
			berry.color = Color("#A63A50")
			base_node.add_child(berry)

func _build_tar_art(hw: float, hh: float) -> void:
	var pit := Polygon2D.new()
	pit.polygon = PackedVector2Array([
		Vector2(-hw + 3, -hh + 3), Vector2(hw - 3, -hh + 3),
		Vector2(hw - 3, hh - 3), Vector2(-hw + 3, hh - 3)
	])
	pit.color = Color("#2A2620") if tier == 1 else (Color("#1E1B15") if tier == 2 else Color("#13110C"))
	base_node.add_child(pit)
	
	var pit_out := Line2D.new()
	pit_out.points = pit.polygon + PackedVector2Array([pit.polygon[0]])
	pit_out.default_color = Color("#D9A441") if tier == 3 else Color("#4A4038")
	pit_out.width = 2.0
	base_node.add_child(pit_out)
	
	var bubbles: int = 3 + tier
	for i in range(bubbles):
		var a: float = float(i) * TAU / float(bubbles)
		var b := Polygon2D.new()
		b.polygon = _circle_poly(4.0, 8)
		b.position = Vector2(cos(a) * (hw * 0.4), sin(a) * (hh * 0.4))
		b.color = Color("#5C4530") if tier == 3 else Color("#3A342C")
		base_node.add_child(b)

func _build_cauldron_art(hw: float, hh: float) -> void:
	for i in range(3):
		var a: float = float(i) * TAU / 3.0 + PI / 6.0
		var leg := Line2D.new()
		leg.points = PackedVector2Array([
			Vector2(cos(a) * 14.0, sin(a) * 14.0),
			Vector2(cos(a) * 22.0, sin(a) * 22.0)
		])
		leg.default_color = Color("#333B4F")
		leg.width = 4.0
		base_node.add_child(leg)
	
	var base_r: float = 20.0 + float(tier) * 2.0
	var pot := Polygon2D.new()
	pot.polygon = _circle_poly(base_r, 20)
	pot.color = Color("#5C4526") if tier == 1 else (Color("#5E5E6E") if tier == 2 else Color("#4A4A60"))
	base_node.add_child(pot)
	
	var pot_out := Line2D.new()
	pot_out.points = pot.polygon + PackedVector2Array([pot.polygon[0]])
	pot_out.default_color = Color("#D9A441") if tier == 3 else Color("#333B4F")
	pot_out.width = 3.0
	base_node.add_child(pot_out)
	
	var brew := Polygon2D.new()
	brew.polygon = _circle_poly(base_r * 0.65, 16)
	brew.color = Color("#C96F4A") if tier == 1 else (Color("#D9A441") if tier == 2 else Color("#9CC08A"))
	base_node.add_child(brew)

func _build_ballista_art(hw: float, hh: float) -> void:
	var carriage := Polygon2D.new()
	carriage.polygon = PackedVector2Array([
		Vector2(-hw + 6, -hh + 6), Vector2(hw - 6, -hh + 6),
		Vector2(hw - 6, hh - 6), Vector2(-hw + 6, hh - 6)
	])
	carriage.color = Color("#5E5A4A") if tier == 1 else (Color("#5E6470") if tier == 2 else Color("#3E4450"))
	base_node.add_child(carriage)
	
	var carriage_out := Line2D.new()
	carriage_out.points = carriage.polygon + PackedVector2Array([carriage.polygon[0]])
	carriage_out.default_color = Color("#333B4F")
	carriage_out.width = 3.0
	base_node.add_child(carriage_out)
	
	for bx in [-hw + 14.0, -hw * 0.33, hw * 0.33, hw - 14.0]:
		for by in [-hh + 10.0, hh - 10.0]:
			var bolt := Polygon2D.new()
			bolt.polygon = _circle_poly(2.5, 6)
			bolt.position = Vector2(bx, by)
			bolt.color = Color("#2E2A22")
			base_node.add_child(bolt)
	
	var body_len: float = 72.0 + float(tier) * 6.0
	var body_h: float = 16.0
	
	var body := Polygon2D.new()
	body.polygon = PackedVector2Array([
		Vector2(-body_len * 0.5, -body_h * 0.5), Vector2(body_len * 0.5, -body_h * 0.5),
		Vector2(body_len * 0.5, body_h * 0.5), Vector2(-body_len * 0.5, body_h * 0.5)
	])
	body.color = Color("#6E4F30") if tier == 1 else (Color("#5E3F24") if tier == 2 else Color("#3E2F18"))
	head_node.add_child(body)
	
	var body_out := Line2D.new()
	body_out.points = body.polygon + PackedVector2Array([body.polygon[0]])
	body_out.default_color = Color("#333B4F")
	body_out.width = 2.5
	head_node.add_child(body_out)
	
	var limb_span: float = 38.0 + float(tier) * 6.0
	var bow_line := Line2D.new()
	bow_line.points = PackedVector2Array([
		Vector2(14.0, -limb_span), Vector2(24.0, 0.0), Vector2(14.0, limb_span)
	])
	bow_line.default_color = Color("#8B8FA8") if tier < 3 else Color("#D9A441")
	bow_line.width = 7.0
	head_node.add_child(bow_line)
	
	var string_line := Line2D.new()
	string_line.points = PackedVector2Array([
		Vector2(14.0, -limb_span), Vector2(-12.0, 0.0), Vector2(14.0, limb_span)
	])
	string_line.default_color = Color("#E8E0C8")
	string_line.width = 3.0
	head_node.add_child(string_line)
	
	var bolt_shaft := Line2D.new()
	bolt_shaft.points = PackedVector2Array([Vector2(-10.0, 0.0), Vector2(34.0, 0.0)])
	bolt_shaft.default_color = Color("#C8C0A8")
	bolt_shaft.width = 4.0
	head_node.add_child(bolt_shaft)
	
	var bolt_head := Polygon2D.new()
	bolt_head.polygon = PackedVector2Array([
		Vector2(44.0, 0.0), Vector2(32.0, -5.0), Vector2(32.0, 5.0)
	])
	bolt_head.color = Color("#DDE3ED")
	head_node.add_child(bolt_head)

func _circle_poly(r: float, steps: int = 16) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in range(steps):
		var a: float = float(i) * TAU / float(steps)
		pts.append(Vector2(cos(a), sin(a)) * r)
	return pts
