const { ipcRenderer } = require('electron');

let currentState = {};

// Log the current state to the console during every click for development purposes
document.getElementById('body').addEventListener('click', () => {
	console.log(currentState);
})

// SELECTORS -----------------------------------------------------------------

const previousStepButton = document.getElementById('previous');
const nextStepButton = document.getElementById('next');

const defaultSection = document.getElementById('right-section-default');
const addPatternSection = document.getElementById('right-section-add-pattern');
const addPatternRepeatSection = document.getElementById('right-section-add-repeat');
const editPatternSection = document.getElementById('right-section-edit-pattern');
const leftSection = document.getElementById('left-section');

const addPatternForm = document.getElementById('add-pattern-form');
const editPatternForm = document.getElementById('edit-pattern-form');


// HELPER FUNCTIONS ----------------------------------------------------------

// Request that the main process save the state to user preferences
let saveCurrentState = () => {
	ipcRenderer.send('save-current-state', currentState);
}

// Validate the add patterns form input
let getAddPatternFormErrors = () => {
	const errors = [];
	const patternName = document.getElementById('pattern-name').value;
	const allStepStitches = document.getElementsByClassName('step-stitch');
	if (!patternName) {
			errors.push('Please input a pattern name');
	}	
	for (let i = 0; i < allStepStitches.length; i++) {
		if (!allStepStitches[i].value) {
			errors.push(`Please input a value for each step's stitches`);
		}
	}
	return errors;
}

// Validate the edit patterns form input
let getEditPatternFormErrors = () => {
	const errors = [];
	const patternName = document.getElementById('edit-pattern-name').value;
	const allStepStitches = document.getElementsByClassName('edit-step-stitch');
	if (!patternName) {
			errors.push('Please input a pattern name');
	}	
	for (let i = 0; i < allStepStitches.length; i++) {
		if (!allStepStitches[i].value) {
			errors.push(`Please input a value for each step's stitches`);
		}
	}
	return errors;
}

// Validate the add repeat form input
let getAddRepeatFormErrors = () => {
	const errors = [];
	const allCheckboxes = document.getElementsByClassName('repeat-checkbox');
	const repeatNumber = document.getElementById('repeat-number').value;
	const checkedCheckboxes = [];
	for (let i = 0; i < allCheckboxes.length; i++) {
		if (allCheckboxes[i].checked) {
			checkedCheckboxes.push(allCheckboxes[i]);
		}
	}
	if (checkedCheckboxes.length === 0) {
		errors.push('Please check at least one step to repeat');
	}
	if (repeatNumber < 1) {
		errors.push('You must repeat your selected steps at least 1 time');
	}
	return errors;
}

// Refresh the contents of the current step/repeat heading
let refreshCurrentPosition = () => {
	const currentPosition = document.getElementById('current-position');
	let repeatDetails = '';
	if (currentState.repeat.active) {
		repeatDetails = `(Repeat ${currentState.repeat.position} of ${currentState.repeat.count})`;
	}
	const currentPositionContents = `
		<h2>Currently on Step ${currentState.step} ${repeatDetails}</h2>
	`;
	currentPosition.innerHTML = currentPositionContents;
}

// Highlight the active step
let visuallyChangeStep = () => {
	const individualStepButtons = document.getElementsByClassName('step-button');
	for (let i = 0; i < individualStepButtons.length; i++) {
		// Remove active class from buttons
		individualStepButtons[i].classList.remove('active');
		// Add the active class to the newly active step button
		if (individualStepButtons[i].textContent == currentState.step) {
			individualStepButtons[i].classList.add('active');
		}
	}
	let steps = leftSection.children;
	for (let i = 0; i < steps.length; i++) {
		// Remove active class from steps
		steps[i].classList.remove('active');
		// Add the active class to the newly active step
		if (steps[i].dataset.stepId == currentState.step) {
			steps[i].classList.add('active');
			steps[i].scrollIntoView();
		}
	}
	refreshCurrentPosition();
}


