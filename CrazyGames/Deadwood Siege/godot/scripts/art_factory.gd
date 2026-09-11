extends Node2D
## Deadwood Siege — Stylized 2D Art Factory
## High-End "Dark Fantasy MooMoo.io / Kingdom Rush / Brotato" Visual Style.
## Pure 90-degree overhead top-down perspective, bold dark comic outlines,
## crisp silhouettes, and rich color-coding.

# --- DARK FANTASY COLOR PALETTE ---
const INK := Color("#222633")
const DARK_INK := Color("#151821")
const WOOD_DARK := Color("#483420")
const WOOD_MID := Color("#6E4F32")
const WOOD_LIGHT := Color("#967048")
const STEEL_DARK := Color("#444958")
const STEEL_MID := Color("#72788C")
const STEEL_LIGHT := Color("#A2A8BC")
const STEEL_HI := Color("#D8DEEE")
const BRASS_DARK := Color("#8A6216")
const BRASS_MID := Color("#C89524")
const BRASS_LIGHT := Color("#F0C446")
const GOLD_HI := Color("#FFE27A")
const BLOOD_DARK := Color("#781422")
const BLOOD_MID := Color("#B81C2C")
const BLOOD_HI := Color("#F03044")

# Backwards compatibility aliases
const WOOD := WOOD_MID
const DARKWOOD := WOOD_DARK
const STEEL := STEEL_MID
const LIGHTSTEEL := STEEL_LIGHT
const TREE := Color("#3E6132")
const LEAF := Color("#558044")
const GOLD := BRASS_MID
const BEIGE := Color("#FAF0D8")
const BERRY := BLOOD_MID
const PLAYER := WOOD_DARK
const PLAYERSHADE := WOOD_MID

# --- VECTOR PRIMITIVES ---
static func poly(points: PackedVector2Array, fill: Color) -> Polygon2D:
	var p := Polygon2D.new()
	p.polygon = points
	p.color = fill
	return p

static func outline_poly(points: PackedVector2Array, width: float = 3.5) -> Line2D:
	var l := Line2D.new()
	var closed := points + PackedVector2Array([points[0]])
	l.points = closed
	l.default_color = INK
	l.width = width
	l.joint_mode = Line2D.LINE_JOINT_ROUND
	l.begin_cap_mode = Line2D.LINE_CAP_ROUND
	l.end_cap_mode = Line2D.LINE_CAP_ROUND
	l.antialiased = true
	return l

static func ring(r: float, color: Color, w: float = 3.0) -> Line2D:
	var pts := PackedVector2Array()
	for i in range(29):
		var a := TAU * i / 28.0
		pts.append(Vector2(cos(a), sin(a)) * r)
	var l := Line2D.new()
	l.points = pts
	l.default_color = color
	l.width = w
	l.joint_mode = Line2D.LINE_JOINT_ROUND
	l.antialiased = true
	return l

static func disc(r: float, fill: Color, width: float = 3.5) -> Node2D:
	var n := Node2D.new()
	var c := _circle_points(r, 26)
	n.add_child(poly(c, fill))
	if width > 0.0:
		n.add_child(outline_poly(c, width))
	return n

static func dot(pos: Vector2, r: float, fill: Color) -> Node2D:
	var n := Node2D.new()
	n.add_child(poly(_circle_points(r, 12), fill))
	n.position = pos
	return n

static func line(from: Vector2, to: Vector2, color: Color, w: float = 3.0) -> Line2D:
	var l := Line2D.new()
	l.points = PackedVector2Array([from, to])
	l.default_color = color
	l.width = w
	l.begin_cap_mode = Line2D.LINE_CAP_ROUND
	l.end_cap_mode = Line2D.LINE_CAP_ROUND
	l.antialiased = true
	return l

static func _circle_points(r: float, steps: int) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in range(steps):
		var a := TAU * i / steps
		pts.append(Vector2(cos(a), sin(a)) * r)
	return pts

static func _quad(p0: Vector2, c: Vector2, p1: Vector2, n: int = 8) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in range(n + 1):
		var t := float(i) / float(n)
		pts.append(p0.lerp(c, t).lerp(c.lerp(p1, t), t))
	return pts

static func crescent(r: float, shade: Color) -> Polygon2D:
	var pts := PackedVector2Array()
	var a0 := -2.356
	var half := 1.05
	for i in range(13):
		var a := a0 - half + 2.0 * half * i / 12.0
		pts.append(Vector2(cos(a), sin(a)) * r)
	for i in range(12, -1, -1):
		var a := a0 - half + 2.0 * half * i / 12.0
		pts.append(Vector2(cos(a), sin(a)) * r * 0.60)
	return poly(pts, shade)

