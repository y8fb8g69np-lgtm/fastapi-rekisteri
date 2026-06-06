# Dynaaminen rekisterinhallinta

Monorepo joka sisältää sekä backendin (FastAPI + PostgreSQL) että frontendin
(React + Vite). Frontend on dynaamisen rekisterinhallinnan käyttöliittymä:
puurakenne, virtuaalitaulut ja master-detail-näkymä. Backend tarjoaa
käyttäjähallinnan REST-rajapinnan sekä dynaamisen rekisterimallin tietokantaskeeman.

## Rakenne

```
rekisteri-monorepo/
├── backend/            # FastAPI + SQLAlchemy + PostgreSQL
│   ├── app/            #   sovelluskoodi (mallit, skeemat, crud, reitit)
│   ├── sql/            #   dynaamisen rekisterin SQL-skeema
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/           # React + Vite -käyttöliittymä
│   ├── src/App.jsx     #   koko UI (puurakenne + master-detail)
│   ├── package.json
│   ├── Dockerfile      #   build + nginx
│   └── nginx.conf
├── docker-compose.yml  # db + backend + frontend yhdellä komennolla
└── README.md
```

## Pikakäynnistys kaikki kerralla (Docker)

```bash
docker compose up --build
```

- Frontend:  http://localhost:5173
- Backend:   http://localhost:8000
- API-docs:  http://localhost:8000/docs

## Kehitysajo erikseen (ilman Dockeria)

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend (toisessa terminaalissa)

```bash
cd frontend
npm install
npm run dev
```

Frontend pyörii osoitteessa http://localhost:5173 ja sen kehityspalvelin
proxyttaa `/api`-alkuiset kutsut backendiin (portti 8000) — ks. `vite.config.js`.

## Frontendin liittäminen backendiin

Käyttöliittymä käyttää tällä hetkellä mock-dataa (`MOCK_TAULUT` App.jsx:ssä),
jotta sen voi ajaa heti ilman backendiä. Kun haluat kytkeä oikean datan,
korvaa mock-haut fetch-kutsuilla, esim:

```js
const res = await fetch("/api/kayttajat");
const data = await res.json();
```

Vite-proxy (kehitys) ja nginx (Docker) ohjaavat `/api`-polun backendiin
automaattisesti, joten samat kutsut toimivat molemmissa ympäristöissä.

## Lisenssi

MIT — ks. [LICENSE](LICENSE).
