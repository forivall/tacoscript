import {addExtra} from '../helpers';

export default {
  NewExpression({node}) {
    if (node.arguments.length > 0) {
      return;
    }
    let se = node.sourceElements;
    let lastEl;
    for (let i = se.length - 1; i >= 0; i--) {
      lastEl = se[i];
      if (lastEl.element !== 'EOF') break;
    }
    if (lastEl.value !== ")") addExtra(node, "noParens", true);
  }
}