# ==================== PLAYER ====================
static func make_player() -> Node2D:
	var root := Node2D.new()
	var axe := Node2D.new()
	axe.name = "Axe"
	axe.rotation = -PI / 2.0

	var tool := Node2D.new()
	tool.add_child(line(Vector2(14, 0), Vector2(58, 0), INK, 8.0))
	tool.add_child(line(Vector2(16, 0), Vector2(56, 0), WOOD_MID, 5.0))
	tool.add_child(line(Vector2(16, -1), Vector2(56, -1), WOOD_LIGHT, 1.5))
	tool.add_child(line(Vector2(24, 0), Vector2(40, 0), WOOD_DARK, 6.0))
	tool.add_child(dot(Vector2(14, 0), 3.5, BRASS_MID))
	tool.add_child(dot(Vector2(14, 0), 1.5, BRASS_LIGHT))

	var collar := PackedVector2Array([Vector2(48, -4), Vector2(56, -4), Vector2(56, 4), Vector2(48, 4)])
	tool.add_child(poly(collar, STEEL_DARK))
	tool.add_child(outline_poly(collar, 2.5))
	var poll := PackedVector2Array([Vector2(48, -2), Vector2(42, 0), Vector2(48, 2)])
	tool.add_child(poly(poll, STEEL_MID))
	tool.add_child(outline_poly(poll, 2.0))
	var blade := PackedVector2Array([Vector2(54, -3), Vector2(68, -8), Vector2(66, 18), Vector2(52, 6)])
	tool.add_child(poly(blade, STEEL_MID))
	tool.add_child(outline_poly(blade, 3.0))
	tool.add_child(line(Vector2(68, -8), Vector2(66, 18), STEEL_HI, 2.5))
	var bevel := PackedVector2Array([Vector2(55, -1), Vector2(63, -4), Vector2(61, 12), Vector2(53, 4)])
	tool.add_child(poly(bevel, STEEL_DARK))

	axe.add_child(tool)
	root.add_child(axe)

	var hand_left := disc(8.0, WOOD_DARK, 3.0)
	hand_left.position = Vector2(26, -3)
	hand_left.add_child(dot(Vector2.ZERO, 1.5, BRASS_LIGHT))
	root.add_child(hand_left)

	var hand_right := disc(8.5, WOOD_DARK, 3.0)
	hand_right.position = Vector2(24, 13)
	hand_right.add_child(dot(Vector2.ZERO, 1.5, BRASS_LIGHT))
	root.add_child(hand_right)

	root.add_child(poly(_circle_points(26.0, 28), WOOD_DARK))
	root.add_child(poly(_circle_points(23.0, 26), Color("#543A28")))
	root.add_child(crescent(24.0, WOOD_MID))

	root.add_child(line(Vector2(-14, -14), Vector2(16, 16), INK, 5.0))
	root.add_child(line(Vector2(-14, -14), Vector2(16, 16), Color("#3A261A"), 3.0))
	var buckle := PackedVector2Array([Vector2(-4, -4), Vector2(4, -4), Vector2(4, 4), Vector2(-4, 4)])
	root.add_child(poly(buckle, BRASS_MID))
	root.add_child(outline_poly(buckle, 2.0))
	root.add_child(dot(Vector2.ZERO, 1.5, BRASS_LIGHT))

	var fur_pts := PackedVector2Array([
		Vector2(-16, -14), Vector2(-8, -20), Vector2(4, -19), Vector2(16, -12),
		Vector2(20, -2), Vector2(18, 12), Vector2(8, 18), Vector2(-6, 18),
		Vector2(-16, 10), Vector2(-18, -2)
	])
	root.add_child(poly(fur_pts, Color("#B5A68E")))
	root.add_child(outline_poly(fur_pts, 3.0))
	root.add_child(line(Vector2(-10, -14), Vector2(2, -14), Color("#DDD4C4"), 2.0))
	root.add_child(line(Vector2(4, -10), Vector2(14, -4), Color("#DDD4C4"), 2.0))
	root.add_child(line(Vector2(-12, 4), Vector2(-4, 12), Color("#8C7A64"), 2.0))
	root.add_child(outline_poly(_circle_points(26.0, 28), 4.0))

	return root
# ==================== ZOMBIES ====================
static func zombie_spec(kind: String) -> Dictionary:
	match kind.to_lower():
		"run":
			return {"r": 16.0, "col": Color("#456B38"), "shade": Color("#629450")}
		"sap":
			return {"r": 19.0, "col": Color("#36522C"), "shade": Color("#4A6B3C")}
		"scav":
			return {"r": 17.0, "col": Color("#4A5C2E"), "shade": Color("#657840")}
		"brute":
			return {"r": 29.0, "col": Color("#2E4726"), "shade": Color("#415E36")}
		"spit":
			return {"r": 20.0, "col": Color("#5A4A2A"), "shade": Color("#78663C")}
		"champ":
			return {"r": 31.0, "col": BLOOD_DARK, "shade": Color("#8B2636")}
		"warlord":
			return {"r": 42.0, "col": Color("#2E1C22"), "shade": Color("#45242C")}
		"mini":
			return {"r": 13.0, "col": Color("#3E5C33"), "shade": Color("#537845")}
		_:
			return {"r": 18.0, "col": Color("#3E5C33"), "shade": Color("#537845")}

static func zombie_radius(kind: String) -> float:
	return float(zombie_spec(kind).get("r", 18.0))

