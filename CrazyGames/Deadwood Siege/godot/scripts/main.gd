extends Node2D
## Deadwood Siege v7 — World + HUD. 32px grid, 8 buildings, X/C locks,
## full HUD (kill feed, boss bar, combo display, achievements, build menu).

const PlayerScript := preload("res://scripts/player.gd")
const NodeScript   := preload("res://scripts/resource_node.gd")
const StructScript := preload("res://scripts/structure.gd")
const Art          := preload("res://scripts/art_factory.gd")
const VignetteShader := preload("res://shaders/vignette.gdshader")
const Juice        := preload("res://scripts/juice.gd")

const MAP := 2048.0
const GRID := 32.0
const DEFAULT_ZOOM := 2.4
const MIN_ZOOM := 1.6
const MAX_ZOOM := 3.4

var player: CharacterBody2D
var camera: Camera2D
var ghost: Node2D = null
var ghost_kind := ""
var build_mode := ""
var build_rot := 0.0
var occupied := {}
var run_over := false
var menu_layer: CanvasLayer = null
var canvas_modulate: CanvasModulate = null
var vignette_mat: ShaderMaterial = null
var _zoom := DEFAULT_ZOOM
var decal_layer: Node2D = null

# HUD refs
var hud_layer: CanvasLayer = null
var hud_wood: Label; var hud_stone: Label; var hud_food: Label
var hud_wave: Label; var hud_timer: Label
var hud_hp: ProgressBar; var hud_energy: ProgressBar
var hud_level: Label; var hud_xp: Label; var hud_xp_bar: ProgressBar
var hud_score: Label; var hud_combo_small: Label
var kill_feed_box: VBoxContainer
var boss_bar: PanelContainer; var boss_fill: ProgressBar; var boss_name: Label
var lock_indicator: PanelContainer
var lock_cursor_lbl: Label; var lock_attack_lbl: Label
var crystal_lbl: Label
var combo_display: Label; var combo_disp_t: float = 0.0
var ach_toast: PanelContainer; var ach_ic: Label; var ach_ti: Label; var ach_sb: Label
var ach_timer: float = 0.0; var current_ach: String = ""
var toast: Label
var build_menu: PanelContainer; var build_toggle_btn: Button
var build_menu_open: bool = false
var build_menu_buttons: Dictionary = {}
var kill_feed_items: Array = []
var day_tint_rect: ColorRect = null

func _ready() -> void:
	add_to_group("game")
	_build_map()
	_build_player_and_camera()
	_build_atmosphere()
	_build_hud()
	Game.resources_changed.connect(_refresh_hud)
	Game.xp_changed.connect(func(_a, _b, _c): _refresh_hud())
	Game.score_changed.connect(func(_a, _b): _refresh_hud())
	Game.combo_changed.connect(_on_combo_changed)
	Game.combo_displayed.connect(_on_combo_displayed)
	Game.wave_changed.connect(_on_wave_changed)
	Game.crystals_changed.connect(func(_c): _refresh_hud())
	Game.kill_feed_event.connect(_on_kill_feed)
	Game.achievement_unlocked.connect(_on_achievement)
	Game.locks_changed.connect(_on_locks_changed)
	WaveDirector.wave_started.connect(_on_wave_started)
	WaveDirector.wave_cleared.connect(_on_wave_cleared)
	WaveDirector.countdown_tick.connect(_on_countdown_tick)
	Game.level_up.connect(_on_level_up)
	Game.new_run()
	_scatter_resources()
	show_menu()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and Game.run_active and not run_over:
		_auto_pause()

# ---------------- Map ----------------
func _build_atmosphere() -> void:
	canvas_modulate = CanvasModulate.new()
	canvas_modulate.name = "CanvasModulate"
	canvas_modulate.color = Color(1, 0.98, 0.95)
	add_child(canvas_modulate)
	# Decal layer (blood, etc.) — drawn above ground, below entities.
	decal_layer = Node2D.new()
	decal_layer.name = "DecalLayer"
	decal_layer.z_index = -5
	add_child(decal_layer)
	# Vignette
	var vl := CanvasLayer.new(); vl.layer = 9
	add_child(vl)
	var vr := ColorRect.new()
	vr.set_anchors_preset(Control.PRESET_FULL_RECT)
	vr.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vignette_mat = ShaderMaterial.new()
	vignette_mat.shader = VignetteShader
	vignette_mat.set_shader_parameter("vignette_intensity", 0.35)
	vignette_mat.set_shader_parameter("vignette_opacity", 0.45)
	vignette_mat.set_shader_parameter("low_hp_pulse", 0.0)
	vr.material = vignette_mat
	vl.add_child(vr)

func _build_map() -> void:
	var bg := ColorRect.new()
	bg.color = Color("#7A9B67")
	bg.size = Vector2(MAP, MAP)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)
	# Checker
	var checker := Node2D.new()
	add_child(checker)
	for x in range(0, int(MAP), int(GRID * 2)):
		for y in range(0, int(MAP), int(GRID * 2)):
			var c := ColorRect.new()
			c.color = Color(0, 0, 0, 0.035)
			c.position = Vector2(x, y); c.size = Vector2(GRID, GRID)
			c.mouse_filter = Control.MOUSE_FILTER_IGNORE
			checker.add_child(c)
	# Grid lines
	for x in range(0, int(MAP) + 1, int(GRID)):
		var v := Line2D.new()
		v.points = PackedVector2Array([Vector2(x, 0), Vector2(x, MAP)])
		v.default_color = Color(0, 0, 0, 0.05); v.width = 1
		add_child(v)
	for y in range(0, int(MAP) + 1, int(GRID)):
		var h := Line2D.new()
		h.points = PackedVector2Array([Vector2(0, y), Vector2(MAP, y)])
		h.default_color = Color(0, 0, 0, 0.05); h.width = 1
		add_child(h)
	var border := StaticBody2D.new()
	for rect in [Rect2(-16, 0, 16, MAP), Rect2(MAP, 0, 16, MAP),
				 Rect2(0, -16, MAP, 16), Rect2(0, MAP, MAP, 16)]:
		var cs := CollisionShape2D.new()
		var rs := RectangleShape2D.new()
		rs.size = rect.size
		cs.shape = rs; cs.position = rect.get_center()
		border.add_child(cs)
	add_child(border)

