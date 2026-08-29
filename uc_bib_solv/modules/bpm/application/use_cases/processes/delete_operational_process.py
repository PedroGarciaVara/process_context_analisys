class DeleteOperationalProcess:
    """Delete a process through the BPM persistence port."""

    def __init__(self, process_port):
        self.process_port = process_port

    def execute(self, process_id):
        return self.process_port.delete_process(process_id)
