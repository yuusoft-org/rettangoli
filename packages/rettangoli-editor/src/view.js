const spacingOptions = [
  { id: undefined, name: "none" },
  { id: "xs", name: "xs" },
  { id: "s", name: "s" },
  { id: "m", name: "m" },
  { id: "l", name: "l" },
  { id: "xl", name: "xl" },
];

const colorOptions = [
  { id: "p", name: "Primary" },
  { id: "pc", name: "Primary Container" },
  { id: "s", name: "Secondary" },
  { id: "sc", name: "Secondary Container" },
  { id: "e", name: "Error" },
  { id: "ec", name: "Error Container" },
  { id: "su", name: "Surface" },
  { id: "sucl", name: "Surface Container Low" },
  { id: "suc", name: "Surface Container" },
  { id: "such", name: "Surface Container High" }
];

const configureView = (editor) => {
  editor.DomComponents.addType("rtgl-view", {
    // Make the editor understand when to bind `my-input-type`
    isComponent: (el) => el.tagName === "RTGL-VIEW",

    model: {
      defaults: {
        tagName: "rtgl-view",
        droppable: true, // Can't drop other elements inside
        attributes: {
          // direction: "horizontal",
          // "bg-color": "surface-container",
          // "horizontal-align": "start",
          // "vertical-align": "start",
          // "flex": "1",
        },
        traits: [
          // Width, Height, and Width&Height (custom values)
          { type: 'text', label: 'Width', name: 'w' },
          { type: 'text', label: 'Height', name: 'h' },
          { type: 'text', label: 'Width & Height', name: 'wh' },

          // Direction
          { type: 'select', label: 'Direction', name: 'd', options: [{id: 'h', name: 'Horizontal'}, {id: 'v', name: 'Vertical'}] },

          // Alignment
          { type: 'select', label: 'Align Horizontal', name: 'ah', options: [{id: 's', name: 'Start'}, {id: 'c', name: 'Center'}, {id: 'e', name: 'End'}] },
          { type: 'select', label: 'Align Vertical', name: 'av', options: [{id: 's', name: 'Start'}, {id: 'c', name: 'Center'}, {id: 'e', name: 'End'}] },

          // Flex
          { type: 'select', label: 'Flex', name: 'f', options: [{id: '1', name: '1'}, {id: '0', name: '0'}] },
          { type: 'select', label: 'Flex Wrap', name: 'fw', options: [{id: 'w', name: 'Wrap'}] },

          // Flex Gap
          { type: 'select', label: 'Flex Gap', name: 'g', options: spacingOptions },
          { type: 'select', label: 'Flex Gap Horizontal', name: 'gh', options: spacingOptions },
          { type: 'select', label: 'Flex Gap Vertical', name: 'gv', options: spacingOptions },

          // Margin
          { type: 'select', label: 'Margin', name: 'm', options: spacingOptions },
          { type: 'select', label: 'Margin Horizontal', name: 'mh', options: spacingOptions },
          { type: 'select', label: 'Margin Vertical', name: 'mv', options: spacingOptions },
          { type: 'select', label: 'Margin Top', name: 'mt', options: spacingOptions },
          { type: 'select', label: 'Margin Right', name: 'mr', options: spacingOptions },
          { type: 'select', label: 'Margin Bottom', name: 'mb', options: spacingOptions },
          { type: 'select', label: 'Margin Left', name: 'ml', options: spacingOptions },

          // Padding
          { type: 'select', label: 'Padding', name: 'p', options: spacingOptions },
          { type: 'select', label: 'Padding Horizontal', name: 'ph', options: spacingOptions },
          { type: 'select', label: 'Padding Vertical', name: 'pv', options: spacingOptions },
          { type: 'select', label: 'Padding Top', name: 'pt', options: spacingOptions },
          { type: 'select', label: 'Padding Right', name: 'pr', options: spacingOptions },
          { type: 'select', label: 'Padding Bottom', name: 'pb', options: spacingOptions },
          { type: 'select', label: 'Padding Left', name: 'pl', options: spacingOptions },

          // Background Color
          { type: 'select', label: 'Background Color', name: 'bgc', options: colorOptions},

          // Border Radius
          { type: 'select', label: 'Border Radius', name: 'br', options: spacingOptions },

          // Border Width
          { type: 'select', label: 'Border Width', name: 'bw', options: spacingOptions },

          // Border Color
          { type: 'select', label: 'Border Color', name: 'bc', options: colorOptions},
        ],
      },
    },
  });

  editor.BlockManager.add("rtgl-view", {
    id: "rtgl-view",
    label: "View",
    content: {
      type: "rtgl-view",
    },
  });
};

export default configureView;
