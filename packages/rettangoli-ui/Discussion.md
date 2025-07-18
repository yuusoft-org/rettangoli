## Slider with number input design plan

goal: in placement form, we need an input way to both support slider input and number input for some var like x, w, scale ...
note:
  - in form, can only use components rettangoli-ui provided, user's design is not available. For example, form define is following:
  ```js
  form: {
    title: 'Add Placement',
    description: 'Create a new placement configuration',
    fields: [
      {
        name: 'name',
        inputType: 'inputText',
        label: 'Name',
        description: 'Enter the placement name',
        required: true,
      },
      {
        name: 'anchor',
        inputType: 'select',
        label: 'Anchor',
        description: 'Enter the anchor point (e.g., center, top-left, bottom-right)',
        placeholder: 'Choose a anchor',
        options: [
          { id: 'tl', label: 'Top Left', value: 'top-left' },
          { id: 'tc', label: 'Top Center', value: 'top-center' },
          { id: 'tr', label: 'Top Right', value: 'top-right' },
          { id: 'cl', label: 'Center Left', value: 'center-left' },
          { id: 'cc', label: 'Center Center', value: 'center-center' },
          { id: 'cr', label: 'Center Right', value: 'center-right' },
          { id: 'bl', label: 'Bottom Left', value: 'bottom-left' },
          { id: 'bc', label: 'Bottom Center', value: 'bottom-center' },
          { id: 'br', label: 'Bottom Right', value: 'bottom-right' },
        ],
        required: true,
      },
      {
        name: 'rotation',
        inputType: 'slider',
        label: 'Rotation',
        description: 'Enter the rotation in degrees (e.g., 0, 45, 180)',
        required: true,
      }
    ],
    actions: {
      layout: '',
      buttons: [{
        id: 'submit',
        variant: 'pr',
        content: 'Add Placement',
      }],
    }
  }
  ```

1. separate, a rtgl-slider and a rtgl-input.
  - note: need a share var to sync state.
  - advantages: more freedom to control values.
  - disadvantages: more code to write.
  - Examples:
    - Ant Design: https://ant-design.antgroup.com/components/slider-cn
      ```jsx
      const IntegerStep: React.FC = () => {
        const [inputValue, setInputValue] = useState(1);

        const onChange: InputNumberProps['onChange'] = (newValue) => {
            setInputValue(newValue as number);
        };

        return (
            <Row>
            <Col span={12}>
                <Slider
                min={1}
                max={20}
                onChange={onChange}
                value={typeof inputValue === 'number' ? inputValue : 0}
                />
            </Col>
            <Col span={4}>
                <InputNumber
                min={1}
                max={20}
                style={{ margin: '0 16px' }}
                value={inputValue}
                onChange={onChange}
                />
            </Col>
            </Row>
        );
      };
      ```
    - Material UI: https://mui.com/material-ui/react-slider/
      ```jsx
      export default function InputSlider() {
        const [value, setValue] = React.useState(30);

        const handleSliderChange = (event: Event, newValue: number) => {
          setValue(newValue);
        };

        const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          setValue(event.target.value === '' ? 0 : Number(event.target.value));
        };

        const handleBlur = () => {
          if (value < 0) {
            setValue(0);
          } else if (value > 100) {
            setValue(100);
          }
        };

        return (
          <Box sx={{ width: 250 }}>
            <Typography id="input-slider" gutterBottom>
              Volume
            </Typography>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid>
                <VolumeUp />
              </Grid>
              <Grid size="grow">
                <Slider
                  value={typeof value === 'number' ? value : 0}
                  onChange={handleSliderChange}
                  aria-labelledby="input-slider"
                />
              </Grid>
              <Grid>
                <Input
                  value={value}
                  size="small"
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  inputProps={{
                    step: 10,
                    min: 0,
                    max: 100,
                    type: 'number',
                    'aria-labelledby': 'input-slider',
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        );
      }
      ```
2. combine, a new slider component.
  - note: 
  - advantages: less code. users do not need to manual package them.
  - disadvantages: less freedom, in some case may not perform well. but user still can mannually design if they want.
  - examples:
    - Element: https://element.eleme.cn/#/zh-CN/component/slider
    ```html
    <template>
      <div class="block">
        <el-slider
          v-model="value"
          show-input>
        </el-slider>
      </div>
    </template>

    <script>
      export default {
        data() {
          return {
            value: 0
          }
        }
      }
    </script>
    ```