# Rettangoli Frontend - Immediate Action Plan

## 🚨 Critical Priority Actions (Start Immediately)

### Action 1: Break Down the Monolithic Parser (Est: 2-3 days)

**Target:** `packages/rettangoli-fe/src/parser.js` (411 lines → 5 focused modules)

#### Step 1.1: Create Module Structure
```bash
mkdir -p packages/rettangoli-fe/src/parsers
mkdir -p packages/rettangoli-fe/src/vdom
mkdir -p packages/rettangoli-fe/src/events
```

#### Step 1.2: Extract YAML Parser Logic
**Create:** `packages/rettangoli-fe/src/parsers/yaml-parser.js`
```javascript
// Extract lines 1-78 from parser.js
export class YAMLTemplateParser {
  parseView({ template, viewData }) {
    // Move jemplRender logic here
    // Add proper error handling
    // Return structured AST
  }
}
```

#### Step 1.3: Extract Virtual DOM Generator  
**Create:** `packages/rettangoli-fe/src/vdom/vdom-generator.js`
```javascript
// Extract createVirtualDom function (lines 89-410)
export class VirtualDOMGenerator {
  generate(items, refs, handlers, viewData) {
    // Simplified, focused logic
    // Remove event handling from here
  }
}
```

#### Step 1.4: Extract Event Binding Logic
**Create:** `packages/rettangoli-fe/src/events/event-binder.js`
```javascript
// Extract lines 238-296 from parser.js
export class EventBinder {
  bindEvents(element, elementId, refs, handlers) {
    // Focused event binding logic
    // Better error handling
  }
}
```

#### Step 1.5: Refactor Main Parser
**Update:** `packages/rettangoli-fe/src/parser.js`
```javascript
import { YAMLTemplateParser } from './parsers/yaml-parser.js';
import { VirtualDOMGenerator } from './vdom/vdom-generator.js';
import { EventBinder } from './events/event-binder.js';

export const parseView = ({ h, template, viewData, refs, handlers }) => {
  const parser = new YAMLTemplateParser();
  const generator = new VirtualDOMGenerator();
  const binder = new EventBinder();
  
  // Orchestrate the parsing process
  const ast = parser.parseView({ template, viewData });
  const vdom = generator.generate(ast, refs, handlers, viewData);
  return vdom;
};
```

### Action 2: Simplify Component Factory (Est: 2-3 days)

**Target:** `packages/rettangoli-fe/src/createComponent.js` (488 lines → 4 focused modules)

#### Step 2.1: Extract CSS Processing
**Create:** `packages/rettangoli-fe/src/styles/css-processor.js`
```javascript
// Extract yamlToCss function (lines 32-78)
export class CSSProcessor {
  process(elementName, styleObject) {
    // Focused CSS generation
    // Add CSS validation
    // Support CSS custom properties better
  }
}
```

#### Step 2.2: Extract Store Binding
**Create:** `packages/rettangoli-fe/src/state/store-binder.js`
```javascript
// Extract bindStore function (lines 404-431)
export class StoreBinder {
  bind(store, props, attrs) {
    // Cleaner state management
    // Better immutability handling
  }
}
```

#### Step 2.3: Extract Base Component Logic
**Create:** `packages/rettangoli-fe/src/components/base-component.js`
```javascript
// Extract BaseComponent class (lines 195-394)
export class BaseComponent extends HTMLElement {
  // Simplified lifecycle management
  // Better error handling
  // Cleaner proxy management
}
```

#### Step 2.4: Refactor Component Factory
**Update:** `packages/rettangoli-fe/src/createComponent.js`
```javascript
import { CSSProcessor } from './styles/css-processor.js';
import { StoreBinder } from './state/store-binder.js';
import { BaseComponent } from './components/base-component.js';

const createComponent = ({ handlers, view, store, patch, h }, deps) => {
  // Orchestration logic only
  // Much cleaner and focused
};
```

### Action 3: Modularize Common Utilities (Est: 1-2 days)

**Target:** `packages/rettangoli-fe/src/common.js` (204 lines → 5 focused modules)

#### Step 3.1: Extract Event Bus
**Create:** `packages/rettangoli-fe/src/events/event-bus.js`
```javascript
// Extract CustomSubject class (lines 18-32)
export class EventBus {
  // Cleaner event bus implementation
  // Better type safety
}
```

#### Step 3.2: Extract HTTP Client  
**Create:** `packages/rettangoli-fe/src/http/http-client.js`
```javascript
// Extract createHttpClient and related classes (lines 86-165)
export class HttpClient {
  // Focused HTTP functionality
  // Better error handling
}
```

#### Step 3.3: Create Utility Modules
**Create multiple focused utility files:**
- `packages/rettangoli-fe/src/utils/array-utils.js` (flattenArrays)
- `packages/rettangoli-fe/src/utils/path-utils.js` (matchPaths, extractCategoryAndComponent)
- `packages/rettangoli-fe/src/utils/layout-utils.js` (LayoutOptions)

### Action 4: Add TypeScript Foundation (Est: 1-2 days)