static func make_zombie(kind: String) -> Node2D:
	var root := Node2D.new()
	var k := kind.to_lower()
	var spec := zombie_spec(k)
	var body_r: float = spec["r"]
	var body_col: Color = spec["col"]

	match k:
		"run":
			for y in [-body_r * 0.7, body_r * 0.7]:
				root.add_child(line(Vector2(body_r * 0.4, y), Vector2(body_r * 1.3, y), body_col, 5.0))
				var claw := PackedVector2Array([
					Vector2(body_r * 1.3, y - 4), Vector2(body_r * 1.7, y), Vector2(body_r * 1.3, y + 4)
				])
				root.add_child(poly(claw, BLOOD_MID))
				root.add_child(outline_poly(claw, 2.0))
			root.add_child(poly(_circle_points(body_r, 24), body_col))
			root.add_child(crescent(body_r * 0.92, spec["shade"]))
			root.add_child(outline_poly(_circle_points(body_r, 24), 3.5))
			root.add_child(line(Vector2(-body_r * 0.3, -2), Vector2(body_r * 0.3, 4), BLOOD_MID, 2.5))

		"sap":
			var keg := PackedVector2Array([
				Vector2(-body_r * 1.6, -10), Vector2(-body_r * 0.7, -10),
				Vector2(-body_r * 0.7, 10), Vector2(-body_r * 1.6, 10)
			])
			root.add_child(poly(keg, WOOD_DARK))
			root.add_child(outline_poly(keg, 3.0))
			root.add_child(line(Vector2(-body_r * 1.6, -5), Vector2(-body_r * 0.7, -5), STEEL_LIGHT, 2.0))
			root.add_child(line(Vector2(-body_r * 1.6, 5), Vector2(-body_r * 0.7, 5), STEEL_LIGHT, 2.0))
			root.add_child(dot(Vector2(-body_r * 1.7, -7), 3.0, BRASS_LIGHT))
			root.add_child(dot(Vector2(-body_r * 1.7, -7), 1.5, BLOOD_HI))
			for y in [-body_r * 0.6, body_r * 0.6]:
				var h := disc(5.5, body_col, 2.5)
				h.position = Vector2(body_r * 0.9, y)
				root.add_child(h)
			root.add_child(poly(_circle_points(body_r, 26), body_col))
			var helm := PackedVector2Array([
				Vector2(-body_r * 0.4, -body_r * 0.75), Vector2(body_r * 0.75, -body_r * 0.4),
				Vector2(body_r * 0.75, body_r * 0.4), Vector2(-body_r * 0.4, body_r * 0.75)
			])
			root.add_child(poly(helm, STEEL_DARK))
			root.add_child(outline_poly(helm, 3.0))
			root.add_child(line(Vector2(0, -body_r * 0.6), Vector2(0, body_r * 0.6), STEEL_HI, 2.0))
			root.add_child(outline_poly(_circle_points(body_r, 26), 3.5))

		"scav":
			var pouch := PackedVector2Array([
				Vector2(-body_r * 1.1, 2), Vector2(-body_r * 0.4, 2),
				Vector2(-body_r * 0.4, 12), Vector2(-body_r * 1.1, 12)
			])
			root.add_child(poly(pouch, WOOD_DARK))
			root.add_child(outline_poly(pouch, 2.5))
			root.add_child(line(Vector2(-body_r * 0.9, -8), Vector2(body_r * 0.4, 8), INK, 3.5))
			for y in [-body_r * 0.55, body_r * 0.55]:
				var h := disc(5.5, body_col, 2.5)
				h.position = Vector2(body_r * 0.95, y)
				root.add_child(h)
			root.add_child(poly(_circle_points(body_r, 24), body_col))
			var cowl := PackedVector2Array([
				Vector2(-body_r * 0.6, -body_r * 0.6), Vector2(body_r * 0.3, -body_r * 0.5),
				Vector2(body_r * 0.5, body_r * 0.2), Vector2(0, body_r * 0.6), Vector2(-body_r * 0.5, body_r * 0.4)
			])
			root.add_child(poly(cowl, Color("#867446")))
			root.add_child(outline_poly(cowl, 2.5))
			root.add_child(outline_poly(_circle_points(body_r, 24), 3.5))

		"brute":
			for y in [-body_r * 0.7, body_r * 0.7]:
				var h := disc(9.5, body_col, 3.5)
				h.position = Vector2(body_r * 1.05, y)
				root.add_child(h)
			root.add_child(poly(_circle_points(body_r, 30), body_col))
			root.add_child(crescent(body_r * 0.92, spec["shade"]))
			var pauldron := PackedVector2Array([
				Vector2(-body_r * 0.6, -body_r * 0.9), Vector2(body_r * 0.5, -body_r * 0.9),
				Vector2(body_r * 0.3, -body_r * 0.2), Vector2(-body_r * 0.5, -body_r * 0.2)
			])
			root.add_child(poly(pauldron, Color("#5E4636")))
			root.add_child(outline_poly(pauldron, 3.0))
			var spk1 := PackedVector2Array([Vector2(-body_r * 0.2, -body_r * 0.9), Vector2(-body_r * 0.1, -body_r * 1.3), Vector2(0, -body_r * 0.9)])
			root.add_child(poly(spk1, STEEL_LIGHT))
			root.add_child(outline_poly(spk1, 2.0))
			var spk2 := PackedVector2Array([Vector2(body_r * 0.1, -body_r * 0.9), Vector2(body_r * 0.2, -body_r * 1.3), Vector2(body_r * 0.3, -body_r * 0.9)])
			root.add_child(poly(spk2, STEEL_LIGHT))
			root.add_child(outline_poly(spk2, 2.0))
			root.add_child(outline_poly(_circle_points(body_r, 30), 4.5))

		"spit":
			for y in [-body_r * 0.5, body_r * 0.5]:
				var h := disc(6.0, body_col, 2.5)
				h.position = Vector2(body_r * 1.0, y)
				root.add_child(h)
			root.add_child(poly(_circle_points(body_r, 26), body_col))
			root.add_child(crescent(body_r * 0.92, spec["shade"]))
			var p1 := disc(5.0, BRASS_LIGHT, 2.0)
			p1.position = Vector2(-body_r * 0.45, -5)
			p1.add_child(dot(Vector2.ZERO, 2.0, GOLD_HI))
			root.add_child(p1)
			var p2 := disc(4.5, BRASS_LIGHT, 2.0)
			p2.position = Vector2(-body_r * 0.35, 6)
			p2.add_child(dot(Vector2.ZERO, 1.8, GOLD_HI))
			root.add_child(p2)
			var p3 := disc(3.5, BRASS_MID, 1.5)
			p3.position = Vector2(-body_r * 0.6, 2)
			root.add_child(p3)
			root.add_child(outline_poly(_circle_points(body_r, 26), 3.5))

		"champ":
			for y in [-body_r * 0.7, body_r * 0.7]:
				var gaunt := disc(8.5, STEEL_DARK, 3.0)
				gaunt.position = Vector2(body_r * 1.0, y)
				var gspk := PackedVector2Array([Vector2(3, -2), Vector2(9, 0), Vector2(3, 2)])
				gaunt.add_child(poly(gspk, STEEL_HI))
				gaunt.add_child(outline_poly(gspk, 1.5))
				root.add_child(gaunt)
			root.add_child(poly(_circle_points(body_r, 28), body_col))
			var plate := PackedVector2Array([
				Vector2(-body_r * 0.5, -body_r * 0.5), Vector2(body_r * 0.5, -body_r * 0.5),
				Vector2(body_r * 0.7, 0), Vector2(body_r * 0.5, body_r * 0.5), Vector2(-body_r * 0.5, body_r * 0.5)
			])
			root.add_child(poly(plate, STEEL_DARK))
			root.add_child(outline_poly(plate, 3.0))
			root.add_child(line(Vector2(-body_r * 0.4, 0), Vector2(body_r * 0.6, 0), BRASS_LIGHT, 2.5))
			root.add_child(line(Vector2(0, -body_r * 0.4), Vector2(0, body_r * 0.4), BRASS_LIGHT, 2.5))
			root.add_child(outline_poly(_circle_points(body_r, 28), 4.5))

		"warlord":
			var cape := PackedVector2Array([
				Vector2(-body_r * 0.4, -body_r * 0.8), Vector2(-body_r * 1.5, -body_r * 0.7),
				Vector2(-body_r * 1.8, 0), Vector2(-body_r * 1.5, body_r * 0.7),
				Vector2(-body_r * 0.4, body_r * 0.8), Vector2(-body_r * 0.8, 0)
			])
			root.add_child(poly(cape, BLOOD_DARK))
			root.add_child(outline_poly(cape, 4.0))
			for y in [-body_r * 0.75, body_r * 0.75]:
				var gaunt := disc(10.5, STEEL_DARK, 3.5)
				gaunt.position = Vector2(body_r * 1.05, y)
				var wspk := PackedVector2Array([Vector2(4, -3), Vector2(12, 0), Vector2(4, 3)])
				gaunt.add_child(poly(wspk, STEEL_HI))
				gaunt.add_child(outline_poly(wspk, 2.0))
				gaunt.add_child(dot(Vector2.ZERO, 2.5, BLOOD_HI))
				root.add_child(gaunt)
			root.add_child(poly(_circle_points(body_r, 32), body_col))
			root.add_child(ring(body_r * 0.75, STEEL_DARK, 5.0))
			for a in [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0]:
				var rad := deg_to_rad(a)
				var spk := PackedVector2Array([
					Vector2(cos(rad - 0.1), sin(rad - 0.1)) * (body_r * 0.75),
					Vector2(cos(rad), sin(rad)) * (body_r * 1.05),
					Vector2(cos(rad + 0.1), sin(rad + 0.1)) * (body_r * 0.75)
				])
				root.add_child(poly(spk, DARK_INK))
			var skull := PackedVector2Array([
				Vector2(-body_r * 0.2, -body_r * 0.45), Vector2(body_r * 0.5, -body_r * 0.35),
				Vector2(body_r * 0.6, 0), Vector2(body_r * 0.5, body_r * 0.35), Vector2(-body_r * 0.2, body_r * 0.45)
			])
			root.add_child(poly(skull, Color("#DDD6C6")))
			root.add_child(outline_poly(skull, 3.0))
			root.add_child(dot(Vector2(body_r * 0.35, -4), 2.5, BLOOD_HI))
			root.add_child(dot(Vector2(body_r * 0.35, 4), 2.5, BLOOD_HI))
			var horn_n := PackedVector2Array([
				Vector2(0, -body_r * 0.4), Vector2(-body_r * 0.3, -body_r * 1.1),
				Vector2(body_r * 0.3, -body_r * 1.3), Vector2(body_r * 0.1, -body_r * 0.8), Vector2(body_r * 0.2, -body_r * 0.4)
			])
			root.add_child(poly(horn_n, Color("#DDD6C6")))
			root.add_child(outline_poly(horn_n, 3.0))
			var horn_s := PackedVector2Array([
				Vector2(0, body_r * 0.4), Vector2(-body_r * 0.3, body_r * 1.1),
				Vector2(body_r * 0.3, body_r * 1.3), Vector2(body_r * 0.1, body_r * 0.8), Vector2(body_r * 0.2, body_r * 0.4)
			])
			root.add_child(poly(horn_s, Color("#DDD6C6")))
			root.add_child(outline_poly(horn_s, 3.0))
			root.add_child(outline_poly(_circle_points(body_r, 32), 5.0))

		_:
			for y in [-body_r * 0.5, body_r * 0.5]:
				root.add_child(line(Vector2(body_r * 0.4, y), Vector2(body_r * 1.15, y), body_col, 6.0))
				var claw := PackedVector2Array([
					Vector2(body_r * 1.15, y - 3), Vector2(body_r * 1.45, y), Vector2(body_r * 1.15, y + 3)
				])
				root.add_child(poly(claw, DARK_INK))
				root.add_child(outline_poly(claw, 1.5))
			root.add_child(poly(_circle_points(body_r, 26), body_col))
			root.add_child(crescent(body_r * 0.94, spec["shade"]))
			root.add_child(outline_poly(_circle_points(body_r, 26), 3.5))
			root.add_child(line(Vector2(-body_r * 0.3, -3), Vector2(body_r * 0.2, 5), BLOOD_DARK, 2.5))

	return root
