# DEADWOOD SIEGE — 2D ASSET GENERATION PROMPTS

This guide provides exact prompts to generate game assets for Midjourney, DALL-E 3, Stable Diffusion, or Leonardo.

> **CRITICAL RULES FOR ALL PROMPTS:**
> 1. **Perspective:** Always specify `strict top-down bird's-eye view, 90-degree overhead angle`. (Avoid isometric, tilt, or 3/4 angle).
> 2. **Background:** Always request `isolated on solid pure bright green #00FF00 background, zero shadows on background` for instant 1-click transparency removal.
> 3. **Facing Direction:** Weapons and rotating turrets MUST point **straight right (East / 0 degrees)** so rotation math in Godot/Canvas aligns natively without offset bugs.

---

## 1. The Rotating Turrets (Crossbow & Ballista)

To make turrets rotate and shoot realistically in-game, they must be split into **2 layers**:
- **Layer 1: Base Platform** (Stationary on ground)
- **Layer 2: Turret Head** (Rotates 360° to aim at zombies, plays recoil animation)

### 1.1 Heavy Crossbow Turret
*In v7, this is your primary rapid defensive weapon.*

#### Part A: Crossbow Base (Stationary)
```text
Strict top-down 90-degree overhead view of a circular stone and dark timber turret mount foundation for a medieval defense tower, circular stone platform with iron rivets and brass central swivel bearing, dark fantasy game asset, clean bold dark outlines, hand-painted texture, high contrast, isolated on solid pure neon green #00FF00 background, no shadows on background --no isometric, perspective, tilt
```

#### Part B: Crossbow Swivel Head (Rotating)
```text
Strict top-down 90-degree overhead view of a heavy medieval siege crossbow mechanism, pointing horizontally directly to the right (0 degrees East), reinforced aged dark oak stock, cold iron bow limbs, taut bowstring with loaded iron-tipped quarrel bolt resting on brass rail, stylized dark fantasy game sprite, clean dark outlines, sharp silhouette, isolated on solid pure neon green #00FF00 background --no isometric, tilt, angled, human, hands
```

---

### 1.2 Siege Ballista
*In v7, unlocked at Level 6, fires massive armor-piercing siege bolts.*

#### Part A: Ballista Chassis (Stationary)
```text
Strict top-down 90-degree overhead view of a heavy rectangular siege ballista carriage foundation, reinforced dark oak timber frame with iron corner plates and heavy anchoring spikes, central rotating gear turntable, gritty dark fantasy game asset, crisp outlines, isolated on solid pure neon green #00FF00 background --no isometric, tilt
```

#### Part B: Ballista Siege Head (Rotating)
```text
Strict top-down 90-degree overhead view of a massive medieval torsion ballista firing head, pointing horizontally directly to the right (0 degrees East), dual curved torsion arms wound with thick cord, heavy steel winch mechanism, long central flight groove loaded with a heavy steel-headed harpoon bolt, dark fantasy aesthetic, bold edges, isolated on solid pure neon green #00FF00 background --no isometric, tilt, base
```

---

### 1.3 Tar Cauldron (Splash Defense)
*Fires hot bubbling pitch in a splash radius.*

#### Part A: Cauldron Tripod Hearth (Stationary)
```text
Strict top-down 90-degree overhead view of a heavy iron tripod fire pit with glowing hot orange embers and charcoal beneath, dark fantasy defensive trap, isolated on solid pure neon green #00FF00 background --no isometric, tilt
```

#### Part B: Bubbling Pitch Pot (Top)
```text
Strict top-down 90-degree overhead view of a round cast iron cauldron filled with boiling black tar and glowing molten yellow sparks popping on the surface, thick iron rim, isolated on solid pure neon green #00FF00 background --no isometric, tilt
```

---

## 2. The Hero / Player

*The player wears a rugged leather/fur survival coat and swings a heavy woodsman's axe.*

### 2.1 Player Body (Top-Down)
```text
Strict top-down 90-degree overhead view of a rugged dark fantasy medieval woodsman survivor character, circular bird's-eye silhouette showing weathered leather tunic with fur-lined shoulders, brass belt buckle, dark hood/hair, facing directly right (East), stylized clean game sprite with distinct readable silhouette and dark outlines, isolated on solid pure neon green #00FF00 background --no isometric, side view, legs
```

### 2.2 Hero Weapons & Hands (Swing Layer)
```text
Strict top-down 90-degree overhead view of a heavy double-bitted bearded woodcutting battle axe with worn hickory handle and steel blade highlights, held by two leather-gloved hands, pointing horizontally to the right, clean dark fantasy weapon sprite, isolated on solid pure neon green #00FF00 background --no body, isometric
```

---

## 3. Defense Structures (Walls, Doors, Spikes, Farms)

### 3.1 Wooden Palisade Wall (Tier 1)
```text
Strict top-down 90-degree overhead view of a horizontal section of defensive wooden palisade wall, sharpened dark pine logs lashed tightly with rope and reinforced with iron braces, gritty medieval survival style, seamless tileable horizontally, isolated on solid pure neon green #00FF00 background --no isometric, perspective
```

### 3.2 Stone Fortress Wall (Tier 2 / 3)
```text
Strict top-down 90-degree overhead view of a horizontal defensive fortress wall segment, weathered dark grey granite ashlar stone blocks with mortar cracks and iron reinforcing bands, clean top-down edges, isolated on solid pure neon green #00FF00 background --no isometric
```