// Display all patterns in the select dropdown, if available
let populatePatternSelectOptions = (patterns) => {
	const patternSelect = document.getElementById('pattern-select');
	patternSelect.innerHTML = '';
	// Get all the patterns
	patterns.forEach((pattern) => {
    let option = document.createElement("option");
    option.textContent = pattern.name;
		option.value = pattern.id;
		option.dataset.patternId = pattern.id;
		if (pattern.id === currentState.patternId) {
			option.selected = true;
		}
    patternSelect.appendChild(option);
	});
}

let isEmpty = object => {
	for(var key in object) {
		if(object.hasOwnProperty(key)) {
			return false;
		}
	}
	return true;
}

// Fill the screen with information from the database, if available
let populateWindow = (e, allPatterns, initialState) => {
	// Initially update the current state from user preferences or defaults after the application has been closed
	if (isEmpty(currentState)) {
		currentState = initialState;
	}
	saveCurrentState();
	// Find the steps for currently selected pattern
	let selectedPattern = allPatterns.filter(pattern => pattern.id === currentState.patternId)[0];
	let steps = JSON.parse(selectedPattern.steps);
	currentState.totalSteps = steps.length;

	populatePatternSelectOptions(allPatterns);

	// Append an individual step button for each step
	const individualStepButtonsUl = document.getElementById('individual-step-buttons');
	let individualStepButtonsUlContents = '';
	steps.forEach((step, index) => {
		let stepNumber = index + 1;
		individualStepButtonsUlContents += `
			<li><button class="button step-button ${(stepNumber === currentState.step) ? 'active' : ''}">${stepNumber}</button></li>
		` 
	});
	individualStepButtonsUl.innerHTML = individualStepButtonsUlContents;

	// Append the list of steps to the left section
	const leftSection = document.getElementById('left-section');
	let leftSectionContents = '';
	steps.forEach((step, index) => {
		let stepNumber = index + 1;
		leftSectionContents += `
			<div data-step-id="${stepNumber}" class="step ${(stepNumber === currentState.step) ? 'active' : ''}">
				<h3 class="step-number">Step ${stepNumber}</h3>
				<div>
					<p class="details">${step.details}</p>
					<p class="stitches">${step.stitches}</p>
				</div>
			</div>
		` 
	});
	leftSection.innerHTML = leftSectionContents;

	refreshCurrentPosition();

	// Display pattern image
	const rightSectionDefault = document.getElementById('right-section-default');
	let rightSectionDefaultContents = `
		<img src="${selectedPattern.imagePath}" id="pattern-image" />
	`;
	rightSectionDefault.innerHTML = rightSectionDefaultContents;

	resetForms();

	// Include pattern data in the edit form
	const editPatternForm = document.getElementById('edit-pattern-form');
	let editPatternFormContents = `
		<div id="edit-pattern-form-errors" class="error"></div>
		<div class="field">
			<label for="pattern-name">Pattern Name*</label>
			<div class="control">
					<input class="input" type="text" name="pattern-name" value="${selectedPattern.name}" id="edit-pattern-name">
			</div>
		</div>
		<p id="edit-uploaded-image-path">${selectedPattern.imagePath}</p>
		<button class="button" type="button" id="edit-image-upload">Choose another image to upload (optional)</button>
		<p id="editImageError" class="error"></p>
		<div id="edit-step-fieldsets">
		</div>
		<button class="button" type="button" id="edit-add-another-step">Add another step</button>
		<div class="is-grouped">
			<button class="button" type="button" id="save-edit-pattern">Save</button>
			<button class="button" type="button" id="cancel-edit-pattern">Cancel</button>
		</div>
	`;
	editPatternForm.innerHTML = editPatternFormContents;

	// Loop through and display each step's details and stitches
	let editPatternFieldsets = document.getElementById('edit-step-fieldsets');
	let fieldSetsToInclude = '';
	steps.forEach((step, index) => {
		let stepNumber = index + 1;
		fieldSetsToInclude += `
			<fieldset data-edit-fieldset-id="${stepNumber}" class="editable-steps">
			<legend>Step ${stepNumber}</legend>
			<div class="field">
				<label for="step-details">Step details (optional)</label>
				<div class="control">
					<input class="input edit-step-detail" type="text" name="step-details" value="${step.details}">
				</div>
			</div>
			<div class="field">
				<label for="step-stitches">Stitches*</label>
				<div class="control">
					<input class="input edit-step-stitch" type="text" name="step-stitches" value="${step.stitches}">
				</div>
			</div>
		</fieldset>
		`;
	});
	editPatternFieldsets.innerHTML = fieldSetsToInclude;

	// Add steps to the add repeat form
	const repeatCheckboxes = document.getElementById('repeat-checkboxes');
	let repeatCheckboxesContents = '';
	steps.forEach((step, index) => {
		let stepNumber = index + 1;
		repeatCheckboxesContents += `
			<label class="checkbox">
				<input type="checkbox" value="${stepNumber}" class="repeat-checkbox">Step ${stepNumber}: ${step.stitches}
			</label>
		` 
	});
	repeatCheckboxes.innerHTML = repeatCheckboxesContents;

	addMainButtonEventListeners();
	addIndividualStepButtonListeners();
	addFormEventListeners();
}

