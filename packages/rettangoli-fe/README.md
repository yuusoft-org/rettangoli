
# Rettangoli Frontend

A frontend framework with just 3 type of files to scale from a single page to a full fledged complex application.

Implemented using:

Browser native:
* web components for components

Runtime:
* snabbdom for virtual dom
* immer for data immutability for state management
* json-e for templating using json
* rxjs for reactive programming

Build & Development:
* esbuild for bundling
* vitest of development

## View

* Write html using yaml
* Write json-e for tempalting. mainly for conditinoals $switch and $map
* Define data schema incudling viewData, props
* Define custom event dispatch
* Define event listerners that need handlers
* Define a elementName

We are using rettangoli-ui for the html here, but it does not have to. It works with any html

```yaml
elementName: my-projects

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

refs:
  createButton:
    eventListeners:
      click:
        handler: handleCreateButtonClick
  project-*:
    eventListeners:
      click:
        handler: handleProjectsClick

events:
  projectSelected:
    detail:
      type: object
      properties:
        id:
          type: string

template:
  - rtgl-view h=100vh w=100vw ah=c:
    - rtgl-view sm-w=f w=400:
      - rtgl-view d=h w=f av=c mb=l mt=xl:
        - rtgl-text s=h2: "${title}"
        - rtgl-view flex=1:
        - rtgl-button#createButton: ${createButtonText}
      - rtgl-view w=f g=m:
        - $map: { $eval: projects }
          each(v,k):
            - rtgl-view#project-${v.id} h=64 w=f bw=xs p=m cur=p:
              - rtgl-text s=lg: "${v.name}"
              - rtgl-text s=sm: "${v.description}"

```

By making values always array. it can write any html


## State Store

* Define initial state
* `toViewData` will take state, props and return the viewData to be used by the view template
* Implement selectors that are read only to read data from the state
* Implement actions to mutate the state (it uses immer)

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

export  const setProjects = (state, payload) => {

}
```

## Handlers

* Define handlers for events
* Use `deps` is used for dependency injection. There are few that are injected by default:
  * `deps.render()` will re-render the component. There is no reactive state, so you need to call this manually.
  * `deps.store` is the store instance
  * `deps.handlers` to call other handlers without calling external functions
* `handleOnMount` is a special handler that is called when the component is mounted. It returns a promise that resolves when the component is mounted.

```js
export const handleOnMount = () => {
  () => {
    // unsubscribe
  }
}

export const handleCreateButtonClick = async (e, deps) => {
  const { store, deps, render } = deps;
  deps.render();
}

export const handleProjectsClick = (e, deps) => {
  const id = e.target.id
  console.log('handleProjectsClick', id);
}
```


### Adding additional dependencies

This is a simple yet powerful way to do dependency injection. Those are all global singleton dependencies.

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

Visual testing with viz


## State Store

Those are all pure functions and it is straighforward to test them. Actions can be turned into pure functions using immer produce.

We recommend testing using rettangoli-test-lib

Example

```yaml
...
```

## Handlers

Test them as normal functions.
They are not always pure per se due to calling of dependencies. You can mock dependencies using rettangoli-test-lib

## Cli Usage

rettangoli fe watch


rettangoli fe build

