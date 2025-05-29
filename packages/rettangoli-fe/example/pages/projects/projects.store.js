
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
