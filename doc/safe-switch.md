Safe switch statements
======================

if the last statement of a case isn't a break, the next case gains the followthrough property, and "and" will be generated as a prefix. Simple.

Also allow commas in case statements for multiple cases.

However, don't break to loops, still break from the switch. Teach people about labels.

```
switch a
  case 1, 2, 3:
    doThing()
  case 4:
    doOtherThing()
  and case 5:
    butStillDoThisOtherThing()
```

### Phase 2 switches

Also allow "boolean" switches

```
switch
