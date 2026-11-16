const EMPTY = Object.freeze({});

export function reset(payload = EMPTY) {
  const history = [];
  history.push(payload);
  return history.length;
}
