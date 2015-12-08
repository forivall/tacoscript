// from http://jsfiddle.net/k2ndj82p/
// author: https://github.com/gibson042

const acorn = require('acorn');
const _ = require('lodash');

// =============================================================================
// Define an enhanced parse function
// (depends on acorn for base functionality and lodash for convenience)
// =============================================================================
var parseCST = (function(acorn, _) {
  // Provide a way to expose the parser object
  acorn.plugins.generic = function(parser, fn){ fn(parser); };

  return function(input, userOptions) {
    // The parser and its current position and node
    var parser, pos, node;

    // Our log function and last node id
    var log, $id = 0;

    // Unclaimed input elements
    var unclaimed = [];

    // Our hooks
    var hooks = {
      onToken: receiveToken,
      onComment: captureWhitespace,
      plugins: {
        generic: function(obj) {
          // Save a parser reference and listen for events
          var spy = _.bindKey(parser = obj, "extend");
          spy("skipSpace", tokenFinder);
          spy("startNode", nodeStarter);
          spy("startNodeAt", nodeStarter);
          spy("finishNode", nodeFinisher);
          spy("finishNodeAt", nodeFinisher);
        }
      }
    };
    var options = _.assign({}, userOptions, hooks, mergeOptions);
    log = options.logger || function(){};

    // The result
    return acorn.parse(input, options);


    // =====================================================================
    // Helpers (hoisted)
    // =====================================================================

    // Capture tokens
    function receiveToken(token) {
      // Restore "helpfully" removed source data and remove structure
      var replacement = token;
      var type = token.type.label;
      var value = token.value;
      if ( type === "num" || type === "string" ) {
        replacement = _.assign({}, token, {value: node.raw});
      } else if ( type === "regexp" && typeof value === "object" ) {
        replacement = _.assign({}, token, {
          value: "/" + value.pattern + "/" + (value.flags || "")
        });
      }

      log("token", token,
        replacement === token ? "" : replacement.value);
      unclaimed.push(replacement);

      return replacement;
    }

    // Capture comments and whitespace
    function tokenFinder(base) {
      return function() {
        // Save current position, then advance
        pos = this.pos || 0;
        var ret = base.apply(this, arguments);

        // Capture any whitespace we skipped over
        captureWhitespace(false, null, this.pos, this.pos);

        return ret;
      };
    }
    function captureWhitespace(isBlockComment, comment, start, end) {
      // Capture preceding whitespace, separating out line terminators
      if ( start > pos ) {
        var str = parser.input.slice(pos, start);
        str.split(/(\r\n?|[\n\u2028\u2029])/).forEach(function(ws, i) {
          if ( !ws.length ) return;
          unclaimed.push({
            // `split` with captures alternates matches & separators
            type: i % 2 ? "LineTerminator" : "WhiteSpace",
            value: ws
          });
        });
      }

      // Capture a comment
      if ( comment != null ) {
        var head = isBlockComment ? "/*" : "//";
        unclaimed.push(
          { type: "CommentHead", value: head },
          { type: "CommentBody", value: comment }
        );
        if ( isBlockComment ) {
          unclaimed.push({ type: "CommentTail", value: "*/" });
        }
      }

      // Save current position
      pos = end;
    }

    // Save nodes and tag them with unique ids
    function nodeStarter( base ) {
      return function() {
        node = base.apply(this, arguments);
        node.$id = node.$id || ++$id;
        return node;
      };
    }

    // Claim input elements
    function nodeFinisher( base ) {
      return function() {
        var node = base.apply(this, arguments);

        // Find the proper index
        var i = unclaimed.length;
        while ( unclaimed[--i] &&
          (unclaimed[i].end || Infinity) > node.start );

        // Extract the elements
        node.sourceElements = unclaimed.splice(
          i + 1, Infinity,

          // Replace them with a reference to this node
          { type: "ref", value: node.$id, end: node.end }
        ).map(simple);

        // TODO: Update sourceElements to properly reference child nodes

        // Record the attachment
        log.call( node, "node", node.$id, node.type,
          node.sourceElements.map(pretty));

        return node;
      };
    }

    // Respect user options after our hooks
    function mergeOptions(userValue, newValue) {
      if ( _.isFunction(newValue) &&
        _.isFunction(userValue) ) {

        return _.flow(newValue, userValue);

      // Recursive merge
      } else if ( _.isObject(newValue) &&
        _.isObject(userValue) ) {

        return _.assign(userValue, newValue, mergeOptions);
      }

      return newValue;
    }
  };

  // Collapse TokenType into a string
  function simple(el) {
    if ( el.type && el.type.label ) {
      el.type = el.type.label;
    }
    return el;
  }

  // Represent input elements as strings
  function pretty(el) {
    if ( el.value == null || el.value == el.type ) {
      return el.type;
    }
    return el.type + ":" + el.value;
  }
})(acorn, _);
// =============================================================================
// The above can be extracted and used in isolation
// =============================================================================


// =============================================================================
// Demonstrate functionality
// =============================================================================
console.log("=== SCROLL TO BOTTOM FOR FINAL RESULTS ===");

// Parsing
// var input = document.getElementById("source").text
var input = require('fs').readFileSync(process.argv[2]);
var nodes = {};
var cst = parseCST(input, {
  logger: function( evt ) {
    // Capture nodes for easy dereferencing
    if ( evt === "node" ) {
      nodes[this.$id] = this;
    }

    // Log parsing progress
    // Comment out to silence messages
    console.log.apply(console, arguments);
  }
});
console.log("=== RESULTS ===");
console.log("CST", cst);
console.log("nodes", nodes);

// Reconstruction
var reconstructed = render(cst, nodes);
console.log("=== RECONSTRUCTION ===");
console.log(reconstructed);
console.log("reconstructed: ", reconstructed === input ? "\u2713" : "\u2717");

// Render by depth-first reference traversal
function render(node, nodeMap) {
  return node.sourceElements.map(function(el) {
    if ( el.type === "ref" ) {
      return render(nodeMap[el.value], nodeMap);
    } else if ( el.type !== "eof" ) {
      return el.value || el.type;
    }
  }).join("");
}
