#!/usr/bin/env node

/**
 * Console Statement Finder
 * Finds all remaining console.log/error/warn/debug statements in the codebase
 * Run with: node scripts/find-console-statements.js
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const consoleRegex = /console\.(log|error|warn|debug|info)/g;

let totalFiles = 0;
let filesWithConsole = 0;
let totalStatements = 0;

function searchDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      searchDirectory(filePath, results);
    } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
      totalFiles++;
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = [...content.matchAll(consoleRegex)];

      if (matches.length > 0) {
        filesWithConsole++;
        totalStatements += matches.length;

        const lines = content.split('\n');
        const locations = [];

        matches.forEach(match => {
          const index = match.index;
          let lineNumber = 1;
          let currentPos = 0;

          for (let i = 0; i < lines.length; i++) {
            currentPos += lines[i].length + 1; // +1 for newline
            if (currentPos > index) {
              lineNumber = i + 1;
              break;
            }
          }

          locations.push({
            line: lineNumber,
            type: match[1],
            snippet: lines[lineNumber - 1].trim(),
          });
        });

        results.push({
          file: path.relative(process.cwd(), filePath),
          count: matches.length,
          locations,
        });
      }
    }
  });

  return results;
}

console.log('🔍 Searching for console statements...\n');

const results = searchDirectory(srcDir);

if (results.length === 0) {
  console.log('✅ No console statements found!');
  process.exit(0);
}

console.log(`📊 Summary:`);
console.log(`   Total files scanned: ${totalFiles}`);
console.log(`   Files with console statements: ${filesWithConsole}`);
console.log(`   Total console statements: ${totalStatements}\n`);

console.log('📝 Files with console statements:\n');

results.forEach(result => {
  console.log(`📄 ${result.file} (${result.count} statement${result.count > 1 ? 's' : ''})`);
  result.locations.forEach(loc => {
    console.log(`   Line ${loc.line}: console.${loc.type}(...)`);
    console.log(`   ${loc.snippet}`);
  });
  console.log('');
});

console.log('💡 Tip: Replace these with the logger from src/lib/logger.ts or src/lib/api-logger.ts');

process.exit(totalStatements > 0 ? 1 : 0);
