const axios = require('axios');

const client = axios.create({
  baseURL: process.env.BUG_TRACKER_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

function buildDescription(execution) {
  const testCase = execution.referencedTestCase ?? execution.testCase ?? {};
  const steps = execution.executionSteps ?? [];
  const failedStep = steps.find(s => s.executionStatus === 'FAILURE') ?? steps[0];

  const lines = [
    `**Exécution Squash TM — statut : FAILURE**`,
    '',
    `**Projet Squash** : ${testCase.project?.name ?? 'N/A'}`,
    `**Cas de test** : ${testCase.name ?? 'N/A'} (ID : ${testCase.id ?? 'N/A'})`,
  ];

  const campaignParts = [execution.campaign?.name, execution.iteration?.name].filter(Boolean);
  if (campaignParts.length) lines.push(`**Campagne** : ${campaignParts.join(' / ')}`);

  if (failedStep) {
    lines.push(`\n**Étape en échec** : #${failedStep.executionRank ?? failedStep.index ?? '?'}`);
    if (failedStep.comment) lines.push(`**Commentaire** : ${failedStep.comment}`);
  }

  return lines.join('\n');
}

async function createTicket(execution) {
  const testCase = execution.referencedTestCase ?? execution.testCase ?? {};
  const steps = execution.executionSteps ?? [];
  const failedStep = steps.find(s => s.executionStatus === 'FAILURE') ?? steps[0];

  const title = `[Squash] Échec : ${testCase.name ?? 'Cas de test #' + execution.id}`;

  const body = {
    TIC_TITRE: title,
    TIC_DESCRIPTION: buildDescription(execution),
    TIC_STATUS: Number(process.env.DEFAULT_STATUS_ID ?? 3),
    TIC_IMPORTANCE: Number(process.env.DEFAULT_IMPORTANCE_ID ?? 1),
    TIC_SQUASH_TEST_CASE: testCase.id ?? null,
    TIC_SQUASH_STEP: failedStep?.id ?? null,
    TIC_SQUASH_STEP_INDEX: failedStep?.executionRank ?? failedStep?.index ?? null,
    // dataMail avec liste vide = pas d'envoi d'email pour les tickets auto
    dataMail: {
      TIC_TITRE: title,
      TIC_DESCRIPTION: '',
      IMPORTANCE: '',
      IMPORTANCE_COULEUR: '',
      APPLICATION: '',
      VERSION: null,
      USER_CREATION: 'Squash TM',
      TAGS: [],
      ASSIGNED_USERS_WITH_EMAIL: [],
    },
  };

  const response = await client.post('/ticket/create', body);
  return response.data;
}

module.exports = { createTicket };
