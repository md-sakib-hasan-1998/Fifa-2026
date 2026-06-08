const fs = require("fs");
const path = require("path");

const htmlPath = "C:\\Users\\user\\OneDrive\\Documents\\Sakib\\Fifa 2026\\files (1)\\index.html";

function parseLocalTimes() {
  const content = fs.readFileSync(htmlPath, "utf8");

  // We can construct a script to evaluate KO and MS directly using Node.js's vm module or direct eval.
  // We'll define a fake environment to capture the variables.
  const sandbox = {
    Date,
    utcDate: (y, mo, d, h, mi) => new Date(Date.UTC(y, mo, d, h, mi)),
    KO: null,
    MS: null
  };

  // Extract the KO block and MS block
  const koMatch = content.match(/const KO = \{([\s\S]+?)\};/);
  const msMatch = content.match(/const MS = \{([\s\S]+?)\};/);

  if (!koMatch || !msMatch) {
    console.error("Failed to locate KO or MS blocks!");
    return;
  }

  // Evaluate them in context
  try {
    const evalStr = `
      const utcDate = ${(y, mo, d, h, mi) => new Date(Date.UTC(y, mo, d, h, mi))};
      const KO = {${koMatch[1]}};
      const MS = {${msMatch[1]}};
      ({ KO, MS })
    `;
    const result = eval(evalStr);
    const KO = result.KO;
    const MS = result.MS;

    console.log(`Parsed ${Object.keys(KO).length} kickoff times and ${Object.keys(MS).length} groups from index.html.`);

    const mappings = [];
    Object.keys(MS).forEach(group => {
      MS[group].forEach((match, index) => {
        const key = `${group}_${index}`;
        const kickoff = KO[key];
        if (kickoff) {
          const teams = match.t.split(" vs ").map(x => x.trim());
          mappings.push({
            group,
            index,
            home: teams[0],
            away: teams[1],
            venue: match.venue,
            kickoff: kickoff.toISOString()
          });
        }
      });
    });

    console.log(`Total mapped matches: ${mappings.length}`);
    console.log("Sample mappings:", mappings.slice(0, 5));

    // Write mapping to JSON file for backend use
    fs.writeFileSync(
      path.join(__dirname, "../fifa2026-backend/utils/matchTimes.json"),
      JSON.stringify(mappings, null, 2),
      "utf8"
    );
    console.log("Written matchTimes.json to backend utils!");

  } catch (err) {
    console.error("Error evaluating scripts from index.html:", err);
  }
}

parseLocalTimes();
