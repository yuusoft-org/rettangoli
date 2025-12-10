import * as steps from './vt-steps.js';

export function createSteps(page, context) {
  const stepHandlers = {
    click: steps.click,
    customEvent: steps.customEvent,
    goto: steps.goto,
    keypress: steps.keypress,
    mouseDown: steps.mouseDown,
    mouseUp: steps.mouseUp,
    move: steps.move,
    rclick: steps.rclick,
    screenshot: steps.screenshot,
    wait: steps.wait,
  };

  return {
    async executeStep(stepString) {
      const [command, ...args] = stepString.split(" ");
      
      const stepFn = stepHandlers[command];
      if (stepFn) {
        await stepFn(page, args, context);
      } else {
        console.warn(`Unknown step command: "${command}"`);
      }
    }
  };
}