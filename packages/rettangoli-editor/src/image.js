const configureImage = (editor) => {
  editor.DomComponents.addType("rtgl-image", {
    isComponent: (el) => el.tagName === "RTGL-IMAGE",

    model: {
      defaults: {
        tagName: "rtgl-image",
        attributes: {
            src: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_light_color_92x30dp.png',
            height: '200',
            width: '200',
            'object-fit': 'contain'
        },
        traits: [
          {
            type: "text", // Type of the trait
            label: "Source", // The label you will see in Settings
            name: "src", // The name of the attribute/property to use on component
          },
          {
            type: "number", // Type of the trait
            label: "Width", // The label you will see in Settings
            name: "width", // The name of the attribute/property to use on component
          },
          {
            type: 'number',
            label: 'Height',
            name: 'height'
          },
          {
            type: 'select',
            label: 'Object Fit',
            name: 'object-fit',
            options: [{
                id: 'cover',
                name: 'cover'
            }, {
                id: 'contain',
                name: 'contain'
            }]
          }
        ]
      },
    },
  });

  editor.BlockManager.add("rtgl-image", {
    id: "rtgl-image",
    label: "Image",
    content: {
      type: "rtgl-image",
    },
  });
};

export default configureImage;