# ==================== TREES & RESOURCES ====================
static func make_tree_variant(idx: int) -> Node2D:
	var n := Node2D.new()
	var sh1 := poly(_circle_points(38.0, 16), DARK_INK)
	sh1.modulate.a = 0.30
	n.add_child(sh1)
	for a in [0.8, 2.3, 3.8, 5.2]:
		var dir := Vector2(cos(a + float(idx) * 0.2), sin(a + float(idx) * 0.2))
		n.add_child(line(Vector2.ZERO, dir * 30.0, WOOD_DARK, 5.0))
		n.add_child(line(Vector2.ZERO, dir * 28.0, WOOD_MID, 2.5))
	var pts1 := PackedVector2Array()
	var pts2 := PackedVector2Array()
	var pts3 := PackedVector2Array()
	var points_count := 8 + (idx % 4) * 2
	for i in range(points_count):
		var a := TAU * float(i) / float(points_count)
		var rad1 := 34.0 + 8.0 * sin(float(i * 3 + idx))
		var rad2 := 26.0 + 6.0 * cos(float(i * 3 + idx))
		var rad3 := 16.0 + 4.0 * sin(float(i * 2))
		pts1.append(Vector2(cos(a), sin(a)) * rad1)
		pts2.append(Vector2(cos(a), sin(a)) * rad2)
		pts3.append(Vector2(cos(a), sin(a)) * rad3)
	n.add_child(poly(pts1, Color("#2C4524")))
	n.add_child(outline_poly(pts1, 4.0))
	n.add_child(poly(pts2, Color("#3E6132")))
	n.add_child(outline_poly(pts2, 3.0))
	n.add_child(poly(pts3, Color("#558044")))
	n.add_child(outline_poly(pts3, 2.5))
	n.add_child(dot(Vector2.ZERO, 5.0, Color("#88BF6C")))
	return n

