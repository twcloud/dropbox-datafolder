"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("../node_modules/rxjs");
const operators_1 = require("../node_modules/rxjs/operators");
function dumpToArray() {
    return (source) => source.pipe(operators_1.reduce((n, e) => n.concat(e), []));
}
exports.dumpToArray = dumpToArray;
function dbx_filesListFolder(client, arg) {
    return new rxjs_1.Observable((subs) => {
        function errHandler(err) {
            subs.error(err);
        }
        function resHandler(res) {
            res.entries.forEach(e => {
                subs.next(e);
            });
            if (res.has_more) {
                return client.filesListFolderContinue({
                    cursor: res.cursor
                }).then(resHandler, errHandler);
            }
            else {
                subs.complete();
            }
        }
        client.filesListFolder(arg).then(resHandler, errHandler);
    });
}
exports.dbx_filesListFolder = dbx_filesListFolder;
class StatusHandler {
    constructor(profilepic) {
        this.profilepic = profilepic;
        //initialize the status panel
        this.clearStatusMessage();
    }
    // private statusPanelCache: any;
    getStatusPanel() {
        // if(this.statusPanelCache) return this.statusPanelCache;
        // debugger;
        var getElement = function (id, parentNode) {
            parentNode = parentNode || document;
            var el = document.getElementById(id);
            if (!el) {
                el = document.createElement("div");
                el.setAttribute("id", id);
                parentNode.appendChild(el);
            }
            return el;
        }, status = getElement("twits-status", document.body), message = getElement("twits-message", status), progress = getElement("twits-progress", status);
        status.style.display = "block";
        if (this.profilepic && status.getElementsByClassName('profile-pic').length === 0) {
            const profile = document.createElement('img');
            profile.src = this.profilepic;
            profile.classList.add("profile-pic");
            status.insertBefore(profile, message);
        }
        return { status: status, message: message, progress: progress };
        // return this.statusPanelCache;
    }
    clearStatusMessage() {
        var status = this.getStatusPanel();
        status.status.style.display = "none";
    }
    setStatusMessage(text) {
        var status = this.getStatusPanel();
        while (status.message.hasChildNodes()) {
            status.message.removeChild(status.message.firstChild);
        }
        status.message.appendChild(document.createTextNode(text));
    }
}
exports.StatusHandler = StatusHandler;
function contains(item, array) {
    return Array.isArray(array) ? (array.indexOf(item) !== -1) : Object.keys(array).findIndex(k => array[k] === item) !== -1;
}
exports.contains = contains;
