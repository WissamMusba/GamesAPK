const { save } = require('./art_utils');

// 1. Shambler: Decaying olive-green, outstretched claws
save('zombie-shambler.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <g stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="68" cy="72" rx="26" ry="24" fill="#151821" opacity="0.35"/>
    <g id="arm-north">
      <path d="M 72 52 Q 88 44 100 48" stroke="#222633" stroke-width="9" fill="none"/>
      <path d="M 72 52 Q 88 44 100 48" stroke="#3E5C33" stroke-width="6" fill="none"/>
      <polygon points="100,48 108,44 104,49 110,48 104,52 108,54 100,53" fill="#151821" stroke="#222633" stroke-width="1"/>
    </g>
    <g id="arm-south">
      <path d="M 72 88 Q 88 96 100 92" stroke="#222633" stroke-width="9" fill="none"/>
      <path d="M 72 88 Q 88 96 100 92" stroke="#3E5C33" stroke-width="6" fill="none"/>
      <polygon points="100,92 108,88 104,93 110,92 104,96 108,98 100,97" fill="#151821" stroke="#222633" stroke-width="1"/>
    </g>
    <circle cx="68" cy="70" r="22" fill="#3E5C33" stroke="#222633" stroke-width="4"/>
    <circle cx="66" cy="68" r="18" fill="#537845"/>
    <circle cx="74" cy="62" r="4.5" fill="#2E4426"/>
    <circle cx="60" cy="76" r="3.5" fill="#2E4426"/>
    <line x1="60" y1="62" x2="74" y2="76" stroke="#781422" stroke-width="3"/>
    <line x1="62" y1="61" x2="66" y2="65" stroke="#222633" stroke-width="1.5"/>
    <line x1="68" y1="67" x2="72" y2="71" stroke="#222633" stroke-width="1.5"/>
  </g>
</svg>`);

// 2. Runner: Lean, pale, blood-red claws
save('zombie-runner.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <g stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="68" cy="72" rx="24" ry="20" fill="#151821" opacity="0.35"/>
    <g id="arm-north">
      <path d="M 70 54 Q 92 48 106 50" stroke="#222633" stroke-width="8" fill="none"/>
      <path d="M 70 54 Q 92 48 106 50" stroke="#456B38" stroke-width="5" fill="none"/>
      <polygon points="106,50 116,46 112,50 118,51 112,54 116,57 106,55" fill="#B81C2C" stroke="#222633" stroke-width="1.5"/>
      <circle cx="114" cy="51" r="1.5" fill="#F03044"/>
    </g>
    <g id="arm-south">
      <path d="M 70 86 Q 92 92 106 90" stroke="#222633" stroke-width="8" fill="none"/>
      <path d="M 70 86 Q 92 92 106 90" stroke="#456B38" stroke-width="5" fill="none"/>
      <polygon points="106,90 116,86 112,90 118,91 112,94 116,97 106,95" fill="#B81C2C" stroke="#222633" stroke-width="1.5"/>
      <circle cx="114" cy="91" r="1.5" fill="#F03044"/>
    </g>
    <ellipse cx="68" cy="70" rx="19" ry="16" fill="#456B38" stroke="#222633" stroke-width="4"/>
    <ellipse cx="66" cy="69" rx="15" ry="13" fill="#629450"/>
    <line x1="58" y1="64" x2="76" y2="72" stroke="#B81C2C" stroke-width="2.5"/>
    <circle cx="78" cy="65" r="2.5" fill="#B81C2C"/>
    <circle cx="62" cy="74" r="2" fill="#B81C2C"/>
  </g>
</svg>`);