static func make_rock() -> Node2D:
	var n := Node2D.new()
	var sh2 := poly(_circle_points(28.0, 8), DARK_INK)
	sh2.modulate.a = 0.35
	n.add_child(sh2)
	var base_pts := PackedVector2Array([
		Vector2(-24, 0), Vector2(-16, -22), Vector2(14, -24), Vector2(26, -6),
		Vector2(24, 18), Vector2(6, 26), Vector2(-18, 22)
	])
	n.add_child(poly(base_pts, STEEL_DARK))
	n.add_child(outline_poly(base_pts, 4.0))
	var f1 := PackedVector2Array([Vector2(-16, -22), Vector2(14, -24), Vector2(18, -4), Vector2(-6, 2)])
	n.add_child(poly(f1, STEEL_LIGHT))
	n.add_child(outline_poly(f1, 2.0))
	var f2 := PackedVector2Array([Vector2(14, -24), Vector2(26, -6), Vector2(18, -4)])
	n.add_child(poly(f2, STEEL_HI))
	n.add_child(outline_poly(f2, 2.0))
	var f3 := PackedVector2Array([Vector2(-6, 2), Vector2(18, -4), Vector2(24, 18), Vector2(6, 26)])
	n.add_child(poly(f3, STEEL_MID))
	n.add_child(outline_poly(f3, 2.0))
	n.add_child(line(Vector2(2, -18), Vector2(8, -6), STEEL_HI, 2.0))
	return n

static func make_bush() -> Node2D:
	var n := Node2D.new()
	var sh3 := poly(_circle_points(28.0, 12), DARK_INK)
	sh3.modulate.a = 0.35
	n.add_child(sh3)
	n.add_child(line(Vector2(-18, -10), Vector2(18, 10), WOOD_DARK, 4.0))
	n.add_child(line(Vector2(14, -14), Vector2(-14, 14), WOOD_DARK, 4.0))
	var blob := PackedVector2Array()
	for i in range(18):
		var a := TAU * float(i) / 18.0
		var rad := 24.0 + 5.0 * sin(a * 3.0)
		blob.append(Vector2(cos(a), sin(a)) * rad)
	n.add_child(poly(blob, Color("#35522A")))
	n.add_child(outline_poly(blob, 4.0))
	for p in [Vector2(-10, -8), Vector2(12, -6), Vector2(-6, 12), Vector2(8, 10), Vector2(0, -2)]:
		n.add_child(dot(p, 10.0, Color("#4B743B")))
		n.add_child(dot(p, 6.0, Color("#78AC62")))
	for b in [Vector2(-12, -6), Vector2(10, -10), Vector2(-2, 8), Vector2(14, 6), Vector2(-8, 12), Vector2(6, -4)]:
		var berry := disc(4.5, BLOOD_HI, 1.5)
		berry.position = b
		berry.add_child(dot(Vector2(-1, -1), 1.2, Color.WHITE))
		n.add_child(berry)
	return n

static func make_gold_mine() -> Node2D:
	var root := Node2D.new()
	root.scale = Vector2(0.7, 0.7)
	var sh4 := poly(_circle_points(46.0, 10), DARK_INK)
	sh4.modulate.a = 0.35
	root.add_child(sh4)
	var rock := PackedVector2Array([
		Vector2(0, -50), Vector2(40, -28), Vector2(40, 25), Vector2(0, 50),
		Vector2(-40, 25), Vector2(-40, -28)
	])
	root.add_child(poly(rock, STEEL_DARK))
	root.add_child(outline_poly(rock, 4.5))
	var f1 := PackedVector2Array([Vector2(0, -50), Vector2(40, -28), Vector2(18, 0), Vector2(-16, -10)])
	root.add_child(poly(f1, STEEL_LIGHT))
	root.add_child(outline_poly(f1, 2.5))
	for v in [
		PackedVector2Array([Vector2(-25, -10), Vector2(-7, 0), Vector2(-13, 20)]),
		PackedVector2Array([Vector2(25, -15), Vector2(11, 2), Vector2(19, 18)])
	]:
		var vein_out := Line2D.new()
		vein_out.points = v
		vein_out.default_color = INK
		vein_out.width = 7.0
		root.add_child(vein_out)
		var vein := Line2D.new()
		vein.points = v
		vein.default_color = BRASS_MID
		vein.width = 4.5
		root.add_child(vein)
		var vein_hi := Line2D.new()
		vein_hi.points = v
		vein_hi.default_color = GOLD_HI
		vein_hi.width = 1.5
		root.add_child(vein_hi)
	for b in [
		PackedVector2Array([Vector2(-23,28),Vector2(-13,22),Vector2(-5,28),Vector2(-9,38),Vector2(-21,38)]),
		PackedVector2Array([Vector2(11,30),Vector2(21,25),Vector2(27,33),Vector2(21,41),Vector2(11,40)])
	]:
		root.add_child(poly(b, GOLD_HI))
		root.add_child(outline_poly(b, 2.5))
	return root

