const Player = require("../models/Player");

// Common first and last names for different regions/nationalities
const NAMES_BY_REGION = {
  spanish: {
    first: ["Diego", "Lionel", "Angel", "Gonzalo", "Rodrigo", "Nicolas", "Emiliano", "Cristian", "Julian", "Lautaro", "Alejandro", "Carlos", "Javier", "Luis", "Francisco", "Jose", "Santiago", "Mateo", "Enzo", "Alexis"],
    last: ["Rodriguez", "Fernandez", "Gonzalez", "Gomez", "Perez", "Martinez", "Sanchez", "Alvarez", "Romero", "Otamendi", "Tagliafico", "Mac Allister", "Molina", "De Paul", "Montiel", "Acuna", "Paredes", "Dybala"]
  },
  french: {
    first: ["Olivier", "Antoine", "Hugo", "Lucas", "Paul", "N'Golo", "Adrien", "Raphael", "Presnel", "Kingsley", "Pierre", "Jean", "Michel", "Laurent", "Theo", "Benjamin", "Jules", "William", "Marcus", "Dayot"],
    last: ["Griezmann", "Lloris", "Hernandez", "Varane", "Pavard", "Rabiot", "Coman", "Giroud", "Dembele", "Mbappe", "Kante", "Pogba", "Tchouameni", "Upamecano", "Konate", "Saliba", "Kounde", "Thuram"]
  },
  english: {
    first: ["John", "James", "Jack", "Harry", "Declan", "Mason", "Jordan", "Marcus", "Kyle", "Luke", "Trent", "Connor", "Liam", "Tyler", "Christian", "Weston", "Aaron", "Kieran", "Bukayo", "Phil"],
    last: ["Henderson", "Stones", "Shaw", "Rashford", "Sterling", "Kane", "Bellingham", "Walker", "Pickford", "Mount", "Rice", "Foden", "Pulisic", "Adams", "McKennie", "Dest", "Robinson", "Ream", "Saka", "Trippier"]
  },
  portuguese: {
    first: ["Cristiano", "Bruno", "Bernardo", "Joao", "Ruben", "Pepe", "Danilo", "Vitinha", "Diogo", "Rafael", "Goncalo", "Vinicius", "Gabriel", "Neymar", "Lucas", "Rodrygo", "Eder", "Alisson", "Marquinhos", "Casemiro"],
    last: ["Silva", "Santos", "Ferreira", "Sousa", "Costa", "Pereira", "Gomes", "Ribeiro", "Pinto", "Carvalho", "Junior", "Marquinhos", "Casemiro", "Dias", "Neves", "Dalot", "Cancelo", "Mendes", "Félix", "Jota"]
  },
  german: {
    first: ["Thomas", "Manuel", "Joshua", "Leon", "Serge", "Ilkay", "Leroy", "Toni", "Kai", "Marc", "David", "Marcel", "Florian", "Jamal", "Nico", "Antonio", "Robin", "Jonas", "Niklas", "Timo"],
    last: ["Muller", "Neuer", "Kimmich", "Goretzka", "Gnabry", "Gundogan", "Sane", "Kroos", "Havertz", "Ter Stegen", "Alaba", "Sabitzer", "Wirtz", "Schlotterbeck", "Rudiger", "Gosens", "Hofmann", "Sule", "Werner", "Musiala"]
  },
  italian: {
    first: ["Gianluigi", "Nicolo", "Federico", "Ciro", "Marco", "Lorenzo", "Giorgio", "Leonardo", "Alessandro", "Davide", "Francesco", "Gianluca", "Domenico", "Manuel", "Giacomo"],
    last: ["Barella", "Chiesa", "Immobile", "Verratti", "Insigne", "Chiellini", "Bonucci", "Bastoni", "Donnarumma", "Locatelli", "Scamacca", "Berardi", "Pellegrini", "Acerbi", "Spinazzola"]
  },
  japanese: {
    first: ["Hiroki", "Maya", "Yuto", "Wataru", "Ritsu", "Daichi", "Junya", "Kaoru", "Takumi", "Kyogo", "Takefusa", "Koukit", "Ao", "Shogo", "Ko"],
    last: ["Yoshida", "Nagatomo", "Endo", "Doan", "Kamada", "Ito", "Mitoma", "Minamino", "Furuhashi", "Kubo", "Itakura", "Tanaka", "Taniguchi", "Sakai", "Tomiyasu"]
  },
  korean: {
    first: ["Heung-min", "Min-jae", "Kang-in", "Jae-sung", "Hee-chan", "Gyu-sung", "In-beom", "Young-gwon", "Ui-jo", "Chang-hoon", "Woo-young"],
    last: ["Son", "Kim", "Lee", "Hwang", "Cho", "Park", "Jung", "Song", "Kwon", "Na", "Paik"]
  },
  arabic: {
    first: ["Mohamed", "Achraf", "Hakim", "Youssef", "Sofyan", "Yassine", "Nayef", "Selim", "Salem", "Yasir", "Salman", "Mostafa", "Omar", "Trezeguet", "Elneny", "Mahmoud"],
    last: ["Salah", "Hakimi", "Ziyech", "En-Nesyri", "Amrabat", "Bounou", "Aguerd", "Al-Dawsari", "Al-Shahrani", "Al-Faraj", "Mostafa", "Marmoush", "Trezeguet", "Elneny", "Hegazi"]
  },
  fallback: {
    first: ["Martin", "Erling", "Viktor", "Arda", "Hakan", "Edin", "Miralem", "Tomas", "Patrik", "Kenan", "Sander", "Alexander", "Stefan", "Luka", "Mateo", "Ivan", "Domagoj", "Andrej"],
    last: ["Haaland", "Odegaard", "Gyokeres", "Guler", "Calhanoglu", "Dzeko", "Pjanic", "Soucek", "Schick", "Yilmaz", "Berge", "Isak", "Savic", "Modric", "Kovacic", "Perisic", "Vida", "Kramaric"]
  }
};

