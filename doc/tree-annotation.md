tree annotation format

the following code

    /*
    This is a comment
      * very comment
    */
    ;
    {
      foo;
    }
    // such comment, wow

corresponds to the following tree:

    {
      type: "File",
      ...
      program: {
        type: "Program",
        ...
        body: [
          {
            type: 'EmptyStatement',
            (start, end, loc,)
            tokenElements: [
              {token: {type: ";" (, start, end, loc)}, kind: 'code'}
            ]
          },
          {
            type: 'BlockStatement',
            (start, end, loc,)
            body: [
              {
                type: 'ExpressionStatement',
                (start, end, loc,)
                expression: {
                  type: "Identifier",
                  (start, end, loc,)
                  name: "foo",
                  tokenElements: [
                    {child: 'name', token: {type: 'name', value: 'foo' (, start, end, loc)}, kind: 'code'}
                  ]
                }
                tokenElements: [
                  {child: 'expression'}
                  {token: {type: ";" (, start, end, loc)}, kind: 'code'}
                ]
              }
            ]
            tokenElements: [
              {token: {type: "{" (, start, end, loc)}, kind: 'code'},
              {token: {type: 'Newline', value: "\n"}, kind: 'whitespace'},
              {token: {type: 'Indent', value: "  "}, kind: 'whitespace'},
              {child: 'body', list: 'next'}
              {token: {type: 'Newline', value: "\n"}, kind: 'whitespace'},
              {token: {type: "}" (, start, end, loc)}, kind: 'code'},
            ]
          }
        ]
        tokenElements: [
          {token: {type: 'BlockCommentStart', value: "/*"}, kind: 'comment'},
          {token: {type: 'Newline', value: "\n"}, kind: 'whitespace'},
          {token: {type: 'BlockCommentLine', value: "This is a comment"}, kind: 'comment'},
          {token: {type: 'Newline', value: "\n"}, kind: 'whitespace'},
          {token: {type: 'Indent', value: "  "}, kind: 'whitespace'},
          {token: {type: 'BlockCommentLine', value: "* very comment"}, kind: 'comment'},
          {token: {type: 'Newline', value: "\n"}, kind: 'whitespace'},
          {token: {type: 'BlockCommentEnd', value: "/*"}, kind: 'comment'},
          {token: {type: 'Newline', value: "\n"}, kind: 'whitespace'},
          {child: 'body', list: 'next'}
          {token: {type: 'Newline', value: "\n"}, kind: 'whitespace'},
          {child: 'body', list: 'next'}
          {token: {type: 'LineCommentStart', value: "//"}, kind: 'comment'},
          {token: {type: 'LineCommentBody', value: " such comment, wow"}, kind: 'comment'},
          {token: {type: 'Newline', value: "\n"}, kind: 'whitespace'},
        ]
      }
      tokenElements: [
      ]
    }

possible optimization (only for space), as described by point 2 of
 https://github.com/estree/estree/issues/41#issuecomment-120107587 :
  replace `{type: 'Newline', value: "\n"}, kind: 'whitespace'}` by `"#newline-1"`,
  and then keep a hash of these references in the root of the ast
