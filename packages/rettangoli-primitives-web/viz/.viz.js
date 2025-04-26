
const config = () => {
  return {
      dir: {
          input: "specs",
          output: "tests",
      },
      engine: {
        name: 'web',
        templates: './templates',
      }
  };
}

export default config;
