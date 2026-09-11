const { save } = require('./art_utils');

// 1. PLAYER
save('player.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <g stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="80" cy="86" rx="34" ry="32" fill="#151821" opacity="0.35"/>
    <g id="hand-left">
      <ellipse cx="92" cy="52" rx="9" ry="8" fill="#483420" stroke="#222633" stroke-width="3"/>
      <path d="M 86 51 Q 92 48 98 51" stroke="#222633" stroke-width="2" fill="none"/>
      <circle cx="92" cy="51" r="1.5" fill="#F0C446"/>
    </g>
    <g id="axe">
      <line x1="68" y1="44" x2="132" y2="44" stroke="#222633" stroke-width="8"/>
      <line x1="70" y1="44" x2="130" y2="44" stroke="#6E4F32" stroke-width="5"/>
      <line x1="70" y1="43" x2="130" y2="43" stroke="#967048" stroke-width="1.5"/>
      <line x1="84" y1="44" x2="100" y2="44" stroke="#483420" stroke-width="6"/>
      <line x1="86" y1="42" x2="88" y2="46" stroke="#222633" stroke-width="1.5"/>
      <line x1="92" y1="42" x2="94" y2="46" stroke="#222633" stroke-width="1.5"/>
      <line x1="98" y1="42" x2="100" y2="46" stroke="#222633" stroke-width="1.5"/>
      <circle cx="68" cy="44" r="5" fill="#C89524" stroke="#222633" stroke-width="2.5"/>
      <circle cx="68" cy="44" r="2" fill="#F0C446"/>
      <rect x="114" y="39" width="10" height="10" rx="2" fill="#444958" stroke="#222633" stroke-width="2.5"/>
      <circle cx="119" cy="44" r="1.5" fill="#D8DEEE"/>
      <polygon points="115,41 106,44 115,47" fill="#72788C" stroke="#222633" stroke-width="2.5"/>
      <path d="M 122 40 L 138 34 Q 146 54 136 74 L 122 56 Q 124 47 122 40 Z" fill="#72788C" stroke="#222633" stroke-width="3"/>
      <path d="M 136 35 Q 144 54 134 72" stroke="#D8DEEE" stroke-width="2.5" fill="none"/>
      <path d="M 124 43 L 132 40 Q 136 53 129 63 L 124 53 Z" fill="#444958"/>
    </g>
    <g id="hand-right">
      <ellipse cx="110" cy="46" rx="9.5" ry="8.5" fill="#483420" stroke="#222633" stroke-width="3"/>
      <circle cx="110" cy="45" r="1.5" fill="#F0C446"/>
    </g>
    <circle cx="76" cy="88" r="28" fill="#483420" stroke="#222633" stroke-width="4"/>
    <circle cx="76" cy="88" r="25" fill="#543A28"/>
    <path d="M 54 74 L 98 102" stroke="#222633" stroke-width="6"/>
    <path d="M 54 74 L 98 102" stroke="#3A261A" stroke-width="3.5"/>
    <rect x="72" y="84" width="8" height="8" rx="1.5" fill="#C89524" stroke="#222633" stroke-width="2"/>
    <circle cx="76" cy="88" r="1.5" fill="#F0C446"/>
    <path d="M 52 82 Q 50 72 58 68 Q 64 64 72 65 Q 80 62 88 66 Q 96 70 98 78 Q 104 88 98 96 Q 96 102 88 104 Q 82 108 74 106 Q 64 106 58 98 Q 52 92 52 82 Z" fill="#B5A68E" stroke="#222633" stroke-width="3"/>
    <path d="M 58 72 Q 62 67 68 70" stroke="#DDD4C4" stroke-width="2" fill="none"/>
    <path d="M 74 67 Q 80 64 86 68" stroke="#DDD4C4" stroke-width="2" fill="none"/>
    <path d="M 90 70 Q 96 74 95 82" stroke="#DDD4C4" stroke-width="2" fill="none"/>
    <ellipse cx="76" cy="85" rx="12" ry="11" fill="#151821"/>
    <ellipse cx="76" cy="86" rx="8" ry="7" fill="#3D291C"/>
  </g>
</svg>`);

// 2. CROSSBOW TURRET BASE & HEAD
save('turret-crossbow-base.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <g stroke-linejoin="round" stroke-linecap="round">
    <circle cx="80" cy="80" r="54" fill="#444958" stroke="#222633" stroke-width="5"/>
    <circle cx="80" cy="80" r="50" fill="#72788C"/>
    <path d="M 80 26 L 80 40 M 80 120 L 80 134 M 26 80 L 40 80 M 120 80 L 134 80" stroke="#222633" stroke-width="3"/>
    <path d="M 42 42 L 52 52 M 118 42 L 108 52 M 42 118 L 52 108 M 118 118 L 108 108" stroke="#222633" stroke-width="3"/>
    <circle cx="80" cy="80" r="42" fill="none" stroke="#222633" stroke-width="6"/>
    <circle cx="80" cy="80" r="42" fill="none" stroke="#444958" stroke-width="3"/>
    <g fill="#A2A8BC" stroke="#222633" stroke-width="1.5">
      <circle cx="80" cy="38" r="3"/><circle cx="80" cy="122" r="3"/>
      <circle cx="38" cy="80" r="3"/><circle cx="122" cy="80" r="3"/>
      <circle cx="50" cy="50" r="3"/><circle cx="110" cy="50" r="3"/>
      <circle cx="50" cy="110" r="3"/><circle cx="110" cy="110" r="3"/>
    </g>
    <circle cx="80" cy="80" r="31" fill="#8A6216" stroke="#222633" stroke-width="3.5"/>
    <circle cx="80" cy="80" r="27" fill="#C89524"/>
    <g stroke="#222633" stroke-width="2" fill="#F0C446">
      <rect x="77" y="50" width="6" height="5" rx="1"/>
      <rect x="77" y="105" width="6" height="5" rx="1"/>
      <rect x="50" y="77" width="5" height="6" rx="1"/>
      <rect x="105" y="77" width="5" height="6" rx="1"/>
    </g>
    <circle cx="80" cy="80" r="16" fill="#151821" stroke="#222633" stroke-width="3"/>
    <circle cx="80" cy="80" r="10" fill="#444958"/>
    <circle cx="80" cy="80" r="5" fill="#F0C446" stroke="#222633" stroke-width="1.5"/>
  </g>
</svg>`);