// Map team nationalities/countries to a name region
const getRegionForCountry = (country) => {
  if (!country) return "fallback";
  const c = country.toLowerCase();

  if (c.includes("argentina") || c.includes("spain") || c.includes("mexico") || c.includes("colombia") || 
      c.includes("uruguay") || c.includes("chile") || c.includes("ecuador") || c.includes("paraguay") ||
      c.includes("panama") || c.includes("costa rica") || c.includes("haiti")) {
    return "spanish";
  }
  if (c.includes("france") || c.includes("belgium") || c.includes("switzerland") || c.includes("ivory coast") || 
      c.includes("senegal") || c.includes("algeria") || c.includes("cameroon") || c.includes("congo") ||
      c.includes("tunisia") || c.includes("morocco") || c.includes("mali") || c.includes("guinea")) {
    return "french";
  }
  if (c.includes("england") || c.includes("united states") || c.includes("usa") || c.includes("canada") || 
      c.includes("australia") || c.includes("new zealand") || c.includes("scotland") || c.includes("wales") || 
      c.includes("ireland") || c.includes("jamaica") || c.includes("ghana") || c.includes("nigeria") ||
      c.includes("south africa")) {
    return "english";
  }
  if (c.includes("portugal") || c.includes("brazil") || c.includes("angola") || c.includes("cape verde") || c.includes("mozambique")) {
    return "portuguese";
  }
  if (c.includes("germany") || c.includes("austria") || c.includes("switzerland")) {
    return "german";
  }
  if (c.includes("italy")) {
    return "italian";
  }
  if (c.includes("japan")) {
    return "japanese";
  }
  if (c.includes("south korea") || c.includes("korea")) {
    return "korean";
  }
  if (c.includes("saudi") || c.includes("egypt") || c.includes("qatar") || c.includes("jordan") || c.includes("iraq") || c.includes("emirates") || c.includes("oman")) {
    return "arabic";
  }
  return "fallback";
};

// Generate a random name for a country
const generateRandomName = (country) => {
  const regionKey = getRegionForCountry(country);
  const region = NAMES_BY_REGION[regionKey] || NAMES_BY_REGION.fallback;
  const first = region.first[Math.floor(Math.random() * region.first.length)];
  const last = region.last[Math.floor(Math.random() * region.last.length)];
  return `${first} ${last}`;
};

// Formations list
const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2"];