#### Step 4.1: Setup TypeScript Configuration
**Create:** `packages/rettangoli-fe/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Step 4.2: Create Core Type Definitions
**Create:** `packages/rettangoli-fe/src/types/index.ts`
```typescript
export interface ComponentDefinition {
  view: ViewDefinition;
  store: StoreDefinition;
  handlers: HandlersDefinition;
}

export interface ViewDefinition {
  elementName: string;
  template: any;
  styles?: Record<string, any>;
  refs?: Record<string, RefDefinition>;
}

export interface StoreDefinition {
  INITIAL_STATE: any;
  toViewData: (context: StateContext) => any;
  [key: string]: any;
}

export interface HandlersDefinition {
  [key: string]: (event: Event, deps: ComponentDeps) => void;
}
```

### Action 5: Improve Build System (Est: 2-3 days)

**Target:** `packages/rettangoli-fe/src/cli/build.js` (134 lines)

#### Step 5.1: Extract File Processing
**Create:** `packages/rettangoli-fe/src/build/file-processor.js`
```javascript
export class FileProcessor {
  async processFiles(dirs, filters) {
    // Clean file discovery and processing
    // Better error handling
  }
}
```

#### Step 5.2: Extract Code Generation
**Create:** `packages/rettangoli-fe/src/build/code-generator.js`
```javascript
export class CodeGenerator {
  generateDynamicImports(components) {
    // AST-based code generation instead of string concatenation
    // Better maintainability
  }
}
```

#### Step 5.3: Add Build Configuration
**Create:** `packages/rettangoli-fe/src/build/build-config.js`
```javascript
export class BuildConfig {
  validate(config) {
    // Validate build configuration
    // Provide helpful error messages
  }
}
```

## 🧪 Testing Strategy (Parallel with refactoring)

### Setup Testing Infrastructure
```bash
# Add testing dependencies
npm install --save-dev vitest @testing-library/dom jsdom

# Create test structure
mkdir -p packages/rettangoli-fe/tests/unit
mkdir -p packages/rettangoli-fe/tests/integration
mkdir -p packages/rettangoli-fe/tests/fixtures
```

### Create Test Examples
**Create:** `packages/rettangoli-fe/tests/unit/yaml-parser.test.js`
```javascript
import { describe, it, expect } from 'vitest';
import { YAMLTemplateParser } from '../../src/parsers/yaml-parser.js';

describe('YAMLTemplateParser', () => {
  it('should parse simple template', () => {
    const parser = new YAMLTemplateParser();
    const result = parser.parseView({
      template: [{ 'div': 'Hello' }],
      viewData: {}
    });
    expect(result).toBeDefined();
  });
});
```

## 📋 Week-by-Week Implementation Plan

### Week 1: Foundation Cleanup
- ✅ **Day 1-2:** Break down `parser.js` into 4 modules
- ✅ **Day 3-4:** Simplify `createComponent.js` 
- ✅ **Day 5:** Setup TypeScript foundation

### Week 2: Core Improvements  
- ✅ **Day 1-2:** Modularize `common.js` utilities
- ✅ **Day 3-4:** Improve build system structure
- ✅ **Day 5:** Add comprehensive tests for new modules

### Week 3: Integration & Polish
- ✅ **Day 1-2:** Ensure all modules work together
- ✅ **Day 3-4:** Add error handling and validation
- ✅ **Day 5:** Update documentation and examples

### Week 4: Performance & DX
- ✅ **Day 1-2:** Optimize build performance
- ✅ **Day 3-4:** Add development tools and better error messages
- ✅ **Day 5:** Create migration guide and final testing

## 🎯 Success Criteria

### Code Quality Metrics
- [ ] No single file > 200 lines
- [ ] No function > 50 lines  
- [ ] Cyclomatic complexity < 10
- [ ] Test coverage > 80%

### Performance Metrics
- [ ] Build time improvement: 30-50%
- [ ] Bundle size reduction: 20-30%
- [ ] Development server start time < 2s

### Developer Experience
- [ ] TypeScript support with autocompletion
- [ ] Clear error messages with actionable suggestions
- [ ] Comprehensive documentation with examples

## 🚀 Implementation Tips

### 1. **Extract First, Optimize Later**
Focus on moving code to appropriate modules before optimizing the logic.

### 2. **Maintain Backward Compatibility**
Keep existing exports working while transitioning to new structure.

### 3. **Test Everything**
Add tests for each new module to prevent regressions.

### 4. **Document Decisions**
Record why certain architectural decisions were made.

### 5. **Incremental Migration**
Update one module at a time, ensuring the system works at each step.

## 🔥 Immediate Commands to Run

```bash
# 1. Create the new module structure
mkdir -p packages/rettangoli-fe/src/{parsers,vdom,events,styles,state,components,utils,http,build,types}

# 2. Setup testing
npm install --save-dev vitest @testing-library/dom jsdom
mkdir -p packages/rettangoli-fe/tests/{unit,integration,fixtures}

# 3. Initialize TypeScript
npm install --save-dev typescript @types/node
touch packages/rettangoli-fe/tsconfig.json

# 4. Create the first extracted module
touch packages/rettangoli-fe/src/parsers/yaml-parser.js
```

Start with **Action 1** (Parser refactoring) as it has the highest impact and will provide immediate benefits to code maintainability and testability.