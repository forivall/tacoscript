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
      format: { indent: { amount: 2, type: "space", indent: "  "} }
      program: {
        type: "Program",
        ...
        body: [
          {
            type: "EmptyStatement",
            (start, end, loc,)
            tokenElements: [
              {token: {type: "semi" (, start, end, loc)}, kind: "code"}
            ]
          },
          {
            type: "BlockStatement",
            (start, end, loc,)
            body: [
              {
                type: "ExpressionStatement",
                (start, end, loc,)
                expression: {
                  type: "Identifier",
                  (start, end, loc,)
                  name: "foo",
                  tokenElements: [
                    {token: {type: "name", value: "foo" (, start, end, loc)}, kind: "code"}
                  ]
                }
                tokenElements: [
                  {child: "expression"}
                  {token: {type: "semi" (, start, end, loc)}, kind: "code"}
                ]
              }
            ]
            tokenElements: [
              {token: {type: "braceL" (, start, end, loc)}, kind: "code"},
              {token: {type: "newline", value: "\n"}, kind: "whitespace"},
              {token: {type: "tab", value: 1}, kind: "whitespace"},
              {child: "body", list: "next"}
              {token: {type: "newline", value: "\n"}, kind: "whitespace"},
              {token: {type: "braceR" (, start, end, loc)}, kind: "code"},
            ]
          }
        ]
        tokenElements: [
          {token: {type: "blockCommentStart", value: "/*"}, kind: "comment"},
          {token: {type: "newline", value: "\n"}, kind: "whitespace"},
          {token: {type: "blockCommentBody", value: "\nThis is a comment\n  * very comment\n"}, kind: "comment"},
          {token: {type: "blockCommentBody", value: ""}, kind: "comment"},
          {token: {type: "blockCommentEnd", value: "*/"}, kind: "comment"},
          {token: {type: "newline", value: "\n"}, kind: "whitespace"},
          {child: "body", list: "next"}
          {token: {type: "newline", value: "\n"}, kind: "whitespace"},
          {child: "body", list: "next"}
          {token: {type: 'lineCommentStart', value: "//"}, kind: 'comment'},
          {token: {type: 'lineCommentBody', value: " such comment, wow"}, kind: 'comment'},
          {token: {type: 'newline', value: "\n"}, kind: 'whitespace'},
        ]
      }
      tokenElements: [
      ]
    }

possible optimization (only for space), as described by point 2 of
 https://github.com/estree/estree/issues/41#issuecomment-120107587 :
  replace `{type: 'newline', value: "\n"}, kind: 'whitespace'}` by `"#newline-1"`,
  and then keep a hash of these references in the root of the ast
