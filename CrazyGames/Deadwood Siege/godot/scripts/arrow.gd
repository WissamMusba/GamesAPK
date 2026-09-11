extends Area2D
## Deadwood Siege — Crossbow Arrow Projectile (v7 port)
## Speed: 680 px/s, Lifetime: 1.4s, Piercing: false

@export var speed: float = 680.0
@export var damage: float = 24.0
@export var lifetime: float = 1.4
var pierce: bool = false
var direction: Vector2 = Vector2.RIGHT

func setup(start_pos: Vector2, angle: float, dmg: float, spd: float = 680.0) -> void:
	global_position = start_pos
	rotation = angle
	direction = Vector2.RIGHT.rotated(angle)
	damage = dmg
	speed = spd
	lifetime = 1.4

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
	if not is_instance_valid(target):
		return
	if target.is_in_group("zombie") or target.has_method("take_hit"):
		if target.has_method("take_hit"):
			target.take_hit(damage)
		_spawn_impact()
		if not pierce:
			queue_free()

func _spawn_impact() -> void:
	var spark := Line2D.new()
	spark.points = PackedVector2Array([Vector2.ZERO, -direction * 12.0])
	spark.default_color = Color("#CFE3C8")
	spark.width = 3.0
	spark.global_position = global_position
	if get_parent():
		get_parent().add_child(spark)
		var tw := spark.create_tween()
		tw.tween_property(spark, "modulate:a", 0.0, 0.1)
		tw.tween_callback(spark.queue_free)

func _draw() -> void:
	# Arrow: shaft (-14 to +10), arrowhead (+10 to +16), fletchings (-14 to -18)
	var shaft_color := Color("#C8C0A8")
	var tip_color := Color("#DDE3ED")
	var feather_color := Color("#C96F4A")
	
	draw_line(Vector2(-14, 0), Vector2(10, 0), shaft_color, 2.5)
	var head := PackedVector2Array([Vector2(16, 0), Vector2(9, -4), Vector2(9, 4)])
	draw_colored_polygon(head, tip_color)
	draw_line(Vector2(-14, 0), Vector2(-18, -4), feather_color, 2.0)
	draw_line(Vector2(-14, 0), Vector2(-18, 4), feather_color, 2.0)
