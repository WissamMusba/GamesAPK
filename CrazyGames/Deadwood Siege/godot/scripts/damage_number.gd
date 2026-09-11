extends Node2D
class_name DamageNumber
## Floating combat text / damage numbers matching Deadwood Siege v7 style.
## Floats upward, scales punchily, fades out, and frees itself.

const SCENE: PackedScene = preload("res://scenes/DamageNumber.tscn")

@onready var label: Label = $Label

var velocity := Vector2(0.0, -55.0)
var duration := 0.85
var _is_setup := false

static func create(text: String, pos: Vector2, color: Color = Color.WHITE, font_size: int = 15, parent: Node = null) -> DamageNumber:
	var instance: DamageNumber = SCENE.instantiate() as DamageNumber
	instance.global_position = pos
	if parent != null:
		parent.add_child(instance)
	else:
		var tree := Engine.get_main_loop() as SceneTree
		if tree and tree.current_scene:
			tree.current_scene.add_child(instance)
	instance.setup(text, color, font_size)
	return instance

func setup(text: String, color: Color = Color.WHITE, font_size: int = 15, custom_vel: Vector2 = Vector2.ZERO) -> void:
	_is_setup = true
	if not is_node_ready():
		await ready
	if label:
		label.text = text
		label.add_theme_color_override("font_color", color)
		label.add_theme_font_size_override("font_size", font_size)
		label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		label.add_theme_constant_override("outline_size", 5)
	if custom_vel != Vector2.ZERO:
		velocity = custom_vel
	_animate()

func _ready() -> void:
	z_index = 70
	if not _is_setup and label and label.text != "":
		_animate()

func _animate() -> void:
	# Slight horizontal random drift like in v7
	var drift := randf_range(-12.0, 12.0)
	var end_pos := position + Vector2(drift, velocity.y * duration)
	
	# Scale punch
	scale = Vector2(1.3, 1.3)
	var tw_scale := create_tween()
	tw_scale.tween_property(self, "scale", Vector2.ONE, 0.12).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	
	# Movement tween
	var tw_move := create_tween()
	tw_move.tween_property(self, "position", end_pos, duration).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	
	# Fade tween near end of duration
	var tw_fade := create_tween()
	tw_fade.tween_interval(duration * 0.45)
	tw_fade.tween_property(self, "modulate:a", 0.0, duration * 0.55)
	tw_fade.tween_callback(queue_free)