// Enrich match details (Lineups, Subs, Goals, Cards, Shootout)
const enrichMatch = async (match) => {
  let modified = false;

  // 1. Generate Lineups & Formations if missing
  const hasHomeLineup = match.lineups?.home?.startingXI?.length > 0;
  const hasAwayLineup = match.lineups?.away?.startingXI?.length > 0;

  if (!hasHomeLineup || !hasAwayLineup) {
    // Fetch seeded players for home and away
    const [homePlayers, awayPlayers] = await Promise.all([
      Player.find({ teamName: match.homeTeam.name }),
      Player.find({ teamName: match.awayTeam.name })
    ]);

    const buildLineup = (teamName, dbPlayers) => {
      const formation = FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
      
      // Parse counts of DF, MF, FW from formation
      // e.g. "4-3-3" -> DF:4, MF:3, FW:3
      const parts = formation.split("-").map(Number);
      let dfCount = parts[0];
      let mfCount = parts[1];
      let fwCount = parts[2];
      let fwCount2 = parts[3] || 0;
      if (fwCount2 > 0) {
        // e.g. "4-2-3-1" -> DF:4, MF: 2+3=5, FW:1
        mfCount = parts[1] + parts[2];
        fwCount = parts[3];
      }

      // Group DB players by position
      const gks = dbPlayers.filter(p => p.position === "Goalkeeper");
      const dfs = dbPlayers.filter(p => p.position === "Defender");
      const mfs = dbPlayers.filter(p => p.position === "Midfielder");
      const fws = dbPlayers.filter(p => p.position === "Forward");

      const startingXI = [];
      const bench = [];

      // Helper to choose or generate a player
      const usedNumbers = new Set();
      const getUniqueNumber = (preferred) => {
        if (preferred && !usedNumbers.has(preferred)) {
          usedNumbers.add(preferred);
          return preferred;
        }
        let num = Math.floor(Math.random() * 25) + 2;
        while (usedNumbers.has(num)) {
          num = Math.floor(Math.random() * 25) + 2;
        }
        usedNumbers.add(num);
        return num;
      };

      // ─── 1. GOALKEEPER (1 starting) ───
      if (gks.length > 0) {
        const p = gks[0];
        startingXI.push({ name: p.name, jerseyNumber: getUniqueNumber(p.jerseyNumber || 1), position: "Goalkeeper", photoUrl: p.photoUrl });
      } else {
        startingXI.push({ name: generateRandomName(teamName), jerseyNumber: getUniqueNumber(1), position: "Goalkeeper", photoUrl: null });
      }

      // ─── 2. DEFENDERS ───
      for (let i = 0; i < dfCount; i++) {
        if (i < dfs.length) {
          const p = dfs[i];
          startingXI.push({ name: p.name, jerseyNumber: getUniqueNumber(p.jerseyNumber), position: "Defender", photoUrl: p.photoUrl });
        } else {
          startingXI.push({ name: generateRandomName(teamName), jerseyNumber: getUniqueNumber(), position: "Defender", photoUrl: null });
        }
      }

      // ─── 3. MIDFIELDERS ───
      for (let i = 0; i < mfCount; i++) {
        if (i < mfs.length) {
          const p = mfs[i];
          startingXI.push({ name: p.name, jerseyNumber: getUniqueNumber(p.jerseyNumber), position: "Midfielder", photoUrl: p.photoUrl });
        } else {
          startingXI.push({ name: generateRandomName(teamName), jerseyNumber: getUniqueNumber(), position: "Midfielder", photoUrl: null });
        }
      }

      // ─── 4. FORWARDS ───
      for (let i = 0; i < fwCount; i++) {
        if (i < fws.length) {
          const p = fws[i];
          startingXI.push({ name: p.name, jerseyNumber: getUniqueNumber(p.jerseyNumber), position: "Forward", photoUrl: p.photoUrl });
        } else {
          startingXI.push({ name: generateRandomName(teamName), jerseyNumber: getUniqueNumber(), position: "Forward", photoUrl: null });
        }
      }

      // ─── 5. BENCH (9 players) ───
      // First put remaining db players on the bench
      let benchCount = 0;
      const allUnused = [
        ...gks.slice(1),
        ...dfs.slice(dfCount),
        ...mfs.slice(mfCount),
        ...fws.slice(fwCount)
      ];

      for (const p of allUnused) {
        if (benchCount >= 9) break;
        bench.push({ name: p.name, jerseyNumber: getUniqueNumber(p.jerseyNumber), position: p.position, photoUrl: p.photoUrl });
        benchCount++;
      }

      // Fill remaining bench spots with mock players
      const benchPositions = ["Goalkeeper", "Defender", "Defender", "Midfielder", "Midfielder", "Forward", "Forward", "Defender", "Midfielder"];
      while (benchCount < 9) {
        const pos = benchPositions[benchCount % benchPositions.length];
        bench.push({
          name: generateRandomName(teamName),
          jerseyNumber: getUniqueNumber(pos === "Goalkeeper" ? 12 : null),
          position: pos,
          photoUrl: null
        });
        benchCount++;
      }

      return { formation, startingXI, bench };
    };

    const homeLineupData = buildLineup(match.homeTeam.name, homePlayers);
    const awayLineupData = buildLineup(match.awayTeam.name, awayPlayers);

    match.lineups = {
      home: homeLineupData,
      away: awayLineupData
    };
    modified = true;
  }

  // 2. Generate goals if score > 0 but goals array is empty
  const homeScore = match.score?.home || 0;
  const awayScore = match.score?.away || 0;
  const totalScore = homeScore + awayScore;

  if (totalScore > 0 && (!match.goals || match.goals.length === 0)) {
    const goalEvents = [];
    
    const addGoalsForTeam = (teamKey, count) => {
      const teamXI = match.lineups[teamKey].startingXI;
      const teamBench = match.lineups[teamKey].bench;
      const scorersPool = [...teamXI.filter(p => p.position !== "Goalkeeper"), ...teamBench.filter(p => p.position !== "Goalkeeper")];
      const otherTeamXI = match.lineups[teamKey === "home" ? "away" : "home"].startingXI;
      const ownScorersPool = otherTeamXI.filter(p => p.position === "Defender" || p.position === "Midfielder");

      for (let i = 0; i < count; i++) {
        // Random minute
        let minute = Math.floor(Math.random() * 90) + 1;
        if (match.stage !== "Group Stage" && match.status === "finished" && Math.random() > 0.8) {
          // Extra time goal
          minute = Math.floor(Math.random() * 30) + 91;
        }

        // Random type
        const rand = Math.random();
        let type = "goal";
        let scorer = scorersPool[Math.floor(Math.random() * scorersPool.length)];

        if (rand > 0.92 && ownScorersPool.length > 0) {
          type = "own_goal";
          scorer = ownScorersPool[Math.floor(Math.random() * ownScorersPool.length)];
        } else if (rand > 0.82) {
          type = "penalty";
        }

        goalEvents.push({
          minute,
          team: teamKey,
          playerName: scorer.name,
          type
        });
      }
    };

    addGoalsForTeam("home", homeScore);
    addGoalsForTeam("away", awayScore);

    // Sort goals by minute
    goalEvents.sort((a, b) => a.minute - b.minute);
    match.goals = goalEvents;
    modified = true;
  }

  // 3. Generate cards if empty
  if (match.status !== "scheduled" && (!match.cards || match.cards.length === 0)) {
    const cardEvents = [];
    const teams = ["home", "away"];
    
    // 2-5 random yellow cards
    const cardCount = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < cardCount; i++) {
      const teamKey = teams[Math.floor(Math.random() * 2)];
      const teamXI = match.lineups[teamKey].startingXI;
      const player = teamXI[Math.floor(Math.random() * teamXI.length)];
      const minute = Math.floor(Math.random() * 88) + 2;

      cardEvents.push({
        minute,
        team: teamKey,
        playerName: player.name,
        cardType: Math.random() > 0.95 ? "red" : "yellow"
      });
    }

    // Sort cards by minute
    cardEvents.sort((a, b) => a.minute - b.minute);
    match.cards = cardEvents;
    modified = true;
  }

  // 4. Generate substitutions if empty
  if (match.status !== "scheduled" && (!match.substitutions || match.substitutions.length === 0)) {
    const subEvents = [];
    const teams = ["home", "away"];

    for (const teamKey of teams) {
      // 2-3 substitutions per team
      const subCount = Math.floor(Math.random() * 2) + 2;
      const teamXI = [...match.lineups[teamKey].startingXI];
      const teamBench = [...match.lineups[teamKey].bench];

      // Exclude Goalkeepers from easy subs
      const outfieldStarters = teamXI.filter(p => p.position !== "Goalkeeper");
      const outfieldBench = teamBench.filter(p => p.position !== "Goalkeeper");

      const shuffledStarters = outfieldStarters.sort(() => 0.5 - Math.random());
      const shuffledBench = outfieldBench.sort(() => 0.5 - Math.random());

      let baseMinute = 55;
      for (let i = 0; i < subCount; i++) {
        if (shuffledStarters.length > i && shuffledBench.length > i) {
          const minute = baseMinute + Math.floor(Math.random() * 10);
          baseMinute = minute + 3;

          subEvents.push({
            minute,
            team: teamKey,
            playerOut: shuffledStarters[i].name,
            playerIn: shuffledBench[i].name
          });
        }
      }
    }

    // Sort substitutions by minute
    subEvents.sort((a, b) => a.minute - b.minute);
    match.substitutions = subEvents;
    modified = true;
  }

  // 5. Detailed Penalty Shootout details if shootout occurred
  const homePenScore = match.score?.homePenalty;
  const awayPenScore = match.score?.awayPenalty;

  if (homePenScore != null && awayPenScore != null && (!match.penalties || match.penalties.length === 0)) {
    const penaltyEvents = [];
    
    // Simulate penalty shootout kicks
    const homeXI = match.lineups.home.startingXI.filter(p => p.position !== "Goalkeeper");
    const awayXI = match.lineups.away.startingXI.filter(p => p.position !== "Goalkeeper");

    let homeIndex = 0;
    let awayIndex = 0;
    
    let homeWins = homePenScore > awayPenScore;
    let finalHome = homePenScore;
    let finalAway = awayPenScore;

    let hScores = 0;
    let aScores = 0;
    let round = 1;

    // Simple algorithm: simulate shootout kicks matching the exact score
    // Let's create an array of makes/misses for home and away
    // A standard shootout runs rounds. We know final score is finalHome - finalAway.
    // Let's generate a list of rounds.
    const homeKicks = [];
    const awayKicks = [];

    // Fill makes and misses
    // To score finalHome out of N kicks, and finalAway out of M kicks.
    // Normally shootouts are 5 rounds, unless ended earlier or goes to sudden death.
    let totalRounds = 5;
    if (finalHome > 5 || finalAway > 5) {
      totalRounds = Math.max(finalHome, finalAway);
    }

    // Initialize all as misses first
    for (let r = 0; r < totalRounds; r++) {
      homeKicks.push(false);
      awayKicks.push(false);
    }

    // Place makes
    let placedHome = 0;
    while (placedHome < finalHome) {
      const idx = Math.floor(Math.random() * totalRounds);
      if (!homeKicks[idx]) {
        homeKicks[idx] = true;
        placedHome++;
      }
    }

    let placedAway = 0;
    while (placedAway < finalAway) {
      const idx = Math.floor(Math.random() * totalRounds);
      if (!awayKicks[idx]) {
        awayKicks[idx] = true;
        placedAway++;
      }
    }

    // If sudden death or regular rounds, sort out the shootout progression
    // Let's order the kicks round by round
    let order = 1;
    for (let r = 0; r < totalRounds; r++) {
      // Home kick
      const hPlayer = homeXI[homeIndex % homeXI.length];
      homeIndex++;
      penaltyEvents.push({
        order: order++,
        team: "home",
        playerName: hPlayer.name,
        scored: homeKicks[r]
      });

      // Away kick
      const aPlayer = awayXI[awayIndex % awayXI.length];
      awayIndex++;
      penaltyEvents.push({
        order: order++,
        team: "away",
        playerName: aPlayer.name,
        scored: awayKicks[r]
      });
    }

    match.penalties = penaltyEvents;
    modified = true;
  }

  return modified;
};

module.exports = {
  enrichMatch,
  generateRandomName
};
