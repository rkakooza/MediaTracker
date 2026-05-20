export const normalizeMediaTitle = (title: string | null | undefined) => {
  return (title ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
};

export class SimilarTitleError extends Error {
  similarTitle: string;

  constructor(similarTitle: string) {
    super(`Similar title found: ${similarTitle}. Save anyway?`);
    this.name = 'SimilarTitleError';
    this.similarTitle = similarTitle;
  }
}

const getEditDistance = (first: string, second: string) => {
  const rows = first.length + 1;
  const columns = second.length + 1;
  const distances = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

  for (let row = 0; row < rows; row += 1) {
    distances[row][0] = row;
  }

  for (let column = 0; column < columns; column += 1) {
    distances[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitutionCost = first[row - 1] === second[column - 1] ? 0 : 1;
      distances[row][column] = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + substitutionCost
      );
    }
  }

  return distances[first.length][second.length];
};

const hasNumericSuffix = (title: string) => /\b\d+$/.test(title);

export const areSimilarMediaTitles = (firstTitle: string | null | undefined, secondTitle: string | null | undefined) => {
  const first = normalizeMediaTitle(firstTitle);
  const second = normalizeMediaTitle(secondTitle);

  if (!first || !second || first === second) return false;
  if (hasNumericSuffix(first) || hasNumericSuffix(second)) return false;

  const longerLength = Math.max(first.length, second.length);
  if (longerLength < 5) return false;

  const allowedDistance = longerLength <= 8 ? 1 : 2;
  return getEditDistance(first, second) <= allowedDistance;
};
