"""Environment-backed startup configuration kept outside the domain."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class PlatformConfig:
    host: str = "127.0.0.1"
    port: int = 8050
    debug: bool = False
    use_reloader: bool = False

    @classmethod
    def from_environment(cls) -> "PlatformConfig":
        return cls(
            host=os.environ.get("WEBAPP_JAVA_HOST", cls.host),
            port=int(os.environ.get("WEBAPP_JAVA_PORT", str(cls.port))),
            debug=os.environ.get("WEBAPP_JAVA_DEBUG", "0").strip().lower() not in {"0", "false", "no"},
        )

