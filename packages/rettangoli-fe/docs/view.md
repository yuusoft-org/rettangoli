# View System (.view.yaml)

Declarative UI definitions using YAML syntax

## Philosophy & Advantages

### Why YAML for UI?

**Pure View Structure**: Views contain only UI structure - no business logic, no complex JavaScript expressions. This enforces clean separation of concerns and makes it easy to read and maintain.

**Less Verbose**: No closing tags needed, cleaner syntax compared to HTML/JSX

**Structured Data**: YAML naturally handles complex objects, enabling powerful features like schemas, refs and event listeners, control flow (conditionals, loops) without verbose syntax.

**Compile-time Optimization**: Templates are pre-compiled to virtual DOM, eliminating runtime template parsing

## File Structure

```yaml
elementName: my-component        # Required: Web component tag name
template: []                     # Required: UI structure
styles: {}                       # Optional: CSS styling
refs: {}                         # Optional: Element references and events
viewDataSchema: {}              # Optional: Input data validation
propsSchema: {}                 # Optional: Props validation
attrsSchema: {}                 # Optional: Attributes validation
```

## Template Syntax

### Basic Elements

YAML templates can express any HTML structure. In YAML, each child element is represented as an array item, except for the very last level where text content is provided as a string.

```yaml
template:
  - div:
    - span#my-id.class1.class2: "Element with ID and classes"
    - button#submit.btn.primary: "Submit"
    - input type=text placeholder="Enter name" required=true:
```

**Selector Syntax:**
- `#` creates an `id` attribute: `div#header` → `<div id="header">`
- `.` creates `class` attributes: `div.btn.primary` → `<div class="btn primary">`
- Combined: `button#submit.btn.primary` → `<button id="submit" class="btn primary">`

**Output HTML:**
```html
<div>
  <span id="my-id" class="class1 class2">Element with ID and classes</span>
  <button id="submit" class="btn primary">Submit</button>
  <input type="text" placeholder="Enter name" required="true">
</div>
```

### Attributes vs Props
```yaml
template:
  # Attributes: string values, become HTML attributes
  - custom-component#myComponent title=Hello name=World:
  
  # Props: JavaScript values from viewData, passed as component properties
  - another-component#anotherComponent .items=todoItems .onSelect=handleSelect:
  
  # Mixed: Both attributes and props on same element
  - user-card#userCard name=John .user=currentUser
```

**Key Difference:**
- **Attributes** (no dot): Set as HTML attributes (`title="Hello"`) - visible in HTML
- **Props** (with dot): Set as JavaScript properties on the element - NOT visible in HTML, only accessible via JavaScript

**Example:**
```js
const userCard = document.getElementById('userCard');
console.log(userCard.user); // Returns the currentUser object
console.log(userCard.getAttribute('name')); // Returns "John"
```

## Templating with Jempl

