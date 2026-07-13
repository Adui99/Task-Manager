const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'KanbanBoard.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const typeStartIdx = content.indexOf('type Task = {');
if (typeStartIdx !== -1) {
  const exportFuncIdx = content.indexOf('export function KanbanBoard', typeStartIdx);
  if (exportFuncIdx !== -1) {
    content = content.substring(0, typeStartIdx) + content.substring(exportFuncIdx);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Removed type Task block.');
  }
}