func _scatter_resources() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 1234
	var c := Vector2(MAP, MAP) / 2.0
	for i in 45:
		_add_node("tree", c + Vector2(rng.randf_range(-700, 700), rng.randf_range(-700, 700)), rng.randi_range(0, 6))
	for i in 28:
		_add_node("rock", c + Vector2(rng.randf_range(-800, 800), rng.randf_range(-800, 800)))
	for i in 22:
		_add_node("bush", c + Vector2(rng.randf_range(-650, 650), rng.randf_range(-650, 650)))

func _add_node(kind: String, pos: Vector2, variant: int = 0) -> void:
	var n: StaticBody2D = NodeScript.new()
	n.setup(kind, variant)
	n.position = _snap(pos)
	add_child(n)

func _snap(p: Vector2) -> Vector2:
	return Vector2(roundf(p.x / GRID) * GRID, roundf(p.y / GRID) * GRID)

func _build_player_and_camera() -> void:
	player = PlayerScript.new()
	player.position = Vector2(MAP, MAP) / 2.0
	add_child(player)
	camera = Camera2D.new()
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 16.0
	camera.zoom = Vector2(_zoom, _zoom)
	player.add_child(camera)
	camera.make_current()

# ---------------- Process ----------------
func _process(delta: float) -> void:
	delta = minf(delta, 0.05)
	_update_ghost()
	_update_day_night()
	if player and hud_hp:
		hud_hp.value = player.hp
		hud_energy.value = player.energy
		if vignette_mat:
			var hp_pct: float = player.hp / maxf(1.0, player.max_hp)
			if hp_pct < 0.25 and not player.get("dead"):
				var pulse := sin(Time.get_ticks_msec() * 0.007) * 0.5 + 0.5
				var strength: float = (1.0 - hp_pct / 0.25) * (0.55 + 0.45 * pulse)
				vignette_mat.set_shader_parameter("low_hp_pulse", strength)
			else:
				vignette_mat.set_shader_parameter("low_hp_pulse", 0.0)
	# Combo display fade
	if combo_disp_t > 0.0:
		combo_disp_t -= delta
		if combo_disp_t <= 0.0 and combo_display:
			combo_display.modulate.a = 0.0
	# Achievement toast timer
	if ach_timer > 0.0:
		ach_timer -= delta
		if ach_timer <= 0.0 and ach_toast:
			ach_toast.modulate.a = 0.0
	# Kill feed cleanup
	for i in range(kill_feed_items.size() - 1, -1, -1):
		var item = kill_feed_items[i]
		item["t"] += delta
		if item["t"] >= item["dur"]:
			if is_instance_valid(item["node"]): item["node"].queue_free()
			kill_feed_items.remove_at(i)
		elif is_instance_valid(item["node"]):
			item["node"].modulate.a = clampf((item["dur"] - item["t"]) / 0.5, 0.0, 1.0)
	# Update boss bar
	_update_boss_bar()

func _update_day_night() -> void:
	if not canvas_modulate: return
	var t := Game.day_time
	var cos_v := cos((t - 0.25) * TAU)
	var bright := clampf(0.55 + 0.45 * cos_v, 0.42, 1.0)
	var day := Color(1.0, 0.98, 0.95)
	var night := Color(0.42, 0.52, 0.78)
	var warm := Color(1.06, 0.88, 0.72)
	if bright > 0.75:
		canvas_modulate.color = day
	elif bright > 0.55:
		var w := (0.75 - bright) / 0.20
		canvas_modulate.color = day.lerp(warm, w)
	else:
		var w := (0.55 - bright) / 0.13
		canvas_modulate.color = warm.lerp(night, clampf(w, 0.0, 1.0))

# ---------------- Input ----------------
func _unhandled_input(event: InputEvent) -> void:
	if run_over: return
	var handled := false
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if build_mode != "":
				var hovered := get_viewport().gui_get_hovered_control()
				if not (hovered is Button):
					try_place()
				handled = true
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			if build_mode != "": cancel_build()
			handled = true
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP:
			_set_zoom(_zoom * 1.12); handled = true
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			_set_zoom(_zoom / 1.12); handled = true
	if handled:
		get_viewport().set_input_as_handled(); return
	if event is InputEventKey and event.pressed and not event.echo:
		var pk: int = int(event.physical_keycode)
		# X = cursor lock, C = attack lock
		if pk == KEY_X:
			var on: bool = Game.toggle_cursor_lock()
			_flash_toast("🔒 CURSOR LOCKED" if on else "🔓 CURSOR UNLOCKED")
		elif pk == KEY_C:
			var on: bool = Game.toggle_auto_attack()
			_flash_toast("⚔ ATTACK LOCK ON" if on else "⚔ ATTACK LOCK OFF")
		elif pk == KEY_B:
			_toggle_build_menu()
		elif pk == KEY_T:
			Game.try_rewind()
		elif pk == KEY_ESCAPE:
			if build_mode != "": cancel_build()
			elif not get_tree().paused and Game.run_active: _show_pause_overlay()
		elif pk >= KEY_1 and pk <= KEY_8:
			var idx: int = pk - int(KEY_1)
			if idx < Game.BUILD_DEFS.size():
				_hotkey_build(Game.BUILD_DEFS[idx]["id"])

