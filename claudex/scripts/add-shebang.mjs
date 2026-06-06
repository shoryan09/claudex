import { readFileSync, writeFileSync } from 'fs';
const file = 'bin/contextis.js';
let content = readFileSync(file, 'utf8');
content = content.replace(/\r\n/g, '\n');
if (!content.startsWith('#!/usr/bin/env node\n')) {
  content = '#!/usr/bin/env node\n' + content.replace(/^#!.*\n/, '');
}
writeFileSync(file, content);
console.log('shebang normalized');