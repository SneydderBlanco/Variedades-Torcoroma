import fs from 'fs';

const logPath = 'C:\\Users\\chris\\.gemini\\antigravity\\brain\\c43115c8-f207-48dc-85dd-574e8c70e30c\\.system_generated\\tasks\\task-2866.log';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  const errorLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('error')) {
      // get surrounding lines
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 5);
      errorLines.push(lines.slice(start, end).join('\n'));
      errorLines.push('------------------------');
      i = end;
    }
  }
  
  console.log(errorLines.slice(-3).join('\n'));
} catch (err) {
  console.error(err);
}