# ---------------- Build ----------------
func _hotkey_build(kind: String) -> void:
	if build_mode == kind: cancel_build()
	else: set_build(kind)

func set_build(kind: String) -> void:
	if run_over: return
	if build_mode == kind: cancel_build(); return
	build_mode = kind; ghost_kind = kind; build_rot = 0.0
	if ghost: ghost.queue_free(); ghost = null
	match kind:
		"wall":     ghost = Art.make_wall_piece()
		"door":     ghost = Art.make_door()
		"crossbow": ghost = Art.make_crossbow()
		"spike":    ghost = Art.make_spike()
		"farm":     ghost = Art.make_farm()
		"tar":      ghost = Art.make_tar()
		"cauldron": ghost = Art.make_cauldron()
		"ballista": ghost = Art.make_ballista()
	if ghost:
		ghost.modulate.a = 0.6
		add_child(ghost)
	_flash_toast("%s — click to place · R rotate · RMB/Esc cancel" % kind.capitalize())

func cancel_build() -> void:
	build_mode = ""
	if ghost: ghost.queue_free(); ghost = null

func _update_ghost() -> void:
	if ghost == null or player == null: return
	ghost.visible = build_mode != "" and not run_over
	if not ghost.visible: return
	var target := get_global_mouse_position()
	if player.get("has_touch_target"): target = player.get("touch_target")
	ghost.position = _snap(target)
	ghost.rotation = build_rot
	var blocked := false
	var def := _def_for(build_mode)
	var cost: Dictionary = def.get("cost", {})
	if Game.wood < int(cost.get("w", 0)) or Game.stone < int(cost.get("s", 0)) or Game.food < int(cost.get("f", 0)):
		blocked = true
	else:
		var cells := _cells_for_build(_snap(ghost.position), build_mode)
		for c in cells:
			if occupied.has(_cell_key(c)): blocked = true; break
	ghost.modulate = Color(1, 0.35, 0.35, 0.65) if blocked else Color(0.55, 1, 0.55, 0.65)

func _def_for(id: String) -> Dictionary:
	for d in Game.BUILD_DEFS:
		if d["id"] == id: return d
	return {}

func _cell_key(c: Vector2) -> String:
	return "%d,%d" % [int(c.x), int(c.y)]

func _cells_for_build(cell: Vector2, kind: String) -> Array:
	var def := _def_for(kind)
	var fw: int = int(def.get("fw", 1))
	var fh: int = int(def.get("fh", 1))
	var out: Array = []
	for x in fw:
		for y in fh:
			out.append(_snap(cell + Vector2(x * GRID, y * GRID)))
	return out

func try_place() -> void:
	if build_mode == "" or ghost == null or run_over: return
	var cell := _snap(ghost.position)
	var def := _def_for(build_mode)
	var cost: Dictionary = def.get("cost", {})
	var cells := _cells_for_build(cell, build_mode)
	for c in cells:
		if occupied.has(_cell_key(c)):
			_flash_toast("Occupied!"); return
	if not Game.spend(int(cost.get("w", 0)), int(cost.get("s", 0)), int(cost.get("f", 0))):
		_flash_toast("Need %dW %dS" % [int(cost.get("w", 0)), int(cost.get("s", 0))]); return
	for c in cells: occupied[_cell_key(c)] = true
	var s: StaticBody2D = StructScript.new()
	s.setup(build_mode)
	s.position = cell
	s.rotation = build_rot
	s.set("cell_keys", cells.map(_cell_key))
	add_child(s)
	if s.has_signal("died"): s.connect("died", release_cells)
	Game.structures_placed += 1
	if Game.structures_placed >= 20: Game.unlock_achievement("builder")
	if build_mode != "wall" and build_mode != "door":
		cancel_build()

func release_cells(keys: Array) -> void:
	for k in keys: occupied.erase(k)

# ---------------- HUD ----------------
func _set_zoom(z: float) -> void:
	_zoom = clampf(z, MIN_ZOOM, MAX_ZOOM)
	if camera: camera.zoom = Vector2(_zoom, _zoom)
	_flash_toast("Zoom %.1fx" % _zoom)