# ==================== DEFENSE STRUCTURES ====================
static func make_wall_piece() -> Node2D:
	var n := Node2D.new()
	n.scale = Vector2(0.42, 0.42)
	var o := Vector2(-80, -45)
	for i in range(6):
		var x := 16.0 + float(i) * 22.0
		var log_poly := PackedVector2Array([
			o + Vector2(x, 26), o + Vector2(x, -14), o + Vector2(x + 9, -28),
			o + Vector2(x + 18, -14), o + Vector2(x + 18, 26)
		])
		n.add_child(poly(log_poly, WOOD_MID))
		n.add_child(outline_poly(log_poly, 4.0))
		n.add_child(dot(o + Vector2(x + 9, -6), 4.5, WOOD_LIGHT))
	var strap := PackedVector2Array([
		o + Vector2(-4, -6), o + Vector2(138, -6), o + Vector2(138, 6), o + Vector2(-4, 6)
	])
	n.add_child(poly(strap, STEEL_DARK))
	n.add_child(outline_poly(strap, 3.5))
	for rx in [-44.0, 0.0, 44.0]:
		n.add_child(dot(Vector2(rx, -1), 3.0, STEEL_HI))
		n.add_child(dot(Vector2(rx, -1), 1.5, INK))
	return n

static func make_wall_stone() -> Node2D:
	var n := Node2D.new()
	n.scale = Vector2(0.5, 0.5)
	var rect := PackedVector2Array([
		Vector2(-65, -20), Vector2(65, -20), Vector2(65, 20), Vector2(-65, 20)
	])
	n.add_child(poly(rect, STEEL_DARK))
	n.add_child(outline_poly(rect, 4.5))
	var upper := PackedVector2Array([
		Vector2(-62, -18), Vector2(62, -18), Vector2(62, -2), Vector2(-62, -2)
	])
	n.add_child(poly(upper, STEEL_LIGHT))
	n.add_child(line(Vector2(-20, -18), Vector2(-20, -2), INK, 2.5))
	n.add_child(line(Vector2(22, -18), Vector2(22, -2), INK, 2.5))
	var lower := PackedVector2Array([
		Vector2(-62, 0), Vector2(62, 0), Vector2(62, 18), Vector2(-62, 18)
	])
	n.add_child(poly(lower, STEEL_MID))
	n.add_child(line(Vector2(-42, 0), Vector2(-42, 18), INK, 2.5))
	n.add_child(line(Vector2(0, 0), Vector2(0, 18), INK, 2.5))
	n.add_child(line(Vector2(42, 0), Vector2(42, 18), INK, 2.5))
	return n

static func make_wall_fortress() -> Node2D:
	var n := Node2D.new()
	n.scale = Vector2(0.5, 0.5)
	var rect := PackedVector2Array([
		Vector2(-65, -20), Vector2(65, -20), Vector2(65, 20), Vector2(-65, 20)
	])
	n.add_child(poly(rect, DARK_INK))
	n.add_child(outline_poly(rect, 4.5))
	for x in [-42.0, -14.0, 14.0, 42.0]:
		var spk := PackedVector2Array([
			Vector2(x - 8, -20), Vector2(x, -36), Vector2(x + 8, -20)
		])
		n.add_child(poly(spk, STEEL_MID))
		n.add_child(outline_poly(spk, 3.0))
	var band := PackedVector2Array([
		Vector2(-62, -6), Vector2(62, -6), Vector2(62, 10), Vector2(-62, 10)
	])
	n.add_child(poly(band, STEEL_DARK))
	n.add_child(outline_poly(band, 2.5))
	for rx in [-45.0, -15.0, 15.0, 45.0]:
		n.add_child(dot(Vector2(rx, 2), 3.0, BRASS_LIGHT))
		n.add_child(dot(Vector2(rx, 2), 1.5, INK))
	return n

static func make_door() -> Node2D:
	var n := Node2D.new()
	n.scale = Vector2(0.55, 0.55)
	var rect := PackedVector2Array([
		Vector2(-50, -22), Vector2(50, -22), Vector2(50, 22), Vector2(-50, 22)
	])
	n.add_child(poly(rect, WOOD_DARK))
	n.add_child(outline_poly(rect, 4.5))
	for x in [-25.0, 0.0, 25.0]:
		n.add_child(line(Vector2(x, -20), Vector2(x, 20), INK, 2.5))
	for y in [-12.0, 8.0]:
		var h := PackedVector2Array([
			Vector2(-50, y), Vector2(-15, y), Vector2(-15, y + 7), Vector2(-50, y + 7)
		])
		n.add_child(poly(h, STEEL_DARK))
		n.add_child(outline_poly(h, 2.5))
		n.add_child(dot(Vector2(-42, y + 3.5), 2.0, STEEL_HI))
		n.add_child(dot(Vector2(-22, y + 3.5), 2.0, STEEL_HI))
	var key := disc(5.0, BRASS_MID, 2.0)
	key.position = Vector2(28, 0)
	key.add_child(dot(Vector2.ZERO, 2.0, INK))
	n.add_child(key)
	return n

