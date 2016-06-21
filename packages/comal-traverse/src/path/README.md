
## NodePath

#### `NodePath.get({ hub, parentPath, parent, container, listKey, key }): NodePath`

#### `set(key: string, node: Object)`
#### `setData(key: string, val: any)`
#### `getData(key: string, def?: any)`
#### `getPathLocation()`
#### `getScope(scope: Scope)`
#### `mark(type: string, message: string)`
#### `traverse(visitor: Object, state?: any)`
#### `buildCodeFrameError(msg: string, Error: typeof Error = SyntaxError)`
#### `debug(buildMessage: Function)`

### ancestry

#### `NodePath#find(callback)`
Find self or parent for which callback returns `true`

#### `NodePath#findParent(callback)`
Find self or parent for which callback returns `true`

#### `NodePath#getFunctionParent()`
Find parent that is a function or program

#### `NodePath#getStatementParent()`
Find parent that is a node inside of a list

#### `NodePath#getAncestry()`
#### `NodePath#getDeepestCommonAncestorFrom(paths: Array<NodePath>, filter?: Function): NodePath`
#### `NodePath#getEarliestCommonAncestorFrom(paths: Array<NodePath>): NodePath`
#### `NodePath#inShadow(key?)`
#### `NodePath#inType()`

### replacement  
#### `NodePath#replaceExpressionWithStatements(nodes: Array<Object>)`
#### `NodePath#replaceInline(nodes: Object | Array<Object>)`
#### `NodePath#replaceWith(replacement)`
#### `NodePath#replaceWithMultiple(nodes: Array<Object>)`
#### `NodePath#replaceWithSourceString(replacement)`
#### `NodePath#_replaceWith(node)`

### evaluation
#### `NodePath#evaluateTruthy(): boolean`
#### `NodePath#evaluate(): { confident: boolean; value: any }`

### conversion
#### `NodePath#arrowFunctionToShadowed()`
#### `NodePath#ensureBlock()`
#### `NodePath#toComputedKey(): Object`

### introspection
#### `NodePath#canHaveVariableDeclarationOrExpression()`
#### `NodePath#canSwapBetweenExpressionAndStatement(replacement)`
#### `NodePath#equals(key, value): boolean`
#### `NodePath#getSource()`
#### `NodePath#has(key): boolean`
_alias: is_

#### `NodePath#isCompletionRecord(allowInsideFunction?)`
#### `NodePath#isNodeType(type: string): boolean`
#### `NodePath#isnt(key): boolean`
#### `NodePath#isStatementOrBlock()`
#### `NodePath#isStatic()`
#### `NodePath#matchesPattern(pattern: string, allowPartial?: boolean): boolean`
#### `NodePath#referencesImport(moduleSource, importName)`
#### `NodePath#resolve(dangerous, resolved)`
#### `NodePath#willIMaybeExecuteBefore(target)`
#### `NodePath#_guessExecutionStatusRelativeTo(target)`
#### `NodePath#_guessExecutionStatusRelativeToDifferentFunctions(targetFuncParent)`
#### `NodePath#_resolve(dangerous?, resolved?): ?NodePath`

### context
#### `NodePath#call(key): boolean`
#### `NodePath#isBlacklisted(): boolean`
#### `NodePath#popContext()`
#### `NodePath#pushContext(context)`
#### `NodePath#requeue(pathToQueue = this)`
#### `NodePath#resync()`
#### `NodePath#setContext(context)`
#### `NodePath#setKey(key)`
#### `NodePath#setScope()`
#### `NodePath#setup(parentPath, container, listKey, key)`
#### `NodePath#skip()`
#### `NodePath#skipKey(key)`
#### `NodePath#stop()`
#### `NodePath#visit(): boolean`
#### `NodePath#_call(fns?: Array<Function>): boolean`
#### `NodePath#_getQueueContexts()`
#### `NodePath#_resyncKey()`
#### `NodePath#_resyncList()`
#### `NodePath#_resyncParent()`
#### `NodePath#_resyncRemoved()`

### removal
#### `NodePath#remove()`
#### `NodePath#_assertUnremoved()`
#### `NodePath#_callRemovalHooks()`
#### `NodePath#_markRemoved()`
#### `NodePath#_remove()`

### modification
#### `NodePath#hoist(scope = this.scope)`
#### `NodePath#insertAfter(nodes)`
#### `NodePath#insertBefore(nodes)`
#### `NodePath#pushContainer(listKey, nodes)`
#### `NodePath#unshiftContainer(listKey, nodes)`
#### `NodePath#updateSiblingKeys(fromIndex, incrementBy)`
#### `NodePath#_containerInsert(from, nodes)`
#### `NodePath#_containerInsertAfter(nodes)`
#### `NodePath#_containerInsertBefore(nodes)`
#### `NodePath#_maybePopFromStatements(nodes)`
#### `NodePath#_verifyNodeList(nodes)`

### family
#### `NodePath#get(key: string, context?: boolean | TraversalContext): NodePath`
#### `NodePath#getBindingIdentifiers(duplicates?)`
#### `NodePath#getCompletionRecords(): Array`
#### `NodePath#getOpposite()`
#### `NodePath#getOuterBindingIdentifiers(duplicates?)`
#### `NodePath#getSibling(key)`
#### `NodePath#getStatementParent(): ?NodePath`
#### `NodePath#_getKey(key, context?)`
#### `NodePath#_getPattern(parts, context)`

### comments
#### `NodePath#addComment(type, content, line?)`
#### `NodePath#addComments(type: string, comments: Array)`
#### `NodePath#shareCommentsWithSiblings()`

### inference
#### `NodePath#baseTypeStrictlyMatches(right: NodePath)`
#### `NodePath#couldBeBaseType(name: string): boolean`
#### `NodePath#getTypeAnnotation(): Object`
#### `NodePath#isBaseType(baseName: string, soft?: boolean): boolean`
#### `NodePath#isGenericType(genericName: string): boolean`
#### `NodePath#_getTypeAnnotation(): ?Object`

### source-elements
