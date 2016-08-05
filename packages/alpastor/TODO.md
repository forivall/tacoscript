For nodes without a source sourceElements, use babel-generator's logic to
generate the node, make it generate soureELements, and generate whitespace where
applicable.

don't just check for \n when checking for a newline, just check LineTerminator && value !== ''

remove kludges that aren't used
