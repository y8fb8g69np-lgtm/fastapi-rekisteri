-- ============================================================================
--  Dynaaminen rekisterinhallinta — PostgreSQL-skeema
--  Taulut: kansio, taulu, sarake, masterrivi, rivi, arvo
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1. KANSIO — hierarkkinen kansiorakenne (itseensä viittaava)
-- ---------------------------------------------------------------------------
CREATE TABLE kansio (
    id            SERIAL PRIMARY KEY,
    vanhempi_id   INTEGER REFERENCES kansio(id) ON DELETE CASCADE,
    nimi          VARCHAR(100) NOT NULL,
    jarjestys     INTEGER NOT NULL DEFAULT 0,
    ikoni         VARCHAR(50),                    -- esim. 'folder', 'database', 'users'
    luotu_aika    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (vanhempi_id, nimi)
);

-- ---------------------------------------------------------------------------
--  2. TAULU — virtuaalitaulujen (rekisterien) määrittely
-- ---------------------------------------------------------------------------
CREATE TABLE taulu (
    id                 SERIAL PRIMARY KEY,
    kansio_id          INTEGER REFERENCES kansio(id),
    nimi               VARCHAR(100) NOT NULL UNIQUE,
    kuvaus             TEXT,
    detail_jarjestys   INTEGER NOT NULL DEFAULT 0,   -- detail-välilehtien järjestys
    max_detail_syvyys  INTEGER,                      -- NULL = käytä globaalia oletusta (3)
    luotu_aika         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    luotu_by           VARCHAR(100)
);

-- ---------------------------------------------------------------------------
--  3. SARAKE — sarakkeiden määrittely per taulu
-- ---------------------------------------------------------------------------
CREATE TABLE sarake (
    id                 SERIAL PRIMARY KEY,
    taulu_id           INTEGER NOT NULL REFERENCES taulu(id) ON DELETE CASCADE,
    nimi               VARCHAR(100) NOT NULL,
    tietotyyppi        VARCHAR(50) NOT NULL DEFAULT 'text',
                       -- 'text', 'integer', 'decimal', 'date', 'boolean', 'viittaus'
    pakollinen         BOOLEAN NOT NULL DEFAULT FALSE,
    jarjestys          INTEGER NOT NULL DEFAULT 0,
    kuvaus             TEXT,
    -- Viittaustyyppisen sarakkeen kohde (toinen virtuaalitaulu)
    viittaus_taulu_id  INTEGER REFERENCES taulu(id),
    -- Merkitsee owner-viittauksen jolla alitaulu kiinnittyy päätauluun (master-detail)
    on_master_viittaus BOOLEAN NOT NULL DEFAULT FALSE,
    luotu_aika         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (taulu_id, nimi),
    -- viittaus_taulu_id vaaditaan vain ja ainoastaan kun tietotyyppi = 'viittaus'
    CONSTRAINT viittaus_check CHECK (
        (tietotyyppi = 'viittaus' AND viittaus_taulu_id IS NOT NULL)
        OR
        (tietotyyppi <> 'viittaus' AND viittaus_taulu_id IS NULL)
    )
);

-- ---------------------------------------------------------------------------
--  4. MASTERRIVI — versioketjun ankkuri
--     Kaikki saman tietueen versiot jakavat saman masterrivi_id:n.
--     Viittaukset osoittavat tänne, jotta ne säilyvät versioinnin yli.
-- ---------------------------------------------------------------------------
CREATE TABLE masterrivi (
    id          SERIAL PRIMARY KEY,
    taulu_id    INTEGER NOT NULL REFERENCES taulu(id) ON DELETE CASCADE,
    luotu_aika  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    luotu_by    VARCHAR(100)
);

-- ---------------------------------------------------------------------------
--  5. RIVI — yksittäinen versio tietueesta (voimassaolo + tila)
-- ---------------------------------------------------------------------------
CREATE TABLE rivi (
    id              SERIAL PRIMARY KEY,
    masterrivi_id   INTEGER NOT NULL REFERENCES masterrivi(id) ON DELETE CASCADE,
    taulu_id        INTEGER NOT NULL REFERENCES taulu(id) ON DELETE CASCADE,
    voimassa_alku   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    voimassa_loppu  TIMESTAMPTZ,                  -- NULL = toistaiseksi voimassa
    tila            VARCHAR(20) NOT NULL DEFAULT 'aktiivinen',
                    -- 'aktiivinen', 'poistettu', 'korvattu'
    luotu_aika      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    luotu_by        VARCHAR(100),
    CONSTRAINT voimassaolo_check CHECK (
        voimassa_loppu IS NULL OR voimassa_loppu > voimassa_alku
    )
);

