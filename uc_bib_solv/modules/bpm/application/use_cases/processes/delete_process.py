class DeleteProcess:
    """Delete a process through the BPM persistence port."""

    def __init__(self, persistence):
        self.persistence = persistence

    def execute(self, process_id):
        return self.persistence.delete_process(process_id)
