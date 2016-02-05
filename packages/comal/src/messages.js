import errmsg from "errmsg";

import MESSAGES from "./messages_.json";

export default function(key, ...args) {
  return errmsg.lookup(MESSAGES, key, ...args);
}
