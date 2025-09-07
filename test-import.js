// Test the import functionality
import { importFromMermaid } from '../src/utils/mermaidHelpers';

// Test case 1: Basic valid Mermaid code
const testMermaid = `graph TD
    A["📝 Learn React"]
    B["📝 Build Component"]
    C["✅ Setup Project"]
    D["📝 Add Tests"]
    A --> B
    A --> C
    B --> D`;

console.log('Testing import function...');
const result = importFromMermaid(testMermaid);

if (result.success) {
  console.log('✅ Import successful!');
  console.log('Goals created:', result.goals?.length);
  console.log('Goals:', result.goals?.map(g => `${g.text} (Level ${g.level})`));
} else {
  console.log('❌ Import failed:', result.error);
}

// Test case 2: Invalid format
const invalidMermaid = `invalid format
    A --> B`;

const invalidResult = importFromMermaid(invalidMermaid);
console.log('Invalid format test:', invalidResult.success ? 'FAILED' : 'PASSED');
