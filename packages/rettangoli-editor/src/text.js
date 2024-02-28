const spacingOptions = [
    { id: undefined, name: "none" },
    { id: "xs", name: "xs" },
    { id: "s", name: "s" },
    { id: "m", name: "m" },
    { id: "l", name: "l" },
    { id: "xl", name: "xl" },
  ];
  

const configureText = (editor) => {
  editor.DomComponents.addType("rtgl-text", {
    isComponent: (el) => el.tagName === "RTGL-TEXT",

    model: {
      defaults: {
        tagName: "rtgl-text",
        content: "Hello",
        attributes: {
          size: 'l',
          color: 'primary'
        },
        traits: [
          {
            type: "select", // Type of the trait
            label: "color", // The label you will see in Settings
            name: "color", // The name of the attribute/property to use on component
            options: [
              { id: "on-primary", name: "on-primary" },
              { id: "on-primary-container", name: "on-primary-container" },
              { id: "on-secondary", name: "on-secondary" },
              { id: "on-secondary-container", name: "on-secondary-container" },
              { id: "on-error", name: "on-error" },
              { id: "on-error-container", name: "on-error-container" },
              { id: "on-surface", name: "on-surface" },
              { id: "on-surface-variant", name: "on-surface-variant" },
              { id: "inverse-on-surface", name: "inverse-on-surface" },
              { id: "inverse-primary", name: "inverse-primary" },
            ],
          },
          {
            type: "select",
            label: "Size",
            name: "size",
            options: [
              {
                id: "display-m",
                name: "display-m",
              },
              {
                id: "headline-m",
                name: "headline-m",
              },
              {
                id: "title-l",
                name: "title-l",
              },
              {
                id: "title-m",
                name: "title-m",
              },
              {
                id: "title-s",
                name: "title-s",
              },
              {
                id: "body-l",
                name: "body-s",
              },
              {
                id: "body-m",
                name: "body-m",
              },
              {
                id: "body-s",
                name: "body-s",
              },
              {
                id: "label-l",
                name: "label-m",
              },
              {
                id: "label-m",
                name: "label-m",
              },
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
      },
    },
    extend: "text",
  });

  editor.BlockManager.add("rtgl-text", {
    id: "rtgl-text",
    label: "Text",
    content: {
      type: "rtgl-text",
    },
  });
};

export default configureText;
