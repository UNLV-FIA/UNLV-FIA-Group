var datimModals = datimModals || {};

datimModals.Utils = datimModals.Utils || {};

(function () {
    /*
     * @description Key code constants
     */
    datimModals.KeyCodes = {
        BACKSPACE: 8,
        TAB: 9,
        RETURN: 13,
        SHIFT: 16,
        ESC: 27,
        SPACE: 32,
        PAGE_UP: 33,
        PAGE_DOWN: 34,
        END: 35,
        HOME: 36,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        DELETE: 46,
    };

    datimModals.Utils.remove = function (item) {
        // if item has a remove function then use it
        if (item.remove && typeof item.remove === "function") {
            return item.remove();
        }

        // if parent node exists and has a removeChild function then use it
        if (
            item.parentNode &&
            item.parentNode.removeChild &&
            typeof item.parentNode.removeChild === "function"
        ) {
            return item.parentNode.removeChild(item);
        }

        // return that element could not be removed
        return false;
    }

    

    /*
     * When util functions move focus around, set this to true so the focus 
     * listener can ignore events
     */
    datimModals.Utils.IgnoreUntilFocusChanges = false;

    datimModals.Utils.dialogOpenClass = "has-dialog";

    /*
     * @description Returns whether the given element is focusable or not
     * @param element
     *          The node to check focusability
     * @returns {boolean}
     *      true if element is focusable
     */
    datimModals.Utils.isFocusable = function (element) {
        // if tabIndex is less than zero element is not focusable
        if (element.tabIndex < 0) {
            return false;
        }

        // check if element is disabled
        if (element.disabled) {
            return false;
        }

        switch (element.nodeName) {
            case "A":
                return !!element.href && element.rel != "ignore";
            case "INPUT":
                return element.type != "hidden";
            case "BUTTON":
            case "SELECT":
            case "TEXTAREA":
                return true;
            default:
                return false;
        }
    }; // end isFocusable

    /*
     * @description Attempts to set focus to an element
     * @param element
     *          The node to attempt to focus
     * @returns {boolean}
     *      true if element is focused.
     */
    datimModals.Utils.attemptFocus = function (element) {
        // if element is not a focusable element then return false
        if (!datimModals.Utils.isFocusable(element)) {
            return false;
        }

        // allows focus event listener to not mess with focus attempt
        datimModals.Utils.IgnoreUntilFocusChanges = true;
        try {
            // attempt to focus element
            element.focus();
        } catch (e) {
            // continue regardless of error
        }
        datimModals.Utils.IgnoreUntilFocusChanges = false;

        // check whether the specified element was able to be focused and return result
        return document.activeElement === element;
    }; // end attemptFocus

    /*
     * @description Set focus on descendant nodes until the first focusable element is found.
     * @param element
     *          DOM node for which to find the first focusable descendant
     * @returns {boolean}
     *      true if a focusable element is found and focus is successfully set
     */
    datimModals.Utils.focusFirstDescendant = function (element) {
        for (let i = 0; i < element.childNodes.length; i++) {
            let child = element.childNodes[i];
            // attempt to focus child, or check if any children of the child can be focused
            if (datimModals.Utils.attemptFocus(child) ||
                datimModals.Utils.focusFirstDescendant(child)) {
                return true;
            }
        }
        return false;
    } // focusFirstDescendant

    /*
     * @description Set focus on the last descendant node that is focusable.
     * @param element
     *          DOM node for which to find the last focusable descendant
     * @returns {boolean}
     *      true if a focusable element is found and focus is successfully set
     */
    datimModals.Utils.focusLastDescendant = function (element) {
        // iterate through all child nodes
        for (let i = element.childNodes.length - 1; i >= 0; i--) {
            let child = element.childNodes[i];
            if (datimModals.Utils.attemptFocus(child) ||
                datimModals.Utils.focusLastDescendant(child)) {
                return true;
            }
        }
        return false;
    }; // end focusLastDescendent

    // Array that keeps track of open modals
    datimModals.OpenDialogList = datimModals.OpenDialogList || [];

    /**
        * @returns {object} the last opened dialog (the current dialog)
    */
    datimModals.getCurrentDialog = function () {
        // check to see that the list is defined and make sure that the length is greater than zero
        if (datimModals.OpenDialogList && datimModals.OpenDialogList.length) {
            // return the last Modal in the array
            return datimModals.OpenDialogList[datimModals.OpenDialogList.length - 1];
        }
    }

    /**
    * @description Closes the current dialog (dialog on top)
    * @returns true if the current dialog was able to be closed
    */
    datimModals.closeCurrentDialog = function () {
        // get the current Dialog
        let currentDialog = datimModals.getCurrentDialog();

        // check if a dialog was returned (if there is one open)
        if (currentDialog) {
            // close the current dialog
            currentDialog.close();
            return true;
        }

        return false;
    }

    /**
    * @description event listener function used to handle ESC key event (closes current dialog)
    */
    datimModals.handleEscape = function (event) {
        // get reference to keyCode of the key pressed
        let key = event.keyCode;

        // check if key pressed was the ESC key and check if Current Dialog could be closed successfully
        if (key === datimModals.KeyCodes.ESC && datimModals.closeCurrentDialog()) {
            // stops event from bubbling up to parent or capturing down to child elements
            event.stopPropagation();
        }
    };

    // add keyup event listener to implement handleEscape functionality
    document.addEventListener('keyup', datimModals.handleEscape);

    /**
     * @class
    * @description Dialog object providing modal focus management.
    *
    * Assumptions: The element serving as the dialog container is present in the
    * DOM and hidden. The dialog container has attribute datim-modal.
    * @param dialogId
    *          The ID of the element serving as the dialog container.
    * @param focusAfterClosed
    *          Either the DOM node or the ID of the DOM node to focus when the
    *          dialog closes.
    * @param focusFirst
    *          Optional parameter containing either the DOM node or the ID of the
    *          DOM node to focus when the dialog opens. If not specified, the
    *          first focusable element in the dialog will receive focus.
    */
    datimModals.Dialog = function (dialogId, focusAfterClosed, focusFirst) {
        // get reference to modal/dialog
        this.dialogNode = document.getElementById(dialogId);
        // make sure element was found
        if (this.dialogNode === null) {
            throw new Error(`No element found with id="${dialogId}".`);
        }

        // check to see if dialogNode is a datim-modal
        let isDatimModal = this.dialogNode.hasAttribute("datim-modal");
        if (!isDatimModal) {
            throw new Error(
                "Dialog() requires a DOM element with datim-modal attribute"
            );
        }

        // Wrap in an individual backdrop element if one doesn't exist
        // TODO: MAKE SURE TO IMPLEMENT THIS STYLE IN STYLESHEET
        let backdropClass = "datim-dialog-backdrop";
        if (this.dialogNode.parentNode.classList.contains(backdropClass)) {
            this.backdropNode = this.dialogNode.parentNode;
        } else { // create a parent backdrop node
            this.backdropNode = document.createElement("div");
            this.backdropNode.className = backdropClass;
            this.dialogNode.parentNode.insertBefore(
                this.backdropNode,
                this.dialogNode
            );
            this.backdropNode.appendChild(this.dialogNode);
        }

        // add active class to backdrop node because its child modal is being opened
        this.backdropNode.classList.add("active");

        // disable scroll on the body element
        // TODO: MAKE SURE TO IMPLEMENT THIS STYLE IN STYLESHEET
        document.body.classList.add(datimModals.Utils.dialogOpenClass);

        // user is able to pass in id or element for focusAfterClosed
        // check if user passed in id
        if (typeof focusAfterClosed === "string") {
            this.focusAfterClosed = document.getElementById(focusAfterClosed);
            if (this.focusAfterClosed === null) {
                throw new Error(`No element found with id="${focusAfterClosed}".`);
            }
        } else if (typeof focusAfterClosed === "object") { // check if user passed in an element
            this.focusAfterClosed = focusAfterClosed;
        } else {
            throw new Error(
                "The focusAfterClosed parameter is required for the aria.Dialog constructor"
            );
        }

        // user is able to pass in id or element for focusFirst
        // check if user passed in id
        if (typeof focusFirst === "string") {
            this.focusFirst = document.getElementById(focusFirst);
        } else if (typeof focusFirst === "object") { // check if user passed in an element
            this.focusFirst = focusFirst;
        } else {
            this.focusFirst = null;
        }

        // Bracket the dialog node with two invisible, focusable nodes.
        // While this dialog is open, we use these to make sure that focus never
        // leaves the document even if dialogNode is the first or last node.
        let preDiv = document.createElement("div");
        this.preNode = this.dialogNode.parentNode.insertBefore(
            preDiv,
            this.dialogNode
        );
        // make preNode tabbable/focusable
        this.preNode.tabIndex = 0;

        let postDiv = document.createElement("div");
        this.postNode = this.dialogNode.parentNode.insertBefore(
            postDiv,
            this.dialogNode.nextSibling
        );
        // make postNode tabbable/focusable
        this.postNode.tabIndex = 0;

        // If this modal is opening on top of one that is already open,
        // get rid of the document focus listener of the open dialog.
        if (datimModals.OpenDialogList.length > 0) {
            datimModals.getCurrentDialog().removeListeners();
        }

        // add listeners (enables focus trap) to this dialog since it is the new current dialog
        this.addListeners();
        // add this dialog to OpenDialogList array
        datimModals.OpenDialogList.push(this);
        // make sure all inputs are empty
        this.clearDialog();
        // TODO: MAKE SURE TO IMPLEMENT THIS STYLE IN STYLESHEET
        this.dialogNode.className = "default_dialog"; // make visible

        // check to see if user specified an element to focus first
        if (this.focusFirst) {
            this.focusFirst.focus();
        } else { // else focus the first descendant
            datimModals.Utils.focusFirstDescendant(this.dialogNode);
        }

        this.lastFocus = document.activeElement;
    }; // end of Dialog class

    /**
    * @description clears all inputs of the this dialog
    */
    datimModals.Dialog.prototype.clearDialog = function () {
        let dialogInputs = Array.from(this.dialogNode.querySelectorAll("input"));
        dialogInputs.map(function (input) {
            input.value = "";
        });
    }

    /**
   * @description
   *  Hides the current top dialog,
   *  removes listeners of the top dialog,
   *  restore listeners of a parent dialog if one was open under the one that just closed,
   *  and sets focus on the element specified for focusAfterClosed.
   */
    datimModals.Dialog.prototype.close = function () {
        // remove current dialog from open dialog list
        datimModals.OpenDialogList.pop();
        // removes focustrap from current dialog
        this.removeListeners();
        // remove pre and post node
        datimModals.Utils.remove(this.preNode);
        datimModals.Utils.remove(this.postNode);
        // TODO: MAKE SURE TO IMPLEMENT THIS STYLE IN STYLESHEET
        this.dialogNode.className = "hidden";
        // remove active class on backdrop
        this.backdropNode.classList.remove("active");
        // return focus to specified focusAfterClosed element (usually element that initiated the modal being shown)
        this.focusAfterClosed.focus();

        // If a dialog was open underneath this one, restore its listeners.
        if (datimModals.OpenDialogList.length > 0) {
            // add listeners to new current dialog
            datimModals.getCurrentDialog.addListeners();
        } else {
            document.body.classList.remove(datimModals.Utils.dialogOpenClass);
        }
    } // end close

    /**
    * @description
    *  Hides the current dialog and replaces it with another.
    * @param newDialogId
    *  ID of the dialog that will replace the currently open top dialog.
    * @param newFocusAfterClosed
    *  Optional ID or DOM node specifying where to place focus when the new dialog closes.
    *  If not specified, focus will be placed on the element specified by the dialog being replaced.
    * @param newFocusFirst
    *  Optional ID or DOM node specifying where to place focus in the new dialog when it opens.
    *  If not specified, the first focusable element will receive focus.
    */
    datimModals.Dialog.prototype.replace = function (newDialogId, newFocusAfterClosed, newFocusFirst) {
        // remove current dialog from open dialog list
        datimModals.OpenDialogList.pop();
        // remove focus trap listeners from current dialog
        this.removeListeners();
        // remove pre and post nodes
        datimModals.Utils.remove(this.preNode);
        datimModals.Utils.remove(this.postNode);
        this.dialogNode.className = "hidden"; // hide current dialog
        // remove active class on backdrop
        this.backdropNode.classList.remove("active");
        let focusAfterClosed = newFocusAfterClosed || this.focusAfterClosed;
        new datimModals.Dialog(newDialogId, focusAfterClosed, newFocusFirst);
    }; // end replace

    // adds the focus event listener to a dialog
    datimModals.Dialog.prototype.addListeners = function () {
        document.addEventListener("focus", this.trapFocus, true);
    }

    // removes the focus event listener of a dialog
    datimModals.Dialog.prototype.removeListeners = function () {
        document.removeEventListener("focus", this.trapFocus, true);
    }

    // trapFocus function used for focus event listener
    datimModals.Dialog.prototype.trapFocus = function (event) {
        if (datimModals.Utils.IgnoreUntilFocusChanges) {
            return;
        }

        let currentDialog = datimModals.getCurrentDialog();
        if (currentDialog.dialogNode.contains(event.target)) {
            currentDialog.lastFocus = event.target;
        } else {
            datimModals.Utils.focusFirstDescendant(currentDialog.dialogNode);
            if (currentDialog.lastFocus == document.activeElement) {
                datimModals.Utils.focusLastDescendant(currentDialog.dialogNode);
            }
            currentDialog.lastFocus = document.activeElement;
        }
    }; // end trapFocus 

    window.openDialog = function (dialogId, focusAfterClosed, focusFirst) {
        new datimModals.Dialog(dialogId, focusAfterClosed, focusFirst);
    }; // end openDialog

    window.closeDialog = function (closeButton) {
        let topDialog = datimModals.getCurrentDialog();
        if (topDialog.dialogNode.contains(closeButton)) {
            topDialog.close();
        }
    }; // end closeDialog

    window.replaceDialog = function (newDialogId, newFocusAfterClosed, newFocusFirst) {
        let topDialog = datimModals.getCurrentDialog();
        if (topDialog.dialogNode.contains(document.activeElement)) {
            topDialog.replace(newDialogId, newFocusAfterClosed, newFocusFirst);
        }
    }; // end replaceDialog

})();