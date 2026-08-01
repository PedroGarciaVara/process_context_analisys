export function createEventBus() {
  const listeners = new Map();

  return {
    on(event, handler) {
      const handlers = listeners.get(event) || [];
      handlers.push(handler);
      listeners.set(event, handlers);
      return () => {
        const current = listeners.get(event) || [];
        listeners.set(
          event,
          current.filter((candidate) => candidate !== handler),
        );
      };
    },
    off(event, handler) {
      const handlers = listeners.get(event) || [];
      listeners.set(
        event,
        handlers.filter((candidate) => candidate !== handler),
      );
    },
    emit(event, payload) {
      const handlers = listeners.get(event) || [];
      handlers.forEach((handler) => handler(payload));
    },
  };
}
