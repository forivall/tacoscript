node bin/tacoscript.js _node -e '
"use strict"
class Hello
  constructor() ->
    this.msg = "hello world"
  world() ->
    console.log! this.msg
new Hello().world()
'