static func make_spike() -> Node2D:
	var root := Node2D.new()
	var base := PackedVector2Array([
		Vector2(-48, -48), Vector2(48, -48), Vector2(48, 48), Vector2(-48, 48)
	])
	root.add_child(poly(base, WOOD_DARK))
	root.add_child(outline_poly(base, 4.0))
	for p in [Vector2(-24, -24), Vector2(24, -24), Vector2(-24, 24), Vector2(24, 24), Vector2(0, 0)]:
		var sp := PackedVector2Array([
			p + Vector2(-11, 11), p + Vector2(0, -20), p + Vector2(11, 11)
		])
		root.add_child(poly(sp, STEEL_DARK))
		root.add_child(outline_poly(sp, 2.5))
		root.add_child(line(p + Vector2(0, -20), p + Vector2(0, 6), STEEL_HI, 2.0))
	return root

static func make_farm() -> Node2D:
	var n := Node2D.new()
	var plot := PackedVector2Array([
		Vector2(-42, -42), Vector2(42, -42), Vector2(42, 42), Vector2(-42, 42)
	])
	n.add_child(poly(plot, WOOD_DARK))
	n.add_child(outline_poly(plot, 4.0))
	n.add_child(poly(_circle_points(38.0, 4), Color("#2E2016")))
	for y in [-22.0, 0.0, 22.0]:
		n.add_child(line(Vector2(-34, y), Vector2(34, y), Color("#3D2B1E"), 8.0))
		n.add_child(line(Vector2(-34, y), Vector2(34, y), Color("#22160E"), 2.5))
	var sprouts := Node2D.new()
	sprouts.name = "Sprouts"
	for x in [-22.0, 0.0, 22.0]:
		for y in [-20.0, 0.0, 20.0]:
			var leaf := disc(6.5, Color("#4B7836"), 2.0)
			leaf.position = Vector2(x, y)
			leaf.add_child(dot(Vector2(2, -2), 3.0, BLOOD_HI))
			sprouts.add_child(leaf)
	n.add_child(sprouts)
	return n

static func make_tar() -> Node2D:
	var root := Node2D.new()
	var frame := PackedVector2Array([
		Vector2(-48, -48), Vector2(48, -48), Vector2(48, 48), Vector2(-48, 48)
	])
	root.add_child(poly(frame, WOOD_DARK))
	root.add_child(outline_poly(frame, 4.0))
	var pool := PackedVector2Array([
		Vector2(-40, -40), Vector2(40, -40), Vector2(40, 40), Vector2(-40, 40)
	])
	root.add_child(poly(pool, Color("#181516")))
	root.add_child(outline_poly(pool, 2.5))
	for b in [Vector2(-16, -12), Vector2(14, -16), Vector2(-8, 14), Vector2(16, 12), Vector2(0, -2)]:
		var bub := disc(6.0, Color("#2E2426"), 2.0)
		bub.position = b
		bub.add_child(dot(Vector2(-1, -1), 2.0, Color("#6A585C")))
		root.add_child(bub)
	return root

static func make_cauldron() -> Node2D:
	var root := Node2D.new()
	root.add_child(poly(_circle_points(36.0, 16), Color("#221814")))
	root.add_child(poly(_circle_points(30.0, 14), Color("#B83A14")))
	root.add_child(poly(_circle_points(24.0, 12), Color("#E67218")))
	for a in [PI / 2.0, PI * 7.0 / 6.0, PI * 11.0 / 6.0]:
		root.add_child(line(Vector2.ZERO, Vector2(cos(a), sin(a)) * 38.0, INK, 8.0))
		root.add_child(line(Vector2.ZERO, Vector2(cos(a), sin(a)) * 36.0, STEEL_DARK, 4.0))
	root.add_child(disc(26.0, STEEL_DARK, 4.5))
	root.add_child(poly(_circle_points(18.0, 16), BRASS_MID))
	root.add_child(poly(_circle_points(14.0, 14), BRASS_LIGHT))
	var b1 := disc(4.5, GOLD_HI, 1.5)
	b1.position = Vector2(-5, -4)
	root.add_child(b1)
	var b2 := disc(3.5, GOLD_HI, 1.5)
	b2.position = Vector2(6, 4)
	root.add_child(b2)
	return root

