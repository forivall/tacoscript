// Originally converted from coffeescript's repl

import fs from 'fs';
import path from 'path';
import nodeREPL from 'repl';

import hasUnicode from 'has-unicode';

function addMultilineHandler(repl) {
  const { rli, inputStream } = repl;
  // Node 0.11.12 changed API, prompt is now _prompt.
  const origPrompt = repl._prompt != null ? repl._prompt : repl.prompt;

  const multiline = { 
    enabled: false, 
    initialPrompt: origPrompt.replace(/^[^>]*/, x => x.replace(/./gu, '-')), // eslint-disable-line no-empty-character-class
    prompt: origPrompt.replace(/^[^>]*>?/, x => x.replace(/./gu, '.')), // eslint-disable-line no-empty-character-class
    buffer: '' };


  // Proxy node's line listener
  const nodeLineListener = rli.listeners('line')[0];
  rli.removeListener('line', nodeLineListener);
  rli.on('line', function (cmd) {
    if (multiline.enabled) {
      multiline.buffer += `${ cmd }\n`;
      rli.setPrompt(multiline.prompt);
      rli.prompt(true);} else 
    {
      rli.setPrompt(origPrompt);
      nodeLineListener(cmd);}});

  // Handle Ctrl-v
  inputStream.on('keypress', function (char, key) {
    if (!(key && key.ctrl && !key.meta && !key.shift && key.name === 'v')) {
      return;}
    if (multiline.enabled) {
      // allow arbitrarily switching between modes any time before multiple lines are entered
      if (!multiline.buffer.match(/\n/)) {
        multiline.enabled = !multiline.enabled;
        rli.setPrompt(origPrompt);
        rli.prompt(true);
        return;}
      // no-op unless the current line is empty
      if (rli.line == null && !rli.line.match(/^\s*$/)) return;
      // eval, print, loop
      multiline.enabled = !multiline.enabled;
      rli.line = '';
      rli.cursor = 0;
      rli.output.cursorTo(0);
      rli.output.clearLine(1);

      // XXX: multiline hack
      multiline.buffer = multiline.buffer.replace(/\n/g, '＀');

      rli.emit('line', multiline.buffer);
      multiline.buffer = '';} else 
    {
      multiline.enabled = !multiline.enabled;
      rli.setPrompt(multiline.initialPrompt);
      rli.prompt(true);}});}

// Store and load command history from a file
function addHistory(repl, filename, maxSize) {
  let lastLine;
  try {
    // Get file info and at most maxSize of command history
    const stat = fs.statSync(filename);
    const size = Math.min(maxSize, stat.size);

    // Read last `size` bytes from the file
    const readFd = fs.openSync(filename, 'r');
    const buffer = new Buffer(size);
    fs.readSync(readFd, buffer, 0, size, stat.size - size);
    fs.close(readFd);

    // Set the history on the interpreter
    repl.rli.history = buffer.toString().split('\n').reverse();

    // If the history file was truncated we should pop off a potential partial line
    if (stat.size > maxSize) {
      repl.rli.history.pop();}

    // Shift off the final blank newline
    if (repl.rli.history[0] === '') {
      repl.rli.history.shift();}

    repl.rli.historyIndex = -1;
    lastLine = repl.rli.history[0];} 
  catch (e) {}

  const fd = fs.openSync(filename, 'a');

  repl.rli.addListener('line', function (code) {
    if (code && code.length && code !== '.history' && lastLine !== code) {
      // Save the latest command in the file
      fs.write(fd, `${ code }\n`);
      lastLine = code;}});

  repl.on('exit', function () {fs.close(fd);});

  // Add a command to show the history stack
  repl.commands[getCommandId(repl, 'history')] = { 
    help: 'Show command history', 
    action() {
      repl.outputStream.write(`${ repl.rli.history.slice().reverse().join('\n') }\n`);
      repl.displayPrompt();} };}


function getCommandId(repl, commandName) {
  // Node 0.11 changed API, a command such as '.help' is now stored as 'help'
  const commandsHaveLeadingDot = repl.commands['.help'] != null;
  return commandsHaveLeadingDot ? `.${ commandName }` : commandName;}

export function start(opts = {}) {
  const [major, minor] = process.versions.node.split('.').map(n => parseInt(n));

  if (major === 0 && minor < 8) {
    console.warn('Node 0.8.0+ required for CoffeeScript REPL');
    // TODO: callback instead
    process.exit(1);}

  if (opts.historyFile == null && process.env.HOME) {
    opts.historyFile = path.join(process.env.HOME, '.taco_history');}
  if (opts.historyMaxInputSize == null) {
    opts.historyMaxInputSize = 10240;}

  const repl = nodeREPL.start({ 
    prompt: hasUnicode() ? '🌮  > ' : 'taco> ', 
    ...opts, 
    eval(input, context, filename, cb) {
      // XXX: multiline hack.
      input = input.replace(/\uFF00/g, '\n');
      return opts.eval(input, context, filename, cb);} });


  repl.on('exit', function () {
    if (!repl.rli.closed) repl.outputStream.write('\n');});

  addMultilineHandler(repl);

  if (opts.historyFile) {
    addHistory(repl, opts.historyFile, opts.historyMaxInputSize);}

  // Adapt help inherited from the node REPL
  repl.commands[getCommandId(repl, 'load')].help = 'Load code from a file into this REPL session';
  return repl;}