Templates use [Jempl](https://github.com/yuusoft-org/jempl) for variables, conditionals, and loops.

### Variables
```yaml
template:
  - h1: "${title}"
  - div: "${statusText}"
```

**Variable Limitations**: 
Inline transformations and complex expressions in variables don't work.

```yaml
# ❌ DOES NOT WORK - Inline transformations
template:
  - h1: "${title || 'default title'}"
  - div: "${isActive ? 'Active' : 'Inactive'}"

# ✅ WORKS - Pre-compute in toViewData
template:
  - h1: "${displayTitle}"
  - div: "${statusText}"
```

Any transformations or complex logic should be handled in the `toViewData` function in your store.

```js
// In store.js
export const toViewData = ({ state }) => ({
  displayTitle: state.title || 'default title',
  displayName: state.user.name || 'Guest',
  statusText: state.isActive ? 'Active' : 'Inactive'
});
```

### Conditionals & Loops
```yaml
template:
  - $if isLoggedIn:
    - user-dashboard: []
  - $else:
    - login-form: []
    
  - ul.todo-list:
    - $for item in todoItems:
      - li: "${item.text}"
```

**Props in Loops - Important Limitation**: 
You cannot directly pass loop variables as props. This is a known limitation.

```yaml
# ❌ DOES NOT WORK - Direct variable won't be passed as prop
- $for project in projects:
  - project-card .data=project:

# ✅ WORKS - Use array indexing instead
- $for project, index in projects:
  - project-card .data=projects[${index}]:
```

For complete syntax documentation, see [Jempl documentation](https://github.com/yuusoft-org/jempl).

## Styling

**Note**: If using `rettangoli-ui`, you should rarely need custom styling. The UI library provides pre-built components that handle 95% of styling needs.

### Basic Styles
```yaml
styles:
  '.container':
    display: flex
    padding: 20px
    
  '#header':
    background-color: '#f0f0f0'
    
  '.button:hover':
    background-color: darkblue
```

### Media Queries & Animations
```yaml
styles:
  '@media (min-width: 768px)':
    '.container':
      max-width: 1200px
      
  '@keyframes fadeIn':
    '0%': { opacity: 0 }
    '100%': { opacity: 1 }
    
  '.fade-in':
    animation: 'fadeIn 0.3s ease-out'
```

## Event Handling

```yaml
refs:
  submitButton:
    eventListeners:
      click:
        handler: handleSubmit

  nameInput:
    eventListeners:
      input:
        handler: handleNameChange
      keydown:
        handler: handleKeyDown

template:
  - form:
    - input#nameInput type=text:
    - button#submitButton: "Submit"
```

### Event Options

Keys under `refs` must match the `id` attribute of HTML elements in the template.

```yaml
refs:
  submitButton:  # Must match id="submitButton" in template
    eventListeners:
      click:    # Standard HTML DOM event (click, submit, input, etc.)
        handler: handleSubmit  # Function name from handlers.js
      keydown:  # Any HTML event is supported
        handler: handleKeyDown

template:
  - rtgl-button#submitButton: "Submit"  # id matches refs key
```

**Current Limitations**: 
- Only `handler` is supported - no event options like `preventDefault` or `passive`
- All event handlers must be defined in the component's `handlers.js` file

## Data Schemas

### ViewData Schema
This is standard [JSON Schema](https://json-schema.org/) validation for data passed to templates.

```yaml
viewDataSchema:
  type: object
  properties:
    title:
      type: string
      default: "Default Title"
    items:
      type: array
      items:
        type: object
        properties:
          id: { type: number }
          name: { type: string }
```

### Props & Attributes
```yaml
propsSchema:
  type: object
  properties:
    onItemClick: { type: function }
    initialItems: { type: array }

attrsSchema:
  type: object
  properties:
    variant:
      type: string
      enum: [primary, secondary]
      default: primary
```

**Note**: Attributes are always string type in HTML, so `attrsSchema` properties should use `type: string`.

## Common Patterns

**Note**: These examples use `rettangoli-ui` components, but the system works with any HTML elements.

### Loading States
```yaml
template:
  - rtgl-view w=f h=f p=md:
    - $if isLoading:
      - rtgl-text c=mu-fg: "Loading..."
    - $elif hasError:
      - rtgl-text c=error: "Error: ${errorMessage}"
    - $else:
      - rtgl-view d=v g=md:
        - $for item in items:
          - rtgl-view p=sm bgc=bg br=sm:
            - rtgl-text: "${item.name}"
```

### Forms
```yaml
refs:
  submitButton:
    eventListeners:
      click: { handler: handleSubmit }

template:
  - rtgl-view d=v g=md p=md:
    - rtgl-input#email w=f placeholder="Enter email":
    - rtgl-button#submitButton w=f .disabled=isSubmitting:
      - $if isSubmitting: "Sending..."
      - $else: "Send"
```

### Modals
```yaml
```
```yaml
refs:
  closeModal:
    eventListeners:
      click: { handler: handleCloseModal }

template:
  - rtgl-dialog .isOpen=showModal w="500px":
    - slot name=content:
      - rtgl-view d=v g=md:
        - rtgl-text s=lg: "${modalTitle}"
        - rtgl-text: "${modalContent}"
        - rtgl-button#closeModal v=ol:
          - rtgl-text: "Close"
```
```

