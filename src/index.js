const { ipcRenderer } = require('electron');

let currentState = {
	patternImageName: '../assets/images/default.png',
	patternId: 1,
	step: 1,
	totalSteps: 8,
	repeat: {
		active: false,
		position: 0,
		count: 0,
		steps: []
	}
}

// Log the current state to the console during every click for development purposes
document.getElementById('body').addEventListener('click', () => {
	console.log(currentState);
})


// SELECTORS -----------------------------------------------------------------

const patternSelect = document.getElementById('pattern-select');
const individualStepButtons = document.getElementsByClassName('step-button');
const previousStepButton = document.getElementById('previous');
const nextStepButton = document.getElementById('next');
const toggleRepeatButton = document.getElementById('repeat');

const defaultSection = document.getElementById('right-section-default');
const addPatternSection = document.getElementById('right-section-add-pattern');
const addPatternRepeatSection = document.getElementById('right-section-add-repeat');
const editPatternSection = document.getElementById('right-section-edit-pattern');
const leftSection = document.getElementById('left-section');

const addPatternForm = document.getElementById('add-pattern-form');
const editPatternForm = document.getElementById('edit-pattern-form');
const addRepeatForm = document.getElementById('add-repeat-form');

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


// HELPER FUNCTIONS ----------------------------------------------------------

// Request that the main process save the state to user preferences
let saveCurrentState = () => {
	ipcRenderer.send('save-current-state', currentState);
}

// Validate the add patterns form input
let getAddPatternFormErrors = () => {
	const errors = [];
	const patternName = document.getElementById('pattern-name').value;
	const allStepStitches = document.getElementsByClassName('step-stitches');
	if (!patternName) {
			errors.push({ 'nameError': 'Please input a pattern name' });
	}	
	for (let i = 0; i < allStepStitches.length; i++) {
		if (!allStepStitches[i].value) {
			errors.push({ 'stepStitchesError': `Please input a value for each step's stitches` });
		}
	}
	return errors;
}

// Validate the edit patterns form input
let getEditPatternFormErrors = () => {
	const errors = [];
	const patternName = document.getElementById('pattern-name').value;
	const allStepStitches = document.getElementsByClassName('step-stitches');
	if (!patternName) {
			errors.push({ 'editNameError': 'Please input a pattern name' });
	}	
	for (let i = 0; i < allStepStitches.length; i++) {
		if (!allStepStitches[i].value) {
			errors.push({ 'stepStitchesError': `Please input a value for each step's stitches` });
		}
	}
	return errors;
}

// Validate the add repeat form input
let getAddRepeatFormErrors = () => {
	const errors = [];
	const allCheckboxes = document.getElementsByClassName('repeat-checkbox');
	const repeatNumber = document.getElementById('repeat-number').value;
	const checkedCheckboxes = allCheckboxes.filter((checkbox) => checkbox.checked);
	if (checkedCheckboxes.length === 0) {
		errors.push({ 'repeatStepsError': 'Please check at least one step to repeat' });
	}
	if (repeatNumber) {
		errors.push({ 'repeatNumberError': 'Please check at least one step to repeat' });
	}
	return errors;
}

// Refresh the contents of the current step/repeat heading
let refreshCurrentPosition = () => {
	const currentPosition = document.getElementById('current-position');
	const currentPositionContents = `
		<h2>Currently on Step ${currentState.currentStep} ${(currentState.repeat.active) ? '(Repeat ${currentState.repeat.position} of ${currentState.repeat.count})' : ''}</h2>
	`;
	currentPosition.innerHTML = currentPositionContents;
}

// Highlight the active step
let visuallyChangeStep = () => {
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
	patternSelect.innerHTML = '';
	// Get all the patterns
	patterns.forEach((pattern) => {
    let option = document.createElement("option");
    option.textContent = pattern.name;
		option.value = pattern.pattern_id;
		option.dataset.patternId = pattern.pattern_id;
		if (pattern.pattern_id === currentState.patternId) {
			option.selected = true;
		}
    patternSelect.appendChild(option);
	});
}

