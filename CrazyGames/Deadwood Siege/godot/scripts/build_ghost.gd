extends Node2D
## Deadwood Siege — Build Ghost Preview Node (v7 port)
## Snaps to 32px grid, renders footprint with cell subdivisions.
## Tints green (#86b06c) when valid, red (#c96f4a) when blocked.
## Supports rotation ('R' key flips fw and fh).
class_name BuildGhost

const COLOR_VALID := Color(0.525, 0.690, 0.424, 0.45)      # #86b06c
const COLOR_VALID_STROKE := Color(0.525, 0.690, 0.424, 0.9)
const COLOR_INVALID := Color(0.788, 0.435, 0.290, 0.45)    # #c96f4a
const COLOR_INVALID_STROKE := Color(0.788, 0.435, 0.290, 0.9)

var structure_kind: String = "wall"
var structure_def: Dictionary = {}
var rot: int = 0
var grid_coord: Vector2i = Vector2i.ZERO
var is_valid: bool = true
var grid: Node = null # BuildGrid instance

func setup(kind: String, p_grid: Node = null) -> void:
	structure_kind = kind
	grid = p_grid
	structure_def = BuildGrid.get_def(kind)
	rot = 0
	queue_redraw()

func rotate_footprint() -> void:
	rot = (rot + 1) % 2
	queue_redraw()

func get_footprint() -> Vector2i:
	return BuildGrid.footprint(structure_def, rot)

func update_ghost(world_cursor_pos: Vector2, player_pos: Vector2, player_radius: float = 20.0, obstacles: Array = [], can_afford: bool = true) -> bool:
	var fp := get_footprint()
	var fw := fp.x
	var fh := fp.y
	
	var cx := int(floor(world_cursor_pos.x / BuildGrid.GRID))
	var cy := int(floor(world_cursor_pos.y / BuildGrid.GRID))
	grid_coord = Vector2i(cx, cy)
	
	global_position = Vector2(cx * BuildGrid.GRID, cy * BuildGrid.GRID)
	
	if not can_afford:
		is_valid = false
	elif grid != null and grid.has_method("can_place"):
		is_valid = grid.can_place(cx, cy, structure_def, rot, player_pos, player_radius, obstacles)
	else:
		is_valid = true
	
	queue_redraw()
	return is_valid

func _draw() -> void:
	var fp := get_footprint()
	var fw := fp.x
	var fh := fp.y
	var w := fw * BuildGrid.GRID
	var h := fh * BuildGrid.GRID
	
	var fill_col := COLOR_VALID if is_valid else COLOR_INVALID
	var stroke_col := COLOR_VALID_STROKE if is_valid else COLOR_INVALID_STROKE
	
	# Translucent rounded footprint
	var rect := Rect2(Vector2.ZERO, Vector2(w, h))
	draw_rect(rect, fill_col, true)
	
	# Cell boundary lines
	for x in range(1, fw):
		draw_line(Vector2(x * BuildGrid.GRID, 0), Vector2(x * BuildGrid.GRID, h), Color(1, 1, 1, 0.2), 1.0)
	for y in range(1, fh):
		draw_line(Vector2(0, y * BuildGrid.GRID), Vector2(w, y * BuildGrid.GRID), Color(1, 1, 1, 0.2), 1.0)
	
	# Solid outline
	draw_rect(rect, stroke_col, false, 2.5)
	
	# Structure name / icon in center
	var label: String = str(structure_def.get("name", structure_kind.to_upper()))
	var font := ThemeDB.fallback_font
	var font_size := 12
	var str_size := font.get_string_size(label, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size)
	var text_pos := Vector2((w - str_size.x) * 0.5, (h + str_size.y * 0.5) * 0.5)
	draw_string(font, text_pos, label, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size, Color(1, 1, 1, 0.85))
