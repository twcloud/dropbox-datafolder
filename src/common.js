"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("../node_modules/rxjs");
const operators_1 = require("../node_modules/rxjs/operators");
function dumpToArray() {
    return (source) => source.pipe(operators_1.reduce((n, e) => { n.push(e); return n; }, []));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsK0NBQWtEO0FBQ2xELDhEQUF3RDtBQUV4RDtJQUNDLE1BQU0sQ0FBQyxDQUFDLE1BQXFCLEtBQXNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQU0sQ0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBUyxDQUFDLENBQUMsQ0FBQztBQUMvSCxDQUFDO0FBRkQsa0NBRUM7QUFHRCw2QkFBb0MsTUFBZSxFQUFFLEdBQXdCO0lBQzVFLE1BQU0sQ0FBQyxJQUFJLGlCQUFVLENBQW9CLENBQUMsSUFBSTtRQUM3QyxvQkFBb0IsR0FBaUM7WUFDcEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQixDQUFDO1FBQ0Qsb0JBQW9CLEdBQTJCO1lBQzlDLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQTtZQUNGLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNsQixNQUFNLENBQUMsTUFBTSxDQUFDLHVCQUF1QixDQUFDO29CQUNyQyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU07aUJBQ2xCLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ2pDLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDUCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDakIsQ0FBQztRQUNGLENBQUM7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FB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