// Reset the repeat values to default
let removeRepeat = () => {
	currentState.repeat = {
		active: false,
		position: 1,
		count: 0,
		steps: []
	}
	saveCurrentState();
	refreshCurrentPosition();
}

// Check if the repeat is active for the current pattern before taking any action
let isRepeatActive = (e) => {
	const targetStep = parseInt(e.target.innerText);
	console.log('target step', targetStep);
	// Jumping to a step erases the current repeat
	if (currentState.repeat.active) {
		// Get confirmation from user
		ipcRenderer.send('confirm-repeat-abandon', targetStep);
	} else {
		jumpToTargetStep(targetStep);
	}
}

// Jump to a step without using previous/next buttons
let jumpToTargetStep = (targetStep) => {
	// Jumping to a step erases the current repeat
	if (currentState.repeat.active) {
		// Get confirmation from user
		ipcRenderer.send('confirm-repeat-abandon');
	}
	currentState.step = targetStep;
	visuallyChangeStep();
	saveCurrentState();
}

// Hide the forms
let displayDefaultSection = () => {
	// Display the form while hiding others
	defaultSection.style.display = 'flex';
	addPatternSection.style.display = 'none';
	editPatternSection.style.display = 'none';
	addPatternRepeatSection.style.display = 'none'
}

let appendFieldsetToAddPatternForm = () => {
	const addStepFieldsets = document.getElementById('add-step-fieldsets');
	// Get the previous fieldset's step number
	const previousFieldsetStepNumber = parseInt(addStepFieldsets.lastElementChild.dataset.addFieldsetId);
	const stepNumber = previousFieldsetStepNumber + 1;

	addStepFieldsets.innerHTML += `
		<fieldset data-add-fieldset-id="${stepNumber}" class="addable-step">
			<legend>Step ${stepNumber}</legend>
			<div class="field">
				<label for="step-detail">Step details (optional)</label>
				<div class="control">
						<input class="input step-detail" type="text" name="step-detail">
				</div>
			</div>
			<div class="field">
				<label for="step-stitch">Stitches*</label>
				<div class="control">
						<input class="input step-stitch" type="text" name="step-stitch" id="step-stitches">
				</div>
			</div>
		</fieldset>
	`;
}