save('turret-crossbow-head.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <g stroke-linejoin="round" stroke-linecap="round">
    <path d="M 126 73 L 138 73 Q 144 80 138 87 L 126 87" fill="none" stroke="#222633" stroke-width="4"/>
    <path d="M 126 74 L 137 74 Q 142 80 137 86 L 126 86" fill="none" stroke="#72788C" stroke-width="2"/>
    <rect x="40" y="73" width="86" height="14" rx="3" fill="#483420" stroke="#222633" stroke-width="3.5"/>
    <rect x="44" y="75" width="80" height="10" rx="1.5" fill="#6E4F32"/>
    <line x1="44" y1="77" x2="122" y2="77" stroke="#967048" stroke-width="1.5"/>
    <line x1="58" y1="72" x2="58" y2="88" stroke="#222633" stroke-width="4"/>
    <line x1="58" y1="73" x2="58" y2="87" stroke="#A2A8BC" stroke-width="2"/>
    <line x1="102" y1="72" x2="102" y2="88" stroke="#222633" stroke-width="4"/>
    <line x1="102" y1="73" x2="102" y2="87" stroke="#A2A8BC" stroke-width="2"/>
    <rect x="36" y="71" width="12" height="18" rx="2" fill="#444958" stroke="#222633" stroke-width="3"/>
    <line x1="42" y1="64" x2="42" y2="96" stroke="#222633" stroke-width="5"/>
    <line x1="42" y1="65" x2="42" y2="95" stroke="#C89524" stroke-width="2.5"/>
    <circle cx="42" cy="63" r="3.5" fill="#483420" stroke="#222633" stroke-width="1.5"/>
    <circle cx="42" cy="97" r="3.5" fill="#483420" stroke="#222633" stroke-width="1.5"/>
    <path d="M 88 32 Q 112 48 112 80 Q 112 112 88 128" fill="none" stroke="#222633" stroke-width="10"/>
    <path d="M 88 32 Q 112 48 112 80 Q 112 112 88 128" fill="none" stroke="#444958" stroke-width="6"/>
    <path d="M 89 33 Q 111 49 111 80 Q 111 111 89 127" fill="none" stroke="#A2A8BC" stroke-width="2"/>
    <circle cx="88" cy="32" r="5" fill="#D8DEEE" stroke="#222633" stroke-width="2"/>
    <circle cx="88" cy="128" r="5" fill="#D8DEEE" stroke="#222633" stroke-width="2"/>
    <polyline points="88,32 78,80 88,128" fill="none" stroke="#222633" stroke-width="4.5"/>
    <polyline points="88,32 78,80 88,128" fill="none" stroke="#FAF0D8" stroke-width="2"/>
    <circle cx="78" cy="80" r="5.5" fill="#C89524" stroke="#222633" stroke-width="2"/>
    <circle cx="78" cy="80" r="2.5" fill="#F0C446"/>
    <line x1="78" y1="80" x2="128" y2="80" stroke="#222633" stroke-width="6"/>
    <line x1="79" y1="80" x2="126" y2="80" stroke="#967048" stroke-width="3"/>
    <polygon points="80,80 88,75 94,80" fill="#B81C2C" stroke="#222633" stroke-width="1.5"/>
    <polygon points="80,80 88,85 94,80" fill="#B81C2C" stroke="#222633" stroke-width="1.5"/>
    <polygon points="124,76 138,80 124,84" fill="#D8DEEE" stroke="#222633" stroke-width="2"/>
  </g>
</svg>`);

// 3. BALLISTA TURRET BASE & HEAD
save('turret-ballista-base.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <g stroke-linejoin="round" stroke-linecap="round">
    <polygon points="26,38 134,38 144,48 144,112 134,122 26,122 16,112 16,48" fill="#483420" stroke="#222633" stroke-width="5"/>
    <polygon points="30,42 130,42 140,52 140,108 130,118 30,118 20,108 20,52" fill="#6E4F32"/>
    <line x1="20" y1="67" x2="140" y2="67" stroke="#222633" stroke-width="2.5"/>
    <line x1="20" y1="93" x2="140" y2="93" stroke="#222633" stroke-width="2.5"/>
    <polygon points="16,48 26,38 52,38 52,48 26,48 26,74 16,74" fill="#444958" stroke="#222633" stroke-width="2.5"/>
    <circle cx="34" cy="43" r="2.5" fill="#D8DEEE" stroke="#222633" stroke-width="1"/>
    <polygon points="144,48 134,38 108,38 108,48 134,48 134,74 144,74" fill="#444958" stroke="#222633" stroke-width="2.5"/>
    <circle cx="126" cy="43" r="2.5" fill="#D8DEEE" stroke="#222633" stroke-width="1"/>
    <polygon points="16,112 26,122 52,122 52,112 26,112 26,86 16,86" fill="#444958" stroke="#222633" stroke-width="2.5"/>
    <circle cx="34" cy="117" r="2.5" fill="#D8DEEE" stroke="#222633" stroke-width="1"/>
    <polygon points="144,112 134,122 108,122 108,112 134,112 134,86 144,86" fill="#444958" stroke="#222633" stroke-width="2.5"/>
    <circle cx="126" cy="117" r="2.5" fill="#D8DEEE" stroke="#222633" stroke-width="1"/>
    <circle cx="80" cy="80" r="32" fill="#444958" stroke="#222633" stroke-width="4"/>
    <circle cx="80" cy="80" r="26" fill="#C89524"/>
    <circle cx="80" cy="80" r="18" fill="#151821" stroke="#222633" stroke-width="3"/>
    <circle cx="80" cy="80" r="8" fill="#D8DEEE" stroke="#222633" stroke-width="2"/>
  </g>
</svg>`);

