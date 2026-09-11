shader_type canvas_item;

uniform float vignette_intensity : hint_range(0.0, 1.0) = 0.35;
uniform float vignette_opacity : hint_range(0.0, 1.0) = 0.5;
uniform vec4 vignette_color : source_color = vec4(0.02, 0.04, 0.03, 1.0);

// Low-HP Heartbeat Red Vignette
uniform float low_hp_pulse : hint_range(0.0, 1.0) = 0.0;
uniform vec4 low_hp_color : source_color = vec4(0.85, 0.08, 0.12, 1.0);

void fragment() {
	vec2 uv = UV;
	vec2 center = vec2(0.5, 0.5);
	float dist = distance(uv, center);
	
	// Smooth circular edge falloff
	float vig = smoothstep(0.38, 0.88, dist * (1.0 + vignette_intensity * 0.35));
	
	// Base edge darkness
	vec4 col = vignette_color;
	col.a = vig * vignette_opacity;
	
	// Low-HP pulsing red overlay
	if (low_hp_pulse > 0.001) {
		float red_vig = smoothstep(0.28, 0.82, dist);
		vec4 red_col = low_hp_color;
		red_col.a = red_vig * low_hp_pulse * 0.85;
		col = mix(col, red_col, red_col.a);
	}
	
	COLOR = col;
}
