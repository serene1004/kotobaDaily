import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2] ?? 'src/n5.csv';
const level = path.basename(input, path.extname(input)).toUpperCase();
if (!['N5', 'N4', 'N3'].includes(level)) throw new Error(`Unsupported JLPT level: ${level}`);
const output = process.argv[3] ?? `public/data/${level.toLowerCase()}.json`;
const csv = fs.readFileSync(input, 'utf8');
const rows = csv.trim().split(/\r?\n/).slice(1);
const splitCsvLine = (line) => {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else cell += character;
  }
  return [...cells, cell];
};

const existingWords = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8')) : [];
if (
  !Array.isArray(existingWords) ||
  existingWords.some((word) => !word || typeof word.id !== 'string')
) {
  throw new Error('Existing vocabulary data is invalid; output was not changed');
}
const existingById = new Map(existingWords.map((word) => [word.id, word]));

const words = rows
  .map((line) => {
    const [jp, reading, meaningEn] = splitCsvLine(line).map((value) => value.trim());
    if (!jp || !reading || !meaningEn) return null;
    const id = level === 'N5' ? `${jp}-${reading}` : `${level}-${jp}-${reading}`;
    const existing = existingById.get(id);
    return {
      ...existing,
      id: level === 'N5' ? `${jp}-${reading}` : `${level}-${jp}-${reading}`,
      jp,
      reading,
      meaningKo: existing?.meaningKo || meaningEn,
      meaningEn,
      jlptLevel: level,
    };
  })
  .filter(Boolean);

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(words, null, 2)}\n`);