func _build_hud() -> void:
	hud_layer = CanvasLayer.new()
	hud_layer.name = "HUD"
	add_child(hud_layer)
	# Top-left resource chips
	var chips := HBoxContainer.new()
	chips.position = Vector2(12, 10)
	chips.add_theme_constant_override("separation", 6)
	hud_layer.add_child(chips)
	hud_wood  = _chip(chips, Color("#8B6B3E"))
	hud_stone = _chip(chips, Color("#A6AAC2"))
	hud_food  = _chip(chips, Color("#A63A50"))
	# XP + score (top center)
	var xp_box := PanelContainer.new()
	xp_box.position = Vector2(340, 10)
	xp_box.custom_minimum_size = Vector2(280, 58)
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.118, 0.149, 0.118, 0.82)
	sb.corner_radius_top_left = 10; sb.corner_radius_top_right = 10
	sb.corner_radius_bottom_left = 10; sb.corner_radius_bottom_right = 10
	sb.content_margin_left = 12; sb.content_margin_right = 12
	sb.content_margin_top = 6; sb.content_margin_bottom = 6
	xp_box.add_theme_stylebox_override("panel", sb)
	hud_layer.add_child(xp_box)
	var xv := VBoxContainer.new()
	xv.add_theme_constant_override("separation", 2)
	xp_box.add_child(xv)
	var row1 := HBoxContainer.new()
	row1.add_theme_constant_override("separation", 8)
	xv.add_child(row1)
	hud_level = Label.new(); hud_level.add_theme_font_size_override("font_size", 12)
	hud_level.add_theme_color_override("font_color", Color("#86B06C"))
	hud_level.text = "LEVEL 1"
	row1.add_child(hud_level)
	hud_xp = Label.new(); hud_xp.add_theme_font_size_override("font_size", 11)
	hud_xp.add_theme_color_override("font_color", Color("#A8B5A4"))
	hud_xp.text = "0 / 25 XP"
	row1.add_child(hud_xp)
	hud_xp_bar = ProgressBar.new()
	hud_xp_bar.custom_minimum_size = Vector2(256, 8)
	hud_xp_bar.min_value = 0; hud_xp_bar.max_value = 100; hud_xp_bar.value = 0
	hud_xp_bar.show_percentage = false
	xv.add_child(hud_xp_bar)
	var row2 := HBoxContainer.new()
	row2.add_theme_constant_override("separation", 12)
	xv.add_child(row2)
	hud_score = Label.new(); hud_score.add_theme_font_size_override("font_size", 11)
	hud_score.add_theme_color_override("font_color", Color("#E6C25A"))
	hud_score.text = "SCORE 0"
	row2.add_child(hud_score)
	hud_combo_small = Label.new(); hud_combo_small.add_theme_font_size_override("font_size", 11)
	hud_combo_small.add_theme_color_override("font_color", Color("#86B06C"))
	hud_combo_small.text = ""
	row2.add_child(hud_combo_small)
	# Wave chip (top-right)
	var wave_box := PanelContainer.new()
	wave_box.position = Vector2(1040, 10)
	wave_box.custom_minimum_size = Vector2(180, 54)
	wave_box.add_theme_stylebox_override("panel", sb.duplicate())
	hud_layer.add_child(wave_box)
	var wv := VBoxContainer.new()
	wv.add_theme_constant_override("separation", 2)
	wave_box.add_child(wv)
	hud_wave = Label.new(); hud_wave.add_theme_font_size_override("font_size", 15)
	hud_wave.add_theme_color_override("font_color", Color("#E6C25A"))
	hud_wave.text = "WAVE 0"
	wv.add_child(hud_wave)
	hud_timer = Label.new(); hud_timer.add_theme_font_size_override("font_size", 10)
	hud_timer.add_theme_color_override("font_color", Color("#A8B5A4"))
	hud_timer.text = "NEXT WAVE IN 6s"
	wv.add_child(hud_timer)
	# Boss bar (top center, under XP)
	boss_bar = PanelContainer.new()
	boss_bar.position = Vector2(340, 76)
	boss_bar.custom_minimum_size = Vector2(280, 44)
	var bs := StyleBoxFlat.new()
	bs.bg_color = Color(0.16, 0.10, 0.12, 0.9)
	bs.corner_radius_top_left = 8; bs.corner_radius_top_right = 8
	bs.corner_radius_bottom_left = 8; bs.corner_radius_bottom_right = 8
	bs.border_width_left = 1; bs.border_width_right = 1
	bs.border_width_top = 1; bs.border_width_bottom = 1
	bs.border_color = Color("#5C2836")
	bs.content_margin_left = 10; bs.content_margin_right = 10
	bs.content_margin_top = 5; bs.content_margin_bottom = 5
	boss_bar.add_theme_stylebox_override("panel", bs)
	boss_bar.visible = false
	hud_layer.add_child(boss_bar)
	var bv := VBoxContainer.new()
	bv.add_theme_constant_override("separation", 3)
	boss_bar.add_child(bv)
	boss_name = Label.new(); boss_name.add_theme_font_size_override("font_size", 12)
	boss_name.add_theme_color_override("font_color", Color("#E88B98"))
	boss_name.text = "WARLORD"
	bv.add_child(boss_name)
	boss_fill = ProgressBar.new()
	boss_fill.custom_minimum_size = Vector2(260, 10)
	boss_fill.show_percentage = false
	boss_fill.min_value = 0; boss_fill.max_value = 100; boss_fill.value = 100
	bv.add_child(boss_fill)
	# Kill feed (top-right, below wave chip)
	kill_feed_box = VBoxContainer.new()
	kill_feed_box.position = Vector2(1040, 80)
	kill_feed_box.custom_minimum_size = Vector2(200, 0)
	kill_feed_box.add_theme_constant_override("separation", 3)
	hud_layer.add_child(kill_feed_box)
	# HP + Energy (bottom-left)
	var bl := VBoxContainer.new()
	bl.position = Vector2(12, 600)
	bl.add_theme_constant_override("separation", 4)
	hud_layer.add_child(bl)
	hud_hp = _bar(bl, Color("#D05C6C"), "HP")
	hud_energy = _bar(bl, Color("#D9A441"), "EN")
	# Lock indicator (bottom-left above HP)
	lock_indicator = PanelContainer.new()
	lock_indicator.position = Vector2(12, 555)
	var ls := StyleBoxFlat.new()
	ls.bg_color = Color(0.118, 0.149, 0.118, 0.82)
	ls.corner_radius_top_left = 8; ls.corner_radius_top_right = 8
	ls.corner_radius_bottom_left = 8; ls.corner_radius_bottom_right = 8
	ls.content_margin_left = 8; ls.content_margin_right = 8
	ls.content_margin_top = 4; ls.content_margin_bottom = 4
	lock_indicator.add_theme_stylebox_override("panel", ls)
	lock_indicator.visible = false
	hud_layer.add_child(lock_indicator)
	var lh := HBoxContainer.new()
	lh.add_theme_constant_override("separation", 6)
	lock_indicator.add_child(lh)
	lock_cursor_lbl = Label.new(); lock_cursor_lbl.text = "🔒X CURSOR"
	lock_cursor_lbl.add_theme_font_size_override("font_size", 10)
	lock_cursor_lbl.add_theme_color_override("font_color", Color("#86B06C"))
	lh.add_child(lock_cursor_lbl)
	lock_attack_lbl = Label.new(); lock_attack_lbl.text = "⚔C AUTO"
	lock_attack_lbl.add_theme_font_size_override("font_size", 10)
	lock_attack_lbl.add_theme_color_override("font_color", Color("#E6C25A"))
	lh.add_child(lock_attack_lbl)
	# Crystal chip (bottom-right)
	var cry := PanelContainer.new()
	cry.position = Vector2(1050, 660)
	var cs := StyleBoxFlat.new()
	cs.bg_color = Color(0.14, 0.11, 0.05, 0.9)
	cs.corner_radius_top_left = 10; cs.corner_radius_top_right = 10
	cs.corner_radius_bottom_left = 10; cs.corner_radius_bottom_right = 10
	cs.border_width_left = 1; cs.border_width_right = 1
	cs.border_width_top = 1; cs.border_width_bottom = 1
	cs.border_color = Color(0.85, 0.75, 0.4, 0.4)
	cs.content_margin_left = 12; cs.content_margin_right = 12
	cs.content_margin_top = 6; cs.content_margin_bottom = 6
	cry.add_theme_stylebox_override("panel", cs)
	hud_layer.add_child(cry)
	var ch := HBoxContainer.new()
	ch.add_theme_constant_override("separation", 8)
	cry.add_child(ch)
	var sym := Label.new(); sym.text = "💎"; sym.add_theme_font_size_override("font_size", 18)
	ch.add_child(sym)
	var cv := VBoxContainer.new()
	cv.add_theme_constant_override("separation", 0)
	ch.add_child(cv)
	crystal_lbl = Label.new(); crystal_lbl.text = "1"
	crystal_lbl.add_theme_font_size_override("font_size", 15)
	crystal_lbl.add_theme_color_override("font_color", Color("#E6C25A"))
	cv.add_child(crystal_lbl)
	var cl := Label.new(); cl.text = "CRYSTAL"
	cl.add_theme_font_size_override("font_size", 8)
	cl.add_theme_color_override("font_color", Color("#8C9A89"))
	cv.add_child(cl)
	# Hint text (bottom-center)
	toast = Label.new()
	toast.position = Vector2(400, 690)
	toast.add_theme_font_size_override("font_size", 16)
	toast.add_theme_color_override("font_color", Color("#A8B5A4"))
	toast.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	toast.add_theme_constant_override("outline_size", 4)
	hud_layer.add_child(toast)
	# Combo display (center)
	combo_display = Label.new()
	combo_display.position = Vector2(500, 240)
	combo_display.add_theme_font_size_override("font_size", 56)
	combo_display.add_theme_color_override("font_color", Color("#E6C25A"))
	combo_display.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.6))
	combo_display.add_theme_constant_override("outline_size", 8)
	combo_display.modulate.a = 0.0
	hud_layer.add_child(combo_display)
	# Achievement toast (center)
	ach_toast = PanelContainer.new()
	ach_toast.position = Vector2(420, 300)
	ach_toast.custom_minimum_size = Vector2(280, 100)
	var ats := StyleBoxFlat.new()
	ats.bg_color = Color(0.16, 0.13, 0.05, 0.95)
	ats.corner_radius_top_left = 12; ats.corner_radius_top_right = 12
	ats.corner_radius_bottom_left = 12; ats.corner_radius_bottom_right = 12
	ats.border_width_left = 2; ats.border_width_right = 2
	ats.border_width_top = 2; ats.border_width_bottom = 2
	ats.border_color = Color("#E6C25A")
	ats.content_margin_left = 20; ats.content_margin_right = 20
	ats.content_margin_top = 12; ats.content_margin_bottom = 12
	ach_toast.add_theme_stylebox_override("panel", ats)
	ach_toast.modulate.a = 0.0
	hud_layer.add_child(ach_toast)
	var av := VBoxContainer.new()
	av.add_theme_constant_override("separation", 4)
	ach_toast.add_child(av)
	ach_ic = Label.new(); ach_ic.text = "🏆"; ach_ic.add_theme_font_size_override("font_size", 32)
	ach_ic.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	av.add_child(ach_ic)
	ach_ti = Label.new(); ach_ti.text = "ACHIEVEMENT"
	ach_ti.add_theme_font_size_override("font_size", 15)
	ach_ti.add_theme_color_override("font_color", Color("#E6C25A"))
	ach_ti.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	av.add_child(ach_ti)
	ach_sb = Label.new(); ach_sb.text = ""
	ach_sb.add_theme_font_size_override("font_size", 11)
	ach_sb.add_theme_color_override("font_color", Color("#A8B5A4"))
	ach_sb.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	av.add_child(ach_sb)
	# Build toggle button + menu (right side)
	build_toggle_btn = Button.new()
	build_toggle_btn.text = "◀  BUILD (B)"
	build_toggle_btn.position = Vector2(1090, 420)
	build_toggle_btn.custom_minimum_size = Vector2(90, 40)
	build_toggle_btn.focus_mode = Control.FOCUS_NONE
	build_toggle_btn.pressed.connect(_toggle_build_menu)
	hud_layer.add_child(build_toggle_btn)
	_build_build_menu()
	_refresh_hud()

