const fs = require('fs');
const raw = fs.readFileSync('wiki_annex.json', 'utf8');
const jsonData = JSON.parse(raw);
const pages = jsonData.query.pages;
const pageId = Object.keys(pages)[0];
const wikitext = pages[pageId].revisions[0].slots.main['*'];

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
// Table columns order: 1A vs, 1B vs, 1D vs, 1E vs, 1G vs, 1I vs, 1K vs, 1L vs
// Maps to match slots: P79,  P85,  P81,  P74,  P82,  P77,  P87,  P80
const MATCH_SLOTS = ['P79','P85','P81','P74','P82','P77','P87','P80'];

const lookup = {};

// Split wikitext into row blocks by "|-"
const blocks = wikitext.split('|-\n');

for (const block of blocks) {
  // Check if this block has a row number
  const rowMatch = block.match(/^! scope="row" \| (\d+)\n/);
  if (!rowMatch) continue;
  const rowNum = parseInt(rowMatch[1]);

  // For row 1: groups on one line, assignments on next (after rowspan separator)
  // For rows 2-495: all 20 cells on ONE line starting with "| "
  let cells = [];

  const splitPipeLine = (line) =>
    line.split(/\s*\|\|\s*/).map((c, i) => i === 0 ? c.replace(/^\| ?/, '').trim() : c.trim());

  if (rowNum === 1) {
    const pipeLines = block.split('\n').filter(l => l.startsWith('| '));
    if (pipeLines.length >= 2) {
      cells = [...splitPipeLine(pipeLines[0]), ...splitPipeLine(pipeLines[1])];
    }
  } else {
    const pipeLine = block.split('\n').find(l => l.startsWith('| '));
    if (pipeLine) {
      cells = splitPipeLine(pipeLine);
    }
  }

  if (cells.length < 20) continue;

  // Extract which groups are in the combination (first 12 cells)
  const activeGroups = [];
  for (let g = 0; g < 12; g++) {
    if ((cells[g] || '').includes("'''")) {
      activeGroups.push(GROUPS[g]);
    }
  }

  // Extract assignments (cells 12-19)
  const assignments = {};
  for (let a = 0; a < 8; a++) {
    const cell = (cells[12 + a] || '').trim().replace(/'/g, '');
    assignments[MATCH_SLOTS[a]] = cell;
  }

  if (activeGroups.length === 8) {
    const key = activeGroups.join('');
    lookup[key] = assignments;
  }
}

console.log('Total combinations parsed:', Object.keys(lookup).length);
console.log('\nABCDEFIL:', JSON.stringify(lookup['ABCDEFIL'], null, 2));
console.log('\nEFGHIJKL (row 1):', JSON.stringify(lookup['EFGHIJKL'], null, 2));
console.log('\nDFGHIJKL (row 2):', JSON.stringify(lookup['DFGHIJKL'], null, 2));

// Write the full JS lookup table
const jsOutput = `// FIFA 2026 Annex C — 495 combinations (source: Wikipedia Template)
// Key: 8 qualifying groups sorted alphabetically joined (e.g. "ABCDEFIL")
// Value columns map to: P79=1Avs, P85=1Bvs, P81=1Dvs, P74=1Evs, P82=1Gvs, P77=1Ivs, P87=1Kvs, P80=1Lvs
// "3X" = 3rd place of group X, "2X" = 2nd place of group X (when third displaces a second)
export const THIRDS_TABLE = ${JSON.stringify(lookup, null, 0)};
`;

fs.writeFileSync('annex_c_output.js', jsOutput);
console.log('\nWritten to annex_c_output.js');
