const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'inci_names.txt');
const txtOutPath = path.join(__dirname, 'inci_names.normalized.txt');
const jsonOutPath = path.join(__dirname, 'inci_names.normalized.json');

const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

const normalized = lines
  .map(line => line.replace(/"/g, '').trim().toLowerCase())
  .filter(line => line.length > 0 && !/^\d$/.test(line));

fs.writeFileSync(txtOutPath, normalized.join('\n'), 'utf8');
fs.writeFileSync(jsonOutPath, JSON.stringify(normalized, null, 2), 'utf8');

console.log(`Normalisierung abgeschlossen. Text: ${txtOutPath}, JSON: ${jsonOutPath}`); 