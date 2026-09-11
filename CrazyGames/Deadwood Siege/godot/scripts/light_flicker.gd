extends Node2D
## Subtle sine-wave torchlight flicker for PointLight2D and additive halo sprites.

var base_energy: float = 0.8
var _time: float = 0.0
var _light: PointLight2D = null
var _halo: Sprite2D = null

func _ready() -> void:
	_time = randf() * TAU
	_light = get_node_or_null("PointLight") as PointLight2D
	_halo = get_node_or_null("Halo") as Sprite2D

func _process(delta: float) -> void:
	_time += delta
	# Double sine for natural organic flame flicker
	var flicker := sin(_time * 6.5) * 0.08 + sin(_time * 11.3) * 0.05
	var cur_e := maxf(0.1, base_energy + flicker)
	if _light and is_instance_valid(_light):
		_light.energy = cur_e
	if _halo and is_instance_valid(_halo):
		_halo.modulate.a = cur_e * 0.35
		var sc := 1.0 + sin(_time * 7.7) * 0.025
		_halo.scale = Vector2(sc, sc)
