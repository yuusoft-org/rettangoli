# Rettangoli Frontend

A modern frontend framework that uses YAML for view definitions, web components for composition, and Immer for state management. Build reactive applications with minimal complexity using just 3 types of files.

## Features

- **🗂️ Three-File Architecture** - `.view.yaml`, `.store.js`, `.handlers.js` files scale from single page to complex applications
- **📝 YAML Views** - Declarative UI definitions that compile to virtual DOM
- **🧩 Web Components** - Standards-based component architecture
- **🔄 Reactive State** - Immer-powered immutable state management
- **⚡ Fast Development** - Hot reload with Vite integration
- **🎯 Template System** - Jempl templating for dynamic content
- **🧪 Testing Ready** - Pure functions and dependency injection for easy testing

## Quick Start

**Production usage** (when rtgl is installed globally):
```bash
rtgl fe build     # Build components
rtgl fe watch     # Start dev server
rtgl fe scaffold  # Create new component
```

## Architecture

### Technology Stack

**Runtime:**
- [Snabbdom](https://github.com/snabbdom/snabbdom) - Virtual DOM
- [Immer](https://github.com/immerjs/immer) - Immutable state management
- [Jempl](https://github.com/yuusoft-org/jempl) - Template engine
- [RxJS](https://github.com/ReactiveX/rxjs) - Reactive programming

**Build & Development:**
- [ESBuild](https://esbuild.github.io/) - Fast bundling
- [Vite](https://vite.dev/) - Development server with hot reload

**Browser Native:**
- Web Components - Component encapsulation

## Development

### Prerequisites

- Node.js 18+ or Bun
- A `rettangoli.config.yaml` file in your project root

### Setup

1. **Install dependencies**:
```bash
bun install
```

2. **Create project structure**:
```bash
# Scaffold a new component
node ../rettangoli-cli/cli.js fe scaffold --category components --name MyButton
```

3. **Start development**:
```bash
# Build once
node ../rettangoli-cli/cli.js fe build

# Watch for changes (recommended)
node ../rettangoli-cli/cli.js fe watch
```

### Project Structure

```
src/
├── cli/
│   ├── build.js       # Build component bundles
│   ├── watch.js       # Development server with hot reload
│   ├── scaffold.js    # Component scaffolding
│   ├── examples.js    # Generate examples for testing
│   └── blank/         # Component templates
├── createComponent.js # Component factory
├── createWebPatch.js  # Virtual DOM patching
├── parser.js          # YAML to JSON converter
├── common.js          # Shared utilities
└── index.js           # Main exports
```

# Usage

## Component Structure

Each component consists of three files:

```
component-name/
├── component-name.handlers.js   # Event handlers
├── component-name.store.js      # State management
└── component-name.view.yaml     # UI structure and styling
```


## View Layer (.view.yaml)

Views are written in YAML and compiled to virtual DOM at build time.

### Basic HTML Structure

```yaml
template:
  - div#myid.class1.class2 custom-attribute=abcd:
    - rtgl-text: "Hello World"
    - rtgl-button: "Click Me"
```

Compiles to:
```html
<div id="myid" class="class1 class2" custom-attribute="abcd">
  <rtgl-text>Hello World</rtgl-text>
  <rtgl-button>Click Me</rtgl-button>
</div>
```

### Component Definition

```yaml
elementName: my-custom-component

template:
  - rtgl-view:
    - rtgl-text: "My Component"
```

### Attributes vs Props

When passing data to components, there's an important distinction:

```yaml
template:
  - custom-component title=Hello .items=items
```

- **Attributes** (`title=Hello`): Always string values, passed as HTML attributes
- **Props** (`.items=items`): JavaScript values from viewData, passed as component properties

Attributes become HTML attributes, while props are JavaScript objects/arrays/functions passed directly to the component.

### Variable Expressions

Views do not support complex variable expressions like `${myValue || 4}`. All values must be pre-computed in the `toViewData` store function:

❌ **Don't do this:**
```yaml
template:
  - rtgl-text: "${user.name || 'Guest'}"
  - rtgl-view class="${isActive ? 'active' : 'inactive'}"
```

✅ **Do this instead:**
```js
// In your .store.js file
export const toViewData = ({ state, props, attrs }) => {
  return {
    ...state,
    displayName: state.user.name || 'Guest',
    statusClass: state.isActive ? 'active' : 'inactive'
  };
};
```

```yaml
template:
  - rtgl-text: "${displayName}"
  - rtgl-view class="${statusClass}"
```



### Styling

```yaml
styles:
  '#title':
    font-size: 24px
    color: blue
  '@media (min-width: 768px)':
    '#title':
      font-size: 32px
```

### Event Handling

```yaml
refs:
  submitButton:
    eventListeners:
      click:
        handler: handleSubmit

template:
  - rtgl-button#submitButton: "Submit"
```

### Templating with Jempl

**Loops:**
```yaml
template:
  - rtgl-view:
      projects:
        $for project, index in projects:
          - rtgl-view#project-${project.id}:
            - rtgl-text: "${project.name}"
            - rtgl-text: "${project.description}"
            - rtgl-text: "Item ${index}"
```


#### Props caveats

❌ This will not work. Prop references can only be taken from viewDate, not from loop variables

```yaml

template:
  - rtgl-view:
    - $for project, index in projects:
      - rtgl-view#project-${project.id}:
        - custom-component .item=project: 
```

✅ This is the workaround

```yaml
template:
  - rtgl-view:
    - $for project, index in projects:
      - rtgl-view#project-${project.id}:
        - custom-component .item=projects[${index}]: 
```

**Conditionals:**
```yaml
template:
  - rtgl-view:
      $if isLoggedIn:
        - user-dashboard: []
      $else:
        - login-form: []

# Multiple conditions with logical operators
template:
  - rtgl-view:
      $if user.age >= 18 && user.verified:
        - admin-panel: []
      $elif user.age >= 13:
        - teen-dashboard: []
      $else:
        - kid-dashboard: []
```

For more advanced templating features, see the [Jempl documentation](https://github.com/yuusoft-org/jempl).

### Data Schemas

Define component interfaces with JSON Schema:

```yaml
viewDataSchema:
  type: object
  properties:
    title:
      type: string
      default: "My Component"
    items:
      type: array
      items:
        type: object

propsSchema:
  type: object
  properties:
    onSelect:
      type: function

attrsSchema:
  type: object
  properties:
    variant:
      type: string
      enum: [primary, secondary]
```

## State Management (.store.js)

### Initial State

```js
export const INITIAL_STATE = Object.freeze({
  title: "My App",
  items: [],
  loading: false
});
```

### View Data Transformation

```js
export const toViewData = ({ state, props, attrs }) => {
  return {
    ...state,
    itemCount: state.items.length,
    hasItems: state.items.length > 0
  };
};
```

### Selectors

```js
export const selectItems = (state) => state.items;
export const selectIsLoading = (state) => state.loading;
```

### Actions

```js
export const setLoading = (state, isLoading) => {
  state.loading = isLoading; // Immer makes this immutable
};

export const addItem = (state, item) => {
  state.items.push(item);
};

export const removeItem = (state, itemId) => {
  const index = state.items.findIndex(item => item.id === itemId);
  if (index !== -1) {
    state.items.splice(index, 1);
  }
};
```

## Event Handlers (.handlers.js)

### Special Handlers

```js
// Called when component mounts
export const handleOnMount = (deps) => {
  const { store, render } = deps;
  
  // Load initial data
  store.setLoading(true);
  loadData().then(data => {
    store.setItems(data);
    store.setLoading(false);
    render();
  });

  // Return cleanup function
  return () => {
    // Cleanup code here
  };
};
```

### Event Handlers

```js
export const handleSubmit = async (event, deps) => {
  const { store, render, attrs, props } = deps;
  
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const newItem = Object.fromEntries(formData);
  
  store.addItem(newItem);
  render();
  
  // Dispatch custom event
  deps.dispatchEvent(new CustomEvent('item-added', {
    detail: { item: newItem }
  }));
};

export const handleItemClick = (event, deps) => {
  const itemId = event.target.id.replace('item-', '');
  console.log('Item clicked:', itemId);
};
```

### Dependency Injection

```js
// In your setup.js file
const componentDependencies = {
  apiClient: new ApiClient(),
  router: new Router()
};

export const deps = {
  components: componentDependencies,
  pages: {}
};
```

Access in handlers:
```js
export const handleLoadData = async (event, deps) => {
  const { apiClient } = deps.components;
  const data = await apiClient.fetchItems();
  // ... handle data
};
```

## Configuration

Create a `rettangoli.config.yaml` file in your project root:

```yaml
fe:
  dirs:
    - "./src/components"
    - "./src/pages"
  setup: "setup.js"
  outfile: "./dist/bundle.js"
  examples:
    outputDir: "./vt/specs/examples"
```

## Testing

### View Components

Use visual testing with `rtgl vt`:

```bash
rtgl vt generate
rtgl vt report
```

## Examples

For a complete working example, see the todos app in `examples/example1/`.
