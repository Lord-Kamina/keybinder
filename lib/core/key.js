/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */



const { Windows } = require("../util/windows");

const { Shortcut } = require("../core/shortcut");
const { Modifiers } = require("../core/modifiers"); 

let Key = exports.Key = function (data) {
	let { domKeys } = require("../util/functions");
	const { Windows } = require("../util/windows");
    let element = Windows.getElementById(data.id);
    this.id = data.id;
    this.element = element;
//     this.key = element.getAttribute("key").toUpperCase().codePointAt(0);

    if (element.hasAttribute("keycode")) {
    	this.keycode = element.getAttribute("keycode");
     }
    else if (element.hasAttribute("key")) {
		this.keycode = domKeys.keys[element.getAttribute("key").toUpperCase()];
		}    

// 	console.warn("Analyzing key id: "+element.getAttribute("id")+": element.key(raw): ("+element.getAttribute("key")+"), element.keycode: "+element.getAttribute("keycode"));

    if (element.hasAttribute("modifiers")) {
    	let modifiers = element.getAttribute("modifiers").split(/[,\s]/);
    	this.modifiers = new Modifiers({
    		modifiers: modifiers
    	});
	}

    this.shortcut = new Shortcut({
//     key: this.key,
    keycode: this.keycode,
    modifiers: this.modifiers
    });
}

Key.prototype = {
    executeCommand: function () {
	const { Windows } = require("../util/windows");
       if (this.element.hasAttribute("command")) {
            let command = this.element.getAttribute("command");
            command = Windows.getElementById(command);
            command && command.doCommand();
            return;
        }

        if (this.element.hasAttribute("oncommand")) {
            let sourceEvent = Windows.createEvent("Events");
            sourceEvent.initEvent("command", false, false);
            let event = Windows.createEvent("XULCommandEvents");
            event.initCommandEvent("command", true, false, null, null, false, false, false, false, sourceEvent);
            this.element.dispatchEvent(event);
            return;
            }
        let id = this.id;
        let menuitem = (Windows.querySelector(`menuitem[key="${id}"][command]`) || Windows.querySelector(`menuitem[key="${id}"][oncommand]`));
       
       if (menuitem) { 
        	if (menuitem.hasAttribute("command")) {
	        	let command = menuitem.getAttribute("command");
    	    	command = Windows.getElementById(command);
        		command && command.doCommand();        	
        	}
        	else if (menuitem.hasAttribute("oncommand")) {
            	let sourceEvent = Windows.createEvent("Events");
            	sourceEvent.initEvent("command", false, false);
            	let event = Windows.createEvent("XULCommandEvents");
            	event.initCommandEvent("command", true, false, null, null, false, false, false, false, sourceEvent);
            	menuitem.dispatchEvent(event);
            	return;
            }
        }
    },

    getLabel: function () {
        return this.element.getAttribute("label");
    },

    toString: function () {
        return this.id;
    }
};

