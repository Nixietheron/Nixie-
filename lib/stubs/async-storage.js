/**
 * Stub for @react-native-async-storage/async-storage (used by MetaMask SDK in web).
 * Web builds don't need persistent storage from this package; no-ops are safe.
 */
const noop = () => Promise.resolve();
const stub = {
  getItem: () => Promise.resolve(null),
  setItem: noop,
  removeItem: noop,
  getAllKeys: () => Promise.resolve([]),
  multiGet: () => Promise.resolve([]),
  multiSet: noop,
  multiRemove: noop,
  clear: noop,
};
export default stub;
