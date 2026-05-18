export const pollingRegistry = {
  _map: new Map(),
  register(id, name) { this._map.set(id, name); },
  unregister(id)     { this._map.delete(id); },
  count()            { return this._map.size; },
};