let all = exports.all = (function () {
	let cache;
	return function () {
	const extensionPrefs = require("sdk/simple-prefs");
	if (!cache || (true == extensionPrefs.prefs["keysMapDirty"])) {
		cache = new Map();
		for (let child of require("../util/windows").Windows.querySelectorAll("key")) {
            if (child.getAttribute("command") == "Browser:Reload" && !child.hasAttribute("id")) { child.setAttribute("id", "key_reload2") } // Fix Reload Key without an ID.
			if (child.getAttribute("command") == "Browser:ReloadSkipCache" && !child.hasAttribute("id")) { child.setAttribute("id", "key_forceReload") } // Fix ReloadSkipCache Key without an ID.

			if (child.hasAttribute("oncommand")) {
				let id = child.getAttribute("id");
// 				console.warn("Current key, with id: "+id+", has an onCommand with value: "+child.getAttribute("oncommand")+", do we also have a command? "+child.getAttribute("command"));
    	    	let menuitem = (require("../util/windows").Windows.querySelector(`menuitem[key="${id}"][command]`) || require("../util/windows").Windows.querySelector(`menuitem[key="${id}"][oncommand]`));
        	
            if (menuitem) {
//             	console.warn("A menuitem was found!, let's see: "+XMLSerializer.serializeToString(menuitem));
        		let command = (menuitem.getAttribute("command") || menuitem.getAttribute("oncommand"));
        	}


			}
			
			if (";" == child.getAttribute("oncommand")) {
				let id = child.getAttribute("id");
        		let menuitem = (require("../util/windows").Windows.querySelector(`menuitem[key="${id}"][command]`) || require("../util/windows").Windows.querySelector(`menuitem[key="${id}"][oncommand]`));
//         		console.warn("oncommand's value was (;), so we'll look for a menuitem... Was it found? "+(menuitem ? XMLSerializer.serializeToString(menuitem) : "null"));
//         		console.warn("The full value of the key is: "+XMLSerializer.serializeToString(child));
            	if (menuitem) {
        			let command = (menuitem.getAttribute("command") || menuitem.getAttribute("oncommand"));
					child.setAttribute("command",command);
        		}
			}
			
			if (child.hasAttribute("id")) {
				let { unusableKeys } = require("../util/functions");
				let id = child.getAttribute("id");
				if ("tabGroups-key-tabView" != id && "tabGroups-key-nextGroup" != id && "tabGroups-key-previousGroup" != id) {
				cache.set(id, new Key({id: id}));
				}
			}
		}
	extensionPrefs.prefs["keysMapDirty"] = false;
	}
return cache;
};
})();

let find = exports.find = function (id) {
	return all().get(id);
};

let filter = exports.filter = function (fun) {
	let filtered = new Map();
	for (let key of all().values()) {
		if (fun(key)) {
			filtered.set(key.id, key);
		}
	}
	return filtered;
}

let filterByShortcut = exports.filterByShortcut = function (shortcut) {
	function filter(shortcut) {
		return key.shortcut.toString().toLowerCase() == (term.toLowerCase());
	}

	let filtered = new Map();
	for (let key of all().values()) {
	
		if (fun(key)) {
			filtered.set(key.id, key);
		}
	}
	return filtered;
}

let group = exports.group = function (keys, groups, defaultGroup) {
	let remaining = new Map(keys);
	let retval = new Map();
	
	for (let name in groups) {
		let group = [];
		if ("CustomXUL" != name) {
			for (let id of groups[name]) {
				if 	(remaining.has(id)) {
					group.push(keys.get(id));
					remaining.delete(id);
				}
			}
		}
		else {

			for (let [id, key] of remaining.entries()) {
				
				if (/^Keybinder_/.test(id)) { group.push(keys.get(id)); remaining.delete(id) }
				
			} 
			
		}
		if (group.length) {
			retval.set(name, group);
		}
	}
	
	if (remaining.size) {
		retval.set(defaultGroup, [...remaining.values()]);
	}
	
	return retval;
}

//         let children = Windows.querySelectorAll("key");

//         for (let c = 0; c < children.length; c++) {
//             let key = children[c];
//             var element = key;
//             if (key.getAttribute("command") == "Browser:Reload" && !key.getAttribute("id")) key.setAttribute("id", "key_reload2"); // Fix Reload Key without an ID.
//             if (key.getAttribute("command") == "Browser:ReloadSkipCache" && !key.getAttribute("id")) key.setAttribute("id", "key_forceReload"); // Fix ReloadSkipCache Key without an ID.
//             if (key.hasAttribute("id")) {
//                 let id = key.getAttribute("id");
//                 this._keys[id] = new Key({
//                     id: id
//                 });
// 
//             }
            //       else {  // The other ID-less keys are basically just redundant. Leaving this debug bit in case somebody wants to use them, though.
            //       const {Cc,Ci} = require("chrome");
            //         var XMLSerializer = Cc["@mozilla.org/xmlextras/xmlserializer;1"].
            //         	       createInstance(Ci.nsIDOMSerializer); 
            // 		let noidElement = key;
            // 		console.info("DEBUG:		Found key without ID: "+XMLSerializer.serializeToString(noidElement));
            // 
            //       
            //       }
//         }
//         return this._keys;
//     },
// 
//     get keys() {
//         return this._keys || this._loadKeys();
//     }
// 
// };