let appendFieldsetToEditPatternForm = () => {
	const editStepFieldsets = document.getElementById('edit-step-fieldsets');
	// Get the previous fieldset's step number
	const previousFieldsetStepNumber = parseInt(editStepFieldsets.lastElementChild.dataset.editFieldsetId);
	const stepNumber = previousFieldsetStepNumber + 1;
	editStepFieldsets.innerHTML += `
		<fieldset data-edit-fieldset-id="${stepNumber}" class="editable-steps">
		<legend>Step ${stepNumber}</legend>
		<div class="field">
			<label for="step-detail">Step details (optional)</label>
			<div class="control">
					<input class="input edit-step-detail" type="text" name="step-detail">
			</div>
		</div>
		<div class="field">
			<label for="step-stitch">Stitches*</label>
			<div class="control">
					<input class="input edit-step-stitch" type="text" name="step-stitch">
			</div>
		</div>
	</fieldset>
	`;
}

let resetForms = () => {
	addPatternForm.innerHTML = `
		<div id="add-pattern-form-errors" class="error"></div>
		<div class="field">
			<label for="pattern-name">Pattern Name*</label>
			<div class="control">
					<input class="input" type="text" name="pattern-name" id="pattern-name">
			</div>
		</div>
		<p id="image-path"></p>
		<button class="button" type="button" id="image-upload">Choose an image to upload (optional)</button>
		<p id="imageError" class="error"></p>
		<div id="add-step-fieldsets">
			<fieldset data-add-fieldset-id="1" class="addable-step">
				<legend>Step 1</legend>
				<div class="field">
					<label for="step-details">Step details (optional)</label>
					<div class="control">
							<input class="input step-detail" type="text" name="step-details">
					</div>
				</div>
				<div class="field">
					<label for="step-stitches">Stitches*</label>
					<div class="control">
							<input class="input step-stitch" type="text" name="step-stitches" id="step-stitches">
					</div>
				</div>
			</fieldset>
		</div>
		<button class="button" type="button" id="add-another-step">Add another step</button>
		<div class="is-grouped">
			<button class="button" type="button" id="save-add-pattern">Save</button>
			<button class="button" type="button" id="cancel-add-pattern">Cancel</button>
		</div>
	`;

	editPatternForm.innerHTML = `
		<div id="edit-pattern-form-errors" class="error"></div>
		<div class="field">
			<label for="pattern-name">Pattern Name*</label>
			<div class="control">
					<input class="input" type="text" name="pattern-name" id="edit-pattern-name">
			</div>
		</div>
		<p id="edit-uploaded-image-path"></p>
		<button class="button" id="edit-image-upload">Choose a different image to upload (optional)</button>
		<p id="editImageError" class="error"></p>
		<div id="edit-step-fieldsets">
			<fieldset data-edit-fieldset-id="1" class="editable-steps>
				<legend>Step 1</legend>
				<div class="field">
					<label for="step-details">Step details (optional)</label>
					<div class="control">
							<input class="input edit-step-detail" type="text" name="step-details">
					</div>
				</div>
				<div class="field">
					<label for="step-stitches">Stitches*</label>
					<div class="control">
							<input class="input edit-step-stitch" type="text" name="step-stitches">
					</div>
				</div>
			</fieldset>
		</div>
		<button class="button" type="button" id="edit-add-another-step">Add another step</button>
		<div class="is-grouped">
			<button class="button" type="button" id="save-edit-pattern">Save</button>
			<button class="button" type="button" id="cancel-edit-pattern">Cancel</button>
		</div>
	`;

	addFormEventListeners();
}

let cancelForm = () => {
	displayDefaultSection();
	resetForms();
}

