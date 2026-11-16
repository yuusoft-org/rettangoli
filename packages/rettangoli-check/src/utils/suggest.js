const editDistance = (left, right) => {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
};

// The single candidate closest to `name`, or undefined. Short names get no suggestion and a tie
// between candidates gets none either: a wrong hint is worse than no hint.
export const findClosestName = ({ name = "", candidates = [] }) => {
  const target = String(name).toLowerCase();
  if (target.length < 4) {
    return undefined;
  }
  const maxDistance = target.length < 6 ? 1 : 2;

  let best;
  let bestDistance = maxDistance + 1;
  let tied = false;
  [...new Set(candidates)].forEach((candidate) => {
    const normalized = String(candidate).toLowerCase();
    if (normalized.length < 3 || Math.abs(normalized.length - target.length) > maxDistance) {
      return;
    }
    const distance = normalized === target ? 0 : editDistance(target, normalized);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
      tied = false;
    } else if (distance === bestDistance) {
      tied = true;
    }
  });

  return tied ? undefined : best;
};