save('turret-ballista-head.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <g stroke-linejoin="round" stroke-linecap="round">
    <rect x="24" y="80" width="118" height="20" rx="3" fill="#483420" stroke="#222633" stroke-width="4"/>
    <rect x="28" y="83" width="110" height="14" rx="2" fill="#6E4F32"/>
    <line x1="28" y1="85" x2="136" y2="85" stroke="#967048" stroke-width="1.5"/>
    <rect x="20" y="78" width="14" height="24" rx="2" fill="#444958" stroke="#222633" stroke-width="3"/>
    <line x1="27" y1="64" x2="27" y2="116" stroke="#222633" stroke-width="6"/>
    <line x1="27" y1="65" x2="27" y2="115" stroke="#72788C" stroke-width="3"/>
    <circle cx="27" cy="62" r="5" fill="#C89524" stroke="#222633" stroke-width="2"/>
    <circle cx="27" cy="118" r="5" fill="#C89524" stroke="#222633" stroke-width="2"/>
    <rect x="110" y="52" width="16" height="76" rx="3" fill="#483420" stroke="#222633" stroke-width="3.5"/>
    <rect x="108" y="44" width="20" height="26" rx="4" fill="#8A6216" stroke="#222633" stroke-width="3"/>
    <circle cx="118" cy="57" r="4" fill="#F0C446" stroke="#222633" stroke-width="1.5"/>
    <rect x="108" y="110" width="20" height="26" rx="4" fill="#8A6216" stroke="#222633" stroke-width="3"/>
    <circle cx="118" cy="123" r="4" fill="#F0C446" stroke="#222633" stroke-width="1.5"/>
    <path d="M 118 57 Q 106 32 76 20" fill="none" stroke="#222633" stroke-width="12"/>
    <path d="M 118 57 Q 106 32 76 20" fill="none" stroke="#483420" stroke-width="7"/>
    <circle cx="76" cy="20" r="7" fill="#444958" stroke="#222633" stroke-width="2.5"/>
    <circle cx="76" cy="20" r="3" fill="#F0C446"/>
    <path d="M 118 123 Q 106 148 76 160" fill="none" stroke="#222633" stroke-width="12"/>
    <path d="M 118 123 Q 106 148 76 160" fill="none" stroke="#483420" stroke-width="7"/>
    <circle cx="76" cy="160" r="7" fill="#444958" stroke="#222633" stroke-width="2.5"/>
    <circle cx="76" cy="160" r="3" fill="#F0C446"/>
    <polyline points="76,20 62,90 76,160" fill="none" stroke="#222633" stroke-width="6"/>
    <polyline points="76,20 62,90 76,160" fill="none" stroke="#F4EDE0" stroke-width="3"/>
    <line x1="62" y1="90" x2="148" y2="90" stroke="#222633" stroke-width="8"/>
    <line x1="64" y1="90" x2="146" y2="90" stroke="#72788C" stroke-width="4.5"/>
    <polygon points="144,83 170,90 144,97 148,90" fill="#D8DEEE" stroke="#222633" stroke-width="3"/>
    <polygon points="148,84 136,76 142,88" fill="#444958" stroke="#222633" stroke-width="2"/>
    <polygon points="148,96 136,104 142,92" fill="#444958" stroke="#222633" stroke-width="2"/>
  </g>
</svg>`);
