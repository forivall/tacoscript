/* @flow */

import Plugin from "../plugin";
import sortBy from "lodash/collection/sortBy";

export default new Plugin({
  /**
   * [Please add a description.]
   *
   * Priority:
   *
   *  - 0 We want this to be at the **very** bottom
   *  - 1 Default node position
   *  - 2 Priority over normal nodes
   *  - 3 We want this to be at the **very** top
   */

  visitor: {
    Block: {
      exit({ node }) {
        let hasChange = false;
        for (let i = 0; i < node.body.length; i++) {
          let bodyNode = node.body[i];
          if (bodyNode && bodyNode._blockHoist != null) {
            hasChange = true;
            break;
          }
        }
        if (!hasChange) return;

        node.body = sortBy(node.body, function(bodyNode){
          let priority = bodyNode && bodyNode._blockHoist;
          if (priority == null) priority = 1;
          if (priority === true) priority = 2;

          // Higher priorities should move toward the top.
          return -1 * priority;
        });
      }
    }
  }
});