### 3.3 Heavy Wood Gate / Door
```text
Strict top-down 90-degree overhead view of a reinforced medieval double gate door, thick banded timber planks with massive black iron hinges and latch bolt, isolated on solid pure neon green #00FF00 background --no isometric
```

### 3.4 Ground Spikes Trap
```text
Strict top-down 90-degree overhead view of a defensive pit trap filled with sharpened upward-pointing fire-hardened wooden stakes and iron spikes, stained with dark splatter, isolated on solid pure neon green #00FF00 background --no isometric
```

### 3.5 Survival Farm Plot
```text
Strict top-down 90-degree overhead view of a tilled dark soil farm bed with rows of lush medicinal herb crops and glowing red berries, framed by rustic split-log borders, isolated on solid pure neon green #00FF00 background --no isometric
```

### 3.6 Tar Pit Hazard
```text
Strict top-down 90-degree overhead view of a viscous black sludge tar pool hazard on muddy ground, bubbling ripples and floating debris, sticky uneven edges, isolated on solid pure neon green #00FF00 background --no isometric
```

---

## 4. The Undead Horde (Enemies)

*Each zombie must have an unmistakable shape and color palette to provide instant visual readability.*

### 4.1 Shambler (Standard Melee — Rotten Sickly Olive Green)
```text
Strict top-down 90-degree overhead view of a decaying shambler zombie creature, hunched decomposing shoulders, torn burlap rags, rotten greenish-grey skin, outstretched clawed arms, facing right, dark fantasy top-down sprite, strong silhouette, isolated on solid pure neon green #00FF00 background --no isometric
```

### 4.2 Runner (Fast Swarmer — Gaunt Pale Blood-Red Accents)
```text
Strict top-down 90-degree overhead view of a lean ferocious feral ghoul runner, emaciated twisted spine, sharp claws, spattered with blood, aggressive lunge posture facing right, bright red glowing eye hints, isolated on solid pure neon green #00FF00 background --no isometric
```

### 4.3 Sapper (Wall Destroyer — Chunky Armored Sappers with Bombs)
```text
Strict top-down 90-degree overhead view of a hunched dwarf-like armored demolition zombie carrying a volatile spiked iron explosive keg on its back, reinforced iron helmet, facing right, isolated on solid pure neon green #00FF00 background --no isometric
```

### 4.4 Brute (Heavy Tank — Massive Silhouette, Rusted Iron Plate)
```text
Strict top-down 90-degree overhead view of a massive hulking mutant plague brute zombie, twice the size of normal units, slab-like shoulders clad in rusted scrap iron armor plates, brutal spiked knuckles, facing right, isolated on solid pure neon green #00FF00 background --no isometric
```

### 4.5 Rotspitter (Ranged Acid Shooter — Bloated, Toxic Yellow/Green)
```text
Strict top-down 90-degree overhead view of a bloated putrid undead creature with pulsating acid sac nodules on its back, glowing toxic yellow-green pustules, distended jaw aiming right, isolated on solid pure neon green #00FF00 background --no isometric
```

### 4.6 The Warlord (Boss — Horned Skull Crown, Black Iron Plate, Cloak)
```text
Strict top-down 90-degree overhead view of a towering undead warlord boss, massive black iron spiked plate armor with a tattered crimson cape, horned skull helm, dark necrotic aura radiating from runes, facing right, imposing boss silhouette, isolated on solid pure neon green #00FF00 background --no isometric
```

---

## 5. Environment & Resource Nodes

### 5.1 Deadwood Ancient Pine Tree (Wood Node)
```text
Strict top-down 90-degree overhead view of a gnarled deadwood pine tree canopy, twisted dark boughs, sparse deep olive needles, textured weathered bark, casting a subtle round contact shadow, isolated on solid pure neon green #00FF00 background --no isometric
```

### 5.2 Granite Boulder (Stone Node)
```text
Strict top-down 90-degree overhead view of a rugged jagged granite boulder cluster with surface cracks and subtle lichen moss patches, natural stone shape, isolated on solid pure neon green #00FF00 background --no isometric
```

### 5.3 Wild Berry Thicket (Food Node)
```text
Strict top-down 90-degree overhead view of a wild thorny bush cluster bearing vibrant crimson red wild berries, lush green foliage with thorny brambles, isolated on solid pure neon green #00FF00 background --no isometric
```

### 5.4 Ground Texture (Seamless Tile)
```text
Seamless tileable texture of dark fantasy forest soil, top-down view, dark damp earth, scattered dry dead pine needles, tiny moss patches, subtle cracked dry dirt, muted earthy palette #2C3529 and #1B221A, subtle low contrast texture suitable for background terrain --no seams, borders, props
```

---

## 6. How to Edit & Prep the Images for Godot/Canvas

When you generate and save the images:
1. **Remove Background:** Use Photoshop, Photopea (free web), or `rembg` to remove the `#00FF00` green background to make transparent PNGs.
2. **Crop & Center Pivot:** 
   - Crop tightly to the bounding box.
   - For rotating items (Crossbow Top, Ballista Top), ensure the pivot point (the swivel axle) is centered in the canvas.
3. **Save as PNG:** Save as 32-bit PNG with alpha transparency at `128x128` or `256x256`.
