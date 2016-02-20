
export function toErrorStack(err) {
  if ((err._babel || err._comal) && err instanceof SyntaxError) {
    return `${err.name}: ${err.message}\n${err.codeFrame}`;
  } else {
    return err.stack;
  }
}