let saveAddPattern = () => {
	// Get the form values
	const patternName = document.getElementById('pattern-name').value;
	let uploadedImagePath = document.getElementById('image-path').innerText;
	const addableSteps = document.getElementsByClassName('addable-step');
	const stepDetails = document.getElementsByClassName('step-detail');
	const stepStitches = document.getElementsByClassName('step-stitch');

	console.log(uploadedImagePath);
	// Optional image upload path
	uploadedImagePath = uploadedImagePath ? uploadedImagePath : '../assets/images/default.png';

	// Build pattern object
	const newPattern = {
		name: patternName,
		imagePath: uploadedImagePath, 
		steps: []
	}

	// Push input values for steps
	for (let i = 0; i < addableSteps.length; i++) {
		newPattern.steps.push({
			details: stepDetails[i].value,
			stitches: stepStitches[i].value
		});
	}

	// Stringify for easy storage in the database
	newPattern.steps = JSON.stringify(newPattern.steps);

	const errors = getAddPatternFormErrors();
	if (errors.length === 0) {
		ipcRenderer.send('save-new-pattern', newPattern);
		displayDefaultSection();
	} else {
		const errorsDiv = document.getElementById('add-pattern-form-errors');
		let errorsDivContents = '';
		errors.forEach((error) => {
			errorsDivContents += `<p>${error}</p>`;
		});
		errorsDiv.innerHTML = errorsDivContents;
	}
}

let saveEditedPattern = () => {
	// Get the form values
	const editedName = document.getElementById('edit-pattern-name').value;
	let editedImagePath = document.getElementById('edit-uploaded-image-path').innerText;
	const editableSteps = document.getElementsByClassName('editable-steps');
	const editableStepDetails = document.getElementsByClassName('edit-step-detail');
	const editableStepStitches = document.getElementsByClassName('edit-step-stitch');
	const repeatNumber = document.getElementById('repeat-number').value;
	const currentPatternImagePath = document.getElementById('edit-uploaded-image-path').innerText;

	// Optional image upload path
	editedImagePath = editedImagePath ? editedImagePath : currentPatternImagePath;

	// Build pattern object
	let editedPattern = {
		name: editedName,
		imagePath: editedImagePath,
		steps: []
	}

	// Push input values for steps
	for (let i = 0; i < editableSteps.length; i++) {
		editedPattern.steps.push({
			details: editableStepDetails[i].value,
			stitches: editableStepStitches[i].value
		});
	}

	// Number of times to repeat the selected steps
	currentState.repeat.count = repeatNumber;

	// Stringify for easy storage in the database
	editedPattern.steps = JSON.stringify(editedPattern.steps);

	const errors = getEditPatternFormErrors();

	// If valid, save and go back to the default form
	if (errors.length === 0) {
		ipcRenderer.send('save-edited-pattern', editedPattern, currentState.patternId);
		displayDefaultSection();
	} else {
		const errorsDiv = document.getElementById('edit-pattern-form-errors');
		let errorsDivContents = '';
		errors.forEach((error) => {
			errorsDivContents += `<p>${error}</p>`;
		});
		errorsDiv.innerHTML = errorsDivContents;
	}
}

let saveRepeat = () => {
	// Get the step numbers included in the repeat from the form
	const checkboxes = document.getElementsByClassName('repeat-checkbox');
	const repeatNumber = parseInt(document.getElementById('repeat-number').value);

	// Collect the values of the checked checkboxes
	for (let i = 0; i < checkboxes.length; i++) {
		if (checkboxes[i].checked) {
			// Push that step number to the array
			console.log(currentState.repeat.steps);
			currentState.repeat.steps.push(parseInt(checkboxes[i].value));
		}
	}

	const errors = getAddRepeatFormErrors();

	if (errors.length === 0) {
		currentState.repeat.active = true;
		currentState.repeat.count = repeatNumber;
		currentState.repeat.position = 1;
		currentState.step = currentState.repeat.steps[0];
		saveCurrentState();
		visuallyChangeStep();
		displayDefaultSection();
	} else {
		const errorsDiv = document.getElementById('add-pattern-repeat-form-errors');
		let errorsDivContents = '';
		errors.forEach((error) => {
			errorsDivContents += `<p>${error}</p>`;
		});
		errorsDiv.innerHTML = errorsDivContents;
	}
}


