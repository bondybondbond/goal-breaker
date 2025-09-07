// Test the updated import functionality
const testMermaid = `graph TD
    A["test"]
    B["✅ test1"]
    C["testaa"]
    D["✅ 3test"]
    E["✅ aaaaeeeeerrr"]
    F["etestest"]
    G["✅ aaa"]
    A --> B
    A --> C
    B --> D
    C --> E
    D --> F
    D --> G`;

// This should work with the updated parser:
// - A["test"] should be incomplete (no emoji needed)
// - B["✅ test1"] should be completed with text "test1"  
// - F["etestest"] should be incomplete with text "etestest"
// - Positioning should use right-to-left grid system

console.log('Testing with your exact input...');
console.log('Expected: Clean text without 📝, proper right-to-left positioning');