-- ---------------------------------------------------------------------------
--  6. ARVO — yksittäisen solun arvo (teksti TAI viittaus masterriviin)
-- ---------------------------------------------------------------------------
CREATE TABLE arvo (
    id                     SERIAL PRIMARY KEY,
    rivi_id                INTEGER NOT NULL REFERENCES rivi(id) ON DELETE CASCADE,
    sarake_id              INTEGER NOT NULL REFERENCES sarake(id) ON DELETE RESTRICT,
    arvo_text              TEXT,                  -- skalaariarvot tekstinä
    viittaus_masterrivi_id INTEGER REFERENCES masterrivi(id),  -- viittaustyyppinen arvo
    luotu_aika             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rivi_id, sarake_id),
    -- Joko teksti TAI viittaus TAI tyhjä — ei tekstiä ja viittausta yhtä aikaa
    CONSTRAINT arvo_xor_check CHECK (
        (arvo_text IS NOT NULL AND viittaus_masterrivi_id IS NULL)
        OR
        (arvo_text IS NULL AND viittaus_masterrivi_id IS NOT NULL)
        OR
        (arvo_text IS NULL AND viittaus_masterrivi_id IS NULL)
    )
);


-- ============================================================================
--  INDEKSIT
-- ============================================================================
CREATE INDEX idx_kansio_vanhempi    ON kansio(vanhempi_id);
CREATE INDEX idx_taulu_kansio        ON taulu(kansio_id);
CREATE INDEX idx_sarake_taulu        ON sarake(taulu_id);
CREATE INDEX idx_sarake_viittaus     ON sarake(viittaus_taulu_id);
CREATE INDEX idx_masterrivi_taulu    ON masterrivi(taulu_id);
CREATE INDEX idx_rivi_masterrivi     ON rivi(masterrivi_id);
CREATE INDEX idx_rivi_taulu          ON rivi(taulu_id);
CREATE INDEX idx_rivi_voimassaolo    ON rivi(voimassa_alku, voimassa_loppu);
CREATE INDEX idx_rivi_tila           ON rivi(tila);
CREATE INDEX idx_arvo_rivi           ON arvo(rivi_id);
CREATE INDEX idx_arvo_sarake         ON arvo(sarake_id);
CREATE INDEX idx_arvo_viittaus       ON arvo(viittaus_masterrivi_id);


-- ============================================================================
--  TRIGGER — viittauksen eheystarkistus
--  Varmistaa että viittaustyyppisellä arvolla on viittaus, ja että viitattu
--  masterrivi kuuluu sarakkeen viittaus_taulu_id:n osoittamaan tauluun.
-- ============================================================================
CREATE OR REPLACE FUNCTION tarkista_viittaus_eheys()
RETURNS TRIGGER AS $$
DECLARE
    v_tietotyyppi       VARCHAR(50);
    v_viittaus_taulu_id INTEGER;
BEGIN
    SELECT s.tietotyyppi, s.viittaus_taulu_id
    INTO v_tietotyyppi, v_viittaus_taulu_id
    FROM sarake s
    WHERE s.id = NEW.sarake_id;

    IF v_tietotyyppi = 'viittaus' THEN
        IF NEW.viittaus_masterrivi_id IS NULL THEN
            RAISE EXCEPTION
                'Viittaussarakkeella täytyy olla viittaus_masterrivi_id (sarake_id: %)',
                NEW.sarake_id;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM masterrivi m
            WHERE m.id = NEW.viittaus_masterrivi_id
              AND m.taulu_id = v_viittaus_taulu_id
        ) THEN
            RAISE EXCEPTION
                'Viittaus osoittaa väärään tauluun (masterrivi_id: %, odotettu taulu_id: %)',
                NEW.viittaus_masterrivi_id, v_viittaus_taulu_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_viittaus_eheys
    BEFORE INSERT OR UPDATE ON arvo
    FOR EACH ROW EXECUTE FUNCTION tarkista_viittaus_eheys();


-- ============================================================================
--  NÄKYMÄ — voimassaolevat rivit, viittaukset resolvoituna
-- ============================================================================
CREATE VIEW aktiiviset_rivit AS
SELECT
    r.id                     AS rivi_id,
    r.masterrivi_id,
    t.nimi                   AS taulu_nimi,
    r.voimassa_alku,
    r.voimassa_loppu,
    s.nimi                   AS sarake_nimi,
    s.tietotyyppi,
    CASE
        WHEN s.tietotyyppi <> 'viittaus' THEN a.arvo_text
        ELSE CONCAT('[', vt.nimi, ':', a.viittaus_masterrivi_id, ']')
    END                      AS arvo,
    a.viittaus_masterrivi_id
FROM rivi r
JOIN taulu      t  ON t.id  = r.taulu_id
JOIN arvo       a  ON a.rivi_id = r.id
JOIN sarake     s  ON s.id  = a.sarake_id
LEFT JOIN taulu vt ON vt.id = s.viittaus_taulu_id
WHERE r.tila = 'aktiivinen'
  AND r.voimassa_loppu IS NULL;