func _build_build_menu() -> void:
	build_menu = PanelContainer.new()
	build_menu.position = Vector2(1150, 200)  # off-screen right
	build_menu.custom_minimum_size = Vector2(220, 460)
	var bs := StyleBoxFlat.new()
	bs.bg_color = Color(0.07, 0.10, 0.07, 0.96)
	bs.corner_radius_top_left = 12; bs.corner_radius_top_right = 12
	bs.corner_radius_bottom_left = 12; bs.corner_radius_bottom_right = 12
	bs.border_width_left = 1; bs.border_width_right = 1
	bs.border_width_top = 1; bs.border_width_bottom = 1
	bs.border_color = Color(0.35, 0.45, 0.35, 0.5)
	bs.content_margin_left = 8; bs.content_margin_right = 8
	bs.content_margin_top = 8; bs.content_margin_bottom = 8
	build_menu.add_theme_stylebox_override("panel", bs)
	hud_layer.add_child(build_menu)
	var bv := VBoxContainer.new()
	bv.add_theme_constant_override("separation", 4)
	build_menu.add_child(bv)
	var title := Label.new()
	title.text = "BUILD MENU"
	title.add_theme_font_size_override("font_size", 11)
	title.add_theme_color_override("font_color", Color("#86B06C"))
	bv.add_child(title)
	for def in Game.BUILD_DEFS:
		var btn := Button.new()
		btn.custom_minimum_size = Vector2(200, 36)
		btn.focus_mode = Control.FOCUS_NONE
		btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		var cost: Dictionary = def["cost"]
		var cost_str := ""
		if int(cost.get("w", 0)) > 0: cost_str += "%dW " % int(cost["w"])
		if int(cost.get("s", 0)) > 0: cost_str += "%dS " % int(cost["s"])
		if int(cost.get("f", 0)) > 0: cost_str += "%dF " % int(cost["f"])
		btn.text = "[%s] %s  (%dx%d)  %s" % [
			def["hotkey"], def["name"], int(def["fw"]), int(def["fh"]), cost_str.strip_edges()]
		var k: String = def["id"]
		btn.pressed.connect(func(): _build_menu_pick(k))
		bv.add_child(btn)
		build_menu_buttons[k] = btn