// 3. Sapper: Armored helmet + explosive keg backpack
save('zombie-sapper.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <g stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="66" cy="72" rx="30" ry="26" fill="#151821" opacity="0.35"/>
    <rect x="32" y="52" width="26" height="36" rx="4" fill="#483420" stroke="#222633" stroke-width="3.5"/>
    <rect x="34" y="54" width="22" height="32" rx="2" fill="#6E4F32"/>
    <line x1="32" y1="58" x2="58" y2="58" stroke="#222633" stroke-width="3.5"/>
    <line x1="32" y1="58" x2="58" y2="58" stroke="#A2A8BC" stroke-width="2"/>
    <line x1="32" y1="82" x2="58" y2="82" stroke="#222633" stroke-width="3.5"/>
    <line x1="32" y1="82" x2="58" y2="82" stroke="#A2A8BC" stroke-width="2"/>
    <path d="M 32 64 Q 22 62 18 56" stroke="#C8B898" stroke-width="2.5" fill="none"/>
    <circle cx="17" cy="55" r="4" fill="#F0C446" stroke="#222633" stroke-width="1.5"/>
    <circle cx="17" cy="55" r="2" fill="#F03044"/>
    <ellipse cx="88" cy="54" rx="7" ry="6" fill="#36522C" stroke="#222633" stroke-width="2.5"/>
    <ellipse cx="88" cy="86" rx="7" ry="6" fill="#36522C" stroke="#222633" stroke-width="2.5"/>
    <circle cx="70" cy="70" r="22" fill="#36522C" stroke="#222633" stroke-width="4"/>
    <circle cx="72" cy="70" r="18" fill="#444958" stroke="#222633" stroke-width="3.5"/>
    <circle cx="71" cy="69" r="15" fill="#72788C"/>
    <path d="M 72 52 Q 88 70 72 88" fill="none" stroke="#222633" stroke-width="4"/>
    <path d="M 72 53 Q 86 70 72 87" fill="none" stroke="#D8DEEE" stroke-width="2"/>
    <circle cx="76" cy="60" r="2" fill="#D8DEEE" stroke="#222633" stroke-width="1"/>
    <circle cx="82" cy="70" r="2.5" fill="#D8DEEE" stroke="#222633" stroke-width="1"/>
    <circle cx="76" cy="80" r="2" fill="#D8DEEE" stroke="#222633" stroke-width="1"/>
  </g>
</svg>`);

// 4. Scavenger: Ragged yellow/brown scavenger
save('zombie-scavenger.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <g stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="68" cy="72" rx="25" ry="22" fill="#151821" opacity="0.35"/>
    <ellipse cx="50" cy="80" rx="12" ry="9" fill="#483420" stroke="#222633" stroke-width="3"/>
    <path d="M 50 56 L 76 92" stroke="#222633" stroke-width="4.5"/>
    <path d="M 50 56 L 76 92" stroke="#483420" stroke-width="2.5"/>
    <ellipse cx="90" cy="54" rx="6.5" ry="5.5" fill="#4A5C2E" stroke="#222633" stroke-width="2.5"/>
    <ellipse cx="90" cy="86" rx="6.5" ry="5.5" fill="#4A5C2E" stroke="#222633" stroke-width="2.5"/>
    <circle cx="68" cy="70" r="20" fill="#4A5C2E" stroke="#222633" stroke-width="4"/>
    <path d="M 54 62 Q 58 52 70 54 Q 82 56 84 66 Q 86 78 78 84 Q 66 88 56 82 Q 50 74 54 62 Z" fill="#867446" stroke="#222633" stroke-width="3"/>
    <ellipse cx="68" cy="70" rx="10" ry="8" fill="#5C4E2C"/>
    <line x1="56" y1="80" x2="52" y2="86" stroke="#222633" stroke-width="2"/>
    <line x1="74" y1="84" x2="76" y2="90" stroke="#222633" stroke-width="2"/>
  </g>
</svg>`);

