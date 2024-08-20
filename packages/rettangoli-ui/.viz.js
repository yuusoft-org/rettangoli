
const config = () => {
    return {
        dir: {
            input: "pages/specs",
            output: "tests",
        },
        screenSizes: [{
            name: "mobile",
            width: 375,
            height: 667,
        }, {
            name: "desktop",
            width: 1024,
            height: 768,
        }]
    };
}

export default config;
