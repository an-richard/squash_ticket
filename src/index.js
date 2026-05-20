const fs = require('fs');
const path = require('path');
const { getRecentFailures } = require('./squash-client');
const { createTicket } = require('./bugtracker-client');

const STATE_FILE = path.join(__dirname, '..', 'data', 'state.json');
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_SECONDS ?? 120) * 1000;

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    // Premier démarrage : remonter 5 minutes en arrière pour éviter les faux positifs
    return {
      lastPollAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      processedIds: [],
    };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function poll() {
  const state = loadState();
  const since = state.lastPollAt;
  const now = new Date().toISOString();

  console.log(`[${now}] Polling Squash TM — failures depuis ${since}`);

  let failures;
  try {
    failures = await getRecentFailures(since);
  } catch (err) {
    console.error(`Erreur Squash TM API : ${err.message}`);
    return;
  }

  const newFailures = failures.filter(e => !state.processedIds.includes(String(e.id)));
  console.log(`${failures.length} failure(s) trouvée(s), ${newFailures.length} nouvelle(s).`);

  for (const execution of newFailures) {
    try {
      const ticket = await createTicket(execution);
      console.log(`Ticket #${ticket.TIC_ID ?? ticket.id} créé pour l'exécution Squash ${execution.id}`);
    } catch (err) {
      console.error(`Erreur création ticket pour exécution ${execution.id} : ${err.message}`);
      // On continue sur les autres — on ne bloque pas sur une erreur unitaire
      continue;
    }
    state.processedIds.push(String(execution.id));
  }

  // Garder les 1000 derniers IDs pour éviter une croissance infinie
  if (state.processedIds.length > 1000) {
    state.processedIds = state.processedIds.slice(-1000);
  }

  state.lastPollAt = now;
  saveState(state);
}

async function main() {
  console.log('squash-ticket bridge démarré');
  console.log(`Intervalle de polling : ${POLL_INTERVAL_MS / 1000}s`);
  console.log(`Squash TM : ${process.env.SQUASH_BASE_URL}`);
  console.log(`Bug tracker : ${process.env.BUG_TRACKER_URL}`);

  await poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

main().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
