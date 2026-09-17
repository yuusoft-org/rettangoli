// A global symbol keeps parent and child transactions compatible across bundles.
export const PARENT_UPDATE_TRANSACTION = Symbol.for(
  "@rettangoli/fe/parent-update-transaction",
);
