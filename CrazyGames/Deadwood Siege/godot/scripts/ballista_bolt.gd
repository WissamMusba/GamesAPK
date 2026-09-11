extends Area2D
## Deadwood Siege — Ballista Siege Bolt Projectile (v7 port)
## Speed: 820 px/s, Lifetime: 1.7s, Piercing: true (armor-piercing siege bolt)

@export var speed: float = 820.0
@export var damage: float = 70.0
@export var lifetime: float = 1.7
var pierce: bool = true
var direction: Vector2 = Vector2.RIGHT

var _hit_targets: Array[Node] = []

func setup(start_pos: Vector2, angle: float, dmg: float, spd: float = 820.0) -> void:
	global_position = start_pos
	rotation = angle
	direction = Vector2.RIGHT.rotated(angle)
	damage = dmg
	speed = spd
	lifetime = 1.7
	_hit_targets.clear()

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	area_entered.connect(_on_area_entered)
	collision_layer = 0
	collision_mask = 4 # Zombies are on layer 4

func _physics_process(delta: float) -> void:
	position += direction * speed * delta
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()

func _on_body_entered(body: Node2D) -> void:
	_hit(body)

func _on_area_entered(area: Area2D) -> void:
	_hit(area)

func _hit(target: Node) -> void:
	if not is_instance_valid(target) or target in _hit_targets:
		return
	_hit_targets.append(target)
	
	if target.is_in_group("zombie") or target.has_method("take_hit"):
		if target.has_method("take_hit"):
			target.take_hit(damage)
		_spawn_impact()
		if not pierce:
			queue_free()

func _spawn_impact() -> void:
	# Heavy impact burst
	var spark := Line2D.new()
	spark.points = PackedVector2Array([Vector2.ZERO, -direction * 20.0])
	spark.default_color = Color("#DDE3ED")
	spark.width = 5.0
	spark.global_position = global_position
	if get_parent():
		get_parent().add_child(spark)
		var tw := spark.create_tween()
		tw.tween_property(spark, "modulate:a", 0.0, 0.15)
		tw.tween_callback(spark.queue_free)

func _draw() -> void:
	# Heavy Siege Bolt: long thick shaft (-26 to +20), massive steel broadhead (+20 to +32), fletchings
	var shaft_color := Color("#C8C0A8")
	var dark_shaft := Color("#3A2D1E")
	var steel_color := Color("#DDE3ED")
	var steel_dark := Color("#8B8FA8")
	var gold_accent := Color("#D9A441")
	
	# Thick shaft
	draw_line(Vector2(-24, 0), Vector2(18, 0), shaft_color, 4.5)
	draw_line(Vector2(-20, 0), Vector2(14, 0), dark_shaft, 2.0)
	
	# Broadhead piercing point
	var head := PackedVector2Array([
		Vector2(32, 0),
		Vector2(18, -7),
		Vector2(22, 0),
		Vector2(18, 7)
	])
	draw_colored_polygon(head, steel_color)
	draw_polyline(head + PackedVector2Array([head[0]]), steel_dark, 1.5)
	
	# Gold accent band
	draw_line(Vector2(12, -3), Vector2(12, 3), gold_accent, 3.0)
	
	# Heavy reinforced steel fletchings
	var fletch_upper := PackedVector2Array([Vector2(-24, 0), Vector2(-32, -8), Vector2(-22, -8), Vector2(-16, 0)])
	var fletch_lower := PackedVector2Array([Vector2(-24, 0), Vector2(-32, 8), Vector2(-22, 8), Vector2(-16, 0)])
	draw_colored_polygon(fletch_upper, Color("#C96F4A"))
	draw_colored_polygon(fletch_lower, Color("#C96F4A"))
