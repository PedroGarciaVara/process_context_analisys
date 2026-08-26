"""Backfill the explicit BPM scope of legacy contracts in the local database."""

from uc_bib_solv.modules.platform.infrastructure.postgres import db_cursor


def main() -> None:
    with db_cursor() as cur:
        cur.execute("ALTER TABLE contrato ADD COLUMN IF NOT EXISTS bpm_process_id UUID")
        cur.execute("ALTER TABLE contrato ADD COLUMN IF NOT EXISTS bpm_node_id UUID")
        cur.execute(
            """
            SELECT n.node_id, n.name, (n.properties->'canonical_ids'->>'contrato_id')::INT AS contract_id,
                   p.process_id AS bpm_process_id, lp.id AS proceso_id
              FROM pm_process_node n
              JOIN pm_process_version v ON v.version_id=n.version_id
              JOIN bpm_process p ON p.process_id=v.process_id
              JOIN proceso lp ON lp.bpm_process_id=p.process_id
             WHERE n.node_type='operation'
               AND (n.properties->'canonical_ids'->>'contrato_id') IS NOT NULL
            """
        )
        mapped = cur.fetchall()
        mapped_ids = {int(row["contract_id"]) for row in mapped}
        cur.execute("SELECT id FROM contrato")
        all_ids = {int(row["id"]) for row in cur.fetchall()}
        orphan_ids = all_ids - mapped_ids

        for row in mapped:
            cur.execute(
                """
                UPDATE contrato
                   SET proceso_id=%s, bpm_process_id=NULL, bpm_node_id=%s, nombre=%s
                 WHERE id=%s
                """,
                (int(row["proceso_id"]), str(row["node_id"]), row["name"], int(row["contract_id"])),
            )

        for contract_id in sorted(orphan_ids):
            cur.execute("UPDATE causa SET parent_id=NULL WHERE contrato_id=%s", (contract_id,))
            cur.execute(
                """
                DELETE FROM analisis_resultado ar
                 USING analisis_causas ac
                 WHERE ar.analisis_id=ac.id AND ac.contrato_id=%s
                """,
                (contract_id,),
            )
            cur.execute("DELETE FROM contrato WHERE id=%s", (contract_id,))

        cur.execute(
            """
            ALTER TABLE contrato
              ADD CONSTRAINT contrato_bpm_process_fk
              FOREIGN KEY (bpm_process_id) REFERENCES bpm_process(process_id) ON DELETE RESTRICT
            """
        )
        cur.execute(
            """
            ALTER TABLE contrato
              ADD CONSTRAINT contrato_bpm_node_fk
              FOREIGN KEY (bpm_node_id) REFERENCES pm_process_node(node_id) ON DELETE RESTRICT
            """
        )
        cur.execute(
            """
            ALTER TABLE contrato
              ADD CONSTRAINT contrato_bpm_scope_chk
              CHECK (num_nonnulls(bpm_process_id, bpm_node_id)=1)
            """
        )
        cur.execute("SELECT COUNT(*) AS count FROM contrato WHERE num_nonnulls(bpm_process_id, bpm_node_id) <> 1")
        invalid = int(cur.fetchone()["count"])
        if invalid:
            raise RuntimeError(f"Quedan {invalid} contratos sin alcance BPM válido")
        cur.execute(
            """
            CREATE OR REPLACE FUNCTION validate_contrato_bpm_scope()
            RETURNS trigger LANGUAGE plpgsql AS $fn$
            DECLARE node_process UUID; canonical_process INT;
            BEGIN
                IF NEW.bpm_process_id IS NULL AND NEW.bpm_node_id IS NULL
                   OR NEW.bpm_process_id IS NOT NULL AND NEW.bpm_node_id IS NOT NULL THEN
                    RAISE EXCEPTION 'El contrato debe tener exactamente un alcance BPM';
                END IF;
                IF NEW.bpm_node_id IS NOT NULL THEN
                    SELECT v.process_id INTO node_process
                      FROM pm_process_node n JOIN pm_process_version v ON v.version_id=n.version_id
                     WHERE n.node_id=NEW.bpm_node_id AND n.node_type='operation';
                    IF node_process IS NULL THEN RAISE EXCEPTION 'bpm_node_id no es una operación BPM válida'; END IF;
                ELSE
                    node_process := NEW.bpm_process_id;
                END IF;
                SELECT id INTO canonical_process FROM proceso WHERE bpm_process_id=node_process;
                IF canonical_process IS NULL OR NEW.proceso_id <> canonical_process THEN
                    RAISE EXCEPTION 'El proceso canónico no coincide con el alcance BPM';
                END IF;
                RETURN NEW;
            END;
            $fn$
            """
        )
        cur.execute("DROP TRIGGER IF EXISTS contrato_bpm_scope_trg ON contrato")
        cur.execute(
            """
            CREATE TRIGGER contrato_bpm_scope_trg
            BEFORE INSERT OR UPDATE OF proceso_id, bpm_process_id, bpm_node_id ON contrato
            FOR EACH ROW EXECUTE FUNCTION validate_contrato_bpm_scope()
            """
        )
        print({"mapped": len(mapped_ids), "deleted": len(orphan_ids), "remaining": len(all_ids - orphan_ids)})


if __name__ == "__main__":
    main()