// INTERPROCESS COMMUNICATION ------------------------------------------------

// Fill the screen with information from the database and user preferences, if available
ipcRenderer.on('populate-window', populateWindow);

// User has confirmed they want to abandon the current repeat
ipcRenderer.on('abandon-repeat', (e) => {
	removeRepeat();
	if (targetStep !== 0) {
		jumpToTargetStep(targetStep);
	}
});

ipcRenderer.on('deletion-complete', () => {
	currentState.patternId = 1;
	saveCurrentState();
	ipcRenderer.send('refresh-after-delete');
});

// User has chosen a file for a new pattern through the dialog box
ipcRenderer.on('selected-file', (e, path) => {
	const pathParagraph = document.getElementById('image-path');
	const editpathParagraph = document.getElementById('edit-uploaded-image-path');
	pathParagraph.textContent = path;
	editpathParagraph.textContent = path;
});

ipcRenderer.on('selected-file-error', (e, error) => {
	const editImageError = document.getElementById('editImageError');
	const addImageError = document.getElementById('imageError');
	editImageError.textContent = error;
	addImageError.textContent = error;
});

// Display add pattern form
ipcRenderer.on('display-add-pattern-form', () => {
	resetForms();
	// Display the form while ensuring others are hidden
	defaultSection.style.display = 'none';
	addPatternSection.style.display = 'flex';
	editPatternSection.style.display = 'none';
	addPatternRepeatSection.style.display = 'none'
});

// Display edit pattern form
ipcRenderer.on('display-edit-pattern-form', () => {
	// Display the form while ensuring others are hidden
	defaultSection.style.display = 'none';
	addPatternSection.style.display = 'none';
	editPatternSection.style.display = 'flex';
	addPatternRepeatSection.style.display = 'none';
});

// EVENT LISTENERS -----------------------------------------------------------

function addFormEventListeners() {
	// Re-attach form button event listeners
	const imageUploadButton = document.getElementById('image-upload');
	const editImageUploadButton = document.getElementById('edit-image-upload');

	const addAnotherStepButton = document.getElementById('add-another-step');
	const editAddAnotherStepButton = document.getElementById('edit-add-another-step');

	const saveAddPatternButton = document.getElementById('save-add-pattern');
	const saveEditedPatternButton = document.getElementById('save-edit-pattern');
	const saveRepeatButton = document.getElementById('save-repeat');

	const cancelAddButton = document.getElementById('cancel-add-pattern');
	const cancelEditButton = document.getElementById('cancel-edit-pattern');
	const cancelAddRepeatButton = document.getElementById('cancel-repeat');

	const addPatternForm = document.getElementById('add-pattern-form');
	const editPatternForm = document.getElementById('edit-pattern-form');
	const addRepeatForm = document.getElementById('add-repeat-form');

	// Add click events for image upload buttons
	imageUploadButton.addEventListener('click', (e) => {
		ipcRenderer.send('imageUploadButtonClicked');
	});
	editImageUploadButton.addEventListener('click', (e) => {
		ipcRenderer.send('editImageUploadButtonClicked');
	});

	// Submit form values to database or user preferences if there are no validation errors
	saveAddPatternButton.addEventListener('click', saveAddPattern);
	saveEditedPatternButton.addEventListener('click', saveEditedPattern);
	saveRepeatButton.addEventListener('click', saveRepeat);

	// Add click events for form cancel buttons
	cancelAddButton.addEventListener('click', cancelForm);
	cancelEditButton.addEventListener('click', cancelForm);
	cancelAddRepeatButton.addEventListener('click', cancelForm);

	// Prevent default form submission behavior
	addPatternForm.addEventListener('onsubmit', (e) => {
		e.preventDefault();
	});
	editPatternForm.addEventListener('onsubmit', (e) => {
		e.preventDefault();
	});
	addRepeatForm.addEventListener('onsubmit', (e) => {
		e.preventDefault();
	});

	// Add another fieldset to the add pattern form
	addAnotherStepButton.addEventListener('click', () => {
		appendFieldsetToAddPatternForm();
	});

	// Add another fieldset to the edit pattern form
	editAddAnotherStepButton.addEventListener('click', () => {
		appendFieldsetToEditPatternForm();
	});
}

