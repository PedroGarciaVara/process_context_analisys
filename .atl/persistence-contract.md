# Persistence Contract

- engram: Stores artifacts in memory (engram) for session recovery.
- openspec: Stores artifacts as local files in openspec/ directory.
- hybrid: Stores in both engram and openspec.
- none: No persistence, results inline.

Default: engram if available, openspec if requested, none otherwise.