// Fill the screen with information from the database, if available
let populateWindow = (e, allPatterns) => {
	// Initially update the current state from user preferences or defaults

	// Find the steps for currently selected pattern
	let selectedPattern = allPatterns.filter(pattern => pattern.id === currentState.patternId);
	let steps = JSON.parse(selectedPattern.steps);

	populatePatternSelectOptions(allPatterns);

	// Append an individual step button for each step
	const individualStepButtonsUl = document.getElementById('individual-step-buttons');
	const individualStepButtons = '';
	steps.forEach((step, index) => {
		individualStepButtons += `
			<li><button class="button step-button ${(index === currentState.currentStep) ? 'active' : ''}">${index}</button></li>
		` 
	});
	individualStepButtonsUl.appendChild(individualStepButtons);

	// Append the list of steps to the left section
	const leftSection = document.getElementById('left-section');
	const leftSectionContents = '';
	steps.forEach((step, index) => {
		leftSectionContents += `
			<div data-step-id="${index}" class="step ${(index === currentState.currentStep) ? 'active' : ''}">
				<h3 class="step-number">Step ${index}</h3>
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
	const rightSectionDefaultContents = `
		<img src="${currentState.patternImageName}" id="pattern-image" />
	`;
	rightSectionDefault.innerHTML = rightSectionDefaultContents;

	// Include pattern data in the edit form
	const editPatternForm = document.getElementById('edit-pattern-form');
	const editPatternFormContents = `
		<div class="field">
			<label for="pattern-name">Pattern Name*</label>
			<div class="control">
					<input class="input" type="text" name="pattern-name" id="edit-pattern-name" required>
			</div>
		</div>
		<p id="edit-uploaded-image-path"></p>
		<button class="button" id="edit-image-upload">Choose an image to upload (optional)</button>
		<p id="editImageError" class="error"></p>
		<div id="edit-step-fieldsets">
		<fieldset class="editable-steps">
			<legend>Step 1</legend>
			<div class="field">
				<label for="step-details">Step details (optional)</label>
				<div class="control">
					<input class="input edit-step-detail" type="text" name="step-details" required>
				</div>
			</div>
			<div class="field">
				<label for="step-details">Stitches*</label>
				<div class="control">
					<input class="input edit-step-stitch" type="text" name="step-stitches" required>
				</div>
			</div>
		</fieldset>
		</div>
		<button class="button" id="edit-add-another-step">Add another step</button>
		<div class="is-grouped">
			<button class="button" type="button" id="save-edit-pattern">Save</button>
			<button class="button" type="button" id="cancel-edit-pattern">Cancel</button>
		</div>
	`;
	editPatternForm.innerHTML = editPatternFormContents;

	// Add steps to the add repeat form
	const repeatCheckboxes = document.getElementById('repeat-checkboxes');
	const repeatCheckboxesContents = '';
	steps.forEach((step, index) => {
		repeatCheckboxesContents += `
			<label class="checkbox">
				<input type="checkbox" value="${index}" class="repeat-checkbox">Step ${index}: ${step.stitches}
			</label>
		` 
	});
	repeatCheckboxes.innerHTML = repeatCheckboxesContents;
}

// Reset the repeat values to default
let removeRepeat = () => {
	currentState.repeat = {
		active: false,
		position: 0,
		count: 0,
		steps: []
	}
	saveCurrentState();
	refreshCurrentPosition();
}

// Check if the repeat is active for the current pattern before taking any action
let isRepeatActive = (e) => {
	const targetStep = parseInt(e.target.innerText);
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
	const previousFieldsetStepNumber = addStepFieldsets.lastElementChild.dataset.addFieldsetId;
	const stepNumber = previousFieldsetStepNumber + 1;
	addStepFieldsets.innerHTML = `
		<fieldset data-add-fieldset-id="${stepNumber}">
			<legend>Step ${stepNumber}</legend>
			<div class="field">
				<label for="step-details">Step details (optional)</label>
				<div class="control">
						<input class="input step-detail" type="text" name="step-details" required>
				</div>
			</div>
			<div class="field">
				<label for="step-details">Stitches*</label>
				<div class="control">
						<input class="input step-stitch" type="text" name="step-stitches" id="step-stitches" required>
				</div>
			</div>
		</fieldset>
	`;
}

let appendFieldsetToEditPatternForm = () => {
	const editStepFieldsets = document.getElementById('edit-step-fieldsets');
	// Get the previous fieldset's step number
	const previousFieldsetStepNumber = editStepFieldsets.lastElementChild.dataset.editFieldsetId;
	const stepNumber = previousFieldsetStepNumber + 1;
	editStepFieldsets.innerHTML = `
		<fieldset data-edit-fieldset-id="${stepNumber}" class="editable-steps>
		<legend>Step ${stepNumber}</legend>
		<div class="field">
			<label for="step-details">Step details (optional)</label>
			<div class="control">
					<input class="input edit-step-detail" type="text" name="step-details" required>
			</div>
		</div>
		<div class="field">
			<label for="step-details">Stitches*</label>
			<div class="control">
					<input class="input edit-step-stitch" type="text" name="step-stitches" required>
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
					<input class="input" type="text" name="pattern-name" id="pattern-name" autofocus required>
			</div>
		</div>
		<p id="uploaded-image-path"></p>
		<button class="button" id="image-upload">Choose an image to upload (optional)</button>
		<p id="imageError" class="error"></p>
		<div id="add-step-fieldsets">
			<fieldset data-add-fieldset-id="1">
				<legend>Step 1</legend>
				<div class="field">
					<label for="step-details">Step details (optional)</label>
					<div class="control">
							<input class="input step-detail" type="text" name="step-details" autofocus required>
					</div>
				</div>
				<div class="field">
					<label for="step-details">Stitches*</label>
					<div class="control">
							<input class="input step-stitch" type="text" name="step-stitches" id="step-stitches" autofocus required>
					</div>
				</div>
			</fieldset>
		</div>
		<button class="button" id="add-another-step">Add another step</button>
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
					<input class="input" type="text" name="pattern-name" id="edit-pattern-name" required>
			</div>
		</div>
		<p id="edit-uploaded-image-path"></p>
		<button class="button" id="edit-image-upload">Choose an image to upload (optional)</button>
		<p id="editImageError" class="error"></p>
		<div id="edit-step-fieldsets">
			<fieldset data-edit-fieldset-id="1" class="editable-steps>
				<legend>Step 1</legend>
				<div class="field">
					<label for="step-details">Step details (optional)</label>
					<div class="control">
							<input class="input edit-step-detail" type="text" name="step-details" required>
					</div>
				</div>
				<div class="field">
					<label for="step-details">Stitches*</label>
					<div class="control">
							<input class="input edit-step-stitch" type="text" name="step-stitches" required>
					</div>
				</div>
			</fieldset>
		</div>
		<button class="button" id="edit-add-another-step">Add another step</button>
		<div class="is-grouped">
			<button class="button" type="button" id="save-edit-pattern">Save</button>
			<button class="button" type="button" id="cancel-edit-pattern">Cancel</button>
		</div>
	`;

	addRepeatForm.innerHTML = `
		<div id="add-pattern-repeat-form-errors" class="error"></div>
		<div id="repeat-checkboxes">
			<label class="checkbox">
				<input type="checkbox" value="1" class="repeat-checkbox">Step 1: Row 1 (RS): *K1, P1, K1, P1; rep from * to end of row.
			</label>
			<label class="checkbox">
				<input type="checkbox" value="2" class="repeat-checkbox">Step 2: Row 2 (WS): * P2, k2; rep from * to end of row.
			</label>
			<label class="checkbox">
				<input type="checkbox" value="3" class="repeat-checkbox">Row 3 (WS): * P2, k2; rep from * to end of row.
			</label>
			<label class="checkbox">
				<input type="checkbox" value="4" class="repeat-checkbox">Row 4 (WS): * P2, k2; rep from * to end of row.
			</label>
			<label class="checkbox">
				<input type="checkbox" value="5" class="repeat-checkbox">Row 5 (WS): * P2, k2; rep from * to end of row.
			</label>
			<label class="checkbox">
				<input type="checkbox" value="6" class="repeat-checkbox">Row 6 (WS): * P2, k2; rep from * to end of row.
			</label>
			<label class="checkbox">
				<input type="checkbox" value="7" class="repeat-checkbox">Row 7 (WS): * P2, k2; rep from * to end of row.
			</label>
			<label class="checkbox">
				<input type="checkbox" value="8" class="repeat-checkbox">Row 8 (WS): * P2, k2; rep from * to end of row.
			</label>
		</div>
		<label class="numeric">
			<input type="number" value="1" min="1" id="repeat-number">times
		</label>
		<div class="is-grouped">
			<button class="button" id="save-repeat" type="button">Save</button>
			<button class="button" id="cancel-repeat" type="button">Cancel</button>
		</div>
	`;
}

let cancelForm = () => {
	displayDefaultSection();
	resetForms();
}

// INTERPROCESS COMMUNICATION ------------------------------------------------

// Fill the screen with information from the database and user preferences, if available
ipcRenderer.on('populate-window', populateWindow);

// User has confirmed they want to abandon the current repeat
ipcRenderer.on('abandon-repeat', (e, targetStep) => {
	removeRepeat();
	if (targetStep !== 0) {
		jumpToTargetStep(targetStep);
	}
});

// User has chosen a file through the dialog box
ipcRenderer.on('selected-file', (e, data) => {
	const pathParagraph = document.getElementById('uploaded-image-path');
	pathParagraph.textContent = data;
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


let saveAddPattern = () => {
	// Get the form values
	const patternName = document.getElementById('pattern-name').value;
	const uploadedImagePath = document.getElementById('uploaded-image-path').value;
	const stepDetails = document.getElementsByClassName('step-detail');
	const stepStitches = document.getElementsByClassName('step-stitch');

	// Optional image upload path
	uploadedImagePath = uploadedImagePath ? uploadedImagePath : '../assets/images/default.png';

	// Build pattern object
	const newPattern = {
		name: patternName,
		imagePath: uploadedImagePath, 
		steps: []
	}

	// Push input values for steps
	for (let i = 0; i < editableSteps.length; i++) {
		newPattern.steps[i].push({
			details: stepDetails[i].value,
			stitches: stepStitches[i].value
		});
	}

	// Stringify for easy storage in the database
	newPattern.steps = JSON.stringify(newPattern.steps);

	const errors = getAddPatternFormErrors();
	if (errors.length === 0) {
		ipcRenderer.send('save-new-pattern', newPattern);
	} else {
		const errorsDiv = document.getElementById('add-pattern-form-errors');
		errors.forEach((error) => {
			errorsDiv.appendChild(`<p>${error}</p>`);
		});
	}
}

let saveEditedPattern = () => {
	// Get the form values
	const editedName = document.getElementById('edit-pattern-name').value;
	const editedImagePath = document.getElementById('edit-uploaded-image-path').innerText;
	const editableStepDetails = document.getElementsByClassName('edit-step-detail');
	const editableStepStitches = document.getElementsByClassName('edit-step-stitch');
	const repeatNumber = document.getElementById('repeat-number').value;

	// Optional image upload path
	editedImagePath = editedImagePath ? editedImagePath : '../assets/images/default.png';

	// Build pattern object
	const editedPattern = {
		name: editedName,
		imagePath: editedImagePath,
		steps: []
	}

	// Push input values for steps
	for (let i = 0; i < editableSteps.length; i++) {
		editedPattern.steps[i].push({
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
	} else {
		const errorsDiv = document.getElementById('edit-pattern-repeat-form-errors');
		errors.forEach((error) => {
			errorsDiv.appendChild(`<p>${error}</p>`);
		});
	}
}

let saveRepeat = () => {
	// Get the step numbers included in the repeat from the form
	const checkboxes = document.getElementsByClassName('repeat-checkbox');

	// Collect the values of the checked checkboxes
	for (let i = 0; i < checkboxes.length; i++) {
		if (checkboxes[i].checked) {
			// Push that step number to the array
			console.log(currentState.repeat.steps);
			currentState.repeat.steps.push(checkboxes[i].value);
		}
	}

	const errors = getAddRepeatFormErrors();

	if (errors.length === 0) {
		saveCurrentState();
	} else {
		const errorsDiv = document.getElementById('add-pattern-repeat-form-errors');
		errors.forEach((error) => {
			errorsDiv.appendChild(`<p>${error}</p>`);
		});
	}
}

// User selects a different pattern from the select box
patternSelect.addEventListener('change', (e) => {
	const patternId = e.target.options[e.target.selectedIndex].dataset.patternId;
	// Save state to user preferences before it's overwritten
	saveCurrentState();
	currentState.patternId = patternId;
	// Refresh the display of patterns
	ipcRenderer.send('refresh-patterns');
});

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

// Add another fieldset to the add pattern form
addAnotherStepButton.addEventListener('click', () => {
	appendFieldsetToAddPatternForm();
});

// Add another fieldset to the edit pattern form
editAddAnotherStepButton.addEventListener('click', () => {
	appendFieldsetToEditPatternForm();
});

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
	currentState.totalSteps = document.getElementsByClassName('step').length;
	// Loop back to step 1 if on the last step
	if (currentState.step === currentState.totalSteps) {
		currentState.step = 1;
	} else if (currentState.step < currentState.totalSteps) {
		// Or just go to the current step plus 1
		currentState.step = currentState.step + 1;
	}
	visuallyChangeStep();
	saveCurrentState();
});

// Add click events for jumping to steps
for (let i = 0; i < individualStepButtons.length; i++) {
	individualStepButtons[i].addEventListener('click', isRepeatActive);
}

// Add click events for image upload buttons
imageUploadButton.addEventListener('click', (e) => {
	ipcRenderer.send('imageUploadButtonClicked');
});
editImageUploadButton.addEventListener('click', (e) => {
	ipcRenderer.send('imageUploadButtonClicked');
});

// Submit form values to database or user preferences if there are no validation errors
saveAddPatternButton.addEventListener('click', saveAddPattern);
saveEditedPatternButton.addEventListener('click', saveEditedPattern);
saveRepeatButton.addEventListener('click', saveRepeat);

// Add click events for form cancel buttons
cancelAddButton.addEventListener('click', cancelForm);
cancelEditButton.addEventListener('click', cancelForm);
cancelAddRepeatButton.addEventListener('click', cancelForm);