// 5. Brute: Massive hulking dark-green with rusted iron shoulder plate armor
save('zombie-brute.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <g stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="76" cy="84" rx="42" ry="38" fill="#151821" opacity="0.45"/>
    <circle cx="114" cy="50" r="12" fill="#2E4726" stroke="#222633" stroke-width="4"/>
    <circle cx="114" cy="110" r="12" fill="#2E4726" stroke="#222633" stroke-width="4"/>
    <circle cx="76" cy="80" r="34" fill="#2E4726" stroke="#222633" stroke-width="5"/>
    <circle cx="74" cy="78" r="29" fill="#415E36"/>
    <g id="rusted-pauldron">
      <path d="M 52 50 Q 76 34 100 48 Q 96 74 72 76 Q 50 72 52 50 Z" fill="#5E4636" stroke="#222633" stroke-width="4"/>
      <path d="M 56 52 Q 76 40 96 50" stroke="#444958" stroke-width="3" fill="none"/>
      <polygon points="66,42 70,28 76,42" fill="#A2A8BC" stroke="#222633" stroke-width="2"/>
      <polygon points="84,46 90,32 96,48" fill="#A2A8BC" stroke="#222633" stroke-width="2"/>
      <circle cx="62" cy="56" r="2.5" fill="#F0C446" stroke="#222633" stroke-width="1.5"/>
      <circle cx="80" cy="62" r="2.5" fill="#F0C446" stroke="#222633" stroke-width="1.5"/>
    </g>
    <path d="M 58 78 Q 74 88 92 82" stroke="#781422" stroke-width="4" fill="none"/>
    <line x1="64" y1="78" x2="66" y2="84" stroke="#222633" stroke-width="2"/>
    <line x1="76" y1="82" x2="78" y2="88" stroke="#222633" stroke-width="2"/>
    <line x1="86" y1="80" x2="88" y2="86" stroke="#222633" stroke-width="2"/>
  </g>
</svg>`);

// 6. Rotspitter: Bloated toxic-yellow pustules on back
save('zombie-rotspitter.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <g stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="68" cy="72" rx="28" ry="26" fill="#151821" opacity="0.38"/>
    <ellipse cx="94" cy="50" rx="7.5" ry="6.5" fill="#5A4A2A" stroke="#222633" stroke-width="3"/>
    <circle cx="96" cy="48" r="2.5" fill="#F0C446"/>
    <ellipse cx="94" cy="90" rx="7.5" ry="6.5" fill="#5A4A2A" stroke="#222633" stroke-width="3"/>
    <circle cx="96" cy="92" r="2.5" fill="#F0C446"/>
    <ellipse cx="68" cy="70" rx="24" ry="22" fill="#5A4A2A" stroke="#222633" stroke-width="4.5"/>
    <ellipse cx="66" cy="68" rx="20" ry="18" fill="#78663C"/>
    <circle cx="54" cy="62" r="9" fill="#F0C446" stroke="#222633" stroke-width="2.5"/>
    <circle cx="52" cy="60" r="4" fill="#FFE27A"/>
    <circle cx="60" cy="78" r="8" fill="#F0C446" stroke="#222633" stroke-width="2.5"/>
    <circle cx="58" cy="76" r="3.5" fill="#FFE27A"/>
    <circle cx="48" cy="74" r="7" fill="#C89524" stroke="#222633" stroke-width="2"/>
    <circle cx="46" cy="72" r="2.5" fill="#FFE27A"/>
    <circle cx="68" cy="60" r="6" fill="#F0C446" stroke="#222633" stroke-width="2"/>
    <circle cx="78" cy="70" r="3" fill="#88B82A" stroke="#222633" stroke-width="1"/>
  </g>
</svg>`);

