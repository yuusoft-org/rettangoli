const config = {
  // Indicate where to init the editor. You can also pass an HTMLElement
  container: "#gjs",
  // Get the content for the canvas directly from the element
  canvas: {
    // styles: [
    //   "/main.css", // Path to your custom CSS file
    // ],
  },
  // As an alternative we could use: `components: '<h1>Hello World Component!</h1>'`,
  fromElement: true,
  // Size of the editor
  height: "calc(100vh - 40px)",
  // height: "auto",
  width: "auto",
  // Disable the storage manager for the moment
  storageManager: false,
  // Avoid any default panel
  // panels: { defaults: [] },
  layerManager: {
    appendTo: ".layers-container",
  },
  // We define a default panel as a sidebar to contain layers
  panels: {
    defaults: [
      {
        id: "layers",
        el: ".panel__left",
      },
      {
        id: "styles",
        el: ".panel__right",
      },
      {
        id: "panel-switcher",
        el: ".panel__switcher",
        buttons: [
          {
            id: "show-blocks",
            active: true,
            label: "Blocks",
            command: "show-blocks",
            togglable: false,
          },
          {
            id: "show-traits",
            active: true,
            label: "Traits",
            command: "show-traits",
            togglable: false,
          },
        ],
      },
      {
        id: "panel-top",
        el: ".panel__top",
      },
      {
        id: "basic-actions",
        el: ".panel__basic-actions",
        buttons: [
          {
            id: "visibility",
            active: true, // active by default
            className: "btn-toggle-borders",
            label: "<u>B</u>",
            command: "sw-visibility", // Built-in command
          },
          {
            id: "export",
            className: "btn-open-export",
            label: "Exp",
            command: "export-template",
            context: "export-template", // For grouping context of buttons from the same panel
          },
          {
            id: "save",
            className: "btn-save",
            label: "Save",
            command: "save-body",
            context: "save-body",
        }
          // {
          //   id: "show-json",
          //   className: "btn-show-json",
          //   label: "JSON",
          //   context: "show-json",
          //   command(editor) {
          //     editor.Modal.setTitle("Components JSON")
          //       .setContent(
          //         `<textarea style="width:100%; height: 250px;">
          //             ${JSON.stringify(editor.getComponents())}
          //           </textarea>`
          //       )
          //       .open();
          //   },
          // },
        ],
      },
    ],
  },
  traitManager: {
    appendTo: ".traits-container",
  },
  blockManager: {
    appendTo: ".blocks-container",
    blocks: [],
  },
};

export default config;
