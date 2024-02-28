
const spacingOptions = [
  { id: undefined, name: "none" },
  { id: "xs", name: "xs" },
  { id: "s", name: "s" },
  { id: "m", name: "m" },
  { id: "l", name: "l" },
  { id: "xl", name: "xl" },
];

const configureButton = (editor) => {

  editor.DomComponents.addType("rtgl-button", {
    model: {
      defaults: {
        tagName: "rtgl-button",
        removable: true,
        draggable: true,
        badgable: true,
        stylable: true,
        highlightable: false,
        selectable: true,
        copyable: false,
        resizable: true,
        editable: true,
        hoverable: true,
        type: "link",
        attributes: {
          type: "primary",
        },
        traits: [
          {
            type: "select", // Type of the trait
            label: "Type", // The label you will see in Settings
            name: "type", // The name of the attribute/property to use on component
            options: [
              { id: "primary-small", name: "primary-small" },
              { id: "primary", name: "primary" },
              { id: "primary-large", name: "primary-large" },
              { id: "secondary-small", name: "secondary-small" },
              { id: "secondary", name: "secondary" },
              { id: "secondary-large", name: "secondary-large" },
              { id: "error-small", name: "error-small" },
              { id: "error", name: "error" },
              { id: "error-large", name: "error-large" },
            ],
          },
          {
            type: "select",
            name: "margin-top",
            label: "Margin Top",
            options: spacingOptions,
          },
          {
            type: "select",
            name: "margin-right",
            label: "Margin right",
            options: spacingOptions,
          },
          {
            type: "select",
            name: "margin-bottom",
            label: "Margin bottom",
            options: spacingOptions,
          },
          {
            type: "select",
            name: "margin-left",
            label: "Margin Left",
            options: spacingOptions,
          },
        ],
        content: "hello wolrd",
      },
      reRender() {
        this.view.render();
      },
    },
    extend: "link",
    isComponent: (el) => el.tagName === "RTGL-BUTTON",
  });

  editor.BlockManager.add("rtgl-button", {
    id: "rtgl-button",
    label: "Button",
    content: {
      type: "rtgl-button",
    },
  });
}

export default configureButton;
