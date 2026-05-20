# squash-ticket

Service de polling qui détecte les échecs d'exécution dans **Squash TM** et crée automatiquement des tickets dans **tool-bug-tracker**.

## Fonctionnement

```
Toutes les N secondes :
  1. GET /api/executions (Squash TM) → filtre status=FAILURE
  2. Ignore les exécutions déjà traitées (state.json)
  3. POST /ticket/create (tool-bug-tracker) → crée le ticket
  4. Sauvegarde l'état → évite les doublons
```

## Déploiement via Docker

Le service est intégré dans le `docker-compose.yml` de **tool-bug-tracker**.

Créer un fichier `.env` à la racine du projet `tool-bug-tracker` (ou compléter l'existant) :

```env
SQUASH_TOKEN=eyJ...          # même valeur que VITE_SQUASH_TOKEN
DEFAULT_STATUS_ID=3          # ID du statut "Nouveau"
DEFAULT_IMPORTANCE_ID=1      # ID de l'importance par défaut
POLL_INTERVAL_SECONDS=120    # polling toutes les 2 minutes
```

Puis lancer :

```bash
docker compose up -d squash-ticket
```

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `SQUASH_BASE_URL` | — | URL Squash TM (ex: `https://squashtm.groupebovis.local`) |
| `SQUASH_TOKEN` | — | Token JWT d'accès à l'API Squash TM |
| `BUG_TRACKER_URL` | `http://backend:3000` | URL interne du backend (nom service Docker) |
| `DEFAULT_STATUS_ID` | `3` | ID du statut attribué aux tickets créés |
| `DEFAULT_IMPORTANCE_ID` | `1` | ID de l'importance attribuée par défaut |
| `POLL_INTERVAL_SECONDS` | `120` | Intervalle de polling en secondes |

## Persistance

L'état du polling (`lastPollAt` + liste des IDs traités) est stocké dans `/app/data/state.json` à l'intérieur du conteneur — le volume Docker `squash_ticket_data` assure la persistance entre les redémarrages.

## Adapter l'endpoint Squash TM

Si l'endpoint `GET /api/executions` ne fonctionne pas avec votre version, vérifiez l'API disponible sur :
```
https://squashtm.groupebovis.local/squash/swagger-ui.html
```
Puis ajuster `src/squash-client.js` en conséquence.
