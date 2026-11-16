var openCount = 0;
const history = [];

export function open(payload = {}) {
  openCount += 1;
  history.unshift(payload);
}
