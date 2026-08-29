-- Canonical graph tables are created first because legacy records reference them.
CREATE TABLE IF NOT EXISTS node (
    id BIGSERIAL PRIMARY KEY,
    node_type VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    status VARCHAR(50),
    legacy_table VARCHAR(50),
    legacy_id INT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT node_legacy_unq UNIQUE (legacy_table, legacy_id)
);

CREATE TABLE IF NOT EXISTS relationship (
    id BIGSERIAL PRIMARY KEY,
    parent_node_id BIGINT NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    child_node_id BIGINT NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT relationship_self_chk CHECK (parent_node_id <> child_node_id),
    CONSTRAINT relationship_logical_unq UNIQUE (parent_node_id, child_node_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS proceso (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    bpm_process_id UUID NOT NULL UNIQUE,
    node_id BIGINT REFERENCES node(id) ON DELETE RESTRICT
);

ALTER TABLE IF EXISTS proceso ADD COLUMN IF NOT EXISTS node_id BIGINT REFERENCES node(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS maquinas_tipo (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS maquina (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    maquinas_tipo_id INT REFERENCES maquinas_tipo(id) ON DELETE RESTRICT,
    node_id BIGINT REFERENCES node(id) ON DELETE RESTRICT,
    parent_maquina_id INT REFERENCES maquina(id) ON DELETE RESTRICT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT maquina_no_self_parent CHECK (parent_maquina_id IS NULL OR parent_maquina_id <> id)
);

CREATE TABLE IF NOT EXISTS registro_maquina (
    id SERIAL PRIMARY KEY,
    maquina_id INT NOT NULL REFERENCES maquina(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL UNIQUE,
    numero_serie TEXT,
    estado TEXT NOT NULL DEFAULT 'operativa',
    fecha_alta DATE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS maquinas_tipo_id INT REFERENCES maquinas_tipo(id) ON DELETE RESTRICT;
ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS node_id BIGINT REFERENCES node(id) ON DELETE RESTRICT;
ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS parent_maquina_id INT REFERENCES maquina(id) ON DELETE RESTRICT;
ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- Req12 machine model: these columns extend the legacy tables without
-- changing the meaning of registro_maquina, parent_maquina_id, activo or
-- contrato_maquina.
ALTER TABLE IF EXISTS maquinas_tipo ADD COLUMN IF NOT EXISTS technology_description TEXT;
ALTER TABLE IF EXISTS maquinas_tipo ADD COLUMN IF NOT EXISTS nominal_capacity JSONB;
ALTER TABLE IF EXISTS maquinas_tipo ADD COLUMN IF NOT EXISTS operating_principle TEXT;
ALTER TABLE IF EXISTS maquinas_tipo ADD COLUMN IF NOT EXISTS elements_zones_positions JSONB;
ALTER TABLE IF EXISTS maquinas_tipo ADD COLUMN IF NOT EXISTS control_systems JSONB;
ALTER TABLE IF EXISTS maquinas_tipo ADD COLUMN IF NOT EXISTS common_technical_characteristics JSONB;
ALTER TABLE IF EXISTS maquinas_tipo ADD COLUMN IF NOT EXISTS common_limitations JSONB;
ALTER TABLE IF EXISTS maquinas_tipo ADD COLUMN IF NOT EXISTS general_technical_description TEXT;

ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS specific_description TEXT;
ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS specific_characteristics JSONB;
ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS specific_parameters JSONB;
ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS specific_operating_ranges JSONB;
ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS specific_limitations JSONB;
ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS specific_instructions JSONB;
ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS differences_from_machine_type JSONB;

DO $$
BEGIN
    ALTER TABLE maquinas_tipo DROP CONSTRAINT IF EXISTS maquinas_tipo_json_shape_check;
    ALTER TABLE maquinas_tipo ADD CONSTRAINT maquinas_tipo_json_shape_check CHECK (
        (nominal_capacity IS NULL OR jsonb_typeof(nominal_capacity) = 'object') AND
        (elements_zones_positions IS NULL OR jsonb_typeof(elements_zones_positions) = 'array') AND
        (control_systems IS NULL OR jsonb_typeof(control_systems) = 'array') AND
        (common_technical_characteristics IS NULL OR jsonb_typeof(common_technical_characteristics) IN ('object', 'array')) AND
        (common_limitations IS NULL OR jsonb_typeof(common_limitations) IN ('object', 'array'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE maquina DROP CONSTRAINT IF EXISTS maquina_json_shape_check;
    ALTER TABLE maquina ADD CONSTRAINT maquina_json_shape_check CHECK (
        (specific_characteristics IS NULL OR jsonb_typeof(specific_characteristics) IN ('object', 'array')) AND
        (specific_parameters IS NULL OR jsonb_typeof(specific_parameters) = 'array') AND
        (specific_operating_ranges IS NULL OR jsonb_typeof(specific_operating_ranges) = 'array') AND
        (specific_limitations IS NULL OR jsonb_typeof(specific_limitations) IN ('object', 'array')) AND
        (specific_instructions IS NULL OR jsonb_typeof(specific_instructions) = 'array') AND
        (differences_from_machine_type IS NULL OR jsonb_typeof(differences_from_machine_type) IN ('object', 'array'))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS contrato (
    id SERIAL PRIMARY KEY,
    proceso_id INT NOT NULL REFERENCES proceso(id) ON DELETE CASCADE,
    bpm_process_id UUID,
    bpm_node_id UUID,
    node_id BIGINT REFERENCES node(id) ON DELETE RESTRICT,
    nombre TEXT NOT NULL,
    metrica TEXT,
    objetivo TEXT,
    version INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE IF EXISTS contrato ADD COLUMN IF NOT EXISTS bpm_process_id UUID;
ALTER TABLE IF EXISTS contrato ADD COLUMN IF NOT EXISTS bpm_node_id UUID;
ALTER TABLE IF EXISTS contrato ADD COLUMN IF NOT EXISTS node_id BIGINT REFERENCES node(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS contrato_maquina (
    contrato_id INT NOT NULL REFERENCES contrato(id) ON DELETE CASCADE,
    maquina_id INT NOT NULL REFERENCES maquina(id) ON DELETE CASCADE,
    PRIMARY KEY (contrato_id, maquina_id)
);

-- The referenced table is created above; keeping this ALTER after contrato
-- makes a clean installation and an upgrade follow the same dependency order.
ALTER TABLE IF EXISTS maquina ADD COLUMN IF NOT EXISTS contract_id INT REFERENCES contrato(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS causa (
    id SERIAL PRIMARY KEY,
    node_id BIGINT UNIQUE REFERENCES node(id) ON DELETE CASCADE,
    contrato_id INT REFERENCES contrato(id) ON DELETE CASCADE,
    parent_id INT REFERENCES causa(id) ON DELETE RESTRICT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL DEFAULT 'causa' CHECK (tipo IN ('causa', 'efecto')),
    categoria TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hipotesis (
    id SERIAL PRIMARY KEY,
    node_id BIGINT UNIQUE REFERENCES node(id) ON DELETE CASCADE,
    causa_id INT REFERENCES causa(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'aceptacion' CHECK (tipo IN ('aceptacion', 'rechazo')),
    criterio_validacion TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'validada', 'rechazada')),
    business_reason TEXT, analysis_method TEXT, expected_result TEXT,
    industrial_process TEXT, industrial_machine TEXT, industrial_asset TEXT,
    analysis_window TEXT, decision_rule TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS causa ADD COLUMN IF NOT EXISTS node_id BIGINT REFERENCES node(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS causa ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE IF EXISTS causa ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE IF EXISTS hipotesis ADD COLUMN IF NOT EXISTS node_id BIGINT REFERENCES node(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS hipotesis ADD COLUMN IF NOT EXISTS business_reason TEXT;
ALTER TABLE IF EXISTS hipotesis ADD COLUMN IF NOT EXISTS analysis_method TEXT;
ALTER TABLE IF EXISTS hipotesis ADD COLUMN IF NOT EXISTS expected_result TEXT;
ALTER TABLE IF EXISTS hipotesis ADD COLUMN IF NOT EXISTS industrial_process TEXT;
ALTER TABLE IF EXISTS hipotesis ADD COLUMN IF NOT EXISTS industrial_machine TEXT;
ALTER TABLE IF EXISTS hipotesis ADD COLUMN IF NOT EXISTS industrial_asset TEXT;
ALTER TABLE IF EXISTS hipotesis ADD COLUMN IF NOT EXISTS analysis_window TEXT;
ALTER TABLE IF EXISTS hipotesis ADD COLUMN IF NOT EXISTS decision_rule TEXT;
ALTER TABLE IF EXISTS hipotesis ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE IF EXISTS hipotesis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS hypothesis_required_data (
    id BIGSERIAL PRIMARY KEY,
    hypothesis_node_id BIGINT NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    position INT NOT NULL, value TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (hypothesis_node_id, position)
);

CREATE TABLE IF NOT EXISTS hypothesis_expected_evidence (
    id BIGSERIAL PRIMARY KEY,
    hypothesis_node_id BIGINT NOT NULL REFERENCES node(id) ON DELETE CASCADE,
    position INT NOT NULL, value TEXT NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (hypothesis_node_id, position)
);

CREATE TABLE IF NOT EXISTS analisis_causas (
    id SERIAL PRIMARY KEY,
    contrato_id INT NOT NULL REFERENCES contrato(id) ON DELETE CASCADE,
    proceso_id INT REFERENCES proceso(id) ON DELETE SET NULL,
    maquina_id INT REFERENCES maquina(id) ON DELETE SET NULL,
    persona_inicializacion TEXT NOT NULL,
    descripcion_apertura TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
    fecha_inicializacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_reapertura TIMESTAMP, fecha_cierre TIMESTAMP
);

ALTER TABLE IF EXISTS analisis_causas ADD COLUMN IF NOT EXISTS fecha_apertura DATE;
ALTER TABLE IF EXISTS analisis_causas ADD COLUMN IF NOT EXISTS indicio_apertura TEXT;
ALTER TABLE IF EXISTS analisis_causas ADD COLUMN IF NOT EXISTS conclusion_final TEXT;

CREATE TABLE IF NOT EXISTS analisis_participante (
    analisis_id INT NOT NULL REFERENCES analisis_causas(id) ON DELETE CASCADE,
    participante TEXT NOT NULL,
    PRIMARY KEY (analisis_id, participante)
);

CREATE TABLE IF NOT EXISTS analisis_resultado (
    id BIGSERIAL PRIMARY KEY,
    analisis_id INT NOT NULL REFERENCES analisis_causas(id) ON DELETE CASCADE,
    tipo_elemento TEXT NOT NULL CHECK (tipo_elemento IN ('causa', 'hipotesis')),
    causa_id INT REFERENCES causa(id) ON DELETE RESTRICT,
    hipotesis_id INT REFERENCES hipotesis(id) ON DELETE RESTRICT,
    evidencia TEXT, conclusion TEXT, evaluacion TEXT NOT NULL DEFAULT 'pendiente',
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT analisis_resultado_elemento_chk CHECK (
        (tipo_elemento = 'causa' AND causa_id IS NOT NULL AND hipotesis_id IS NULL) OR
        (tipo_elemento = 'hipotesis' AND hipotesis_id IS NOT NULL AND causa_id IS NULL)
    ),
    CONSTRAINT analisis_resultado_unq UNIQUE (analisis_id, tipo_elemento, causa_id, hipotesis_id)
);

CREATE TABLE IF NOT EXISTS analisis_causas_detalle (
    id SERIAL PRIMARY KEY,
    analisis_causa_id INT NOT NULL REFERENCES analisis_causas(id) ON DELETE CASCADE,
    tipo_elemento TEXT NOT NULL CHECK (tipo_elemento IN ('causa', 'hipotesis')),
    causa_id INT REFERENCES causa(id) ON DELETE CASCADE,
    hipotesis_id INT REFERENCES hipotesis(id) ON DELETE CASCADE,
    evaluacion TEXT NOT NULL, comentario TEXT, fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    node_id BIGINT REFERENCES node(id) ON DELETE SET NULL,
    CONSTRAINT analisis_detalle_elemento_chk CHECK (
        (tipo_elemento = 'causa' AND causa_id IS NOT NULL AND hipotesis_id IS NULL) OR
        (tipo_elemento = 'hipotesis' AND hipotesis_id IS NOT NULL AND causa_id IS NULL)
    ),
    CONSTRAINT analisis_causas_detalle_unq UNIQUE (analisis_causa_id, tipo_elemento, causa_id, hipotesis_id)
);

CREATE INDEX IF NOT EXISTS idx_causa_contrato ON causa(contrato_id);
CREATE INDEX IF NOT EXISTS idx_causa_parent ON causa(parent_id);
CREATE INDEX IF NOT EXISTS idx_analisis_contrato ON analisis_causas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_analisis_resultado ON analisis_resultado(analisis_id);
CREATE INDEX IF NOT EXISTS idx_machine_parent ON maquina(parent_maquina_id);
CREATE INDEX IF NOT EXISTS idx_machine_type ON maquina(maquinas_tipo_id);

-- Process modeling bounded context (requerimiento_10). These tables are
-- intentionally independent from the legacy causal graph tables above.
-- Existing installations require a controlled migration that renames
-- the legacy process table to bpm_process and recreates/updates every FK
-- before applying this source schema. This schema intentionally does not
-- execute that data migration implicitly.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS bpm_process (
    process_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    abstraction_level INTEGER NOT NULL DEFAULT 0 CHECK (abstraction_level >= 0),
    parent_process_id UUID REFERENCES bpm_process(process_id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Canonical operational processes are owned by exactly one BPM definition.
-- The column is introduced nullable so existing installations can be
-- backfilled before enforcing the final NOT NULL contract.
ALTER TABLE proceso ADD COLUMN IF NOT EXISTS bpm_process_id UUID;
DO $$
BEGIN
    ALTER TABLE proceso
        ADD CONSTRAINT proceso_bpm_process_fk
        FOREIGN KEY (bpm_process_id)
        REFERENCES bpm_process(process_id)
        ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE proceso ALTER COLUMN bpm_process_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS pm_process_node (
    node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES bpm_process(process_id) ON DELETE CASCADE,
    node_code TEXT NOT NULL,
    node_type TEXT NOT NULL CHECK (node_type IN ('input', 'output', 'operation', 'subprocess', 'decision', 'stock')),
    name TEXT NOT NULL,
    description TEXT,
    child_process_id UUID REFERENCES bpm_process(process_id) ON DELETE RESTRICT,
    output_role TEXT CHECK (output_role IN ('normal', 'waste')),
    stock_capacity INTEGER,
    stock_initial_quantity INTEGER,
    stock_unit TEXT,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (process_id, node_code),
    CONSTRAINT pm_subprocess_child_chk CHECK (
        (node_type = 'subprocess' AND child_process_id IS NOT NULL) OR
        (node_type <> 'subprocess' AND child_process_id IS NULL)
    ),
    CONSTRAINT pm_output_role_chk CHECK (
        (node_type = 'output' AND output_role IN ('normal', 'waste')) OR
        (node_type <> 'output' AND output_role IS NULL)
    ),
    CONSTRAINT pm_stock_fields_chk CHECK (
        (node_type = 'stock' AND stock_capacity > 0 AND stock_initial_quantity >= 0 AND stock_initial_quantity <= stock_capacity AND stock_unit IS NOT NULL) OR
        (node_type <> 'stock' AND stock_capacity IS NULL AND stock_initial_quantity IS NULL AND stock_unit IS NULL)
    )
);

-- AMD-02-003: operation stages are an additive, versioned JSONB envelope.
-- The application validates the two-level tree; no parallel table/column is
-- introduced and existing node properties remain the source of truth.
CREATE INDEX IF NOT EXISTS idx_pm_process_node_operation_stages
    ON pm_process_node USING GIN ((properties -> 'etapas'));

-- Dedicated relation/configuration for a machine participating in one BPM
-- operation. The trigger below enforces node_type and version/process
-- consistency because a CHECK constraint cannot query pm_process_node.
CREATE TABLE IF NOT EXISTS machine_operation_configuration (
    id BIGSERIAL PRIMARY KEY,
    machine_id INT NOT NULL REFERENCES maquina(id) ON DELETE CASCADE,
    operation_id UUID NOT NULL REFERENCES pm_process_node(node_id) ON DELETE RESTRICT,
    process_id UUID NOT NULL REFERENCES bpm_process(process_id) ON DELETE RESTRICT,
    contract_id INT REFERENCES contrato(id) ON DELETE SET NULL,
    specific_description TEXT,
    additional_inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
    specific_controls JSONB NOT NULL DEFAULT '[]'::jsonb,
    available_measurements JSONB NOT NULL DEFAULT '[]'::jsonb,
    specific_safety_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    validation_status TEXT NOT NULL DEFAULT 'draft',
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT machine_operation_configuration_unq UNIQUE (machine_id, process_id, operation_id),
    CONSTRAINT machine_operation_configuration_status_chk CHECK (validation_status IN ('draft', 'validated', 'rejected')),
    CONSTRAINT machine_operation_configuration_validity_chk CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
    CONSTRAINT machine_operation_configuration_json_chk CHECK (
        jsonb_typeof(additional_inputs) = 'array' AND
        jsonb_typeof(specific_controls) = 'array' AND
        jsonb_typeof(available_measurements) = 'array' AND
        jsonb_typeof(specific_safety_rules) = 'array'
    )
);

CREATE OR REPLACE FUNCTION validate_machine_operation_configuration_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    node_type TEXT;
    node_process UUID;
BEGIN
    SELECT n.node_type, n.process_id
      INTO node_type, node_process
      FROM pm_process_node n
     WHERE n.node_id = NEW.operation_id;
    IF node_process IS NULL THEN
        RAISE EXCEPTION 'operation_id no existe en pm_process_node';
    END IF;
    IF node_type <> 'operation' THEN
        RAISE EXCEPTION 'operation_id debe referenciar un nodo BPM operation';
    END IF;
    IF node_process <> NEW.process_id THEN
        RAISE EXCEPTION 'operation_id no pertenece a process_id';
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS machine_operation_configuration_identity_trg ON machine_operation_configuration;
CREATE TRIGGER machine_operation_configuration_identity_trg
    BEFORE INSERT OR UPDATE ON machine_operation_configuration
    FOR EACH ROW EXECUTE FUNCTION validate_machine_operation_configuration_identity();

CREATE INDEX IF NOT EXISTS idx_machine_operation_configuration_machine ON machine_operation_configuration(machine_id);
CREATE INDEX IF NOT EXISTS idx_machine_operation_configuration_operation ON machine_operation_configuration(operation_id, process_id);
CREATE INDEX IF NOT EXISTS idx_machine_operation_configuration_contract ON machine_operation_configuration(contract_id);

ALTER TABLE pm_process_node ADD COLUMN IF NOT EXISTS output_role TEXT;
ALTER TABLE pm_process_node ADD COLUMN IF NOT EXISTS stock_capacity INTEGER;
ALTER TABLE pm_process_node ADD COLUMN IF NOT EXISTS stock_initial_quantity INTEGER;
ALTER TABLE pm_process_node ADD COLUMN IF NOT EXISTS stock_unit TEXT;
DO $$
BEGIN
    ALTER TABLE pm_process_node DROP CONSTRAINT IF EXISTS pm_process_node_node_type_check;
    ALTER TABLE pm_process_node ADD CONSTRAINT pm_process_node_node_type_check CHECK (node_type IN ('input', 'output', 'operation', 'subprocess', 'decision', 'stock'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS pm_process_transition (
    transition_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES bpm_process(process_id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES pm_process_node(node_id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES pm_process_node(node_id) ON DELETE CASCADE,
    transition_type TEXT NOT NULL CHECK (transition_type IN ('sequence', 'branch')),
    label TEXT,
    condition TEXT,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (process_id, source_node_id, target_node_id, transition_type),
    CONSTRAINT pm_transition_self_chk CHECK (source_node_id <> target_node_id)
);

CREATE INDEX IF NOT EXISTS idx_pm_process_parent ON bpm_process(parent_process_id);
CREATE INDEX IF NOT EXISTS idx_pm_process_node_process ON pm_process_node(process_id);
CREATE INDEX IF NOT EXISTS idx_pm_node_code ON pm_process_node(node_code);
CREATE INDEX IF NOT EXISTS idx_pm_node_child_process ON pm_process_node(child_process_id);
CREATE INDEX IF NOT EXISTS idx_pm_transition_source ON pm_process_transition(source_node_id);
CREATE INDEX IF NOT EXISTS idx_pm_transition_target ON pm_process_transition(target_node_id);

DO $$
BEGIN
    ALTER TABLE contrato
        ADD CONSTRAINT contrato_bpm_process_fk
        FOREIGN KEY (bpm_process_id)
        REFERENCES bpm_process(process_id)
        ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE contrato
        ADD CONSTRAINT contrato_bpm_node_fk
        FOREIGN KEY (bpm_node_id)
        REFERENCES pm_process_node(node_id)
        ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE contrato
        ADD CONSTRAINT contrato_bpm_scope_chk
        CHECK (num_nonnulls(bpm_process_id, bpm_node_id) = 1) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION validate_contrato_bpm_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    node_process UUID;
    canonical_process INT;
BEGIN
    IF NEW.bpm_process_id IS NULL AND NEW.bpm_node_id IS NULL THEN
        RAISE EXCEPTION 'El contrato debe estar vinculado a un proceso o una operación BPM';
    END IF;
    IF NEW.bpm_process_id IS NOT NULL AND NEW.bpm_node_id IS NOT NULL THEN
        RAISE EXCEPTION 'El contrato no puede estar vinculado a proceso y operación BPM simultáneamente';
    END IF;

    IF NEW.bpm_node_id IS NOT NULL THEN
          SELECT n.process_id
          INTO node_process
          FROM pm_process_node n
         WHERE n.node_id = NEW.bpm_node_id
           AND n.node_type = 'operation';
        IF node_process IS NULL THEN
            RAISE EXCEPTION 'bpm_node_id debe referenciar una operación BPM válida';
        END IF;
        SELECT id INTO canonical_process FROM proceso WHERE bpm_process_id = node_process;
    ELSE
        node_process := NEW.bpm_process_id;
        SELECT id INTO canonical_process FROM proceso WHERE bpm_process_id = node_process;
    END IF;
    IF canonical_process IS NULL OR NEW.proceso_id <> canonical_process THEN
        RAISE EXCEPTION 'El proceso canónico no coincide con el alcance BPM del contrato';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contrato_bpm_scope_trg ON contrato;
CREATE TRIGGER contrato_bpm_scope_trg
    BEFORE INSERT OR UPDATE OF proceso_id, bpm_process_id, bpm_node_id ON contrato
    FOR EACH ROW EXECUTE FUNCTION validate_contrato_bpm_scope();

-- Free-form, agent-oriented documentation for each process element.
CREATE TABLE IF NOT EXISTS pm_process_node_metadata (
    metadata_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL UNIQUE REFERENCES pm_process_node(node_id) ON DELETE CASCADE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pm_node_metadata_object_chk CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_pm_node_metadata_node ON pm_process_node_metadata(node_id);

-- General context records. The record_type separates current declarations,
-- execution facts and evidence without creating a table per process/family.
-- Deployment is performed by the data-model deployment phase.
CREATE TABLE IF NOT EXISTS pm_context_record (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES bpm_process(process_id) ON DELETE CASCADE,
    node_id UUID REFERENCES pm_process_node(node_id) ON DELETE CASCADE,
    record_type TEXT NOT NULL CHECK (record_type IN ('declaration', 'fact', 'evidence')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    source JSONB NOT NULL DEFAULT '{}'::jsonb,
    provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
    execution_id TEXT,
    supports JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pm_context_record_payload_chk CHECK (jsonb_typeof(payload) = 'object'),
    CONSTRAINT pm_context_record_source_chk CHECK (jsonb_typeof(source) = 'object'),
    CONSTRAINT pm_context_record_provenance_chk CHECK (jsonb_typeof(provenance) = 'object'),
    CONSTRAINT pm_context_record_supports_chk CHECK (supports IS NULL OR jsonb_typeof(supports) = 'object'),
    CONSTRAINT pm_context_record_owner_chk CHECK (process_id IS NOT NULL OR node_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pm_context_record_process ON pm_context_record(process_id);
CREATE INDEX IF NOT EXISTS idx_pm_context_record_node ON pm_context_record(node_id);
CREATE INDEX IF NOT EXISTS idx_pm_context_record_type ON pm_context_record(record_type);
