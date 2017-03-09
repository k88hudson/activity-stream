/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

class NewTabInit {
  onAction(action) {
    switch (action.type) {
      case "NEWTAB_LOAD":
        this.store.dispatch({
          type: "NEWTAB_INITIAL_STATE",
          data: this.store.getState(),
          meta: {send: "ActivityStream:MainToContent", target: action.data
        }});
        return;
    }
  }
}

this.NewTabInit = NewTabInit;
this.EXPORTED_SYMBOLS = ["NewTabInit"];