# ==================== TURRETS ====================
static func make_crossbow() -> Node2D:
	var root := Node2D.new()
	root.add_child(disc(36.0, STEEL_DARK, 4.5))
	root.add_child(poly(_circle_points(32.0, 24), STEEL_MID))
	root.add_child(ring(27.0, INK, 5.0))
	root.add_child(ring(27.0, STEEL_DARK, 2.5))
	for a in [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0]:
		var rad := deg_to_rad(a)
		root.add_child(dot(Vector2(cos(rad), sin(rad)) * 27.0, 2.5, STEEL_HI))
	root.add_child(disc(20.0, BRASS_MID, 3.0))
	root.add_child(poly(_circle_points(16.0, 16), BRASS_LIGHT))
	root.add_child(dot(Vector2.ZERO, 6.0, DARK_INK))

	var asm := Node2D.new()
	asm.name = "Assembly"
	var stock := PackedVector2Array([
		Vector2(-24, -6), Vector2(28, -6), Vector2(28, 6), Vector2(-24, 6)
	])
	asm.add_child(poly(stock, WOOD_DARK))
	asm.add_child(outline_poly(stock, 3.0))
	asm.add_child(line(Vector2(-20, 0), Vector2(24, 0), WOOD_LIGHT, 1.5))
	asm.add_child(line(Vector2(-22, -12), Vector2(-22, 12), INK, 5.0))
	asm.add_child(line(Vector2(-22, -12), Vector2(-22, 12), BRASS_MID, 2.5))
	var bow_pts := _quad(Vector2(6, -32), Vector2(24, 0), Vector2(6, 32))
	var bow_line := Line2D.new()
	bow_line.points = bow_pts
	bow_line.default_color = INK
	bow_line.width = 8.0
	bow_line.begin_cap_mode = Line2D.LINE_CAP_ROUND
	bow_line.end_cap_mode = Line2D.LINE_CAP_ROUND
	asm.add_child(bow_line)
	var bow_core := Line2D.new()
	bow_core.points = bow_pts
	bow_core.default_color = STEEL_MID
	bow_core.width = 4.5
	asm.add_child(bow_core)
	asm.add_child(line(Vector2(6, -32), Vector2(-4, 0), INK, 3.5))
	asm.add_child(line(Vector2(-4, 0), Vector2(6, 32), INK, 3.5))
	asm.add_child(line(Vector2(6, -32), Vector2(-4, 0), Color("#FAF0D8"), 1.5))
	asm.add_child(line(Vector2(-4, 0), Vector2(6, 32), Color("#FAF0D8"), 1.5))
	asm.add_child(line(Vector2(-4, 0), Vector2(32, 0), INK, 5.0))
	asm.add_child(line(Vector2(-4, 0), Vector2(30, 0), WOOD_LIGHT, 2.5))
	var tip := PackedVector2Array([Vector2(38, 0), Vector2(28, -4), Vector2(28, 4)])
	asm.add_child(poly(tip, STEEL_HI))
	asm.add_child(outline_poly(tip, 2.0))
	asm.add_child(poly(PackedVector2Array([Vector2(-2, 0), Vector2(4, -3), Vector2(8, 0)]), BLOOD_MID))
	asm.add_child(poly(PackedVector2Array([Vector2(-2, 0), Vector2(4, 3), Vector2(8, 0)]), BLOOD_MID))
	asm.add_child(disc(6.0, BRASS_MID, 2.0))

	root.add_child(asm)
	return root

static func make_ballista() -> Node2D:
	var root := Node2D.new()
	var carriage := PackedVector2Array([
		Vector2(-52, -22), Vector2(52, -22), Vector2(52, 22), Vector2(-52, 22)
	])
	root.add_child(poly(carriage, WOOD_DARK))
	root.add_child(outline_poly(carriage, 4.5))
	for x in [-32.0, 0.0, 32.0]:
		root.add_child(line(Vector2(x, -20), Vector2(x, 20), INK, 2.5))
	for bx in [-44.0, 44.0]:
		for by in [-16.0, 16.0]:
			root.add_child(dot(Vector2(bx, by), 3.0, STEEL_HI))
	root.add_child(disc(18.0, BRASS_MID, 3.0))
	root.add_child(dot(Vector2.ZERO, 7.0, DARK_INK))

	var asm := Node2D.new()
	asm.name = "Assembly"
	var stock := PackedVector2Array([
		Vector2(-40, -8), Vector2(46, -8), Vector2(46, 8), Vector2(-40, 8)
	])
	asm.add_child(poly(stock, WOOD_DARK))
	asm.add_child(outline_poly(stock, 3.5))
	asm.add_child(line(Vector2(-36, 0), Vector2(42, 0), WOOD_LIGHT, 2.0))
	for y in [-20.0, 20.0]:
		var cyl := PackedVector2Array([
			Vector2(14, y - 8), Vector2(26, y - 8), Vector2(26, y + 8), Vector2(14, y + 8)
		])
		asm.add_child(poly(cyl, BRASS_MID))
		asm.add_child(outline_poly(cyl, 2.5))
		asm.add_child(dot(Vector2(20, y), 3.0, BRASS_LIGHT))
	var limb_n := _quad(Vector2(20, -20), Vector2(10, -48), Vector2(-12, -44))
	var ln := Line2D.new()
	ln.points = limb_n
	ln.default_color = INK
	ln.width = 10.0
	ln.begin_cap_mode = Line2D.LINE_CAP_ROUND
	ln.end_cap_mode = Line2D.LINE_CAP_ROUND
	asm.add_child(ln)
	var lnc := Line2D.new()
	lnc.points = limb_n
	lnc.default_color = WOOD_DARK
	lnc.width = 6.0
	asm.add_child(lnc)

	var limb_s := _quad(Vector2(20, 20), Vector2(10, 48), Vector2(-12, 44))
	var ls := Line2D.new()
	ls.points = limb_s
	ls.default_color = INK
	ls.width = 10.0
	ls.begin_cap_mode = Line2D.LINE_CAP_ROUND
	ls.end_cap_mode = Line2D.LINE_CAP_ROUND
	asm.add_child(ls)
	var lsc := Line2D.new()
	lsc.points = limb_s
	lsc.default_color = WOOD_DARK
	lsc.width = 6.0
	asm.add_child(lsc)

	asm.add_child(line(Vector2(-12, -44), Vector2(-26, 0), INK, 5.0))
	asm.add_child(line(Vector2(-26, 0), Vector2(-12, 44), INK, 5.0))
	asm.add_child(line(Vector2(-12, -44), Vector2(-26, 0), Color("#F4EDE0"), 2.5))
	asm.add_child(line(Vector2(-26, 0), Vector2(-12, 44), Color("#F4EDE0"), 2.5))
	asm.add_child(line(Vector2(-26, 0), Vector2(50, 0), INK, 8.0))
	asm.add_child(line(Vector2(-26, 0), Vector2(48, 0), STEEL_MID, 4.5))
	var harpoon := PackedVector2Array([
		Vector2(62, 0), Vector2(46, -7), Vector2(50, 0), Vector2(46, 7)
	])
	asm.add_child(poly(harpoon, STEEL_HI))
	asm.add_child(outline_poly(harpoon, 2.5))

	root.add_child(asm)
	return root

static func make_archer() -> Node2D:
	return make_crossbow()
