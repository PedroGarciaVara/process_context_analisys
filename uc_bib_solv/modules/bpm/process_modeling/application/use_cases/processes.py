from uc_bib_solv.modules.bpm.domain.processes.entities import ProcessDefinition, ProcessVersion
from uc_bib_solv.modules.bpm.domain.processes.exceptions import NotFoundError, ProcessModelingError
from .dependencies import jsonable, ProcessModelingDependencies


class GetProcess:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, process_id):
        try:
            value = self.dependencies.processes.get(process_id)
        except (ValueError, TypeError):
            raise ProcessModelingError("process_id debe ser un UUID válido", "invalid_uuid")
        if not value:
            raise NotFoundError("Proceso no encontrado")
        return jsonable(value)


class ListProcesses:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self):
        return jsonable(self.dependencies.processes.list())


class UpdateProcess:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies
        self.get_process = GetProcess(dependencies)

    def execute(self, process_id, data):
        current = self.get_process.execute(process_id)
        values = {
            "process_id": current["process_id"],
            "process_code": data.get("process_code", current.get("process_code")),
            "name": data.get("name", current.get("name")),
            "description": data.get("description", current.get("description")),
            "abstraction_level": data.get("abstraction_level", current.get("abstraction_level", 0)),
            "parent_process_id": data.get("parent_process_id", current.get("parent_process_id")),
            "status": data.get("status", current.get("status", "draft")),
        }
        entity = ProcessDefinition(**values)
        if entity.parent_process_id:
            parent = self.dependencies.processes.get(entity.parent_process_id)
            if not parent:
                raise NotFoundError("Proceso padre no encontrado")
            if str(entity.parent_process_id) == str(entity.process_id) or self.dependencies.hierarchy_contains(entity.parent_process_id, entity.process_id):
                raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
        result = self.dependencies.processes.update(process_id, entity.to_dict())
        if not result:
            raise NotFoundError("Proceso no encontrado")
        return jsonable(result)


class CreateProcess:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies

    def execute(self, data):
        entity = ProcessDefinition(**{
            key: value
            for key, value in data.items()
            if key in ProcessDefinition.__dataclass_fields__ and key != "process_id"
        })
        if entity.parent_process_id:
            parent = self.dependencies.processes.get(entity.parent_process_id)
            if not parent:
                raise NotFoundError("Proceso padre no encontrado")
            if str(parent.get("process_id")) == str(entity.process_id) or self.dependencies.hierarchy_contains(entity.parent_process_id, entity.process_id):
                raise ProcessModelingError("La jerarquía contiene un ciclo", "hierarchy_cycle")
        return jsonable(self.dependencies.processes.create(entity.to_dict()))


class ListVersions:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.get_process = GetProcess(dependencies)

    def execute(self, process_id):
        process = self.get_process.execute(process_id)
        return jsonable(process.get("versions", []))


class CreateVersion:
    def __init__(self, dependencies: ProcessModelingDependencies):
        self.dependencies = dependencies
        self.get_process = GetProcess(dependencies)

    def execute(self, process_id, data):
        self.get_process.execute(process_id)
        entity = ProcessVersion(
            process_id=process_id,
            **{
                key: value
                for key, value in data.items()
                if key in {"version_id", "version_number", "change_description"}
            },
        )
        return jsonable(self.dependencies.versions.create(process_id, entity.to_dict()))