func _build_menu_pick(kind: String) -> void:
	var def := _def_for(kind)
	if Game.level < int(def.get("unlockLv", 1)):
		_flash_toast("Locked · reach LV %d" % int(def["unlockLv"]))
		return
	set_build(kind)
	_toggle_build_menu()

func _toggle_build_menu() -> void:
	build_menu_open = not build_menu_open
	var tw := create_tween()
	tw.tween_property(build_menu, "position:x",
		1150.0 if not build_menu_open else 900.0, 0.22).set_trans(Tween.TRANS_CUBIC)

func _chip(parent: Control, col: Color) -> Label:
	var pill := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.118, 0.149, 0.118, 0.82)
	sb.corner_radius_top_left = 9; sb.corner_radius_top_right = 9
	sb.corner_radius_bottom_left = 9; sb.corner_radius_bottom_right = 9
	sb.content_margin_left = 10; sb.content_margin_right = 10
	sb.content_margin_top = 5; sb.content_margin_bottom = 5
	pill.add_theme_stylebox_override("panel", sb)
	parent.add_child(pill)
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation", 6)
	pill.add_child(row)
	var ic := ColorRect.new()
	ic.custom_minimum_size = Vector2(14, 14); ic.color = col
	row.add_child(ic)
	var lab := Label.new(); lab.add_theme_font_size_override("font_size", 13)
	lab.add_theme_color_override("font_color", Color.WHITE)
	lab.text = "0"
	row.add_child(lab)
	return lab

func _bar(parent: Control, col: Color, _tag: String) -> ProgressBar:
	var b := ProgressBar.new()
	b.min_value = 0; b.max_value = 100; b.value = 100
	b.custom_minimum_size = Vector2(180, 14)
	b.show_percentage = false
	b.modulate = col
	parent.add_child(b)
	return b

func _refresh_hud() -> void:
	if not hud_wood: return
	hud_wood.text = "🪵 %d" % Game.wood
	hud_stone.text = "🪨 %d" % Game.stone
	hud_food.text = "🍒 %d" % Game.food
	hud_wave.text = "WAVE %d" % Game.wave
	var next_xp := Game.xp_to_next(Game.level)
	hud_level.text = "LEVEL %d" % Game.level
	hud_xp.text = "%d / %d XP" % [Game.xp, next_xp]
	hud_xp_bar.value = clampf(100.0 * float(Game.xp) / float(next_xp), 0, 100)
	hud_score.text = "SCORE %d" % Game.score
	if Game.combo >= 2:
		hud_combo_small.text = "×%d COMBO" % Game.combo
	else: hud_combo_small.text = ""
	crystal_lbl.text = str(Game.crystals)

func _on_combo_changed(c: int) -> void:
	if c >= 2:
		hud_combo_small.text = "×%d COMBO" % c
	else: hud_combo_small.text = ""

func _on_combo_displayed(c: int) -> void:
	if not combo_display: return
	combo_display.text = "×%d" % c
	combo_display.modulate.a = 1.0
	combo_disp_t = 0.9

func _on_locks_changed(cursor: bool, attack: bool) -> void:
	if not lock_indicator: return
	lock_indicator.visible = cursor or attack
	lock_cursor_lbl.visible = cursor
	lock_attack_lbl.visible = attack

