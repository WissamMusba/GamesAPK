console.log("=== Regenerating all Deadwood Siege Art Assets ===");
require('./gen_player_turrets.js');
require('./gen_structures.js');
require('./gen_resources.js');
require('./gen_zombies.js');
console.log("=== All SVGs regenerated successfully ===");