function addMainButtonEventListeners() {
	const patternSelect = document.getElementById('pattern-select');
	// User selects a different pattern from the select box
	patternSelect.addEventListener('change', (e) => {
		const patternId = parseInt(e.target.options[e.target.selectedIndex].dataset.patternId);
		currentState.patternId = patternId;
		currentState.step = 1;
		currentState.totalSteps = 0;
		currentState.repeat = {
			active: false,
			position: 1,
			count: 0,
			steps: []
		}
		saveCurrentState();
		// Refresh the display of patterns
		ipcRenderer.send('refresh-patterns');
	});

	const toggleRepeatButton = document.getElementById('repeat');
	// Abandon the current repeat or create a new one
	toggleRepeatButton.addEventListener('click', () => {
		if (currentState.repeat.active) {
			ipcRenderer.send('confirm-repeat-abandon', currentState.step);
		} else {
			// Display the add repeat form while hiding others
			defaultSection.style.display = 'none';
			addPatternSection.style.display = 'none';
			editPatternSection.style.display = 'none';
			addPatternRepeatSection.style.display = 'flex';
		}
	});
}






// Go to the previous step
previousStepButton.addEventListener('click', () => {
	currentState.totalSteps = document.getElementsByClassName('step').length;
	// Loop back to the last if on step 1
	if (currentState.step === 1) {
		currentState.step = currentState.totalSteps;
	} else if (currentState.step !== 1) {
		// Or just go to the current step minus 1
		currentState.step = currentState.step - 1;
	}
	visuallyChangeStep();
	saveCurrentState();
});

// Go to the next step
nextStepButton.addEventListener('click', () => {
	// If repeat is active, go to the next step in the repeat
	if (currentState.repeat.active) {
		currentState.totalSteps = currentState.repeat.steps.length;
		// Loop back to first step of the repeat if on the last step
		if (currentState.repeat.steps.indexOf(currentState.step) === currentState.repeat.steps.length - 1) {
			// If the final repeat is finished
			if (currentState.repeat.position === currentState.repeat.count) {
				// Go to the next step number and remove the repeat
				currentState.totalSteps = document.getElementsByClassName('step').length;
				// Loop back to step 1 if on the last step
				if (currentState.step === currentState.totalSteps) {
					currentState.step = 1;
				} else if (currentState.step < currentState.totalSteps) {
					// Or just go to the current step plus 1
					currentState.step = currentState.step + 1;
				}
				removeRepeat();
			} else {
				currentState.step = currentState.repeat.steps[0];
				currentState.repeat.position = currentState.repeat.position + 1;
			}
		} else {
			// Just go to the index of the current step in the repeat plus 1
			let nextStepIndex = currentState.repeat.steps.indexOf(currentState.step) + 1;
			console.log(nextStepIndex);
			currentState.step = currentState.repeat.steps[nextStepIndex];
		}
	} else {
		currentState.totalSteps = document.getElementsByClassName('step').length;
		// Loop back to step 1 if on the last step
		if (currentState.step === currentState.totalSteps) {
			currentState.step = 1;
		} else if (currentState.step < currentState.totalSteps) {
			// Or just go to the current step plus 1
			currentState.step = currentState.step + 1;
		}
	}
	
	visuallyChangeStep();
	saveCurrentState();
});

function addIndividualStepButtonListeners() {
	const individualStepButtons = document.getElementsByClassName('step-button');
	// Add click events for jumping to steps
	for (let i = 0; i < individualStepButtons.length; i++) {
		individualStepButtons[i].addEventListener('click', isRepeatActive);
	}
}