func _on_kill_feed(text: String, cls: String) -> void:
	if not kill_feed_box: return
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 11)
	var col := Color("#CFE3C8")
	if cls == "gold": col = Color("#E6C25A")
	elif cls == "violet": col = Color("#BFA4E8")
	lbl.add_theme_color_override("font_color", col)
	lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.6))
	lbl.add_theme_constant_override("outline_size", 3)
	kill_feed_box.add_child(lbl)
	kill_feed_items.append({"node": lbl, "t": 0.0, "dur": 3.5})
	while kill_feed_items.size() > 6:
		var old = kill_feed_items.pop_front()
		if is_instance_valid(old["node"]): old["node"].queue_free()

func _on_achievement(id: String, info: Dictionary) -> void:
	if not ach_toast: return
	ach_ic.text = str(info.get("ic", "🏆"))
	ach_ti.text = str(info.get("ti", id))
	ach_sb.text = str(info.get("sb", ""))
	ach_toast.modulate.a = 1.0
	ach_timer = 3.2
	current_ach = id

func _on_level_up(_lv: int) -> void:
	if player and is_instance_valid(player):
		Juice.level_up_shockwave(self, player.global_position)
		if player.has_method("add_trauma"): player.add_trauma(0.24)

func _on_wave_changed(_w: int) -> void: _refresh_hud()

func _on_wave_started(w: int, _plan: Dictionary) -> void:
	hud_timer.text = ""
	_flash_toast("WAVE %d" % w)
	_refresh_hud()

func _on_wave_cleared(w: int) -> void:
	hud_timer.text = "Wave %d cleared!" % w
	if Game.wave == 10: Game.unlock_achievement("wave10")
	elif Game.wave == 25: Game.unlock_achievement("wave25")

func _on_countdown_tick(secs: int) -> void:
	hud_timer.text = "NEXT WAVE IN %ds" % secs

func _update_boss_bar() -> void:
	var boss: Node = null
	for z in get_tree().get_nodes_in_group("zombie"):
		if z.get("kind") == "warlord" and not z.get("dead"):
			boss = z; break
	if boss:
		boss_bar.visible = true
		var hp: float = boss.get("hp")
		var mx: float = maxf(1.0, boss.get("max_hp"))
		boss_fill.value = clampf(100.0 * hp / mx, 0, 100)
	else:
		boss_bar.visible = false

# ---------------- Public callbacks (called by groups) ----------------
func flash_toast(text: String) -> void: _flash_toast(text)

func spawn_float_text(world_pos: Vector2, text: String, col: Color) -> void:
	if text == "": return
	var lbl := Label.new()
	lbl.text = text
	lbl.add_theme_font_size_override("font_size", 16)
	lbl.add_theme_color_override("font_color", col)
	lbl.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
	lbl.add_theme_constant_override("outline_size", 4)
	lbl.position = world_pos + Vector2(-10, -14)
	lbl.z_index = 60
	lbl.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(lbl)
	var tw := lbl.create_tween()
	tw.tween_property(lbl, "position", world_pos + Vector2(-10, -52), 0.85)
	tw.parallel().tween_property(lbl, "modulate:a", 0.0, 0.85)
	tw.tween_callback(lbl.queue_free)

func spawn_decal(pos: Vector2, radius: float, col: Color) -> void:
	if not decal_layer: return
	var d := Polygon2D.new()
	var pts := PackedVector2Array()
	for i in 12:
		var a := TAU * float(i) / 12.0
		var r := radius * (0.85 + randf() * 0.35)
		pts.append(Vector2(cos(a), sin(a)) * r)
	d.polygon = pts
	d.color = col
	d.position = pos
	d.z_index = -5
	decal_layer.add_child(d)
	var tw := d.create_tween()
	tw.tween_interval(28.0)
	tw.tween_property(d, "modulate:a", 0.0, 4.0)
	tw.tween_callback(d.queue_free)

func spawn_ring(pos: Vector2, max_radius: float, col: Color, width: float = 3.0, dur: float = 0.4) -> void:
	var ln := Line2D.new()
	var pts := PackedVector2Array()
	var seg := 24
	for i in seg + 1:
		var a := TAU * float(i) / float(seg)
		pts.append(Vector2(cos(a), sin(a)) * 0.001)
	ln.points = pts
	ln.width = width
	ln.default_color = col
	ln.position = pos
	add_child(ln)
	var tw := ln.create_tween()
	tw.set_parallel(true)
	tw.tween_method(func(t: float):
		var nr: float = max_radius * t
		var np := PackedVector2Array()
		for i in seg + 1:
			var a := TAU * float(i) / float(seg)
			np.append(Vector2(cos(a), sin(a)) * nr)
		ln.points = np
	, 0.0, 1.0, dur)
	tw.tween_property(ln, "modulate:a", 0.0, dur)
	tw.chain().tween_callback(ln.queue_free)

func _flash_toast(text: String) -> void:
	if not toast: return
	toast.text = text
	toast.modulate.a = 1.0
	var tw := toast.create_tween()
	tw.tween_interval(1.4)
	tw.tween_property(toast, "modulate:a", 0.0, 0.5)

func _restore_from_snapshot(snap: Dictionary) -> void:
	# Recreate structures from snapshot.
	var StructScript2 = load("res://scripts/structure.gd")
	if snap.has("structures"):
		for sd in snap["structures"]:
			var s: StaticBody2D = StructScript2.new()
			s.setup(str(sd.get("kind", "wall")))
			s.position = sd["pos"]
			s.rotation = float(sd.get("rot", 0.0))
			if "tier" in s: s.set("tier", int(sd.get("tier", 0)))
			var keys: Array = sd.get("keys", [])
			s.set("cell_keys", keys)
			add_child(s)
			if s.has_signal("died"): s.connect("died", release_cells)
			for k in keys: occupied[k] = true

