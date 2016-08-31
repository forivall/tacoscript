

// TODO: make these kind of functinos composable
export default function keywordToPunc(els: Array<Object>, keyword = 'then', tokens = [{element: 'Punctuator', value: ')'}]) {
  const t = [];
  let beforeParen = true;
  let beforeParenSpace = true;
  for (const el of els) {
    if (beforeParen) {
      if (beforeParenSpace && el.element === 'WhiteSpace') {
        beforeParenSpace = false;
        pushTruncatedWhitespace(t, el);
      } else if (el.element === 'Keyword' && el.value === keyword) {
        beforeParen = false;
        t.push(...tokens);
      } else {
        t.push(el);
      }
    } else {
      t.push(el);
    }
  }
  if (beforeParen) {
    t.push(...tokens);
  }
  return t;
}

export function pushTruncatedWhitespace(t, el) {
  if (el.value !== ' ') {
    t.push({element: 'WhiteSpace', value: el.value.slice(0, -1)})
  }
}
