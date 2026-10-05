import { cpSync } from 'fs';
import { resolve } from 'path';

// Copy the docs folder to dist/docs
cpSync(resolve('docs'), resolve('dist/docs'), { recursive: true });
console.log('✅ [Assets] Copied docs/ to dist/docs/');

// Copy the AI context folder to dist/src/context
cpSync(resolve('src/context'), resolve('dist/src/context'), { recursive: true });
console.log('✅ [Assets] Copied src/context/ to dist/src/context/');