# ---------------- Menus ----------------
func _start_run() -> void:
	if menu_layer and is_instance_valid(menu_layer): menu_layer.queue_free()
	menu_layer = null
	get_tree().paused = false
	WaveDirector.start_run()
	_flash_toast("Harvest! Build! Wave 1 incoming!")

func _auto_pause() -> void:
	if run_over or get_tree().paused or not Game.run_active: return
	_show_pause_overlay()

func _show_pause_overlay() -> void:
	get_tree().paused = true
	var layer := CanvasLayer.new(); layer.layer = 15
	layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(layer)
	var dim := ColorRect.new()
	dim.color = Color(0.05, 0.08, 0.06, 0.72)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(dim)
	var box := VBoxContainer.new()
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.position -= Vector2(140, 90)
	box.add_theme_constant_override("separation", 12)
	layer.add_child(box)
	var title := Label.new(); title.text = "PAUSED"
	title.add_theme_font_size_override("font_size", 48)
	title.add_theme_color_override("font_color", Color("#86B06C"))
	box.add_child(title)
	var resume := Button.new(); resume.text = "▶  RESUME"
	resume.custom_minimum_size = Vector2(240, 52)
	resume.focus_mode = Control.FOCUS_NONE
	resume.pressed.connect(func(): layer.queue_free(); get_tree().paused = false)
	box.add_child(resume)

func show_menu() -> void:
	menu_layer = CanvasLayer.new(); menu_layer.layer = 10
	menu_layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(menu_layer)
	var dim := ColorRect.new()
	dim.color = Color(0.05, 0.08, 0.06, 0.88)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	menu_layer.add_child(dim)
	var box := VBoxContainer.new()
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.position -= Vector2(340, 220)
	box.add_theme_constant_override("separation", 12)
	menu_layer.add_child(box)
	var title := Label.new(); title.text = "DEADWOOD SIEGE"
	title.add_theme_font_size_override("font_size", 56)
	title.add_theme_color_override("font_color", Color("#86B06C"))
	box.add_child(title)
	var sub := Label.new()
	sub.text = "Build. Hold the line. No weapons — only walls.\nBest wave: %d   ·   Best combo: ×%d   ·   Kills: %d" % [
		Game.best_wave, Game.best_combo, Game.total_kills]
	sub.add_theme_font_size_override("font_size", 15)
	sub.add_theme_color_override("font_color", Color("#A8B5A4"))
	box.add_child(sub)
	var play := Button.new(); play.text = "▶  PLAY"
	play.custom_minimum_size = Vector2(280, 60)
	play.add_theme_font_size_override("font_size", 28)
	play.focus_mode = Control.FOCUS_NONE
	play.pressed.connect(_start_run)
	box.add_child(play)
	var hint := Label.new()
	hint.text = "WASD move · LMB swing · 1-8 build · R rotate · E eat · Shift dash · wheel zoom\nX cursor-lock · C attack-lock · T rewind · B build menu · Esc cancel"
	hint.add_theme_font_size_override("font_size", 13)
	hint.add_theme_color_override("font_color", Color("#6F7D6C"))
	box.add_child(hint)
	get_tree().paused = true

func show_game_over() -> void:
	if run_over: return
	run_over = true
	cancel_build()
	Game.end_run()
	get_tree().paused = true
	var layer := CanvasLayer.new(); layer.layer = 20
	layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(layer)
	var dim := ColorRect.new()
	dim.color = Color(0.08, 0.05, 0.05, 0.88)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(dim)
	var box := VBoxContainer.new()
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.position -= Vector2(200, 180)
	box.add_theme_constant_override("separation", 10)
	layer.add_child(box)
	var title := Label.new(); title.text = "OVERRUN"
	title.add_theme_font_size_override("font_size", 60)
	title.add_theme_color_override("font_color", Color("#D05C6C"))
	box.add_child(title)
	var grid := GridContainer.new()
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 6)
	box.add_child(grid)
	_stat(grid, "WAVE", str(Game.wave))
	_stat(grid, "KILLS", str(Game.kills))
	_stat(grid, "SCORE", str(Game.score))
	_stat(grid, "LEVEL", str(Game.level))
	_stat(grid, "BEST COMBO", "×%d" % Game.best_combo)
	_stat(grid, "ACHIEVEMENTS", "%d/%d" % [Game.unlocked_achievements.size(), Game.ACHIEVEMENTS.size()])
	var retry := Button.new(); retry.text = "↻  TRY AGAIN"
	retry.custom_minimum_size = Vector2(260, 56)
	retry.add_theme_font_size_override("font_size", 22)
	retry.focus_mode = Control.FOCUS_NONE
	retry.pressed.connect(func(): get_tree().paused = false; get_tree().reload_current_scene())
	box.add_child(retry)

func _stat(parent: Control, label: String, value: String) -> void:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.05, 0.07, 0.05, 0.7)
	sb.corner_radius_top_left = 6; sb.corner_radius_top_right = 6
	sb.corner_radius_bottom_left = 6; sb.corner_radius_bottom_right = 6
	sb.content_margin_left = 12; sb.content_margin_right = 12
	sb.content_margin_top = 6; sb.content_margin_bottom = 6
	p.add_theme_stylebox_override("panel", sb)
	parent.add_child(p)
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 1)
	p.add_child(v)
	var l := Label.new(); l.text = label
	l.add_theme_font_size_override("font_size", 10)
	l.add_theme_color_override("font_color", Color("#8C9A89"))
	v.add_child(l)
	var val := Label.new(); val.text = value
	val.add_theme_font_size_override("font_size", 18)
	val.add_theme_color_override("font_color", Color("#E6C25A"))
	v.add_child(val)

func spawn_zombie(kind: String, _w: int = 0) -> void:
	WaveDirector.spawn_zombie(kind)