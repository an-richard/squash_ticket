# squash_ticket

Intégration Squash TM → tool-bug-tracker : création automatique de tickets lors des échecs d'exécution de tests.

---

## Principe

Lorsqu'une exécution de test échoue dans Squash TM, un **webhook** est envoyé automatiquement au backend NestJS de **tool-bug-tracker**, qui crée un ticket de bug pré-rempli avec les informations de l'exécution.

```
Squash TM (échec d'exécution)
       │  POST /squash/webhook
       ▼
NestJS backend (tool-bug-tracker)
  → vérifie le secret
  → identifie l'application (via application_squash)
  → déduplique si ticket déjà ouvert
  → crée le ticket automatiquement
```

---

## Configuration côté Squash TM

### Prérequis

Squash TM **>= 1.21** (webhooks natifs).

### 1. Créer le webhook

Dans **Administration > Webhooks**, ajouter un webhook avec ces paramètres :

| Champ | Valeur |
|-------|--------|
| URL | `http://<bug-tracker-host>:3000/squash/webhook` |
| Événements | `EXECUTION_STATUS_CHANGED` |
| En-tête personnalisé | `X-Squash-Secret: <votre-secret>` |

### 2. Filtrer les statuts déclencheurs

Configurez le webhook pour ne se déclencher que sur les statuts :
- `FAILURE` — exécution en échec
- `BLOCKED` — exécution bloquée

---

## Configuration côté tool-bug-tracker

### Variables d'environnement (`backend/.env`)

| Variable | Exemple | Description |
|----------|---------|-------------|
| `SQUASH_WEBHOOK_SECRET` | `mon-secret-fort` | Secret partagé pour authentifier les appels Squash TM |
| `SQUASH_DEFAULT_STATUS_ID` | `3` | ID du statut attribué aux tickets créés (ex : "Nouveau") |
| `SQUASH_DEFAULT_IMPORTANCE_ID` | `1` | ID de l'importance attribuée par défaut (ex : "Normal") |

> Les IDs de statut et d'importance sont ceux de votre base de données. Vérifiez-les dans **Admin > Statuts** et **Admin > Importances**.

### Associer les projets Squash aux applications

Dans l'admin du bug tracker (`/admin`), section **Projets Squash**, associer chaque projet Squash TM à l'application métier correspondante.

Le webhook utilise cette correspondance pour renseigner automatiquement le champ **Application** du ticket créé.

---

## Format du webhook Squash TM

Le backend accepte le payload suivant (format standard Squash TM) :

```json
{
  "execution": {
    "executionStatus": "FAILURE",
    "testCase": {
      "id": 123,
      "name": "TC_001 - Login utilisateur",
      "project": {
        "id": 1,
        "name": "Mon Projet"
      }
    },
    "steps": [
      {
        "id": 456,
        "index": 2,
        "executionStatus": "FAILURE",
        "comment": "Assertion failed: expected 200 but got 500"
      }
    ],
    "campaign": { "name": "Campagne Sprint 12" },
    "iteration": { "name": "Itération 1" }
  }
}
```

---

## Comportement de l'endpoint

**Endpoint** : `POST /squash/webhook`

**Headers requis** :
- `Content-Type: application/json`
- `X-Squash-Secret: <secret>` (si `SQUASH_WEBHOOK_SECRET` est configuré)

**Réponses** :

| Cas | Réponse |
|-----|---------|
| Ticket créé | `{ "created": true, "ticketId": 42 }` |
| Ticket déjà existant (déduplication) | `{ "skipped": true, "existingTicketId": 42 }` |
| Statut non concerné (SUCCESS, etc.) | `{ "ignored": true, "reason": "..." }` |
| Secret invalide | `401 Unauthorized` |

### Déduplication

Si un ticket **actif** existe déjà pour le même cas de test Squash TM (même `TIC_SQUASH_TEST_CASE`), aucun nouveau ticket n'est créé. Cela évite les doublons lors d'exécutions répétées sur un même cas de test défaillant.

---

## Ticket créé dans tool-bug-tracker

Exemple de ticket généré automatiquement :

- **Titre** : `[Squash] Échec : TC_001 - Login utilisateur`
- **Description** :
  ```
  **Exécution Squash TM — statut : FAILURE**
  
  **Campagne** : Campagne Sprint 12 / Itération 1
  **Projet Squash** : Mon Projet
  **Cas de test** : TC_001 - Login utilisateur (ID : 123)
  
  **Étape en échec** : #2
  **Commentaire** : Assertion failed: expected 200 but got 500
  ```
- **Lien Squash** : rempli automatiquement (cas de test + étape)
- **Application** : mappée depuis le projet Squash
