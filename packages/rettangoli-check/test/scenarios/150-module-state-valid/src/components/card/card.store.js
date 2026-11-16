const DEFAULT_KINDS = ["a", "b"];
const EXTRA_KINDS = [];
if (DEFAULT_KINDS.length > 1) EXTRA_KINDS.push("c");

export const createInitialState = () => ({ kind: DEFAULT_KINDS[0], known: false });

export const selectViewData = ({ state }) => ({ kind: state.kind });

export const select = ({ state }, { kind, known }) => {
  state.kind = kind;
  state.known = known;
};
