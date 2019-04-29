const Selected = (function () {
	let self = {};

	let selectStart = {};
	let pointer = {};
	let lastPointer = {};

	let selectionBox;

	let mouseDown = -1;

	let selectables;
	let selection = {};
	let nextSelection = {};
	let getSelectables = () => [];
	let selectables_need_update = true;

	let update = async () => {
		let x = pointer.x < selectStart.x ? pointer.x : selectStart.x;
		let y = pointer.y < selectStart.y ? pointer.y : selectStart.y;
		let w = Math.abs(pointer.x - selectStart.x);
		let h = Math.abs(pointer.y - selectStart.y);
		updateSelectionVisual(x, y, w, h);
		await updateSelection(x, y, w, h);
	}

	let updateSelection = async (x, y, w, h) => {
		for (let id in selectables) {
			let elem = selectables[id];

			let inSelection = isElementPartInRect(elem, x, y, w, h);

			let outcome = false;

			if (inSelection && elementVisibleInScrollfield(elem, elem.parentNode.parentNode)) {
				outcome = true;
			}

			nextSelection[id] = outcome;
			let previous = selection[id];

			if (outcome || previous) {
				outcome = true;
			}

			if (previous != outcome) {
				setNodeClass(elem, 'selection', outcome);
			}
		}
	}

	let elementVisibleInScrollfield = (elem, scrollfield) => {
		// Only tests vertical scroll
		let offset = elem.offsetTop;
		let scrollTop = scrollfield.scrollTop;

		if (offset + elem.clientHeight - scrollTop > 0 &&
			offset - scrollTop < scrollfield.clientHeight) {
			return true;
		}
	}

	let updateSelectionVisual = async (x, y, w, h) => {
		selectionBox.style.left = `${x}px`;
		selectionBox.style.top = `${y}px`;
		selectionBox.style.width = `${w}px`;
		selectionBox.style.height = `${h}px`;
	}


	let updateSelectionItemVisual = async () => {
		for (let id in selectables) {
			let elem = selectables[id];
			setNodeClass(elem, 'selection', selection[id]);
		}
	}


	let onStartSelect = async (event) => {
		selectStart.x = event.clientX;
		selectStart.y = event.clientY;
		selectionBox.style.left = `${event.clientX}px`;
		selectionBox.style.top = `${event.clientY}px`;
		selectionBox.style.display = 'initial';
	}

	let onEndSelect = async () => {
		selectionBox.style.display = 'none';
		selectionBox.style.width = `$0px`;
		selectionBox.style.height = `$0px`;

		for (let id in nextSelection) {
			let outcome = nextSelection[id];
			let previous = selection[id];

			selection[id] = outcome || previous;
		}

		nextSelection = {};

		// if (multiselect_api_enabled) {
		// 	let sel = self.get();
		// 	let current_win_id = await browser.windows.getCurrent().id;
		// 	let return_to = (await browser.tabs.query({
		// 		active: true
		// 		, windowId: current_win_id
		// 	}))[0];

		// 	for (i in sel) {
		// 		console.log(`shifting ${sel[i]}`);
		// 		if (sel[i] > return_to.id) {
		// 			console.log(`shifting ${sel[i]}`);
		// 			sel[i] = sel[i] - 1;
		// 		}
		// 	}

		// 	browser.tabs.highlight({
		// 		windowId: current_win_id
		// 		, tabs: sel
		// 	}).then(_ => {
		// 		browser.tabs.update(return_to.id, {
		// 			active: true
		// 		});
		// 	});
		// }
	}

	let clickedOnTab = (pElement) => {
		let elem = pElement;

		if (isElementTab(elem)) {
			return true;
		}
		else {
			while (elem.parentNode != null) {
				elem = elem.parentNode;
				if (isElementTab(elem)) {
					return true;
				}
			}
		}

		return false;
	}

	let shouldIgnoreElement = (pElement) => {
		if (pElement.getAttribute('ignore') == 't') {
			return true;
		}

		return false;
	}

	let isElementTab = (pElement) => {
		if (pElement.classList == null) {
			return false;
		}

		if (pElement.classList.contains('tab')) {
			return true;
		}

		return false;
	}

	let ensureUpToDate = () => {
		if (selectables_need_update) {
			selectables = getSelectables();
			selectables_need_update = false;
		}
	}

	let endSelect = () => {
		if (mouseDown != -1) {
			clearInterval(mouseDown)
			mouseDown = -1;
			onEndSelect();
		}
	}

	self.get = () => {
		let r = [];

		for (id in selection) {
			if (selection[id] == true) {
				r.push(Number(id));
			}
		}

		endSelect();

		return r;
	}

	self.add = (id) => {
		ensureUpToDate();
		let elem = selectables[id];
		if (elem != null) {
			selection[id] = true;
			setNodeClass(elem, 'selection', true);
		}
	}

	self.remove = (id) => {
		let elem = selectables[id];
		if (elem != null) {
			selection[id] = false;
			setNodeClass(elem, 'selection', false);
		}
	}

	self.removeSelectable = (id) => {
		let elem = selectables[id];
		if (elem != null) {
			delete selection[id];
			delete selectables[id];
			setNodeClass(elem, 'selection', false);
			selectables_need_update = true;
		}
	}

	self.requireUpdate = () => {
		selectables_need_update = true;
	}

	self.print = () => {
		let s = self.get();

		for (let id in s) {
			console.log(id);
		}
	}

	self.clear = () => {
		selection = {};
		updateSelectionItemVisual();

		// if (multiselect_api_enabled) {
		// 	browser.tabs.query({
		// 		currentWindow: true
		// 	}).then(tabs => {
		// 		for (i in tabs) {
		// 			let tab = tabs[i];
		// 			tab.highlighted = false;
		// 		}
		// 	});
		// }
	}

	self.init = (callback) => {
		if (callback != null) {
			getSelectables = callback;
		}

		selectionBox = document.getElementById('selection-box');
		selectables = getSelectables();

		document.onmousedown = function (event) {
			if (event.button != 0) {
				return;
			}

			if (mouseDown == -1) {
				if (shouldIgnoreElement(event.target)) {
					return;
				}
				if (!event.ctrlKey && !event.shiftKey && clickedOnTab(event.target)) {
					return;
				}

				if (!event.ctrlKey && !event.shiftKey) {
					self.clear();
				}

				ensureUpToDate();

				mouseDown = setInterval(whilemousedown, 17);
				onStartSelect(event);
				update();
			}
		};

		document.onmouseup = function (event) {
			if (event.button != 0) {
				return;
			}
			endSelect();
		}

		function whilemousedown() {
			if (lastPointer.x != pointer.x || lastPointer.y != pointer.y) {
				update();
				lastPointer.x = pointer.x;
				lastPointer.y = pointer.y;
			}
		}

		document.onmousemove = function (event) {
			pointer.x = event.clientX;
			pointer.y = event.clientY;
		}

		document.onkeypress = function (event) {
			if (event.key == 'd') {
				event.stopPropagation();
				self.clear();
			}
		}
	}

	return self;
})();