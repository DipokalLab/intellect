import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { globSync } from "glob";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

const PERSONS_DIR = path.join(projectRoot, "data", "persons");
const ACHIEVEMENTS_FILE = path.join(projectRoot, "data", "achievements.yml");
const OUTPUT_DIR = path.join(projectRoot, "public");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "graph-data.json");

function generateGraph() {
  console.log("--- Start: Graph Data Generation ---");

  try {
    const nodes = [];
    const edges = [];
    const persons = [];
    console.log("Step 1: Initializing arrays.");

    console.log(`Step 2: Reading person files from ${PERSONS_DIR}`);
    const personFiles = globSync(`${PERSONS_DIR}/*.yml`);
    console.log(`Found ${personFiles.length} person files.`);

    personFiles.forEach((file) => {
      const personData = yaml.load(fs.readFileSync(file, "utf8"));
      const personId = personData.scholar_id;

      if (!personId) {
        console.warn(`Skipping file ${file} due to missing 'scholar_id'.`);
        return;
      }

      persons.push({
        ...personData,
        id: personId,
        type: "person",
      });
      console.log(`  - Person entry created for: ${personId}`);
    });

    console.log(`Step 3: Reading achievements file from ${ACHIEVEMENTS_FILE}`);
    const achievementsData = yaml.load(
      fs.readFileSync(ACHIEVEMENTS_FILE, "utf8")
    );
    console.log(`Found ${achievementsData.length} achievements.`);

    achievementsData.forEach((achievement) => {
      const achievementId = achievement.key;
      const participants = achievement.participants || [];

      if (!achievementId) {
        console.warn(`Skipping an achievement due to missing 'key'.`);
        return;
      }

      const { participants: _, ...achievementProps } = achievement;

      nodes.push({
        ...achievementProps,
        id: achievementId,
        type: "achievement",
      });
      console.log(`  - Node (achievement) created for: ${achievementId}`);

      participants.forEach((participantId) => {
        edges.push({
          source: participantId,
          target: achievementId,
        });
        console.log(`  - Edge created: ${participantId} -> ${achievementId}`);
      });
    });

    console.log("Step 4: Assembling final JSON object.");
    const graphData = { nodes, edges, persons };

    console.log(
      `Final counts - Nodes (Achievements): ${nodes.length}, Edges: ${edges.length}, Persons: ${persons.length}`
    );

    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(graphData, null, 2));
    console.log(`\n✅ Success! Graph data saved to ${OUTPUT_FILE}`);
    console.log("--- End: Graph Data Generation ---");
  } catch (error) {
    console.error("\n❌ An error occurred during graph generation:");
    console.error(error);
  }
}

generateGraph();
