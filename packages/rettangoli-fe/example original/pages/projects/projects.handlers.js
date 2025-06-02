
export const handleCreateButtonClick = async (e, deps) => {
  console.log('handleCreateButtonClick', e);
  deps.render();
}

export const handleProjectsClick = (e, deps) => {
  const id = e.target.id
  console.log('handleProjectsClick', id);
}
