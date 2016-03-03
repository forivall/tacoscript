import * as t from "./index";

export let isReactComponent = t.buildMatchMemberExpression("React.Component");

export function isCompatTag(tagName?: string): boolean {
  return !!tagName && /^[a-z]|\-/.test(tagName);
}

function cleanJSXElementLiteralChild(
  child: { value: string },
  args: Array<Object>,
) {
  let lines = child.value.split(/\r\n|\n|\r/);

  let lastNonEmptyLine = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/[^ \t]/)) {
      lastNonEmptyLine = i;
    }
  }

  let str = "";

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    let isFirstLine = i === 0;
    let isLastLine = i === lines.length - 1;
    let isLastNonEmptyLine = i === lastNonEmptyLine;

    // replace rendered whitespace tabs with spaces
    let trimmedLine = line.replace(/\t/g, " ");

    // trim whitespace touching a newline
    if (!isFirstLine) {
      trimmedLine = trimmedLine.replace(/^[ ]+/, "");
    }

    // trim whitespace touching an endline
    if (!isLastLine) {
      trimmedLine = trimmedLine.replace(/[ ]+$/, "");
    }

    if (trimmedLine) {
      if (!isLastNonEmptyLine) {
        trimmedLine += " ";
      }

      str += trimmedLine;
    }
  }

  if (str) args.push(t.stringLiteral(str));
}

export function buildChildren(node: Object): Array<Object> {
  let elems = [];

  for (let i = 0; i < node.children.length; i++) {
    let child = node.children[i];

    if (t.isJSXText(child)) {
      cleanJSXElementLiteralChild(child, elems);
      continue;
    }

    if (t.isJSXExpressionContainer(child)) child = child.expression;
    if (t.isJSXEmptyExpression(child)) continue;

    elems.push(child);
  }

  return elems;
}
