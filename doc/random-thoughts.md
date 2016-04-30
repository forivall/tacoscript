
See if it's possible to write plugins using https://github.com/zkat/mona, write a tutorial if so.

### Annotations

babel (flow?) uses /\*:: for comments that have special meaning

https://github.com/babel/babel/commit/ef60fed7d6ca963e30212a0b89199505c69bd8e6

---

coffeescript redux TERMINDENT

https://github.com/michaelficarra/CoffeeScriptRedux/blob/a7448ea26e6887000d828af595e9c3b693fec4ef/src/grammar.pegjs#L594-L625

---

up for grabs:

c struct -style object literals

```js
{
  a: b,
  "c": d,
  ["e"]: f,
  [g]: h
  i() {}
}
```

```c
{
  .a = b
  ["c"] = d
  [("e")] = f
  [g] = h
  i() {}
}
```

---

presets:

std == es5 : includes some features of es6 that are very simple transpilations,
such as simple string interpolation, but no classes, modules, etc.

lts == es6 / currently supported syntax in the most up-to-date lts release

cur == AS UP TO DATE AS BABEL CAN HANDLE. yeah.
