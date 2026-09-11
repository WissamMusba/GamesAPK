extends StaticBody2D
## Harvestable resource node: tree (wood) / rock (stone) / bush (food) / gold (gold).
## Enhanced with WoodSparks & StoneSparks particle feedback.

const Art := preload("res://scripts/art_factory.gd")
const Juice := preload("res://scripts/juice.gd")

var node_kind := "tree"
var variant := 0
var hits_done := 0
var yield_wood := 0
var yield_stone := 0
var yield_food := 0
var yield_gold := 0
var permanent := false

func setup(kind: String, _variant: int = 0) -> void:
	node_kind = kind
	variant = _variant
	add_to_group("harvestable")
	match kind:
		"tree":
			permanent = true
			yield_wood = 2
			add_child(Art.make_tree_variant(variant))
		"rock":
			permanent = true
			yield_stone = 3
			add_child(Art.make_rock())
		"bush":
			permanent = false
			yield_food = 6
			add_to_group("farm") # wild bush: Scavengers can raid it
			add_child(Art.make_bush())
		"gold":
			permanent = false
			yield_gold = 2
			add_child(Art.make_gold_mine())
	# Scale telegraphs yield: tree sizes vary, bushes/mines fixed.
	if kind == "tree":
		var s := lerpf(0.85, 1.15, float(variant) / 6.0)
		scale = Vector2(s, s)
	var col := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 26.0
	col.shape = circle
	add_child(col)
	collision_layer = 2
	if permanent:
		add_to_group("permanent_node")

func harvest(power: int) -> void:
	# Permanent nodes: always yield consistent resources (matching HTML v7).
	if permanent:
		var amt := maxi(1, power)
		if yield_wood > 0:
			Game.add_loot(5 * amt, 0, 0)
			Juice.wood_sparks(self, global_position, 10)
			var label := "+%d 🪵" % (5 * amt)
			get_tree().call_group("game", "spawn_float_text", global_position, label, Color("#E8EFE6"))
		else:
			Game.add_loot(0, 4 * amt, 0)
			Juice.stone_sparks(self, global_position, 12)
			var label := "+%d 🪨" % (4 * amt)
			get_tree().call_group("game", "spawn_float_text", global_position, label, Color("#E8EFE6"))
		_pulse()
		return
	
	# Consumable path.
	hits_done += power
	for _i in range(power):
		if yield_food > 0:
			Game.add_loot(0, 0, yield_food)
			Juice.wood_sparks(self, global_position, 8)
		if yield_gold > 0:
			Game.gold += yield_gold
			Game.resources_changed.emit()
			Juice.stone_sparks(self, global_position, 14)
	var parts := PackedStringArray()
	if yield_food > 0:
		parts.append("+%d 🍒" % (yield_food * power))
	if yield_gold > 0:
		parts.append("+%d 🪙" % (yield_gold * power))
	if not parts.is_empty():
		get_tree().call_group("game", "spawn_float_text",
			global_position, " ".join(parts), Color("#E8EFE6"))
	_pulse()
	var cap := 2 if node_kind == "bush" else 10
	if hits_done >= cap:
		queue_free()

func take_hit(_amount: float) -> void:
	if permanent:
		return
	hits_done += 1
	_pulse()
	var cap2 := 2 if node_kind == "bush" else 10
	if hits_done >= cap2:
		queue_free()

func _pulse() -> void:
	var tw := create_tween()
	tw.tween_property(self, "scale", Vector2(1.12, 1.12) * scale, 0.07)
	tw.tween_property(self, "scale", scale, 0.09)