// 7. Champion: Dark crimson warplate
save('zombie-champion.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <g stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="78" cy="84" rx="40" ry="36" fill="#151821" opacity="0.45"/>
    <g transform="translate(114, 52)">
      <circle cx="0" cy="0" r="10" fill="#444958" stroke="#222633" stroke-width="3"/>
      <polygon points="4,-4 14,0 4,4" fill="#D8DEEE" stroke="#222633" stroke-width="1.5"/>
    </g>
    <g transform="translate(114, 108)">
      <circle cx="0" cy="0" r="10" fill="#444958" stroke="#222633" stroke-width="3"/>
      <polygon points="4,-4 14,0 4,4" fill="#D8DEEE" stroke="#222633" stroke-width="1.5"/>
    </g>
    <circle cx="78" cy="80" r="30" fill="#781422" stroke="#222633" stroke-width="5"/>
    <circle cx="76" cy="78" r="26" fill="#8B2636"/>
    <polygon points="58,66 94,66 102,80 94,94 58,94 66,80" fill="#444958" stroke="#222633" stroke-width="3.5"/>
    <polygon points="62,69 90,69 97,80 90,91 62,91 69,80" fill="#484D5E"/>
    <line x1="62" y1="80" x2="96" y2="80" stroke="#F0C446" stroke-width="3"/>
    <line x1="78" y1="67" x2="78" y2="93" stroke="#F0C446" stroke-width="3"/>
    <circle cx="78" cy="80" r="3" fill="#FFE27A"/>
    <path d="M 58 54 Q 78 44 94 54 Q 86 66 64 66 Z" fill="#444958" stroke="#222633" stroke-width="3"/>
    <polygon points="72,46 76,32 82,46" fill="#D8DEEE" stroke="#222633" stroke-width="2"/>
    <polygon points="86,49 92,38 96,52" fill="#D8DEEE" stroke="#222633" stroke-width="2"/>
    <path d="M 58 106 Q 78 116 94 106 Q 86 94 64 94 Z" fill="#444958" stroke="#222633" stroke-width="3"/>
    <polygon points="72,114 76,128 82,114" fill="#D8DEEE" stroke="#222633" stroke-width="2"/>
    <polygon points="86,111 92,122 96,108" fill="#D8DEEE" stroke="#222633" stroke-width="2"/>
  </g>
</svg>`);

// 8. Warlord: Towering horned skull helm, black iron spikes, ragged crimson cape
save('zombie-warlord.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <g stroke-linejoin="round" stroke-linecap="round">
    <ellipse cx="88" cy="94" rx="54" ry="48" fill="#151821" opacity="0.55"/>
    <path d="M 52 50 C 24 54 18 70 26 84 C 16 94 20 114 36 122 C 48 128 62 126 70 120 L 60 90 L 70 60 Z" fill="#781422" stroke="#222633" stroke-width="4.5"/>
    <path d="M 50 56 C 28 62 24 74 30 84" stroke="#A82436" stroke-width="2" fill="none"/>
    <path d="M 28 92 C 24 104 30 114 40 120" stroke="#A82436" stroke-width="2" fill="none"/>
    <g transform="translate(136, 56)">
      <circle cx="0" cy="0" r="13" fill="#444958" stroke="#222633" stroke-width="3.5"/>
      <circle cx="0" cy="0" r="9" fill="#151821"/>
      <polygon points="6,-5 18,0 6,5" fill="#D8DEEE" stroke="#222633" stroke-width="2"/>
      <circle cx="-2" cy="0" r="2.5" fill="#F03044"/>
    </g>
    <g transform="translate(136, 124)">
      <circle cx="0" cy="0" r="13" fill="#444958" stroke="#222633" stroke-width="3.5"/>
      <circle cx="0" cy="0" r="9" fill="#151821"/>
      <polygon points="6,-5 18,0 6,5" fill="#D8DEEE" stroke="#222633" stroke-width="2"/>
      <circle cx="-2" cy="0" r="2.5" fill="#F03044"/>
    </g>
    <circle cx="88" cy="90" r="42" fill="#2E1C22" stroke="#222633" stroke-width="6"/>
    <circle cx="86" cy="88" r="37" fill="#45242C"/>
    <circle cx="88" cy="90" r="32" fill="#444958" stroke="#222633" stroke-width="4"/>
    <polygon points="56,76 42,70 54,82" fill="#151821" stroke="#222633" stroke-width="2"/>
    <polygon points="56,104 42,110 54,98" fill="#151821" stroke="#222633" stroke-width="2"/>
    <polygon points="68,60 60,46 76,56" fill="#151821" stroke="#222633" stroke-width="2"/>
    <polygon points="68,120 60,134 76,124" fill="#151821" stroke="#222633" stroke-width="2"/>
    <ellipse cx="94" cy="90" rx="20" ry="18" fill="#DDD6C6" stroke="#222633" stroke-width="3.5"/>
    <ellipse cx="102" cy="83" rx="4" ry="3.5" fill="#151821" stroke="#222633" stroke-width="1.5"/>
    <circle cx="102" cy="83" r="2" fill="#F03044"/>
    <ellipse cx="102" cy="97" rx="4" ry="3.5" fill="#151821" stroke="#222633" stroke-width="1.5"/>
    <circle cx="102" cy="97" r="2" fill="#F03044"/>
    <path d="M 88 74 Q 80 44 100 24 Q 94 36 94 56 Q 96 68 96 74 Z" fill="#DDD6C6" stroke="#222633" stroke-width="3.5"/>
    <line x1="88" y1="46" x2="94" y2="44" stroke="#151821" stroke-width="2"/>
    <line x1="90" y1="36" x2="96" y2="34" stroke="#151821" stroke-width="2"/>
    <path d="M 88 106 Q 80 136 100 156 Q 94 144 94 124 Q 96 112 96 106 Z" fill="#DDD6C6" stroke="#222633" stroke-width="3.5"/>
    <line x1="88" y1="134" x2="94" y2="136" stroke="#151821" stroke-width="2"/>
    <line x1="90" y1="144" x2="96" y2="146" stroke="#151821" stroke-width="2"/>
  </g>
</svg>`);
