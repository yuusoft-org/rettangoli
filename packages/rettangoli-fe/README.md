
# Rettangoli Frontend

## Development

Bundle the code under `example` folder using `@rettangoli/fe`

```bash
bun run ../rettangoli-cli/cli.js fe build
```

Visit the example project that shows the components in action

```bash
bunx serve ./viz/static
```

Instead of running `fe build` each time, we can also watch for file changes and bundle the code automatically.

```bash
bun run ../rettangoli-cli/cli.js fe watch
```


Note: rettangoli-vt is not setup for this project yet. We just use static files under `viz/static` folder.


## Introduction

A frontend framework with just 3 type of files to scale from a single page to a full fledged complex application.

Implemented using:

Browser native:
* web components for components

Runtime:
* [snabbdom](https://github.com/snabbdom/snabbdom) for virtual dom
* [immer](https://github.com/immerjs/immer) for data immutability for state management
* [json-e](https://github.com/json-e/json-e) for templating using json
* [rxjs](https://github.com/ReactiveX/rxjs) for reactive programming

Build & Development:
* [esbuild](https://esbuild.github.io/) for bundling
* [vite](https://vite.dev/) for development

## View Layer

The view layer is unique in that it uses yaml.

* The yaml will be converted into json at build time. The json will then be consumed by snabbdom to be transformed into html through a virtual dom.

### Yaml to write html

Standard html can be totally written in yaml. 

All child element are arrays. Except for things like actual content of text

Use `#` and `.` selectors to represent `id` and `class`.

`div#myid.class1.class2 custorm-attribute=abcd`

will become

`<div id="myid" class="class1 class2" custom-attribute="abcd"></div>`


### Templating using json-e

`json-e` templating language allows us to write conditions and loops in our yaml. For example:


Loop

```yaml
template:
  - rtgl-view w=f g=m:
    - $map: { $eval: projects }
      each(v,k):
        - rtgl-view#project-${v.id} h=64 w=f bw=xs p=m cur=p:
          - rtgl-text s=lg: "${v.name}"
          - rtgl-text s=sm: "${v.description}"
```

Conditional. We usually use `$switch` more as it tends to be more flexible than `$if`.

```yaml
template:
  - rtgl-view d=h w=f h=f:
    - $switch:
        'showSidebar':
          - sidebar-component: []
    - rtgl-view w=f h=f:
      - $switch:
          'currentRoute== "/projects"':
            - projects-component: []
          'currentRoute== "/profile"':
```

`json-e` has many more features but we want to keep it simple and in most cases loops and conditionals are enough.

The actual data used in the template is passed in as `viewData` from the state store which we will cover later.

### Define a elementName

```yaml
elementName: custom-projects
```

This will be the web component name that will be used for the component.

The component can later be used as `<custom-projects></custom-projects>`.

### Styles

Styles can also be completely written in yaml.

```yaml
styles:
  '#title':
    font-size: 24px
  '@media (min-width: 768px)':
    '#title':
      font-size: 32px
```

TODO better support nesting and issue with some global selectors.

### Event listeners

```yaml
refs:
  createButton:
    eventListeners:
      click:
        handler: handleCreateButtonClick
  project-*:
    eventListeners:
      click:
        handler: handleProjectsClick

template:
  - rtgl-button#createButton: Create Project
  - rtgl-view w=f g=m:
    - $map: { $eval: projects }
      each(v,k):
        - rtgl-view#project-${v.id} h=64 w=f bw=xs p=m cur=p:
          - rtgl-text s=lg: "${v.name}"
          - rtgl-text s=sm: "${v.description}"
```

The above example, will attach event listenrs to `#createButton` and all `#project-*` (wild card support) elements. And bind them to the handlers `handleCreateButtonClick` and `handleProjectsClick`.

### Defining data schema

Component have a few types of data that can be defined using a JSON schema:

* `viewDataSchema` - The data that will used for the template.
* `propsSchema` - The data that will be passed to the component via javascript, those can be objects.
* `attrsSchema` - The data that will be passed to the component via html attributes, this is raw strings.


```yaml
viewDataSchema:
  type: object
  properties:
    title:
      type: string
      default: Projects
    createButtonText:
      type: string
      default: Create Project
    projects:
      type: array
      items:
        type: object
        properties:
          id:
            type: string
          name:
            type: string
            default: Project 1
          description:
            type: string
            default: Project 1 description
propsSchema:
  type: object
  properties: {}
```


## State Store

* Define `initial state`
* `toViewData` will take current `state`, `props` and `attrs` and return the `viewData` to be used by the view template
* Any exported function that starts with `select`  will beceme selectors and are used by handlers to access state data
* `actions` are all other exported functions that are used to mutate the state.

```js
export const INITIAL_STATE = Object.freeze({
  title: "Projects",
  createButtonText: "Create Project",
  projects: [
    {
      id: "1",
      name: "Project 1",
      description: "Project 1 description",
    },
    {
      id: '2',
      name: 'Project 2',
      description: 'Project 2 description'
    }
  ],
});

export const toViewData = ({ state, props }, payload) => {
  return state;
}

export const selectProjects = (state, props, payload) => {
  return state.projects;
}

export const setProjects = (state, payload) => {

}
```

Note that this is just a dump store, it is not reactive. Components will need to call `deps.render()` from handlers to re-render the component.

## Handlers

`handleOnMount` is a special handler that is called when the component is mounted. It returns a promise that resolves when the component is mounted.

All other exported functions will automatically become handlers and can be used in the view layers's `eventListeners`

A special object called `deps` is injected into all handlers. It has the following properties:

* `deps.render()` will re-render the component. We call this function each time we have chaged state and want to re-render the component.
* `deps.store` is the store instance. Use selectors to select state and actions to mutate state.
* `deps.transformedHandlers` can be used to call other handlers.
* `deps.attrs` is the html attributes that are passed to the component.
* `deps.props` is the javascript properties that are passed to the component.


```js
export const handleOnMount = (deps) => {
  () => {
    // unsubscribe
  }
}

export const handleCreateButtonClick = async (e, deps) => {
  const { store, deps, render } = deps;
  const formIsVisible = store.selectFormIsVisible();

  if (!formIsVisible) {
    store.setFormIsVisible(true);
  }
  deps.render();
}

export const handleProjectsClick = (e, deps) => {
  const id = e.target.id
  console.log('handleProjectsClick', id);
}
```



* `deps.dispatchEvent` can be used to dispatch custom dom events.

```js
export const handleProjectsClick = (e, deps) => {
  deps.dispatchEvent(new CustomEvent('project-clicked', {
    projectId: '1',
  }));
}
```


### Adding additional dependencies

This is a simple yet powerful way to do dependency injection. Those are all global singleton dependencies. Technically anything can be injected and be made accessible to all components.

```js
const componentDependencies = {
}

const pageDependencies = {
}

export const deps = {
  components: componentDependencies,
  pages: pageDependencies,
}
```


## Testing

This framework is written with testability in mind.


## View

Visual testing `rettangoli-vt`


## State Store

Those are all pure functions and it is straighforward to test them. Actions can be turned into pure functions using immer produce.

Example

```yaml
...
```

## Handlers

Test them as normal functions.
They are not always pure per se due to calling of dependencies. 
